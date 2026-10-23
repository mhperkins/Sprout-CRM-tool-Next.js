-- Call-for-submissions list from the public /submit page (TV slide QR).
--
-- Artists and musicians leave a name + email; staff send them the submission
-- form later. No token and no login, so the API route writes with the
-- service-role key. Never writes to sprout_contacts: import keepers by hand.

create table if not exists public.sprout_submission_list (
  id text primary key,
  name text not null default '',
  email text not null default '',
  role text not null default 'other' check (role in ('music', 'art', 'other')),
  instagram text not null default '',
  source text not null default 'tv-slide',
  sent_form_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists sprout_submission_list_email_idx on public.sprout_submission_list (lower(email));
create index if not exists sprout_submission_list_created_idx on public.sprout_submission_list (created_at desc);

alter table public.sprout_submission_list enable row level security;

create policy authenticated_all on public.sprout_submission_list
  for all to authenticated using (true) with check (true);

-- Explicit grants (Supabase stops auto-granting new tables on 2026-10-30). No anon.
grant select, insert, update, delete on public.sprout_submission_list to authenticated;
grant select, insert, update, delete on public.sprout_submission_list to service_role;
