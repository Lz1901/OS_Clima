DROP POLICY IF EXISTS "auth read all buckets" ON storage.objects;

CREATE POLICY "public_read_logos_equipamentos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('logos', 'equipamentos'));