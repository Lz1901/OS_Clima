
-- 1. Add status columns to companies
DO $$ BEGIN
  CREATE TYPE public.company_status AS ENUM ('ativa', 'suspensa', 'bloqueada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status public.company_status NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS block_reason text;

-- 2. Helper: is the user's company active?
CREATE OR REPLACE FUNCTION public.is_company_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c.status = 'ativa'
       FROM public.profiles p
       JOIN public.companies c ON c.id = p.company_id
      WHERE p.id = _user_id LIMIT 1),
    false
  );
$$;

-- 3. Allow Super Admin to delete companies and insert new ones
DROP POLICY IF EXISTS "super admin insert companies" ON public.companies;
CREATE POLICY "super admin insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin delete companies" ON public.companies;
CREATE POLICY "super admin delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Allow Super Admin to view profiles globally (for admin panel listing users)
-- Existing "profiles view" already allows when is_super_admin
