export const formatDate = (d?: string | Date | null) => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
};

export const formatDateTime = (d?: string | Date | null) => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR");
};

export const formatCNPJ = (v?: string | null) => {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
};

export const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  aguardando_aprovacao: "Aguardando aprovação",
  cancelado: "Cancelado",
  ativo: "Ativo",
  inativo: "Inativo",
  manutencao: "Em manutenção",
  defeito: "Com defeito",
};

export const equipamentoTipoLabel: Record<string, string> = {
  split: "Split",
  cassete: "Cassete",
  piso_teto: "Piso Teto",
  vrf: "VRF",
  fan_coil: "Fan Coil",
  chiller: "Chiller",
  janela: "Janela",
};

export const unidadeTipoLabel: Record<string, string> = {
  matriz: "Matriz",
  filial: "Filial",
  loja: "Loja",
  escritorio: "Escritório",
  condominio: "Condomínio",
};

export const roleLabel: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  financeiro: "Financeiro",
  supervisor: "Supervisor",
};
