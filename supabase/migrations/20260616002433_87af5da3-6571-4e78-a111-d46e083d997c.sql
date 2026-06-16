
-- 1) profiles: explicitly forbid client-side INSERTs.
-- handle_new_user is SECURITY DEFINER and bypasses RLS, so signup keeps working.
-- The service_role (admin client) also bypasses RLS.
CREATE POLICY "profiles no client insert"
ON public.profiles
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 2) storage: make the public read on the 'equipamentos' bucket explicit.
DROP POLICY IF EXISTS "equipamentos public read" ON storage.objects;
CREATE POLICY "equipamentos public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'equipamentos');
