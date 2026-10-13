-- Resizable itinerary photos (October 2026, Seth). Hosts drag a photo's corner
-- to make it bigger or smaller. The chosen display height in pixels is kept
-- per photo, keyed by the photo URL: {"https://.../photo.jpg": 420}. Photos
-- without an entry keep the standard 300px height. get_shared_tour() returns
-- to_jsonb(agenda_items), so participant views receive this automatically.
alter table public.agenda_items
  add column if not exists image_sizes jsonb not null default '{}'::jsonb;
