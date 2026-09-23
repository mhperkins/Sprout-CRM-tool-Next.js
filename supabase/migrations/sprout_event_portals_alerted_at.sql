-- Applied 2026-09-23. Throttle marker for host-activity alerts on the event portal.
--
-- The portal autosaves as the host types, so an alert per save would flood the inbox.
-- Edit alerts are rate limited to one per portal per 12 hours using this column; a
-- submit always alerts regardless of it. Null means nobody has been told anything
-- about this portal yet.

alter table public.sprout_event_portals
  add column if not exists alerted_at timestamptz;
