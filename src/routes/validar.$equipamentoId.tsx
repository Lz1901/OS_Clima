import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Snowflake, ShieldCheck, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { equipamentoTipoLabel, formatDate, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/validar/$equipamentoId")({
  component: ValidarPage,
});

function ValidarPage() {
  const { equipamentoId } = Route.useParams();
  const [notFound, setNotFound] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["validar", equipamentoId],
    queryFn: async () => {
      const { data: eq } = await supabase
        .from("equipamentos")
        .select("marca, modelo, tipo, numero_serie, localizacao, status, data_instalacao, company_id, unidade_id")
        .eq("id", equipamentoId)
        .maybeSingle();
      if (!eq) return null;
      const [{ data: company }, { data: unidade }, { data: ultima }] = await Promise.all([
        supabase.from("companies").select("nome, cor_primaria, logo_url").eq("id", eq.company_id).maybeSingle(),
        supabase.from("unidades").select("nome, clientes(razao_social)").eq("id", eq.unidade_id).maybeSingle(),
        supabase.from("pmoc_equipamentos")
          .select("pmocs(numero, data_finalizacao, status)")
          .eq("equipamento_id", equipamentoId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      return { eq, company, unidade, ultima: ultima?.[0]?.pmocs };
    },
  });

  useEffect(() => { if (!isLoading && !data) setNotFound(true); }, [isLoading, data]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="p-8 text-center max-w-md">
        <h1 className="text-xl font-bold mb-2">Equipamento não encontrado</h1>
        <p className="text-sm text-muted-foreground">O QR Code lido pode ser inválido ou ter expirado.</p>
      </Card>
    </div>
  );

  const { eq, company, unidade, ultima }: any = data!;

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2 text-center">
          {company?.logo_url
            ? <img src={company.logo_url} alt="" className="h-10" />
            : <Snowflake className="h-8 w-8 text-primary" />}
          <h1 className="text-xl font-bold">{company?.nome ?? "PMOC Pro"}</h1>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold">Validação de equipamento</span>
          </div>

          <div className="flex items-start gap-3 mb-4 pb-4 border-b">
            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wrench className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold">{eq.marca} {eq.modelo}</h2>
              <p className="text-sm text-muted-foreground">{equipamentoTipoLabel[eq.tipo]}</p>
              {eq.numero_serie && <p className="text-xs text-muted-foreground">S/N: {eq.numero_serie}</p>}
            </div>
            <Badge>{statusLabel[eq.status]}</Badge>
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Cliente" value={unidade?.clientes?.razao_social} />
            <Row label="Unidade" value={unidade?.nome} />
            <Row label="Localização" value={eq.localizacao} />
            <Row label="Instalado em" value={formatDate(eq.data_instalacao)} />
          </div>

          {ultima ? (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-1">Última manutenção registrada</p>
              <p className="font-semibold">PMOC #{ultima.numero}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(ultima.data_finalizacao)} · {statusLabel[ultima.status]}
              </p>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
              Nenhuma manutenção PMOC registrada ainda.
            </div>
          )}
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Página pública de validação · Powered by PMOC Pro
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
