DROP POLICY IF EXISTS "checklist_items_access" ON public.checklist_items;
CREATE POLICY "checklist_items_access" ON public.checklist_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.checklist_templates t
  WHERE t.id = checklist_items.template_id
    AND (((t.company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.checklist_templates t
  WHERE t.id = checklist_items.template_id
    AND (((t.company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))));

DROP POLICY IF EXISTS "pmoc_related_access_pmoc_respostas" ON public.pmoc_respostas;
CREATE POLICY "pmoc_related_access_pmoc_respostas" ON public.pmoc_respostas
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.pmocs p
  WHERE p.id = pmoc_respostas.pmoc_id
    AND (((p.company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.pmocs p
  WHERE p.id = pmoc_respostas.pmoc_id
    AND (((p.company_id = get_user_company_id(auth.uid())) AND is_company_active(auth.uid())) OR is_super_admin(auth.uid()))));