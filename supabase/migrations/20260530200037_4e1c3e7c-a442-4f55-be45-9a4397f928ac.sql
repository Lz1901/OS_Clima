
DO $$
DECLARE
  r record;
  fks text[][] := ARRAY[
    ['pmocs','company_id','companies','id','CASCADE'],
    ['pmocs','cliente_id','clientes','id','SET NULL'],
    ['pmocs','unidade_id','unidades','id','SET NULL'],
    ['pmocs','template_id','checklist_templates','id','SET NULL'],
    ['pmocs','tecnico_id','profiles','id','SET NULL'],
    ['pmocs','pmoc_origem_id','pmocs','id','SET NULL'],
    ['unidades','company_id','companies','id','CASCADE'],
    ['unidades','cliente_id','clientes','id','CASCADE'],
    ['equipamentos','company_id','companies','id','CASCADE'],
    ['equipamentos','unidade_id','unidades','id','CASCADE'],
    ['clientes','company_id','companies','id','CASCADE'],
    ['checklist_templates','company_id','companies','id','CASCADE'],
    ['checklist_items','template_id','checklist_templates','id','CASCADE'],
    ['pmoc_equipamentos','pmoc_id','pmocs','id','CASCADE'],
    ['pmoc_equipamentos','equipamento_id','equipamentos','id','CASCADE'],
    ['pmoc_respostas','pmoc_id','pmocs','id','CASCADE'],
    ['pmoc_respostas','item_id','checklist_items','id','CASCADE'],
    ['pmoc_respostas','equipamento_id','equipamentos','id','SET NULL'],
    ['pmoc_fotos','pmoc_id','pmocs','id','CASCADE'],
    ['pmoc_fotos','equipamento_id','equipamentos','id','SET NULL'],
    ['assinaturas','pmoc_id','pmocs','id','CASCADE'],
    ['equipamento_fotos','equipamento_id','equipamentos','id','CASCADE'],
    ['equipamento_fotos','company_id','companies','id','CASCADE'],
    ['profiles','company_id','companies','id','CASCADE'],
    ['user_roles','company_id','companies','id','CASCADE'],
    ['notificacoes','company_id','companies','id','CASCADE'],
    ['financial_transactions','company_id','companies','id','CASCADE'],
    ['financial_transactions','cliente_id','clientes','id','SET NULL'],
    ['financial_transactions','categoria_id','financial_categories','id','RESTRICT'],
    ['financial_categories','company_id','companies','id','CASCADE'],
    ['activity_logs','company_id','companies','id','CASCADE']
  ];
  i int;
  cname text;
BEGIN
  FOR i IN 1 .. array_length(fks,1) LOOP
    cname := fks[i][1] || '_' || fks[i][2] || '_fkey';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = cname AND conrelid = ('public.'||fks[i][1])::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE %s',
        fks[i][1], cname, fks[i][2], fks[i][3], fks[i][4], fks[i][5]
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
