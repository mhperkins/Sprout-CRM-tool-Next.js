-- Gallery submission form (replaces the "Gallery Art Submission Form" Google Form).
--
-- Same model as the program form: a secret-token link, no login, the public API route
-- writes with the service-role key, staff read and manage as `authenticated`.
-- One link per event (event_id set) plus ONE standing open-call link (event_id null,
-- kind 'open') that /submit emails automatically. Open-call entries get an event
-- later, when staff assign them to a show.
--
-- Entries live in their own table so a staff save of an event can never wipe them.

create table if not exists public.sprout_gallery_forms (
  id text primary key,
  kind text not null default 'event' check (kind in ('event', 'open')),
  event_id text,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'open') = (event_id is null))
);

create unique index if not exists sprout_gallery_forms_event_idx on public.sprout_gallery_forms (event_id) where event_id is not null;
create unique index if not exists sprout_gallery_forms_open_idx on public.sprout_gallery_forms (kind) where kind = 'open';

create table if not exists public.sprout_gallery_entries (
  id text primary key,
  form_id text not null,
  event_id text,
  edit_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sprout_gallery_entries_event_idx on public.sprout_gallery_entries (event_id, created_at);
create index if not exists sprout_gallery_entries_form_idx on public.sprout_gallery_entries (form_id, created_at);

alter table public.sprout_gallery_forms enable row level security;
alter table public.sprout_gallery_entries enable row level security;

create policy authenticated_all on public.sprout_gallery_forms for all to authenticated using (true) with check (true);
create policy authenticated_all on public.sprout_gallery_entries for all to authenticated using (true) with check (true);

-- Explicit grants (Supabase stops auto-granting new tables on 2026-10-30). No anon.
grant select, insert, update, delete on public.sprout_gallery_forms to authenticated, service_role;
grant select, insert, update, delete on public.sprout_gallery_entries to authenticated, service_role;

-- The /submit list remembers which link it sent.
alter table public.sprout_submission_list add column if not exists form_token text;

-- The standing open-call link (token generated in the database, 32 hex chars).
insert into public.sprout_gallery_forms (id, kind, event_id, token)
values ('glf_open_call', 'open', null, encode(extensions.gen_random_bytes(16), 'hex'))
on conflict do nothing;
