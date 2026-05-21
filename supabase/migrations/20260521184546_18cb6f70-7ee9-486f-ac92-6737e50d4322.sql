
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'tecnico', 'financeiro', 'supervisor');
CREATE TYPE public.unidade_tipo AS ENUM ('matriz', 'filial', 'loja', 'escritorio', 'condominio');
CREATE TYPE public.equipamento_tipo AS ENUM ('split', 'cassete', 'piso_teto', 'vrf', 'fan_coil', 'chiller', 'janela');
CREATE TYPE public.equipamento_status AS ENUM ('ativo', 'inativo', 'manutencao', 'defeito');
CREATE TYPE public.pmoc_status AS ENUM ('pendente', 'em_andamento', 'finalizado', 'aguardando_aprovacao', 'cancelado');
CREATE TYPE public.checklist_field_type AS ENUM ('checkbox', 'texto', 'numero', 'selecao', 'foto', 'observacao');

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  logo_url TEXT,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  crea TEXT,
  responsavel_tecnico TEXT,
  assinatura_url TEXT,
  cor_primaria TEXT DEFAULT '#2563eb',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  endereco TEXT,
  responsavel TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.clientes (company_id);

-- ============ UNIDADES ============
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo public.unidade_tipo NOT NULL DEFAULT 'matriz',
  nome TEXT NOT NULL,
  endereco TEXT,
  responsavel_local TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.unidades (cliente_id);
CREATE INDEX ON public.unidades (company_id);

-- ============ EQUIPAMENTOS ============
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  tipo public.equipamento_tipo NOT NULL DEFAULT 'split',
  marca TEXT,
  modelo TEXT,
  btus INTEGER,
  numero_serie TEXT,
  patrimonio TEXT,
  localizacao TEXT,
  tensao TEXT,
  gas_refrigerante TEXT,
  data_instalacao DATE,
  status public.equipamento_status NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.equipamentos (unidade_id);
CREATE INDEX ON public.equipamentos (company_id);

CREATE TABLE public.equipamento_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.equipamento_fotos (equipamento_id);

-- ============ CHECKLIST ============
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.checklist_templates (company_id);

CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  categoria TEXT,
  label TEXT NOT NULL,
  tipo_campo public.checklist_field_type NOT NULL DEFAULT 'checkbox',
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  opcoes JSONB,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.checklist_items (template_id);

-- ============ PMOC ============
CREATE TABLE public.pmocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  numero TEXT,
  status public.pmoc_status NOT NULL DEFAULT 'pendente',
  data_agendada DATE,
  data_inicio TIMESTAMPTZ,
  data_finalizacao TIMESTAMPTZ,
  observacoes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pmocs (company_id);
CREATE INDEX ON public.pmocs (cliente_id);
CREATE INDEX ON public.pmocs (status);

CREATE TABLE public.pmoc_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmoc_id UUID NOT NULL REFERENCES public.pmocs(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pmoc_id, equipamento_id)
);

CREATE TABLE public.pmoc_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmoc_id UUID NOT NULL REFERENCES public.pmocs(id) ON DELETE CASCADE,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  valor TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pmoc_respostas (pmoc_id);

CREATE TABLE public.pmoc_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmoc_id UUID NOT NULL REFERENCES public.pmocs(id) ON DELETE CASCADE,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmoc_id UUID NOT NULL REFERENCES public.pmocs(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cliente','tecnico')),
  nome TEXT NOT NULL,
  imagem_url TEXT NOT NULL,
  ip TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ NOTIFICACOES & LOGS ============
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notificacoes (company_id, user_id);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id UUID,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.activity_logs (company_id);

-- ============ TRIGGER updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['companies','profiles','clientes','unidades','equipamentos','checklist_templates','pmocs'])
  LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
  END LOOP;
END $$;

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  v_company_name TEXT;
  v_nome TEXT;
  v_default_template UUID;
BEGIN
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

  INSERT INTO public.companies (nome, email) VALUES (v_company_name, NEW.email) RETURNING id INTO new_company_id;
  INSERT INTO public.profiles (id, company_id, nome, email) VALUES (NEW.id, new_company_id, v_nome, NEW.email);
  INSERT INTO public.user_roles (user_id, company_id, role) VALUES (NEW.id, new_company_id, 'admin');

  -- Checklist padrão
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
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ENABLE RLS ============
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamento_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmoc_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmoc_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmoc_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- companies
CREATE POLICY "company members view" ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));
CREATE POLICY "admins update company" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "view own company profiles" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- user_roles
CREATE POLICY "view company roles" ON public.user_roles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Generic tenant policies via DO block
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['clientes','unidades','equipamentos','equipamento_fotos','checklist_templates','pmocs','pmoc_equipamentos','pmoc_respostas','pmoc_fotos','assinaturas','notificacoes','activity_logs'])
  LOOP
    -- pmoc_* and assinaturas don't have company_id directly, handle separately
    NULL;
  END LOOP;
END $$;

-- Tables with direct company_id
CREATE POLICY "tenant all clientes" ON public.clientes FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant all unidades" ON public.unidades FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant all equipamentos" ON public.equipamentos FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant all equipamento_fotos" ON public.equipamento_fotos FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant all templates" ON public.checklist_templates FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant all checklist_items" ON public.checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.company_id = public.get_user_company_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.company_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "tenant all pmocs" ON public.pmocs FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant all pmoc_equipamentos" ON public.pmoc_equipamentos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "tenant all pmoc_respostas" ON public.pmoc_respostas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "tenant all pmoc_fotos" ON public.pmoc_fotos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "tenant all assinaturas" ON public.assinaturas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pmocs p WHERE p.id = pmoc_id AND p.company_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "tenant all notificacoes" ON public.notificacoes FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "tenant view logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "tenant insert logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('logos', 'logos', true),
  ('equipamentos', 'equipamentos', true),
  ('pmoc-fotos', 'pmoc-fotos', true),
  ('assinaturas', 'assinaturas', true),
  ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload/manage in their company "folder" (first path segment = company_id)
CREATE POLICY "auth read all buckets" ON storage.objects FOR SELECT TO public
  USING (bucket_id IN ('logos','equipamentos','pmoc-fotos','assinaturas','pdfs'));

CREATE POLICY "auth upload to company folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('logos','equipamentos','pmoc-fotos','assinaturas','pdfs')
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

CREATE POLICY "auth update own company files" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('logos','equipamentos','pmoc-fotos','assinaturas','pdfs')
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

CREATE POLICY "auth delete own company files" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('logos','equipamentos','pmoc-fotos','assinaturas','pdfs')
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );
