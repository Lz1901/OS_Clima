
-- 1) Remove duplicate ALL policy on checklist_templates
DROP POLICY IF EXISTS "tenant all templates" ON public.checklist_templates;

-- 2) Restrict admins from granting/revoking the 'admin' role directly via the table.
-- Server-side functions using the service role bypass RLS and remain the only path
-- to manage admin role assignments.
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

CREATE POLICY "admins manage non-admin roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role, company_id)
  AND role <> 'admin'::app_role
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role, company_id)
  AND role <> 'admin'::app_role
  AND company_id = public.get_user_company_id(auth.uid())
);
