-- Fix security for newly created and existing functions
REVOKE EXECUTE ON FUNCTION public.check_user_permission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_financial_transaction() FROM PUBLIC, authenticated;
-- Only the system/trigger needs to execute this, but triggers run as the owner of the function (SECURITY DEFINER)
-- so we don't need to grant execute to authenticated.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated;

-- Ensure previously created functions are also secure
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
