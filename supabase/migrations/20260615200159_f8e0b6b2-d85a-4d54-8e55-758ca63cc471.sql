
-- 1) Remove broad storage policies that bypass is_company_active()
DROP POLICY IF EXISTS "auth upload to company folder" ON storage.objects;
DROP POLICY IF EXISTS "auth update own company files" ON storage.objects;
DROP POLICY IF EXISTS "auth delete own company files" ON storage.objects;

-- 2) Add bucket-specific INSERT/UPDATE/DELETE policies for logos and equipamentos
DO $$ BEGIN
  -- logos
  CREATE POLICY "logos_insert_company" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'logos'
      AND (is_super_admin(auth.uid()) OR (
        (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
        AND is_company_active(auth.uid())
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "logos_update_company" ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'logos'
      AND (is_super_admin(auth.uid()) OR (
        (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
        AND is_company_active(auth.uid())
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "logos_delete_company" ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'logos'
      AND (is_super_admin(auth.uid()) OR (
        (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
        AND is_company_active(auth.uid())
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- equipamentos
DO $$ BEGIN
  CREATE POLICY "equipamentos_insert_company" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'equipamentos'
      AND (is_super_admin(auth.uid()) OR (
        (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
        AND is_company_active(auth.uid())
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "equipamentos_update_company" ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'equipamentos'
      AND (is_super_admin(auth.uid()) OR (
        (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
        AND is_company_active(auth.uid())
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "equipamentos_delete_company" ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'equipamentos'
      AND (is_super_admin(auth.uid()) OR (
        (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
        AND is_company_active(auth.uid())
      ))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) pending_invites: explicit restrictive deny for INSERT/UPDATE/DELETE by authenticated users
-- Only service_role (server-side) may create or modify invites.
DO $$ BEGIN
  CREATE POLICY "pending_invites_no_client_insert" ON public.pending_invites
    AS RESTRICTIVE FOR INSERT TO authenticated, anon
    WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pending_invites_no_client_update" ON public.pending_invites
    AS RESTRICTIVE FOR UPDATE TO authenticated, anon
    USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pending_invites_no_client_delete" ON public.pending_invites
    AS RESTRICTIVE FOR DELETE TO authenticated, anon
    USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
