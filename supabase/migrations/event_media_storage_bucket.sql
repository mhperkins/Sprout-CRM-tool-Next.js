-- event-media bucket: flyers, photos and short video attached to an event.
--
-- Public read so an <img> renders without a signed-URL round trip, matching the
-- existing newsletter-images bucket. Writes are restricted to `authenticated`,
-- NOT anon: the CRM has had a login wall since 2026-06-17, so there is no reason
-- to repeat the anon-insert policy the older newsletter bucket still carries.
--
-- Apply with the Supabase MCP (apply_migration) once the project is restored.

insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

drop policy if exists "event_media_public_read" on storage.objects;
create policy "event_media_public_read"
  on storage.objects for select
  using (bucket_id = 'event-media');

drop policy if exists "event_media_auth_insert" on storage.objects;
create policy "event_media_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-media');

drop policy if exists "event_media_auth_update" on storage.objects;
create policy "event_media_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'event-media');

drop policy if exists "event_media_auth_delete" on storage.objects;
create policy "event_media_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-media');
