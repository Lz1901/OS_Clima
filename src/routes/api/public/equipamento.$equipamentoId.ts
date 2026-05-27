import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/equipamento/$equipamentoId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.equipamentoId;
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response(JSON.stringify({ error: "invalid_id" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: eq } = await supabaseAdmin
          .from("equipamentos")
          .select(
            "id, marca, modelo, tipo, numero_serie, localizacao, status, data_instalacao, btus, gas_refrigerante, company_id, unidade_id"
          )
          .eq("id", id)
          .maybeSingle();

        if (!eq) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const [{ data: company }, { data: unidade }, { data: history }] = await Promise.all([
          supabaseAdmin
            .from("companies")
            .select("nome, cor_primaria, logo_url, telefone, email, crea, responsavel_tecnico")
            .eq("id", eq.company_id)
            .maybeSingle(),
          supabaseAdmin
            .from("unidades")
            .select("nome, endereco, clientes(razao_social, nome_fantasia)")
            .eq("id", eq.unidade_id)
            .maybeSingle(),
          supabaseAdmin
            .from("pmoc_equipamentos")
            .select("pmocs(id, numero, status, data_finalizacao, data_inicio, pdf_url)")
            .eq("equipamento_id", id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        const historico = (history ?? [])
          .map((r: any) => r.pmocs)
          .filter(Boolean)
          .sort((a: any, b: any) =>
            String(b.data_finalizacao ?? b.data_inicio ?? "").localeCompare(
              String(a.data_finalizacao ?? a.data_inicio ?? "")
            )
          );

        return new Response(
          JSON.stringify({ eq, company, unidade, historico }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=30",
            },
          }
        );
      },
    },
  },
});
