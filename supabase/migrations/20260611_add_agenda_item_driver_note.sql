-- Bus Driver Note on itinerary items.
-- A nullable free-text note surfaced only to the bus_driver persona and tour
-- hosts (gated in the app by the existing per-persona visibility model).
-- Idempotent: this column already exists in some environments, so guarded with
-- IF NOT EXISTS — safe to run in the Supabase SQL Editor either way.
alter table agenda_items add column if not exists driver_note text;
