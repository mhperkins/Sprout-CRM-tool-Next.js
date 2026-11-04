-- Booking slots: the actual dates a client asked for or holds.
-- One row per date. Requests come in from /book and the portal (service role);
-- staff approve or decline them in the CRM. An approved slot carries the id of the
-- Google Calendar event written to the Program Calendar.
-- Kept outside sprout_events so a staff save of the whole event can never wipe them.

create table if not exists public.sprout_booking_slots (
  id              text primary key,
  event_id        text not null references public.sprout_events(id) on delete cascade,
  portal_id       text,
  date            date not null,
  start_time      text not null,           -- HH:MM, 24h, New York time
  end_time        text not null,
  status          text not null default 'requested'
                  check (status in ('requested','confirmed','declined','cancelled')),
  note            text not null default '',
  decline_reason  text not null default '',
  gcal_event_id   text,
  requested_at    timestamptz not null default now(),
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists sprout_booking_slots_event_idx  on public.sprout_booking_slots (event_id);
create index if not exists sprout_booking_slots_date_idx   on public.sprout_booking_slots (date);
create index if not exists sprout_booking_slots_status_idx on public.sprout_booking_slots (status);

alter table public.sprout_booking_slots enable row level security;

drop policy if exists authenticated_all on public.sprout_booking_slots;
create policy authenticated_all on public.sprout_booking_slots
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.sprout_booking_slots to authenticated;
grant all on public.sprout_booking_slots to service_role;
