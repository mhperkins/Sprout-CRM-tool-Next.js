-- Inbox › Email triage: Pin / Completed / Ignore, set in the CRM only (Gmail is never changed).
-- key = "<account>:<gmail thread id>" for email, "ig:<outreach account id>" for Instagram replies.
create table if not exists public.sprout_inbox_triage (
  key        text primary key,
  status     text not null check (status in ('pinned', 'done', 'ignored')),
  updated_at timestamptz not null default now()
);

alter table public.sprout_inbox_triage enable row level security;

drop policy if exists authenticated_all on public.sprout_inbox_triage;
create policy authenticated_all on public.sprout_inbox_triage
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.sprout_inbox_triage to authenticated;
grant select, insert, update, delete on public.sprout_inbox_triage to service_role;
