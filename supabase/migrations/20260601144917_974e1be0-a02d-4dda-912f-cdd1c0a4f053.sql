
-- Make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('pdfs', 'assinaturas', 'pmoc-fotos');

-- Storage RLS: company members can read/write files in their company folder; super admin full access.
-- Path convention: first folder is the company_id.

DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['pdfs','assinaturas','pmoc-fotos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_select_company');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_insert_company');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_update_company');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_delete_company');
  END LOOP;
END $$;

CREATE POLICY "pdfs_select_company" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdfs' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "pdfs_insert_company" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "pdfs_update_company" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pdfs' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "pdfs_delete_company" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pdfs' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));

CREATE POLICY "assinaturas_select_company" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assinaturas' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "assinaturas_insert_company" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assinaturas' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "assinaturas_update_company" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assinaturas' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "assinaturas_delete_company" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assinaturas' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));

CREATE POLICY "pmoc-fotos_select_company" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pmoc-fotos' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "pmoc-fotos_insert_company" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pmoc-fotos' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "pmoc-fotos_update_company" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pmoc-fotos' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
CREATE POLICY "pmoc-fotos_delete_company" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pmoc-fotos' AND (
  public.is_super_admin(auth.uid())
  OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
));
