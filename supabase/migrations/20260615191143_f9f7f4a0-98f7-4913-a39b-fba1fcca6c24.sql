INSERT INTO public.permissions (id, nome, descricao, modulo) VALUES
  ('financeiro.create', 'Criar transações financeiras', 'Permite cadastrar novas receitas e despesas', 'financeiro'),
  ('financeiro.edit', 'Editar transações financeiras', 'Permite alterar status e dados de receitas e despesas', 'financeiro'),
  ('financeiro.delete', 'Excluir transações financeiras', 'Permite excluir receitas e despesas', 'financeiro')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  modulo = EXCLUDED.modulo;

INSERT INTO public.role_permissions (role, permission_id) VALUES
  ('admin', 'financeiro.create'),
  ('admin', 'financeiro.edit'),
  ('admin', 'financeiro.delete'),
  ('financeiro', 'financeiro.create'),
  ('financeiro', 'financeiro.edit'),
  ('financeiro', 'financeiro.delete')
ON CONFLICT (role, permission_id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

DROP POLICY IF EXISTS "financial_transactions_role_scoped" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_select" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_insert" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_update" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_delete" ON public.financial_transactions;

CREATE POLICY "financial_transactions_select"
ON public.financial_transactions
FOR SELECT
TO authenticated
USING (
  (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(auth.uid())
    AND (
      public.check_user_permission(auth.uid(), 'financeiro.view')
      OR public.check_user_permission(auth.uid(), 'financeiro.manage')
      OR public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    )
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "financial_transactions_insert"
ON public.financial_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(auth.uid())
    AND (
      public.check_user_permission(auth.uid(), 'financeiro.create')
      OR public.check_user_permission(auth.uid(), 'financeiro.manage')
      OR public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    )
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "financial_transactions_update"
ON public.financial_transactions
FOR UPDATE
TO authenticated
USING (
  (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(auth.uid())
    AND (
      public.check_user_permission(auth.uid(), 'financeiro.edit')
      OR public.check_user_permission(auth.uid(), 'financeiro.manage')
      OR public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    )
  )
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(auth.uid())
    AND (
      public.check_user_permission(auth.uid(), 'financeiro.edit')
      OR public.check_user_permission(auth.uid(), 'financeiro.manage')
      OR public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    )
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "financial_transactions_delete"
ON public.financial_transactions
FOR DELETE
TO authenticated
USING (
  (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(auth.uid())
    AND (
      public.check_user_permission(auth.uid(), 'financeiro.delete')
      OR public.check_user_permission(auth.uid(), 'financeiro.manage')
      OR public.has_role(auth.uid(), 'admin'::public.app_role, public.get_user_company_id(auth.uid()))
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role, public.get_user_company_id(auth.uid()))
    )
  )
  OR public.is_super_admin(auth.uid())
);