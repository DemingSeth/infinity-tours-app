-- ════════════════════════════════════════════════════════════════════════════
-- Quote Builder hero images — additive storage policies
--
-- Hero photos for quotes reuse the existing public `banner-images` bucket under
-- a dedicated `quote-heroes/` prefix. This file ONLY adds policies scoped to
-- that prefix so any authenticated tour host may upload/replace/remove their
-- quote hero. The curated banner library (other prefixes in the same bucket)
-- stays admin-only — these policies never touch it.
--
-- Public read is already granted bucket-wide by "banner-images public read"
-- in storage-policies.sql, so hero <img> tags resolve without changes here.
--
-- DO NOT APPLY automatically. Run this in the Supabase SQL Editor by hand.
-- ════════════════════════════════════════════════════════════════════════════

create policy "quote-heroes authenticated upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'banner-images'
    and (storage.foldername(name))[1] = 'quote-heroes'
  );

create policy "quote-heroes authenticated update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'banner-images'
    and (storage.foldername(name))[1] = 'quote-heroes'
  )
  with check (
    bucket_id = 'banner-images'
    and (storage.foldername(name))[1] = 'quote-heroes'
  );

create policy "quote-heroes authenticated delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'banner-images'
    and (storage.foldername(name))[1] = 'quote-heroes'
  );
