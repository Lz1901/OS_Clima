-- 1) Remover policy unificada atual
DROP POLICY IF EXISTS "pmoc_related_access_assinaturas" ON public.assinaturas;

-- 2) INSERT: qualquer membro autenticado da empresa dona da PMOC (mantém fluxo de coleta de assinatura)
CREATE POLICY "assinaturas_insert_company_member"
  ON public.assinaturas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pmocs p
      WHERE p.id = assinaturas.pmoc_id
        AND (
          (p.company_id = public.get_user_company_id(auth.uid())
           AND public.is_company_active(auth.uid()))
          OR public.is_super_admin(auth.uid())
        )
    )
  );

-- 3) SELECT direto na tabela base: apenas admin da empresa ou super admin (dados técnicos sensíveis)
CREATE POLICY "assinaturas_select_admin_only"
  ON public.assinaturas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pmocs p
      WHERE p.id = assinaturas.pmoc_id
        AND (
          (p.company_id = public.get_user_company_id(auth.uid())
           AND public.is_company_active(auth.uid())
           AND public.has_role(auth.uid(), 'admin'::app_role, public.get_user_company_id(auth.uid())))
          OR public.is_super_admin(auth.uid())
        )
    )
  );

-- 4) UPDATE/DELETE: apenas admin ou super admin
CREATE POLICY "assinaturas_modify_admin_only"
  ON public.assinaturas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pmocs p
      WHERE p.id = assinaturas.pmoc_id
        AND (
          (p.company_id = public.get_user_company_id(auth.uid())
           AND public.has_role(auth.uid(), 'admin'::app_role, public.get_user_company_id(auth.uid())))
          OR public.is_super_admin(auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pmocs p
      WHERE p.id = assinaturas.pmoc_id
        AND (
          (p.company_id = public.get_user_company_id(auth.uid())
           AND public.has_role(auth.uid(), 'admin'::app_role, public.get_user_company_id(auth.uid())))
          OR public.is_super_admin(auth.uid())
        )
    )
  );

CREATE POLICY "assinaturas_delete_admin_only"
  ON public.assinaturas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pmocs p
      WHERE p.id = assinaturas.pmoc_id
        AND (
          (p.company_id = public.get_user_company_id(auth.uid())
           AND public.has_role(auth.uid(), 'admin'::app_role, public.get_user_company_id(auth.uid())))
          OR public.is_super_admin(auth.uid())
        )
    )
  );

-- 5) View segura para consultas gerais (sem ip/device)
--    security_invoker = true: respeita RLS da tabela base.
--    Como SELECT na base agora só permite admin, adicionamos um filtro próprio
--    que permite membros da mesma empresa lerem campos não sensíveis.
DROP VIEW IF EXISTS public.assinaturas_safe;
CREATE VIEW public.assinaturas_safe
WITH (security_invoker = false) AS
SELECT
  a.id,
  a.pmoc_id,
  a.tipo,
  a.nome,
  a.imagem_url,
  a.created_at
FROM public.assinaturas a
WHERE EXISTS (
  SELECT 1 FROM public.pmocs p
  WHERE p.id = a.pmoc_id
    AND (
      (p.company_id = public.get_user_company_id(auth.uid())
       AND public.is_company_active(auth.uid()))
      OR public.is_super_admin(auth.uid())
    )
);

ALTER VIEW public.assinaturas_safe SET (security_invoker = false);
REVOKE ALL ON public.assinaturas_safe FROM PUBLIC, anon;
GRANT SELECT ON public.assinaturas_safe TO authenticated;
GRANT ALL ON public.assinaturas_safe TO service_role;