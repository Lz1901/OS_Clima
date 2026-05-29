-- Helper to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT is_super_admin FROM public.profiles WHERE id = _user_id;
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

-- companies
DROP POLICY IF EXISTS "company members view" ON public.companies;
DROP POLICY IF EXISTS "company view" ON public.companies;
CREATE POLICY "company view" ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "admins update company" ON public.companies;
DROP POLICY IF EXISTS "company update" ON public.companies;
CREATE POLICY "company update" ON public.companies FOR UPDATE TO authenticated
  USING ((id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "view own company profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles view" ON public.profiles;
CREATE POLICY "profiles view" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Tables WITH company_id
DO $$
DECLARE
  t TEXT;
  policies TEXT[] := ARRAY['clientes', 'unidades', 'equipamentos', 'equipamento_fotos', 'checklist_templates', 'pmocs', 'notificacoes', 'activity_logs', 'financial_categories', 'financial_transactions'];
BEGIN
  FOR t IN SELECT unnest(policies)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant all %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant view logs" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_access_%I" ON public.%I', t, t);

    EXECUTE format('CREATE POLICY "tenant_access_%I" ON public.%I FOR ALL TO authenticated 
      USING (company_id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()))
      WITH CHECK (company_id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()))', t, t);
  END LOOP;
END $$;

-- Tables WITHOUT company_id (Child tables)
-- checklist_items
DROP POLICY IF EXISTS "tenant all checklist_items" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_access" ON public.checklist_items;
CREATE POLICY "checklist_items_access" ON public.checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND (t.company_id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()))));

-- pmoc child tables
DO $$
DECLARE
  t TEXT;
  policies TEXT[] := ARRAY['pmoc_equipamentos', 'pmoc_respostas', 'pmoc_fotos', 'assinaturas'];
BEGIN
  FOR t IN SELECT unnest(policies)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant all %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "pmoc_related_access_%I" ON public.%I', t, t);
    
    EXECUTE format('CREATE POLICY "pmoc_related_access_%I" ON public.%I FOR ALL TO authenticated 
      USING (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND (p.company_id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()))))', t, t);
  END LOOP;
END $$;
