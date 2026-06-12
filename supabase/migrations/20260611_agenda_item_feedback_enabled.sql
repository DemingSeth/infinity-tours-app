-- Per-item student feedback toggle for itinerary items.
-- The UI calls these "Itinerary" items; the table kept its original name,
-- agenda_items. This is a display-layer feature — no columns/tables renamed.
-- Additive and idempotent; safe to paste into the Supabase SQL Editor.

-- 1. The toggle column: opt-in per item, defaults off.
alter table agenda_items
  add column if not exists feedback_enabled boolean not null default false;

-- 2. Backfill: turn feedback on for existing Activity items — the Activity type
--    itself, plus any item carrying an Activity sub-type (activity_subtype).
--    Sub-type values mirror ACTIVITY_SUBTYPES in lib/helpers.ts.
update agenda_items
set feedback_enabled = true
where type = 'activity'
   or activity_subtype in ('theme_park', 'disney', 'medieval_times', 'beach', 'clinic', 'concert');
