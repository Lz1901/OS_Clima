-- Hardening: defesa em profundidade na função check_user_permission.
-- Restringe a verificação de permissões apenas a roles da própria empresa do usuário.
-- Comportamento funcional permanece idêntico no fluxo atual (1 perfil = 1 empresa),
-- mas bloqueia uso cross-tenant caso surja, no futuro, qualquer row em user_roles
-- vinculada a outra empresa.

CREATE OR REPLACE FUNCTION public.check_user_permission(_user_id uuid, _permission_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission_id = _permission_id
      AND ur.company_id = public.get_user_company_id(_user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND is_super_admin = true
  );
$function$;
