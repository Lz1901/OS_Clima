import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, History, QrCode, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { equipamentoTipoLabel, formatDate, statusLabel } from "@/lib/format";
import { generateQrDataUrl, getEquipamentoValidationUrl } from "@/lib/qr";
import { SignedLinkButton } from "@/components/signed-file";

export const Route = createFileRoute("/equipamentos/$equipamentoId")({
  component: () => (
    <AppLayout>
      <EquipamentoDetail />
    </AppLayout>
  ),
});

function EquipamentoDetail() {
  const { equipamentoId } = Route.useParams();
  const nav = useNavigate();
  const [qr, setQr] = useState<string>("");

  const { data: eq } = useQuery({
    queryKey: ["equip-detail", equipamentoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipamentos")
        .select("*, unidades(nome, clientes(razao_social))")
        .eq("id", equipamentoId)
        .single();
      return data;
    },
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["equip-historico", equipamentoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pmoc_equipamentos")
        .select("pmocs(id, numero, status, data_finalizacao, pdf_url)")
        .eq("equipamento_id", equipamentoId);
      return data ?? [];
    },
  });

  useEffect(() => {
    generateQrDataUrl(getEquipamentoValidationUrl(equipamentoId), 220).then(setQr);
  }, [equipamentoId]);

  if (!eq) return null;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/equipamentos" })} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wrench className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{eq.marca} {eq.modelo}</h1>
                <p className="text-sm text-muted-foreground">{equipamentoTipoLabel[eq.tipo]} · {eq.btus ? `${eq.btus} BTUs` : "—"}</p>
              </div>
              <Badge>{statusLabel[eq.status]}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Info label="Cliente" value={(eq as any).unidades?.clientes?.razao_social} />
              <Info label="Unidade" value={(eq as any).unidades?.nome} />
              <Info label="Localização" value={eq.localizacao} />
              <Info label="N° série" value={eq.numero_serie} />
              <Info label="Patrimônio" value={eq.patrimonio} />
              <Info label="Tensão" value={eq.tensao} />
              <Info label="Gás" value={eq.gas_refrigerante} />
              <Info label="Instalação" value={formatDate(eq.data_instalacao)} />
            </div>
            {eq.observacoes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{eq.observacoes}</p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Histórico de manutenções</h2>
            </div>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma PMOC registrada para este equipamento.</p>
            ) : (
              <div className="divide-y">
                {(historico as any[]).map((h, i) => h.pmocs && (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">PMOC #{h.pmocs.numero}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.pmocs.data_finalizacao)} · {statusLabel[h.pmocs.status]}
                      </p>
                    </div>
                    {h.pmocs.pdf_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={h.pmocs.pdf_url} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">QR Code</h2>
          </div>
          {qr && (
            <>
              <img src={qr} alt="QR" className="w-full max-w-[220px] mx-auto rounded border" />
              <p className="text-xs text-muted-foreground text-center mt-2 break-all">
                {getEquipamentoValidationUrl(equipamentoId)}
              </p>
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <a href={qr} download={`qr-${eq.id}.png`}>
                  <Download className="h-3 w-3 mr-1" /> Baixar QR
                </a>
              </Button>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
