
-- Reforço: bloquear acesso a buckets privados quando a empresa estiver suspensa/bloqueada
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid='storage.objects'::regclass
      AND polname IN (
        'pdfs_select_company','pdfs_insert_company','pdfs_update_company','pdfs_delete_company',
        'assinaturas_select_company','assinaturas_insert_company','assinaturas_update_company','assinaturas_delete_company',
        'pmoc-fotos_select_company','pmoc-fotos_insert_company','pmoc-fotos_update_company','pmoc-fotos_delete_company'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.polname);
  END LOOP;
END $$;

-- pdfs
CREATE POLICY "pdfs_select_company" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='pdfs' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "pdfs_insert_company" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='pdfs' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "pdfs_update_company" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='pdfs' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "pdfs_delete_company" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='pdfs' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));

-- assinaturas
CREATE POLICY "assinaturas_select_company" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='assinaturas' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "assinaturas_insert_company" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='assinaturas' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "assinaturas_update_company" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='assinaturas' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "assinaturas_delete_company" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='assinaturas' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));

-- pmoc-fotos
CREATE POLICY "pmoc-fotos_select_company" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='pmoc-fotos' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "pmoc-fotos_insert_company" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='pmoc-fotos' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "pmoc-fotos_update_company" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='pmoc-fotos' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
CREATE POLICY "pmoc-fotos_delete_company" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='pmoc-fotos' AND (public.is_super_admin(auth.uid()) OR ((storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text AND public.is_company_active(auth.uid()))));
