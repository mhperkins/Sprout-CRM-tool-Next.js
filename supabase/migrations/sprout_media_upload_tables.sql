-- Guest media upload link (applied 2026-10-28 as migration sprout_media_upload_tables).
--
-- One upload link per event (sprout_media_forms). Guests open /media/<token> with no
-- login and send photos and video straight to a Google Drive folder for that event;
-- each file or pasted link is one row in sprout_media_uploads. The public API route
-- uses the service-role key. Logged-in staff read and manage both tables directly.
--
-- Uploads live in their own table, not on the event record, so a staff save of the
-- whole event object can never wipe them.

create table if not exists public.sprout_media_forms (
  id text primary key,
  event_id text not null unique,
  token text not null unique,
  drive_folder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sprout_media_uploads (
  id text primary key,
  event_id text not null,
  form_id text not null,
  batch_id text not null,
  kind text not null check (kind in ('file', 'link')),
  status text not null default 'pending' check (status in ('pending', 'done')),
  name text,
  mime text,
  size bigint,
  drive_file_id text,
  url text,
  sender jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sprout_media_uploads_event_idx on public.sprout_media_uploads (event_id, created_at);
create index if not exists sprout_media_uploads_batch_idx on public.sprout_media_uploads (batch_id);

alter table public.sprout_media_forms enable row level security;
alter table public.sprout_media_uploads enable row level security;

create policy authenticated_all on public.sprout_media_forms for all to authenticated using (true) with check (true);
create policy authenticated_all on public.sprout_media_uploads for all to authenticated using (true) with check (true);

-- Explicit grants (Supabase stops auto-granting new tables on 2026-10-30). No anon.
grant select, insert, update, delete on public.sprout_media_forms to authenticated;
grant select, insert, update, delete on public.sprout_media_forms to service_role;
grant select, insert, update, delete on public.sprout_media_uploads to authenticated;
grant select, insert, update, delete on public.sprout_media_uploads to service_role;
