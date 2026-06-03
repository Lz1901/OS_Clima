-- Restrict role_permissions writes to super admins (it's a global table)
DROP POLICY IF EXISTS "admins manage role_permissions" ON public.role_permissions;

CREATE POLICY "super_admins manage role_permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));