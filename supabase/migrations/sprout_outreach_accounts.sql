-- Instagram outreach (migration sprout_outreach_accounts).
--
-- sprout_outreach_accounts is one row per Instagram account Sprout is reaching out to.
-- It replaces the DM Plan tab of the IG triage sheet. contact_id links the row to an
-- existing CRM contact; a null contact_id means the person is not in the CRM yet, and
-- nothing is created until staff press Add to CRM. history is the row's own log; every
-- entry is also written to the linked contact's touchpoints.
--
-- sprout_outreach_messages holds the editable message text.
--
-- Staff only. Grants are explicit because new tables get none by default from 2026-10-30.

create table if not exists public.sprout_outreach_accounts (
  id text primary key,
  handle text not null,
  name text not null default '',
  type text not null default '',
  batch integer not null default 1,
  status text not null default 'to_message'
    check (status in ('to_message', 'messaged', 'replied', 'interested', 'added', 'skip')),
  follows_us boolean,
  skip_reason text not null default '',
  note text not null default '',
  contact_id text,
  sent_at timestamptz,
  replied_at timestamptz,
  reply text not null default '',
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sprout_outreach_accounts_handle_idx on public.sprout_outreach_accounts (lower(handle));
create index if not exists sprout_outreach_accounts_batch_idx on public.sprout_outreach_accounts (batch, status);

create table if not exists public.sprout_outreach_messages (
  id text primary key,
  name text not null default '',
  body text not null default '',
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.sprout_outreach_accounts enable row level security;
alter table public.sprout_outreach_messages enable row level security;

create policy authenticated_all on public.sprout_outreach_accounts for all to authenticated using (true) with check (true);
create policy authenticated_all on public.sprout_outreach_messages for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.sprout_outreach_accounts to authenticated, service_role;
grant select, insert, update, delete on public.sprout_outreach_messages to authenticated, service_role;

revoke all on public.sprout_outreach_accounts from anon;
revoke all on public.sprout_outreach_messages from anon;
