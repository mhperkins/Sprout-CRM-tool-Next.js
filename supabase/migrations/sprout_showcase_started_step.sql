-- Two-step /submit form (2026-11-24).
-- Step 1 (name, email, role) saves a row with status 'started' and a private token;
-- step 2 finishes it (status 'new'). The token is the person's link back to their own
-- row, used by the day-3 and day-14 reminder emails. Existing rows keep token null.
alter table public.sprout_showcase_applications
  add column if not exists token text,
  add column if not exists reminders_sent integer not null default 0,
  add column if not exists last_reminded_at timestamptz;

create unique index if not exists sprout_showcase_applications_token_key
  on public.sprout_showcase_applications (token) where token is not null;

create index if not exists sprout_showcase_applications_status_idx
  on public.sprout_showcase_applications (status, created_at);
