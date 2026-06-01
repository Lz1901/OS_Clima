import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ClipboardCheck, FileText, Trash2, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, statusLabel } from "@/lib/format";
import { SignedLinkButton } from "@/components/signed-file";
import { logActivity } from "@/lib/logs";

export const Route = createFileRoute("/pmocs")({
  component: () => (
    <AppLayout>
      <PmocsPage />
    </AppLayout>
  ),
});

function PmocsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: pmocs = [] } = useQuery({
    queryKey: ["pmocs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pmocs")
        .select("*, clientes(razao_social), unidades(nome), profiles!pmocs_tecnico_id_fkey(nome)")
        .order("created_at", { ascending: false });
      if (error) {
        const { data: fallback } = await supabase
          .from("pmocs")
          .select("*, clientes(razao_social), unidades(nome)")
          .order("created_at", { ascending: false });
        return fallback ?? [];
      }
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pmocs").delete().eq("id", id);
      if (error) throw error;
      await logActivity(profile!.company_id, "excluiu", "pmoc", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pmocs"] }); toast.success("PMOC removida"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (pmocs as any[]).filter((p) =>
    [p.numero, p.clientes?.razao_social, p.unidades?.nome, statusLabel[p.status]]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) =>
    s === "finalizado" ? "default" :
    s === "em_andamento" ? "secondary" :
    s === "cancelado" ? "destructive" : "outline";

  return (
    <>
      <PageHeader
        title="PMOCs"
        description={`${pmocs.length} ordem(ns) de serviço`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova PMOC
          </Button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número, cliente, unidade ou status..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma PMOC encontrada.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3 hover:bg-accent/50">
                <button
                  onClick={() => nav({ to: "/pmocs/$pmocId", params: { pmocId: p.id } })}
                  className="flex items-start gap-3 min-w-0 flex-1 text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">PMOC {p.numero ? `#${p.numero}` : `· ${p.id.slice(0, 8)}`}</p>
                      <Badge variant={statusColor(p.status)}>{statusLabel[p.status]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.clientes?.razao_social ?? "—"} · {p.unidades?.nome ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Agendado: {formatDate(p.data_agendada)} · Finalizado: {formatDate(p.data_finalizacao)}
                      {p.periodicidade ? ` · ${p.periodicidade}` : ""}
                      {p.proxima_execucao ? ` · Próxima: ${formatDate(p.proxima_execucao)}` : ""}
                    </p>
                  </div>
                </button>
                <div className="flex gap-1 shrink-0">
                  {p.pdf_url && (
                    <SignedLinkButton
                      bucket="pdfs"
                      pathOrUrl={p.pdf_url}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" />
                    </SignedLinkButton>
                  )}
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/pmocs/$pmocId" params={{ pmocId: p.id }}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => confirm("Remover esta PMOC?") && remove.mutate(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <NewPmocDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function NewPmocDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [form, setForm] = useState<any>({});

  useEffect(() => { if (open) setForm({}); }, [open]);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-mini"],
    queryFn: async () => (await supabase.from("clientes").select("id, razao_social").order("razao_social")).data ?? [],
  });
  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-mini", form.cliente_id],
    queryFn: async () => {
      if (!form.cliente_id) return [];
      const { data } = await supabase
        .from("unidades")
        .select("id, nome, equipamentos(id)")
        .eq("cliente_id", form.cliente_id)
        .order("nome");
      return data ?? [];
    },
    enabled: !!form.cliente_id,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["templates-mini"],
    queryFn: async () => (await supabase.from("checklist_templates").select("id, nome").eq("ativo", true)).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const numero = `${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const proxima = form.data_agendada && form.periodicidade
        ? calcNext(form.data_agendada, form.periodicidade) : null;
      const { data, error } = await supabase.from("pmocs").insert({
        company_id: profile!.company_id,
        cliente_id: form.cliente_id,
        unidade_id: form.unidade_id,
        template_id: form.template_id,
        tecnico_id: profile!.id,
        data_agendada: form.data_agendada || null,
        periodicidade: form.periodicidade || null,
        proxima_execucao: proxima,
        observacoes: form.observacoes || null,
        numero,
        status: "pendente",
      } as any).select().single();
      if (error) throw error;
      await logActivity(profile!.company_id, "criou", "pmoc", data.id, { numero });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pmocs"] });
      toast.success("PMOC criada — vamos executar!");
      onOpenChange(false);
      nav({ to: "/pmocs/$pmocId", params: { pmocId: data.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const periodicidadeOptions = [
    { v: "mensal", l: "Mensal" },
    { v: "quinzenal", l: "Quinzenal" },
    { v: "bimestral", l: "Bimestral" },
    { v: "trimestral", l: "Trimestral" },
    { v: "semestral", l: "Semestral" },
    { v: "anual", l: "Anual" },
  ];

  const proximaPreview = form.data_agendada && form.periodicidade
    ? calcNext(form.data_agendada, form.periodicidade) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova PMOC</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={form.cliente_id ?? ""} onValueChange={(v) => setForm({ ...form, cliente_id: v, unidade_id: undefined })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(clientes as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={form.unidade_id ?? ""} onValueChange={(v) => setForm({ ...form, unidade_id: v })} disabled={!form.cliente_id}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(unidades as any[]).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome} {u.equipamentos?.length === 0 ? "(Sem equipamentos)" : `(${u.equipamentos?.length} eq.)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Checklist *</Label>
            <Select value={form.template_id ?? ""} onValueChange={(v) => setForm({ ...form, template_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(templates as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data inicial *</Label>
              <Input type="date" value={form.data_agendada ?? ""} onChange={(e) => setForm({ ...form, data_agendada: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Periodicidade *</Label>
              <Select value={form.periodicidade ?? ""} onValueChange={(v) => setForm({ ...form, periodicidade: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {periodicidadeOptions.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {proximaPreview && (
            <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-md p-2">
              Próxima execução será agendada automaticamente para <strong>{formatDate(proximaPreview)}</strong> ao finalizar esta PMOC.
            </div>
          )}
          <div className="space-y-2">
            <Label>Observações</Label>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.observacoes ?? ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Notas internas, escopo do serviço…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!form.cliente_id || !form.unidade_id || !form.template_id || !form.data_agendada || !form.periodicidade || create.isPending}
          >
            {create.isPending ? "Criando..." : "Criar e iniciar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function calcNext(baseISO: string, period: string): string {
  const d = new Date(baseISO + "T00:00:00");
  switch (period) {
    case "mensal":     d.setMonth(d.getMonth() + 1); break;
    case "quinzenal":  d.setDate(d.getDate() + 15); break;
    case "bimestral":  d.setMonth(d.getMonth() + 2); break;
    case "trimestral": d.setMonth(d.getMonth() + 3); break;
    case "semestral":  d.setMonth(d.getMonth() + 6); break;
    case "anual":      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}
