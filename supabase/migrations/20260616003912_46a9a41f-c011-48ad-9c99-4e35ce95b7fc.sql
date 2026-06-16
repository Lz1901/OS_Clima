-- Prevent anonymous listing of public buckets (logos, equipamentos).
-- Public read access to individual files via public URLs continues to work
-- because public buckets are served by the storage CDN without needing a
-- SELECT policy on storage.objects. The broad SELECT policies below allowed
-- clients to enumerate every file in the bucket, which is unnecessary and
-- a privacy risk.
DROP POLICY IF EXISTS "equipamentos public read" ON storage.objects;
DROP POLICY IF EXISTS public_read_logos_equipamentos ON storage.objects;