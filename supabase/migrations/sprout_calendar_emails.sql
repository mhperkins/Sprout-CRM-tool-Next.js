-- Day Board checklist + Sprout calendar emails (migration sprout_summary_sends_reminder_kinds).
-- Adds the Monday overview and tomorrow reminder to the once-only send log.
--
-- Run the unschedule line when this code goes live: tasks no longer roll forward at
-- midnight, because the checklist shows everything open, oldest first.

alter table public.sprout_summary_sends drop constraint sprout_summary_sends_kind_check;
alter table public.sprout_summary_sends add constraint sprout_summary_sends_kind_check
  check (kind = any (array['daily'::text, 'weekly'::text, 'monday'::text, 'tomorrow'::text]));

select cron.unschedule('sprout-tasks-roll-forward');
