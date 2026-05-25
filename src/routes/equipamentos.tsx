import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wrench, Search, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { equipamentoTipoLabel, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/equipamentos")({
  component: () => (
    <AppLayout>
      <EquipamentosPage />
    </AppLayout>
  ),
});

function EquipamentosPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: equipamentos = [] } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamentos")
        .select("*, unidades(nome, clientes(razao_social))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("unidades")
        .select("id, nome, cliente_id, clientes(razao_social)")
        .order("nome");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (form: any) => {
      const payload = { ...form, btus: form.btus ? Number(form.btus) : null };
      if (editing) {
        const { error } = await supabase.from("equipamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipamentos").insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("Salvo");
      setOpen(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipamentos"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (equipamentos as any[]).filter((eq) =>
    [eq.marca, eq.modelo, eq.numero_serie, eq.patrimonio, eq.unidades?.nome].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Equipamentos"
        description={`${equipamentos.length} equipamento(s) cadastrado(s)`}
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} disabled={!unidades.length}>
            <Plus className="h-4 w-4 mr-2" /> Novo equipamento
          </Button>
        }
      />

      {!unidades.length && (
        <Card className="p-6 mb-4 text-sm text-muted-foreground">
          Cadastre uma unidade antes de criar equipamentos.
        </Card>
      )}

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((eq: any) => (
          <Card key={eq.id} className="p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wrench className="h-5 w-5" />
              </div>
              <Badge variant={eq.status === "ativo" ? "default" : "secondary"}>
                {statusLabel[eq.status]}
              </Badge>
            </div>
            <p className="font-semibold truncate">{eq.marca} {eq.modelo}</p>
            <p className="text-xs text-muted-foreground">{equipamentoTipoLabel[eq.tipo]} · {eq.btus ? `${eq.btus} BTUs` : "—"}</p>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
              <p className="truncate">📍 {eq.unidades?.nome} — {eq.unidades?.clientes?.razao_social}</p>
              {eq.numero_serie && <p>Série: {eq.numero_serie}</p>}
              {eq.localizacao && <p>Local: {eq.localizacao}</p>}
            </div>
            <div className="flex gap-1 mt-3">
              <Button variant="ghost" size="sm" className="flex-1" asChild>
                <Link to="/equipamentos/$equipamentoId" params={{ equipamentoId: eq.id }}>
                  <QrCode className="h-3 w-3 mr-1" /> Ver / QR
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(eq); setOpen(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => confirm("Remover?") && remove.mutate(eq.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
            Nenhum equipamento.
          </div>
        )}
      </div>

      <EquipamentoDialog
        open={open}
        onOpenChange={setOpen}
        equipamento={editing}
        unidades={unidades as any}
        onSave={(form: any) => save.mutate(form)}
        saving={save.isPending}
      />
    </>
  );
}

function EquipamentoDialog({ open, onOpenChange, equipamento, unidades, onSave, saving }: any) {
  const [form, setForm] = useState<any>({ tipo: "split", status: "ativo" });
  useEffect(() => {
    if (open) setForm(equipamento ?? { tipo: "split", status: "ativo" });
  }, [open, equipamento]);

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipamento ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Unidade *</Label>
            <Select value={form.unidade_id ?? ""} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {unidades.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.clientes?.razao_social} — {u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(equipamentoTipoLabel).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="manutencao">Em manutenção</SelectItem>
                <SelectItem value="defeito">Com defeito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Marca</Label><Input value={form.marca ?? ""} onChange={f("marca")} /></div>
          <div className="space-y-2"><Label>Modelo</Label><Input value={form.modelo ?? ""} onChange={f("modelo")} /></div>
          <div className="space-y-2"><Label>BTUs</Label><Input type="number" value={form.btus ?? ""} onChange={f("btus")} /></div>
          <div className="space-y-2"><Label>Tensão</Label><Input value={form.tensao ?? ""} onChange={f("tensao")} placeholder="220V / 380V" /></div>
          <div className="space-y-2"><Label>Número de série</Label><Input value={form.numero_serie ?? ""} onChange={f("numero_serie")} /></div>
          <div className="space-y-2"><Label>Patrimônio</Label><Input value={form.patrimonio ?? ""} onChange={f("patrimonio")} /></div>
          <div className="space-y-2"><Label>Gás refrigerante</Label><Input value={form.gas_refrigerante ?? ""} onChange={f("gas_refrigerante")} placeholder="R410A / R32" /></div>
          <div className="space-y-2"><Label>Data instalação</Label><Input type="date" value={form.data_instalacao ?? ""} onChange={f("data_instalacao")} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Localização</Label><Input value={form.localizacao ?? ""} onChange={f("localizacao")} placeholder="Sala 12, 2º andar..." /></div>
          <div className="space-y-2 md:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={f("observacoes")} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.unidade_id}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
