-- ════════════════════════════════════════════════════════════════════════════
-- Itinerary items: multi-select activity sub-types and travel methods.
--
-- Previously each item carried a single travel_method and a single
-- activity_subtype. An item could end up with an orphaned travel_method (e.g.
-- "walking" on an Activity item) that the editor offered no way to clear.
--
-- This migration introduces two array columns that become the authoritative
-- source going forward. Each item may now carry zero or more of each,
-- independently toggleable in the editor.
--
-- The legacy singular columns (travel_method, activity_subtype) are KEPT and
-- stay backfilled/synced by the app as dormant rollback insurance only — no
-- live display or derivation reads them once this migration is applied.
-- ════════════════════════════════════════════════════════════════════════════

alter table agenda_items
  add column if not exists travel_methods   text[] not null default '{}',
  add column if not exists activity_subtypes text[] not null default '{}';

-- Backfill the arrays from the existing singular values (only where unset).
update agenda_items
  set travel_methods = array[travel_method]
  where travel_methods = '{}'::text[]
    and coalesce(travel_method, '') <> '';

update agenda_items
  set activity_subtypes = array[activity_subtype]
  where activity_subtypes = '{}'::text[]
    and coalesce(activity_subtype, '') <> '';
