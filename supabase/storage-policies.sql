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
