-- Participant program form (applied 2026-09-10 as migration sprout_program_form_tables).
--
-- One form link per event (sprout_program_forms), many submissions per event
-- (sprout_program_entries). Participants reach the form with a secret token and no
-- login, so the public API route uses the service-role key. Logged-in staff read and
-- manage both tables directly, matching every other sprout_* table.
--
-- Submissions live in their own table, not on the event record, so a staff save of
-- the whole event object can never wipe what a participant sent.

create table if not exists public.sprout_program_forms (
  id text primary key,
  event_id text not null unique,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sprout_program_entries (
  id text primary key,
  event_id text not null,
  edit_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sprout_program_entries_event_idx on public.sprout_program_entries (event_id, created_at);

alter table public.sprout_program_forms enable row level security;
alter table public.sprout_program_entries enable row level security;

create policy authenticated_all on public.sprout_program_forms for all to authenticated using (true) with check (true);
create policy authenticated_all on public.sprout_program_entries for all to authenticated using (true) with check (true);
