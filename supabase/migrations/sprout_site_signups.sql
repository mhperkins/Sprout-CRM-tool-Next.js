-- Launch-list sign-ups from the public coming-soon page (/coming-soon).
--
-- No token and no login, so the API route writes with the service-role key.
-- Logged-in staff read the table directly, matching every other sprout_* table.
-- Sign-ups never write to sprout_contacts on their own: they are a list to import
-- or email later, so junk stays out of the relationship data.

create table if not exists public.sprout_site_signups (
  id text primary key,
  name text not null default '',
  email text not null default '',
  source text not null default 'coming-soon',
  created_at timestamptz not null default now()
);

create unique index if not exists sprout_site_signups_email_idx on public.sprout_site_signups (lower(email));
create index if not exists sprout_site_signups_created_idx on public.sprout_site_signups (created_at desc);

alter table public.sprout_site_signups enable row level security;

create policy authenticated_all on public.sprout_site_signups
  for all to authenticated using (true) with check (true);

-- Explicit grants (Supabase stops auto-granting new tables on 2026-10-30). No anon.
grant select, insert, update, delete on public.sprout_site_signups to authenticated;
grant select, insert, update, delete on public.sprout_site_signups to service_role;
