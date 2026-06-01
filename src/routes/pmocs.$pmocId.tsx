import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, Wrench, FileText, Mail, Loader2, Camera,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { SignaturePad, type SignatureResult } from "@/components/signature-pad";
import { formatDateTime, statusLabel, equipamentoTipoLabel } from "@/lib/format";
import { logActivity } from "@/lib/logs";
import { generatePmocPdf, uploadPmocPdf } from "@/lib/pdf";
import { getSignedUrl } from "@/lib/storage";
import { SignedImage, SignedLinkButton } from "@/components/signed-file";
import { calcNext as calcNextDate } from "./pmocs";

export const Route = createFileRoute("/pmocs/$pmocId")({
  component: () => (
    <AppLayout>
      <PmocWizard />
    </AppLayout>
  ),
});

type Resposta = { valor: string | null; foto_url?: string | null };

function PmocWizard() {
  const { pmocId } = Route.useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedEquipIds, setSelectedEquipIds] = useState<Set<string>>(new Set());
  // respostas[equipamentoId][itemId] = { valor, foto_url }
  const [respostas, setRespostas] = useState<Record<string, Record<string, Resposta>>>({});
  const [obs, setObs] = useState("");
  const [tecnicoSig, setTecnicoSig] = useState<SignatureResult | null>(null);
  const [clienteSig, setClienteSig] = useState<SignatureResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: pmoc, isLoading } = useQuery({
    queryKey: ["pmoc", pmocId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pmocs")
        .select("*, clientes(*), unidades(*), checklist_templates(id, nome)")
        .eq("id", pmocId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["template-items", pmoc?.template_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("template_id", pmoc!.template_id!)
        .order("ordem");
      return data ?? [];
    },
    enabled: !!pmoc?.template_id,
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ["equip-unidade", pmoc?.unidade_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipamentos")
        .select("*")
        .eq("unidade_id", pmoc!.unidade_id!)
        .order("created_at");
      return data ?? [];
    },
    enabled: !!pmoc?.unidade_id,
  });

  // Load existing PMOC data (for resuming in-progress PMOCs)
  const { data: existing } = useQuery({
    queryKey: ["pmoc-existing", pmocId],
    queryFn: async () => {
      const [{ data: eqs }, { data: resps }] = await Promise.all([
        supabase.from("pmoc_equipamentos").select("equipamento_id").eq("pmoc_id", pmocId),
        supabase.from("pmoc_respostas").select("equipamento_id, item_id, valor, foto_url").eq("pmoc_id", pmocId),
      ]);
      return { eqs: eqs ?? [], resps: resps ?? [] };
    },
    enabled: !!pmoc && (pmoc as any).status === "em_andamento",
  });

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!existing || hydrated) return;
    if (existing.eqs.length > 0) {
      setSelectedEquipIds(new Set(existing.eqs.map((e: any) => e.equipamento_id)));
    }
    if (existing.resps.length > 0) {
      const next: Record<string, Record<string, Resposta>> = {};
      for (const r of existing.resps as any[]) {
        if (!r.equipamento_id) continue;
        next[r.equipamento_id] = next[r.equipamento_id] ?? {};
        next[r.equipamento_id][r.item_id] = { valor: r.valor, foto_url: r.foto_url };
      }
      setRespostas(next);
    }
    if (pmoc && (pmoc as any).observacoes) setObs((pmoc as any).observacoes);
    setHydrated(true);
  }, [existing, hydrated, pmoc]);

  const selectedEquips = useMemo(
    () => (equipamentos as any[]).filter((e) => selectedEquipIds.has(e.id)),
    [equipamentos, selectedEquipIds]
  );

  const setResposta = (equipId: string, itemId: string, valor: string | null, foto_url?: string | null) => {
    setRespostas((prev) => ({
      ...prev,
      [equipId]: { ...(prev[equipId] ?? {}), [itemId]: { valor, foto_url: foto_url ?? prev[equipId]?.[itemId]?.foto_url ?? null } },
    }));
  };

  const uploadFoto = async (equipId: string, itemId: string, file: File) => {
    const path = `${profile!.company_id}/${pmocId}/${equipId}-${itemId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("pmoc-fotos").upload(path, file);
    if (error) { toast.error("Falha no upload"); return; }
    // Store the storage path; signed URL is minted on demand for display/PDF.
    setResposta(equipId, itemId, respostas[equipId]?.[itemId]?.valor ?? null, path);
    toast.success("Foto anexada");
  };

  // Persist current progress without finalizing (auto-save / resume support)
  const saveProgress = async (opts?: { silent?: boolean }) => {
    try {
      await supabase.from("pmoc_equipamentos").delete().eq("pmoc_id", pmocId);
      await supabase.from("pmoc_respostas").delete().eq("pmoc_id", pmocId);
      const eqRows = selectedEquips.map((e) => ({ pmoc_id: pmocId, equipamento_id: e.id }));
      if (eqRows.length) await supabase.from("pmoc_equipamentos").insert(eqRows);
      const respRows: any[] = [];
      for (const equipId of selectedEquipIds) {
        for (const item of items as any[]) {
          const r = respostas[equipId]?.[item.id];
          if (r?.valor == null && !r?.foto_url) continue;
          respRows.push({
            pmoc_id: pmocId,
            equipamento_id: equipId,
            item_id: item.id,
            valor: r?.valor ?? null,
            foto_url: r?.foto_url ?? null,
          });
        }
      }
      if (respRows.length) await supabase.from("pmoc_respostas").insert(respRows);
      await supabase.from("pmocs").update({ observacoes: obs }).eq("id", pmocId);
      if (!opts?.silent) toast.success("Progresso salvo");
    } catch (e: any) {
      if (!opts?.silent) toast.error("Falha ao salvar progresso");
    }
  };

  const finalize = async () => {
    if (!tecnicoSig || !clienteSig) { toast.error("Ambas as assinaturas são obrigatórias"); return; }
    setSubmitting(true);
    try {
      // Persist equipamentos + respostas (replace any drafts)
      await supabase.from("pmoc_equipamentos").delete().eq("pmoc_id", pmocId);
      await supabase.from("pmoc_respostas").delete().eq("pmoc_id", pmocId);
      const eqRows = selectedEquips.map((e) => ({ pmoc_id: pmocId, equipamento_id: e.id }));
      if (eqRows.length) await supabase.from("pmoc_equipamentos").insert(eqRows);

      const respRows: any[] = [];
      for (const equipId of selectedEquipIds) {
        for (const item of items as any[]) {
          const r = respostas[equipId]?.[item.id];
          respRows.push({
            pmoc_id: pmocId,
            equipamento_id: equipId,
            item_id: item.id,
            valor: r?.valor ?? null,
            foto_url: r?.foto_url ?? null,
          });
        }
      }
      if (respRows.length) await supabase.from("pmoc_respostas").insert(respRows);

      // upload assinaturas
      const uploadSig = async (sig: SignatureResult, tipo: string) => {
        const blob = await (await fetch(sig.dataUrl)).blob();
        const path = `${profile!.company_id}/${pmocId}/${tipo}-${Date.now()}.png`;
        await supabase.storage.from("assinaturas").upload(path, blob, { contentType: "image/png", upsert: true });
        // Store path; PDF generator and viewers mint signed URLs on demand.
        return path;
      };
      const tecnicoUrl = await uploadSig(tecnicoSig, "tecnico");
      const clienteUrl = await uploadSig(clienteSig, "cliente");
      await supabase.from("assinaturas").insert([
        { pmoc_id: pmocId, tipo: "tecnico", nome: tecnicoSig.nome, imagem_url: tecnicoUrl, device: navigator.userAgent.slice(0, 200) },
        { pmoc_id: pmocId, tipo: "cliente", nome: clienteSig.nome, imagem_url: clienteUrl, device: navigator.userAgent.slice(0, 200) },
      ]);

      // gerar PDF
      const { data: company } = await supabase.from("companies").select("*").eq("id", profile!.company_id).single();
      const pdf = await generatePmocPdf({
        company: company as any,
        pmoc: { ...(pmoc as any), data_inicio: pmoc?.data_inicio ?? new Date().toISOString(), data_finalizacao: new Date().toISOString(), observacoes: obs },
        cliente: (pmoc as any).clientes,
        unidade: (pmoc as any).unidades,
        tecnico: { nome: profile!.nome, email: profile!.email },
        equipamentos: selectedEquips.map((eq) => ({
          id: eq.id,
          marca: eq.marca, modelo: eq.modelo, tipo: equipamentoTipoLabel[eq.tipo] ?? eq.tipo,
          numero_serie: eq.numero_serie, localizacao: eq.localizacao,
          respostas: (items as any[]).map((it) => ({
            label: it.label, categoria: it.categoria, tipo_campo: it.tipo_campo,
            valor: respostas[eq.id]?.[it.id]?.valor ?? null,
            foto_url: respostas[eq.id]?.[it.id]?.foto_url ?? null,
          })),
        })),
        assinaturas: [
          { tipo: "tecnico", nome: tecnicoSig.nome, imagem_url: tecnicoUrl },
          { tipo: "cliente", nome: clienteSig.nome, imagem_url: clienteUrl },
        ],
      });
      const pdfUrl = await uploadPmocPdf(pmocId, profile!.company_id, pdf);

      await supabase.from("pmocs").update({
        status: "finalizado",
        data_finalizacao: new Date().toISOString(),
        observacoes: obs,
        pdf_url: pdfUrl,
      }).eq("id", pmocId);

      // Atualizar status dos equipamentos conforme as respostas
      for (const eqId of selectedEquipIds) {
        const temErro = Object.values(respostas[eqId] ?? {}).some(r => r.valor === "false");
        if (temErro) {
          await supabase.from("equipamentos").update({ status: "manutencao" }).eq("id", eqId);
        } else {
          await supabase.from("equipamentos").update({ status: "ativo" }).eq("id", eqId);
        }
      }

      // RECORRÊNCIA: cria automaticamente a próxima PMOC se houver periodicidade
      const periodicidade = (pmoc as any).periodicidade as string | null;
      if (periodicidade) {
        const baseISO = new Date().toISOString().slice(0, 10);
        const proxima = calcNextDate(baseISO, periodicidade);
        const proximaDepois = calcNextDate(proxima, periodicidade);
        const ano = new Date().getFullYear();
        const novoNumero = `${ano}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const { data: novo } = await supabase.from("pmocs").insert({
          company_id: profile!.company_id,
          cliente_id: (pmoc as any).cliente_id,
          unidade_id: (pmoc as any).unidade_id,
          template_id: (pmoc as any).template_id,
          tecnico_id: (pmoc as any).tecnico_id,
          data_agendada: proxima,
          periodicidade,
          proxima_execucao: proximaDepois,
          pmoc_origem_id: pmocId,
          numero: novoNumero,
          status: "pendente",
        } as any).select().single();
        if (novo) {
          await supabase.from("notificacoes").insert({
            company_id: profile!.company_id,
            tipo: "pmoc_agendada",
            titulo: `Próxima PMOC agendada`,
            mensagem: `PMOC #${novoNumero} agendada para ${proxima}`,
            link: `/pmocs/${novo.id}`,
          });
        }
      }

      await supabase.from("notificacoes").insert({
        company_id: profile!.company_id,
        tipo: "pmoc_finalizada",
        titulo: `PMOC ${(pmoc as any).numero ?? ""} finalizada`,
        mensagem: `Concluída em ${(pmoc as any).unidades?.nome}`,
        link: `/pmocs/${pmocId}`,
      });

      await logActivity(profile!.company_id, "finalizou", "pmoc", pmocId, { equipamentos: selectedEquips.length });

      qc.invalidateQueries({ queryKey: ["pmoc", pmocId] });
      qc.invalidateQueries({ queryKey: ["pmocs"] });
      toast.success("PMOC finalizada com sucesso!");
      setStep(4);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao finalizar");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !pmoc) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const isFinalized = (pmoc as any).status === "finalizado";

  if (isFinalized || step === 4) return <FinalizedView pmoc={pmoc} onBack={() => nav({ to: "/pmocs" })} />;

  const steps = ["Equipamentos", "Checklist", "Assinaturas", "Confirmar"];
  const progress = ((step + 1) / steps.length) * 100;

  // start pmoc on first interaction
  const ensureStarted = async () => {
    if ((pmoc as any).status === "pendente") {
      await supabase.from("pmocs").update({ status: "em_andamento", data_inicio: new Date().toISOString() }).eq("id", pmocId);
      qc.invalidateQueries({ queryKey: ["pmoc", pmocId] });
    }
  };

  const isResuming = (pmoc as any).status === "em_andamento" && hydrated &&
    (selectedEquipIds.size > 0 || Object.keys(respostas).length > 0);

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/pmocs" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          {step > 0 && step < 3 && (
            <Button variant="outline" size="sm" onClick={() => saveProgress()}>
              Salvar rascunho
            </Button>
          )}
          <Badge variant="secondary">{statusLabel[(pmoc as any).status]}</Badge>
        </div>
      </div>

      {isResuming && (
        <Card className="p-3 mb-4 bg-primary/5 border-primary/20 text-sm flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary" />
          <span>Retomando PMOC em andamento — seu progresso anterior foi carregado.</span>
        </Card>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">PMOC #{(pmoc as any).numero}</h1>
        <p className="text-sm text-muted-foreground">
          {(pmoc as any).clientes?.razao_social} · {(pmoc as any).unidades?.nome}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Progress value={progress} className="flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">Passo {step + 1}/{steps.length}</span>
        </div>
        <div className="flex gap-2 mt-2 text-xs flex-wrap">
          {steps.map((s, i) => (
            <span key={s} className={i <= step ? "text-primary font-medium" : "text-muted-foreground"}>{s}</span>
          ))}
        </div>
      </div>

      {step === 0 && (
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Selecione os equipamentos a inspecionar</h2>
          {(equipamentos as any[]).length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Nenhum equipamento cadastrado nesta unidade.</p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/equipamentos">Ir para Equipamentos</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">{selectedEquipIds.size} selecionado(s)</span>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => {
                  if (selectedEquipIds.size === (equipamentos as any[]).length) setSelectedEquipIds(new Set());
                  else setSelectedEquipIds(new Set((equipamentos as any[]).map(e => e.id)));
                }}>
                  {selectedEquipIds.size === (equipamentos as any[]).length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              </div>
              {(equipamentos as any[]).map((e) => (
                <label key={e.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <Checkbox
                    checked={selectedEquipIds.has(e.id)}
                    onCheckedChange={(v) => {
                      const next = new Set(selectedEquipIds);
                      if (v) next.add(e.id); else next.delete(e.id);
                      setSelectedEquipIds(next);
                    }}
                  />
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{e.marca} {e.modelo}</p>
                    <p className="text-xs text-muted-foreground">{equipamentoTipoLabel[e.tipo]} · {e.localizacao ?? "—"}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={async () => { await ensureStarted(); setStep(1); }} disabled={selectedEquipIds.size === 0}>
              Continuar ({selectedEquipIds.size})
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {selectedEquips.map((eq) => (
            <Card key={eq.id} className="p-4">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                <Wrench className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{eq.marca} {eq.modelo}</h3>
                <Badge variant="outline">{equipamentoTipoLabel[eq.tipo]}</Badge>
              </div>
              <div className="space-y-3">
                {(items as any[]).map((it) => {
                  const r = respostas[eq.id]?.[it.id];
                  return (
                    <div key={it.id} className="flex flex-col gap-2 p-3 rounded-md bg-accent/30">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {it.label} {it.obrigatorio && <span className="text-destructive">*</span>}
                          </p>
                          {it.categoria && <p className="text-xs text-muted-foreground">{it.categoria}</p>}
                        </div>
                      </div>
                      {it.tipo_campo === "checkbox" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant={r?.valor === "true" ? "default" : "outline"}
                            onClick={() => setResposta(eq.id, it.id, "true")}>OK</Button>
                          <Button size="sm" variant={r?.valor === "false" ? "destructive" : "outline"}
                            onClick={() => setResposta(eq.id, it.id, "false")}>Não OK</Button>
                        </div>
                      )}
                      {it.tipo_campo === "numero" && (
                        <Input type="number" step="0.1" placeholder="Valor"
                          value={r?.valor ?? ""} onChange={(e) => setResposta(eq.id, it.id, e.target.value)} />
                      )}
                      {(it.tipo_campo === "observacao" || it.tipo_campo === "texto") && (
                        <Textarea rows={2} placeholder="Observação"
                          value={r?.valor ?? ""} onChange={(e) => setResposta(eq.id, it.id, e.target.value)} />
                      )}
                      <div className="flex items-center gap-2">
                        <label className="text-xs cursor-pointer inline-flex items-center gap-1 text-primary hover:underline">
                          <Camera className="h-3 w-3" />
                          {r?.foto_url ? "Trocar foto" : "Anexar foto"}
                          <input type="file" accept="image/*" capture="environment" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFoto(eq.id, it.id, f); }} />
                        </label>
                        {r?.foto_url && (
                          <SignedLinkButton bucket="pmoc-fotos" pathOrUrl={r.foto_url}>
                            <SignedImage bucket="pmoc-fotos" pathOrUrl={r.foto_url} className="h-10 w-10 object-cover rounded border" />
                          </SignedLinkButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
            <Button onClick={() => setStep(2)}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="p-4 space-y-6">
          <h2 className="font-semibold">Assinaturas</h2>
          <SignaturePad label="Técnico responsável" initialName={profile?.nome ?? ""} onChange={setTecnicoSig} />
          <SignaturePad label="Responsável pelo cliente" onChange={setClienteSig} />
          <div className="space-y-2">
            <Label>Observações gerais</Label>
            <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações finais sobre o serviço..." />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={!tecnicoSig || !clienteSig}>Revisar</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
          <h2 className="font-semibold text-lg">Tudo pronto para finalizar</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>{selectedEquips.length} equipamento(s) inspecionado(s)</p>
            <p>Assinado por {tecnicoSig?.nome} (técnico) e {clienteSig?.nome} (cliente)</p>
            <p>Um PDF será gerado e ficará disponível para download/envio.</p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>Voltar</Button>
            <Button onClick={finalize} disabled={submitting}>
              {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF...</>) : "Finalizar PMOC"}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

function FinalizedView({ pmoc, onBack }: { pmoc: any; onBack: () => void }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [to, setTo] = useState(pmoc.clientes?.email ?? "");
  const [extra, setExtra] = useState("");

  const sendEmail = () => {
    if (!to) { toast.error("Informe o e-mail do destinatário"); return; }
    const cliente = pmoc.clientes?.razao_social ?? "";
    const subject = encodeURIComponent(`PMOC ${pmoc.numero ?? ""} — ${cliente}`);
    const body = encodeURIComponent(
      `Olá,\n\nSegue o relatório PMOC concluído em ${formatDateTime(pmoc.data_finalizacao)}.\n\n` +
      `Link do relatório (PDF):\n${pmoc.pdf_url}\n\n` +
      (extra ? `${extra}\n\n` : "") +
      `Atenciosamente.`
    );
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  };

  const copyLink = async () => {
    if (!pmoc.pdf_url) return;
    await navigator.clipboard.writeText(pmoc.pdf_url);
    toast.success("Link copiado");
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
      <Card className="p-8 text-center">
        <CheckCircle2 className="h-16 w-16 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-bold">PMOC #{pmoc.numero} finalizada</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {pmoc.clientes?.razao_social} · {pmoc.unidades?.nome}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Finalizada em {formatDateTime(pmoc.data_finalizacao)}
        </p>
        <div className="flex justify-center gap-2 mt-6 flex-wrap">
          {pmoc.pdf_url && (
            <Button asChild>
              <a href={pmoc.pdf_url} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4 mr-2" /> Baixar PDF
              </a>
            </Button>
          )}
          {pmoc.pdf_url && (
            <Button variant="outline" onClick={() => setEmailOpen(true)}>
              <Mail className="h-4 w-4 mr-2" /> Enviar por e-mail
            </Button>
          )}
          {pmoc.pdf_url && (
            <Button variant="outline" onClick={copyLink}>
              Copiar link do PDF
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/pmocs">Ver todas as PMOCs</Link>
          </Button>
        </div>

        {emailOpen && (
          <div className="mt-6 text-left border-t pt-6 max-w-md mx-auto space-y-3">
            <div>
              <Label htmlFor="to">Destinatário</Label>
              <Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="cliente@empresa.com" />
            </div>
            <div>
              <Label htmlFor="extra">Mensagem adicional (opcional)</Label>
              <Textarea id="extra" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEmailOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={sendEmail}>
                <Mail className="h-4 w-4 mr-2" /> Abrir e-mail
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Abre seu cliente de e-mail padrão com tudo pré-preenchido (assunto, destinatário e link do PDF).
            </p>
          </div>
        )}
      </Card>
    </>
  );
}

