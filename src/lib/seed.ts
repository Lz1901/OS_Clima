import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData(companyId: string, userId: string) {
  // 1. Cliente
  const { data: cliente } = await supabase.from("clientes").insert({
    company_id: companyId,
    razao_social: "Shopping Center Demo",
    nome_fantasia: "Shopping Demo",
    cnpj: "00.000.000/0001-00",
    endereco: "Av. das Palmeiras, 1000",
    email: "manutencao@shoppingdemo.com",
    responsavel: "Carlos Gerente",
  }).select().single();

  if (!cliente) return;

  // 2. Unidade
  const { data: unidade } = await supabase.from("unidades").insert({
    company_id: companyId,
    cliente_id: cliente.id,
    nome: "Bloco A - Praça de Alimentação",
    endereco: "Piso L3",
    tipo: "filial",
  }).select().single();

  if (!unidade) return;

  // 3. Equipamentos
  const { data: eq1 } = await supabase.from("equipamentos").insert({
    company_id: companyId,
    unidade_id: unidade.id,
    tipo: "split",
    marca: "Daikin",
    modelo: "Inverter 12000",
    btus: 12000,
    localizacao: "Restaurante 1",
    status: "ativo",
  }).select().single();

  const { data: eq2 } = await supabase.from("equipamentos").insert({
    company_id: companyId,
    unidade_id: unidade.id,
    tipo: "cassete",
    marca: "Carrier",
    modelo: "Cassete 36000",
    btus: 36000,
    localizacao: "Área Comum",
    status: "ativo",
  }).select().single();

  // 4. PMOC (Finalizado)
  const { data: template } = await supabase.from("checklist_templates").select("id").eq("company_id", companyId).limit(1).single();
  if (!template) return;

  const { data: pmoc } = await supabase.from("pmocs").insert({
    company_id: companyId,
    cliente_id: cliente.id,
    unidade_id: unidade.id,
    template_id: template.id,
    tecnico_id: userId,
    numero: "DEMO-001",
    status: "finalizado",
    data_inicio: new Date(Date.now() - 86400000).toISOString(),
    data_finalizacao: new Date().toISOString(),
    observacoes: "Manutenção preventiva realizada conforme cronograma.",
  }).select().single();

  if (!pmoc) return;

  // 5. Vincular equipamentos
  await supabase.from("pmoc_equipamentos").insert([
    { pmoc_id: pmoc.id, equipamento_id: eq1!.id },
    { pmoc_id: pmoc.id, equipamento_id: eq2!.id },
  ]);

  // 6. Financeiro
  const { data: cats } = await supabase.from("financial_categories").select("id, tipo").eq("company_id", companyId);
  if (cats) {
    const receitaCat = cats.find(c => c.tipo === 'receita');
    const despesaCat = cats.find(c => c.tipo === 'despesa');

    if (receitaCat && despesaCat) {
      await supabase.from("financial_transactions").insert([
        {
          company_id: companyId,
          cliente_id: cliente.id,
          categoria_id: receitaCat.id,
          tipo: 'receita',
          descricao: 'Mensalidade Contrato Shopping',
          valor: 2500.00,
          data_vencimento: new Date().toISOString().split('T')[0],
          status: 'pago',
          data_pagamento: new Date().toISOString()
        },
        {
          company_id: companyId,
          categoria_id: despesaCat.id,
          tipo: 'despesa',
          descricao: 'Combustível Frota',
          valor: 450.00,
          data_vencimento: new Date().toISOString().split('T')[0],
          status: 'pago',
          data_pagamento: new Date().toISOString()
        }
      ]);
    }
  }

  return true;
}