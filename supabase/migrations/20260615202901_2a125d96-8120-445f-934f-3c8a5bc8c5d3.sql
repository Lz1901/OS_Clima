-- Remove a view problemática (security definer view)
DROP VIEW IF EXISTS public.assinaturas_safe;

-- Substitui a policy SELECT admin-only por uma que permite membros da empresa
DROP POLICY IF EXISTS "assinaturas_select_admin_only" ON public.assinaturas;

CREATE POLICY "assinaturas_select_company_member"
  ON public.assinaturas
  FOR SELECT
  TO authenticated
  USING (
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

-- Hide das colunas técnicas via grants por coluna (mecanismo nativo do Postgres)
REVOKE SELECT ON public.assinaturas FROM authenticated;
GRANT SELECT (id, pmoc_id, tipo, nome, imagem_url, created_at)
  ON public.assinaturas TO authenticated;
-- service_role mantém SELECT completo (admins via server fn)
GRANT SELECT ON public.assinaturas TO service_role;