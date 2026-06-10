-- ════════════════════════════════════════════════════════════════════════════
-- Storage: agenda-images bucket
-- Public bucket holding photos attached to agenda items.
-- Layout: agenda-images/[tourId]/[itemId]/[filename]
--
-- The bucket itself is created as PUBLIC (public read served without RLS).
-- Uploads / updates / deletes still require RLS policies on storage.objects;
-- these grant them to authenticated tour hosts.
-- ════════════════════════════════════════════════════════════════════════════

-- Create the bucket if it does not already exist (public read).
insert into storage.buckets (id, name, public)
values ('agenda-images', 'agenda-images', true)
on conflict (id) do update set public = true;

create policy "agenda-images authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'agenda-images');

create policy "agenda-images authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'agenda-images')
  with check (bucket_id = 'agenda-images');

create policy "agenda-images authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'agenda-images');

-- ════════════════════════════════════════════════════════════════════════════
-- Storage: banner-images bucket
-- Public bucket holding the curated banner image library. Anyone may read
-- (images render in itinerary headers and the picker); only admins
-- (tour_hosts.role = 'admin') may upload or delete. Mirrors the RLS on the
-- banner_image_library table in schema.sql.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('banner-images', 'banner-images', true)
on conflict (id) do update set public = true;

create policy "banner-images public read"
  on storage.objects for select
  using (bucket_id = 'banner-images');

create policy "banner-images admin upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'banner-images'
    and exists (select 1 from tour_hosts th where th.id = auth.uid() and th.role = 'admin')
  );

create policy "banner-images admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'banner-images'
    and exists (select 1 from tour_hosts th where th.id = auth.uid() and th.role = 'admin')
  );
