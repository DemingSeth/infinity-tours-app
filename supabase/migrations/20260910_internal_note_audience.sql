-- September 2026 (Linda): the Internal Note gets a "Who sees this?" audience.
--   { "hosts": ["Linda Deming", ...], "personas": ["teacher"] }
-- hosts    = named tour hosts on the tour the note is addressed to (empty = all
--            tour hosts, which is the historical behavior).
-- personas = participant personas beyond the tour host that may also see it.
-- An empty object keeps every existing note exactly as it renders today.
-- get_shared_tour returns agenda items as to_jsonb(ai), so the new column flows
-- into the shared itinerary with no function change.
alter table public.agenda_items
  add column if not exists internal_note_audience jsonb not null default '{}'::jsonb;
