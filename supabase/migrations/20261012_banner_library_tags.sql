-- Banner library location tags (October 2026, Amy).
-- A photo can now carry several place tags (e.g. Disneyland, Anaheim, Southern
-- California) instead of a single Destination. The picker suggests photos whose
-- tags match the tour's destination or name. Writes stay admin-only through the
-- existing "Admins update banner library" policy.
--
-- destination is kept for compatibility; the app writes tags[0] into it.

alter table public.banner_image_library
  add column if not exists tags text[] not null default '{}';

-- Seed each photo's tags from its current Destination so nothing is re-entered.
update public.banner_image_library
   set tags = array[btrim(destination)]
 where destination is not null
   and btrim(destination) <> ''
   and tags = '{}';
