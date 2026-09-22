-- Showcase applications (replaces the Sprout N Tell Google Form).
--
-- One standing public link (/showcase), no token and no login, so the API route
-- writes with the service-role key. Logged-in staff read and manage the table
-- directly, matching every other sprout_* table.
--
-- Applications live in their own table and NEVER write to sprout_contacts on their
-- own. Accepting one in the CRM is what creates or updates a contact, so junk and
-- duplicates stay out of the relationship data.

create table if not exists public.sprout_showcase_applications (
  id text primary key,
  status text not null default 'new',        -- new | accepted | passed
  name text not null default '',
  email text not null default '',
  role text not null default '',
  data jsonb not null default '{}'::jsonb,   -- pitch, links[], files[], phone, instagram, notes, decision trail
  contact_id text,                           -- set when accepted
  event_id text,                             -- the night they were placed on
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sprout_showcase_status_idx on public.sprout_showcase_applications (status, created_at desc);
create index if not exists sprout_showcase_email_idx on public.sprout_showcase_applications (lower(email));

alter table public.sprout_showcase_applications enable row level security;

create policy authenticated_all on public.sprout_showcase_applications
  for all to authenticated using (true) with check (true);
