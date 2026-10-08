-- Impact surveys for hosts and showcase artists (migration sprout_impact_surveys).
--
-- sprout_surveys holds the editable questions, one row per audience (svy_host,
-- svy_artist). A missing row means "use the defaults in lib/surveyForm.js".
--
-- sprout_survey_invites is one private link per person. It names the nights it covers
-- and, once they answer, holds their answers plus a copy of the questions they saw, so
-- editing the survey later never changes what an old answer meant. People reach it with
-- the token and no login, so the public route uses the service-role key; staff read and
-- manage both tables directly, like every other sprout_* table.

create table if not exists public.sprout_surveys (
  id text primary key,
  audience text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sprout_survey_invites (
  id text primary key,
  survey_id text not null,
  token text not null unique,
  contact_id text,
  name text not null default '',
  email text not null default '',
  event_ids jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sprout_survey_invites_survey_idx on public.sprout_survey_invites (survey_id, created_at);

alter table public.sprout_surveys enable row level security;
alter table public.sprout_survey_invites enable row level security;

create policy authenticated_all on public.sprout_surveys for all to authenticated using (true) with check (true);
create policy authenticated_all on public.sprout_survey_invites for all to authenticated using (true) with check (true);
