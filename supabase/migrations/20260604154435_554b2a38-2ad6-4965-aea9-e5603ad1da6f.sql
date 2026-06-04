
-- 1) Pending invites table to validate company membership on signup
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_invites_email_idx ON public.pending_invites (lower(email));

GRANT SELECT ON public.pending_invites TO authenticated;
GRANT ALL ON public.pending_invites TO service_role;

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- Only admins of the inviting company can view their own pending invites
DROP POLICY IF EXISTS "company admins read own invites" ON public.pending_invites;
CREATE POLICY "company admins read own invites" ON public.pending_invites
FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.is_company_active(auth.uid())
  AND public.has_role(auth.uid(), 'admin', public.get_user_company_id(auth.uid()))
);

-- Writes happen exclusively via service_role (server functions). No INSERT/UPDATE/DELETE policies for authenticated.

-- 2) Harden handle_new_user: never trust user-supplied invited_company_id/role.
--    Use pending_invites instead.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id UUID;
  v_company_name TEXT;
  v_nome TEXT;
  v_default_template UUID;
  v_invite RECORD;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

  -- Look up a valid pending invite for this email (server-side, not user-controlled)
  SELECT * INTO v_invite
  FROM public.pending_invites
  WHERE lower(email) = lower(NEW.email)
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, company_id, nome, email)
    VALUES (NEW.id, v_invite.company_id, v_nome, NEW.email);
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_invite.company_id, v_invite.role);
    UPDATE public.pending_invites SET used_at = now() WHERE id = v_invite.id;
    RETURN NEW;
  END IF;

  -- Standard self-signup: create a new company and seed defaults
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
  INSERT INTO public.companies (nome, email) VALUES (v_company_name, NEW.email) RETURNING id INTO new_company_id;
  INSERT INTO public.profiles (id, company_id, nome, email) VALUES (NEW.id, new_company_id, v_nome, NEW.email);
  INSERT INTO public.user_roles (user_id, company_id, role) VALUES (NEW.id, new_company_id, 'admin');

  INSERT INTO public.financial_categories (company_id, nome, tipo, cor) VALUES
    (new_company_id, 'Contrato PMOC', 'receita', '#22c55e'),
    (new_company_id, 'Instalação', 'receita', '#10b981'),
    (new_company_id, 'Manutenção Avulsa', 'receita', '#3b82f6'),
    (new_company_id, 'Salários', 'despesa', '#ef4444'),
    (new_company_id, 'Combustível', 'despesa', '#f97316'),
    (new_company_id, 'Ferramentas', 'despesa', '#64748b'),
    (new_company_id, 'Peças', 'despesa', '#8b5cf6'),
    (new_company_id, 'Aluguel', 'despesa', '#ec4899');

  INSERT INTO public.checklist_templates (company_id, nome, descricao)
  VALUES (new_company_id, 'Checklist PMOC Padrão', 'Itens padrão de manutenção preventiva')
  RETURNING id INTO v_default_template;

  INSERT INTO public.checklist_items (template_id, categoria, label, tipo_campo, obrigatorio, ordem) VALUES
    (v_default_template, 'Limpeza', 'Limpeza dos filtros', 'checkbox', true, 1),
    (v_default_template, 'Limpeza', 'Higienização da evaporadora', 'checkbox', true, 2),
    (v_default_template, 'Limpeza', 'Higienização da condensadora', 'checkbox', true, 3),
    (v_default_template, 'Verificação', 'Verificação do dreno', 'checkbox', true, 4),
    (v_default_template, 'Elétrica', 'Verificação elétrica', 'checkbox', true, 5),
    (v_default_template, 'Refrigeração', 'Verificação de pressão', 'checkbox', true, 6),
    (v_default_template, 'Refrigeração', 'Verificação de vazamentos', 'checkbox', true, 7),
    (v_default_template, 'Medição', 'Medição de corrente elétrica (A)', 'numero', false, 8),
    (v_default_template, 'Medição', 'Temperatura de insuflamento (°C)', 'numero', false, 9),
    (v_default_template, 'Medição', 'Temperatura de retorno (°C)', 'numero', false, 10),
    (v_default_template, 'Verificação', 'Verificação de ruídos', 'checkbox', false, 11),
    (v_default_template, 'Estrutura', 'Fixação do suporte', 'checkbox', false, 12),
    (v_default_template, 'Teste', 'Teste de funcionamento geral', 'checkbox', true, 13),
    (v_default_template, 'Observações', 'Observações gerais', 'observacao', false, 14);

  RETURN NEW;
END;
$function$;

-- 3) Drop the insecure single-argument has_role overload (callable via RPC).
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
