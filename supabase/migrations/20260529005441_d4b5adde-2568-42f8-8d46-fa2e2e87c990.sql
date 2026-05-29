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

  -- Default Financial Categories
  INSERT INTO public.financial_categories (company_id, nome, tipo, cor) VALUES
    (new_company_id, 'Contrato PMOC', 'receita', '#22c55e'),
    (new_company_id, 'Instalação', 'receita', '#10b981'),
    (new_company_id, 'Manutenção Avulsa', 'receita', '#3b82f6'),
    (new_company_id, 'Salários', 'despesa', '#ef4444'),
    (new_company_id, 'Combustível', 'despesa', '#f97316'),
    (new_company_id, 'Ferramentas', 'despesa', '#64748b'),
    (new_company_id, 'Peças', 'despesa', '#8b5cf6'),
    (new_company_id, 'Aluguel', 'despesa', '#ec4899');

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
