-- "Get involved" interest form from the public /get-involved page.
--
-- Anyone who wants more info, more events, or a way into the community. No token
-- and no login, so the API route writes with the service-role key. Never writes to
-- sprout_contacts: staff use "Add as contact" on the CRM's Get Involved page.

create table if not exists public.sprout_interest (
  id text primary key,
  name text not null default '',
  email text not null default '',
  interests text[] not null default '{}',
  message text not null default '',
  instagram text not null default '',
  how_heard text not null default '',
  status text not null default 'new' check (status in ('new', 'followed_up')),
  contact_id text,
  source text not null default 'get-involved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sprout_interest_created_idx on public.sprout_interest (created_at desc);
create index if not exists sprout_interest_email_idx on public.sprout_interest (lower(email));

alter table public.sprout_interest enable row level security;

create policy authenticated_all on public.sprout_interest
  for all to authenticated using (true) with check (true);

-- Explicit grants (Supabase stops auto-granting new tables on 2026-10-30). No anon.
grant select, insert, update, delete on public.sprout_interest to authenticated;
grant select, insert, update, delete on public.sprout_interest to service_role;
