-- August 2026: one icon color per itinerary item, any type (previously only
-- flight / bus / meeting point had a color). The three legacy columns stay as
-- a read fallback for items saved before this change (see resolveIconColor in
-- lib/helpers.ts); the editor clears them whenever an item is saved.
--
-- get_shared_tour returns agenda items as to_jsonb(ai), so the new column flows
-- into the shared itinerary with no function change.
alter table public.agenda_items add column if not exists icon_color text;
