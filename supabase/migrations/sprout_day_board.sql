-- Day Board (applied 2026-09-15 as migration sprout_day_board).
--
-- Tasks and the weekly bank, the midnight auto-push, and send-once claims for the daily
-- recap and weekly summary emails. CRM follow-ups mirror into sprout_tasks by action_key;
-- the CRM contact/org record stays the source of truth for the next action itself.
--
-- The cron secret is generated inside the database and never printed. pg_cron sends the
-- plaintext from Vault; the route compares its sha256 against sprout_cron_keys.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.sprout_tasks (
  id          text primary key,
  title       text not null,
  category    text not null default 'admin'
              check (category in ('events','outreach','admin','grants','personal')),
  hours       numeric(4,2) not null default 1 check (hours > 0 and hours <= 12),
  week_start  date not null,            -- Monday of the task's week, New York time
  day         date,                     -- null = in the weekly bank
  priority    double precision not null default 0,
  kind        text not null default 'task' check (kind in ('task','follow_up')),
  contact_id  text,
  org_id      text,
  action_key  text,                     -- identity of the CRM next action this task mirrors
  due         date,                     -- the CRM next action's date
  done        boolean not null default false,
  done_at     timestamptz,
  pushes      jsonb not null default '[]'::jsonb,  -- [{from, note, auto, at}]
  carried     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sprout_tasks_day_in_week check (day is null or (day >= week_start and day < week_start + 7)),
  constraint sprout_tasks_week_is_monday check (extract(isodow from week_start) = 1)
);

create index if not exists sprout_tasks_week_idx on public.sprout_tasks (week_start, priority);
create unique index if not exists sprout_tasks_action_key_uq on public.sprout_tasks (action_key) where action_key is not null;

alter table public.sprout_tasks enable row level security;
drop policy if exists authenticated_all on public.sprout_tasks;
create policy authenticated_all on public.sprout_tasks for all to authenticated using (true) with check (true);

create table if not exists public.sprout_summary_sends (
  kind         text not null check (kind in ('daily','weekly')),
  period       date not null,
  claim_token  text not null,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  primary key (kind, period)
);
alter table public.sprout_summary_sends enable row level security;

create table if not exists public.sprout_cron_keys (
  name      text primary key,
  key_hash  text not null
);
alter table public.sprout_cron_keys enable row level security;

create or replace function public.sprout_tasks_roll_forward(p_today date default null)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'America/New_York')::date);
  v_week  date := date_trunc('week', v_today)::date;
  n1 int; n2 int;
begin
  update sprout_tasks t set
    pushes = t.pushes || jsonb_build_array(jsonb_build_object('from', t.day, 'auto', true, 'at', now())),
    day = v_today,
    updated_at = now()
  where not t.done and t.day is not null and t.day < v_today and t.week_start = v_week;
  get diagnostics n1 = row_count;

  update sprout_tasks t set
    pushes = case when t.day is not null
               then t.pushes || jsonb_build_array(jsonb_build_object('from', t.day, 'auto', true, 'at', now()))
               else t.pushes end,
    day = null,
    week_start = v_week,
    carried = true,
    updated_at = now()
  where not t.done and t.week_start < v_week;
  get diagnostics n2 = row_count;

  return n1 + n2;
end $$;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sprout_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'sprout_cron_secret', 'Day Board scheduled email routes');
  end if;
end $$;

insert into public.sprout_cron_keys (name, key_hash)
select 'summaries', encode(extensions.digest(decrypted_secret, 'sha256'), 'hex')
from vault.decrypted_secrets where name = 'sprout_cron_secret'
on conflict (name) do update set key_hash = excluded.key_hash;

select cron.unschedule(jobid) from cron.job where jobname in ('sprout-tasks-roll-forward', 'sprout-day-board-summaries');

select cron.schedule('sprout-tasks-roll-forward', '2 * * * *', $job$select public.sprout_tasks_roll_forward()$job$);

select cron.schedule('sprout-day-board-summaries', '*/15 * * * *', $job$
  select net.http_post(
    url := 'https://sprout-crm-tool-next-js.vercel.app/api/cron/summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sprout_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  )
$job$);
