import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  companyId: string,
  acao: string,
  entidade: string,
  entidadeId?: string,
  detalhes?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("activity_logs").insert({
    company_id: companyId,
    user_id: user?.id,
    acao,
    entidade,
    entidade_id: entidadeId,
    detalhes: detalhes ?? {},
  });
}
