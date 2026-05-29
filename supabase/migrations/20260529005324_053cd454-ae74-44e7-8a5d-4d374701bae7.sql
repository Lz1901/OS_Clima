-- Add is_super_admin to profiles
ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Finance Categories
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.financial_categories (company_id);

-- Financial Transactions
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  categoria_id UUID NOT NULL REFERENCES public.financial_categories(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  recorrencia TEXT CHECK (recorrencia IN ('mensal', 'anual', 'avulso')),
  comprovante_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.financial_transactions (company_id);
CREATE INDEX ON public.financial_transactions (data_vencimento);

-- Permissions System
CREATE TABLE public.permissions (
  id TEXT PRIMARY KEY, -- e.g. 'clientes.view', 'pmoc.create'
  nome TEXT NOT NULL,
  descricao TEXT,
  modulo TEXT NOT NULL -- 'clientes', 'pmoc', 'financeiro', etc.
);

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role, permission_id)
);

-- Seed Initial Permissions
INSERT INTO public.permissions (id, nome, modulo) VALUES
  ('clientes.view', 'Visualizar Clientes', 'clientes'),
  ('clientes.manage', 'Gerenciar Clientes', 'clientes'),
  ('unidades.manage', 'Gerenciar Unidades', 'clientes'),
  ('equipamentos.manage', 'Gerenciar Equipamentos', 'equipamentos'),
  ('pmoc.view', 'Visualizar PMOCs', 'pmoc'),
  ('pmoc.create', 'Criar/Executar PMOC', 'pmoc'),
  ('pmoc.manage', 'Gerenciar PMOCs (Admin)', 'pmoc'),
  ('financeiro.view', 'Visualizar Financeiro', 'financeiro'),
  ('financeiro.manage', 'Gerenciar Transações', 'financeiro'),
  ('relatorios.view', 'Visualizar Relatórios', 'relatorios'),
  ('configuracoes.manage', 'Gerenciar Empresa', 'configuracoes');

-- Seed Role Permissions (Default mappings)
INSERT INTO public.role_permissions (role, permission_id) VALUES
  ('admin', 'clientes.view'), ('admin', 'clientes.manage'), ('admin', 'unidades.manage'), ('admin', 'equipamentos.manage'), 
  ('admin', 'pmoc.view'), ('admin', 'pmoc.create'), ('admin', 'pmoc.manage'), ('admin', 'financeiro.view'), 
  ('admin', 'financeiro.manage'), ('admin', 'relatorios.view'), ('admin', 'configuracoes.manage'),
  ('tecnico', 'clientes.view'), ('tecnico', 'pmoc.view'), ('tecnico', 'pmoc.create'), ('tecnico', 'equipamentos.manage'),
  ('financeiro', 'financeiro.view'), ('financeiro', 'financeiro.manage'), ('financeiro', 'relatorios.view'),
  ('supervisor', 'clientes.view'), ('supervisor', 'pmoc.view'), ('supervisor', 'relatorios.view');

-- Update RLS for Finance
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions are viewable by all authenticated users
CREATE POLICY "View permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "View role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Finance Policies
CREATE POLICY "tenant financial_categories" ON public.financial_categories FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant financial_transactions" ON public.financial_transactions FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Update helper functions to be more robust
CREATE OR REPLACE FUNCTION public.check_user_permission(_user_id UUID, _permission_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND rp.permission_id = _permission_id
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND is_super_admin = true
  );
$$;

-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, TEXT) TO authenticated;

-- Grant access to new tables
GRANT ALL ON public.financial_categories TO authenticated, service_role;
GRANT ALL ON public.financial_transactions TO authenticated, service_role;
GRANT ALL ON public.permissions TO authenticated, service_role;
GRANT ALL ON public.role_permissions TO authenticated, service_role;

-- Add updated_at triggers to new tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Super Admin Bypass for existing policies
-- Note: We need to recreate policies to include the bypass if we want total control.
-- For now, let's keep it simple and ensure the 'check_user_permission' can be used in the app.

-- Audit Logs for Finance and Config
CREATE OR REPLACE FUNCTION public.log_financial_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (company_id, user_id, acao, entidade, entidade_id, detalhes)
  VALUES (
    NEW.company_id,
    auth.uid(),
    TG_OP,
    'financial_transaction',
    NEW.id,
    jsonb_build_object('tipo', NEW.tipo, 'valor', NEW.valor, 'descricao', NEW.descricao)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_financial_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_transaction();
