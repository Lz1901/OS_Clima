
-- 1) Profiles: bloquear auto-promoção a super admin
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own profile (no escalation)"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_super_admin = (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND company_id = (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2) Companies: impedir mass-assignment de status/suspended_at/block_reason por admins comuns
CREATE OR REPLACE FUNCTION public.prevent_company_status_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
       OR NEW.block_reason IS DISTINCT FROM OLD.block_reason THEN
      RAISE EXCEPTION 'Somente Super Admin pode alterar status, suspensão ou bloqueio da empresa';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_company_status_self_update ON public.companies;
CREATE TRIGGER trg_prevent_company_status_self_update
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.prevent_company_status_self_update();

-- 3) Notificações: escopo por usuário
DROP POLICY IF EXISTS "tenant_access_notificacoes" ON public.notificacoes;

CREATE POLICY "notificacoes_select_user_scoped"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "notificacoes_modify_admin_or_self"
  ON public.notificacoes FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id(auth.uid())
     AND (user_id IS NULL OR user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    (company_id = public.get_user_company_id(auth.uid())
     AND (user_id IS NULL OR user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)))
    OR public.is_super_admin(auth.uid())
  );

-- 4) Financeiro: requer cargo admin ou financeiro
DROP POLICY IF EXISTS "tenant financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "tenant_access_financial_transactions" ON public.financial_transactions;
CREATE POLICY "financial_transactions_role_scoped"
  ON public.financial_transactions FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id(auth.uid())
     AND (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'financeiro'::app_role)))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    (company_id = public.get_user_company_id(auth.uid())
     AND (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'financeiro'::app_role)))
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "tenant financial_categories" ON public.financial_categories;
DROP POLICY IF EXISTS "tenant_access_financial_categories" ON public.financial_categories;
CREATE POLICY "financial_categories_role_scoped"
  ON public.financial_categories FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id(auth.uid())
     AND (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'financeiro'::app_role)))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    (company_id = public.get_user_company_id(auth.uid())
     AND (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'financeiro'::app_role)))
    OR public.is_super_admin(auth.uid())
  );

-- 5) has_role com escopo opcional de empresa (sobrecarga)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND company_id = _company_id
  );
$$;

-- 6) Revogar EXECUTE público e de anon nas funções de segurança
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_user_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_company_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_company_status_self_update() FROM PUBLIC, anon, authenticated;
