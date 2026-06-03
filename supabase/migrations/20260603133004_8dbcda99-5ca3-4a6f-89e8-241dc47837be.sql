-- 1) profiles view: add is_company_active check
DROP POLICY IF EXISTS "profiles view" ON public.profiles;
CREATE POLICY "profiles view" ON public.profiles
FOR SELECT TO authenticated
USING (
  ((company_id = public.get_user_company_id(auth.uid())) AND public.is_company_active(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

-- 2) companies update: scope has_role to company
DROP POLICY IF EXISTS "company update" ON public.companies;
CREATE POLICY "company update" ON public.companies
FOR UPDATE TO authenticated
USING (
  ((id = public.get_user_company_id(auth.uid()))
    AND public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
    AND public.is_company_active(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

-- 3) financial_categories: scope role check to company
DROP POLICY IF EXISTS "financial_categories_role_scoped" ON public.financial_categories;
CREATE POLICY "financial_categories_role_scoped" ON public.financial_categories
FOR ALL TO authenticated
USING (
  ((company_id = public.get_user_company_id(auth.uid()))
    AND public.is_company_active(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    ))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  ((company_id = public.get_user_company_id(auth.uid()))
    AND public.is_company_active(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    ))
  OR public.is_super_admin(auth.uid())
);

-- 4) financial_transactions: scope role check to company
DROP POLICY IF EXISTS "financial_transactions_role_scoped" ON public.financial_transactions;
CREATE POLICY "financial_transactions_role_scoped" ON public.financial_transactions
FOR ALL TO authenticated
USING (
  ((company_id = public.get_user_company_id(auth.uid()))
    AND public.is_company_active(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    ))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  ((company_id = public.get_user_company_id(auth.uid()))
    AND public.is_company_active(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    ))
  OR public.is_super_admin(auth.uid())
);

-- 5) notificacoes: scope admin role to company
DROP POLICY IF EXISTS "notificacoes_modify_admin_or_self" ON public.notificacoes;
CREATE POLICY "notificacoes_modify_admin_or_self" ON public.notificacoes
FOR ALL TO authenticated
USING (
  ((company_id = public.get_user_company_id(auth.uid()))
    AND public.is_company_active(auth.uid())
    AND (
      user_id IS NULL OR user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
    ))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  ((company_id = public.get_user_company_id(auth.uid()))
    AND public.is_company_active(auth.uid())
    AND (
      user_id IS NULL OR user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
    ))
  OR public.is_super_admin(auth.uid())
);

-- 6) user_roles admins manage: scope to company
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (
  (company_id = public.get_user_company_id(auth.uid()))
  AND public.is_company_active(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
)
WITH CHECK (
  (company_id = public.get_user_company_id(auth.uid()))
  AND public.is_company_active(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
);