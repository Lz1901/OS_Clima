import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Snowflake, ShieldCheck, Wrench, FileText, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { equipamentoTipoLabel, formatDate, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/validar/$equipamentoId")({
  component: ValidarPage,
});

function ValidarPage() {
  const { equipamentoId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["validar", equipamentoId],
    queryFn: async () => {
      const res = await fetch(`/api/public/equipamento/${equipamentoId}`);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data?.eq) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-xl font-bold mb-2">Equipamento não encontrado</h1>
          <p className="text-sm text-muted-foreground">
            O QR Code lido pode ser inválido ou ter expirado.
          </p>
        </Card>
      </div>
    );
  }

  const { eq, company, unidade, historico } = data as any;
  const ultima = historico?.[0];
  const finalizadas = (historico ?? []).filter((h: any) => h.status === "finalizado");

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2 text-center">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-10" />
          ) : (
            <Snowflake className="h-8 w-8 text-primary" />
          )}
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
              <h2 className="font-bold">
                {eq.marca} {eq.modelo}
              </h2>
              <p className="text-sm text-muted-foreground">{equipamentoTipoLabel[eq.tipo]}</p>
              {eq.numero_serie && (
                <p className="text-xs text-muted-foreground">S/N: {eq.numero_serie}</p>
              )}
            </div>
            <Badge>{statusLabel[eq.status]}</Badge>
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Cliente" value={unidade?.clientes?.razao_social} />
            <Row label="Unidade" value={unidade?.nome} />
            <Row label="Endereço" value={unidade?.endereco} />
            <Row label="Localização" value={eq.localizacao} />
            <Row label="Capacidade" value={eq.btus ? `${eq.btus.toLocaleString("pt-BR")} BTUs` : null} />
            <Row label="Gás" value={eq.gas_refrigerante} />
            <Row label="Instalado em" value={formatDate(eq.data_instalacao)} />
          </div>

          {ultima ? (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-1">Última manutenção</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">PMOC #{ultima.numero}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(ultima.data_finalizacao ?? ultima.data_inicio)} ·{" "}
                    {statusLabel[ultima.status]}
                  </p>
                </div>
                {ultima.pdf_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={ultima.pdf_url} target="_blank" rel="noreferrer">
                      <FileText className="h-3 w-3 mr-1" /> PDF
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
              Nenhuma manutenção PMOC registrada ainda.
            </div>
          )}
        </Card>

        {finalizadas.length > 1 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Histórico de manutenções</h3>
              <Badge variant="secondary" className="ml-auto">
                {finalizadas.length}
              </Badge>
            </div>
            <ol className="relative border-l border-border ml-2 space-y-3">
              {finalizadas.map((h: any) => (
                <li key={h.id} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">PMOC #{h.numero}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.data_finalizacao ?? h.data_inicio)}
                      </p>
                    </div>
                    {h.pdf_url && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={h.pdf_url} target="_blank" rel="noreferrer">
                          <FileText className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {(company?.telefone || company?.email) && (
          <Card className="p-4 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Contato da empresa responsável</p>
            {company.responsavel_tecnico && <p>Resp. Téc.: {company.responsavel_tecnico}</p>}
            {company.crea && <p>CREA: {company.crea}</p>}
            {company.telefone && <p>{company.telefone}</p>}
            {company.email && <p>{company.email}</p>}
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Página pública de validação · Powered by PMOC Pro
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
