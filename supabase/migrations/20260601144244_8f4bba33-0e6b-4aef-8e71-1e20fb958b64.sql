
-- Enforce is_company_active() across all tenant-scoped RLS policies.
-- Super admin remains exempt.

-- activity_logs
DROP POLICY IF EXISTS "tenant_access_activity_logs" ON public.activity_logs;
CREATE POLICY "tenant_access_activity_logs" ON public.activity_logs FOR ALL TO authenticated
  USING ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))
  WITH CHECK ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "tenant insert logs" ON public.activity_logs;
CREATE POLICY "tenant insert logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid()));

-- assinaturas
DROP POLICY IF EXISTS "pmoc_related_access_assinaturas" ON public.assinaturas;
CREATE POLICY "pmoc_related_access_assinaturas" ON public.assinaturas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM pmocs p WHERE p.id = assinaturas.pmoc_id
    AND ((p.company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))));

-- checklist_items
DROP POLICY IF EXISTS "checklist_items_access" ON public.checklist_items;
CREATE POLICY "checklist_items_access" ON public.checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM checklist_templates t WHERE t.id = checklist_items.template_id
    AND ((t.company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))));

-- checklist_templates
DROP POLICY IF EXISTS "tenant_access_checklist_templates" ON public.checklist_templates;
CREATE POLICY "tenant_access_checklist_templates" ON public.checklist_templates FOR ALL TO authenticated
  USING ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))
  WITH CHECK ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "tenant all templates" ON public.checklist_templates;
CREATE POLICY "tenant all templates" ON public.checklist_templates FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid()));

-- clientes
DROP POLICY IF EXISTS "tenant_access_clientes" ON public.clientes;
CREATE POLICY "tenant_access_clientes" ON public.clientes FOR ALL TO authenticated
  USING ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))
  WITH CHECK ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

-- companies: own view/update still requires active (super admin exempt)
DROP POLICY IF EXISTS "company view" ON public.companies;
CREATE POLICY "company view" ON public.companies FOR SELECT TO authenticated
  USING (id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "company update" ON public.companies;
CREATE POLICY "company update" ON public.companies FOR UPDATE TO authenticated
  USING (((id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

-- equipamento_fotos
DROP POLICY IF EXISTS "tenant_access_equipamento_fotos" ON public.equipamento_fotos;
CREATE POLICY "tenant_access_equipamento_fotos" ON public.equipamento_fotos FOR ALL TO authenticated
  USING ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))
  WITH CHECK ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

-- equipamentos
DROP POLICY IF EXISTS "tenant_access_equipamentos" ON public.equipamentos;
CREATE POLICY "tenant_access_equipamentos" ON public.equipamentos FOR ALL TO authenticated
  USING ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))
  WITH CHECK ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

-- financial_categories
DROP POLICY IF EXISTS "financial_categories_role_scoped" ON public.financial_categories;
CREATE POLICY "financial_categories_role_scoped" ON public.financial_categories FOR ALL TO authenticated
  USING (((company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))) OR is_super_admin(auth.uid()))
  WITH CHECK (((company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))) OR is_super_admin(auth.uid()));

-- financial_transactions
DROP POLICY IF EXISTS "financial_transactions_role_scoped" ON public.financial_transactions;
CREATE POLICY "financial_transactions_role_scoped" ON public.financial_transactions FOR ALL TO authenticated
  USING (((company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))) OR is_super_admin(auth.uid()))
  WITH CHECK (((company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))) OR is_super_admin(auth.uid()));

-- notificacoes
DROP POLICY IF EXISTS "notificacoes_select_user_scoped" ON public.notificacoes;
CREATE POLICY "notificacoes_select_user_scoped" ON public.notificacoes FOR SELECT TO authenticated
  USING (((company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid()) AND ((user_id IS NULL) OR (user_id = auth.uid()))) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "notificacoes_modify_admin_or_self" ON public.notificacoes;
CREATE POLICY "notificacoes_modify_admin_or_self" ON public.notificacoes FOR ALL TO authenticated
  USING (((company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid()) AND ((user_id IS NULL) OR (user_id = auth.uid()) OR has_role(auth.uid(),'admin'::app_role))) OR is_super_admin(auth.uid()))
  WITH CHECK (((company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid()) AND ((user_id IS NULL) OR (user_id = auth.uid()) OR has_role(auth.uid(),'admin'::app_role))) OR is_super_admin(auth.uid()));

-- pmoc_equipamentos
DROP POLICY IF EXISTS "pmoc_related_access_pmoc_equipamentos" ON public.pmoc_equipamentos;
CREATE POLICY "pmoc_related_access_pmoc_equipamentos" ON public.pmoc_equipamentos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM pmocs p WHERE p.id = pmoc_equipamentos.pmoc_id
    AND ((p.company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))));

-- pmoc_fotos
DROP POLICY IF EXISTS "pmoc_related_access_pmoc_fotos" ON public.pmoc_fotos;
CREATE POLICY "pmoc_related_access_pmoc_fotos" ON public.pmoc_fotos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM pmocs p WHERE p.id = pmoc_fotos.pmoc_id
    AND ((p.company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))));

-- pmoc_respostas
DROP POLICY IF EXISTS "pmoc_related_access_pmoc_respostas" ON public.pmoc_respostas;
CREATE POLICY "pmoc_related_access_pmoc_respostas" ON public.pmoc_respostas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM pmocs p WHERE p.id = pmoc_respostas.pmoc_id
    AND ((p.company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))));

-- pmocs
DROP POLICY IF EXISTS "tenant_access_pmocs" ON public.pmocs;
CREATE POLICY "tenant_access_pmocs" ON public.pmocs FOR ALL TO authenticated
  USING ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))
  WITH CHECK ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

-- unidades
DROP POLICY IF EXISTS "tenant_access_unidades" ON public.unidades;
CREATE POLICY "tenant_access_unidades" ON public.unidades FOR ALL TO authenticated
  USING ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))
  WITH CHECK ((company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "view company roles" ON public.user_roles;
CREATE POLICY "view company roles" ON public.user_roles FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid()));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid()) AND has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_company_active(auth.uid()) AND has_role(auth.uid(),'admin'::app_role));

-- profiles: keep readable so login flow works; updates require active
DROP POLICY IF EXISTS "update own profile (no escalation)" ON public.profiles;
CREATE POLICY "update own profile (no escalation)" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND is_company_active(auth.uid()))
  WITH CHECK (
    id = auth.uid()
    AND is_super_admin = (SELECT p.is_super_admin FROM profiles p WHERE p.id = auth.uid())
    AND company_id = (SELECT p.company_id FROM profiles p WHERE p.id = auth.uid())
  );
