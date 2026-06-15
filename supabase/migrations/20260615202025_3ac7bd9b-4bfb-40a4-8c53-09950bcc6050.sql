-- Hardening: revoke EXECUTE from PUBLIC/anon on SECURITY DEFINER functions.
-- Keep authenticated + service_role; triggers run regardless of EXECUTE grant.

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_company_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_active(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_user_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_permission(uuid, text) TO authenticated, service_role;

-- Trigger-only functions: no app-level callers; lock down to owner/service_role.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.log_financial_transaction() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_financial_transaction() TO service_role;

REVOKE EXECUTE ON FUNCTION public.prevent_company_status_self_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_company_status_self_update() TO service_role;