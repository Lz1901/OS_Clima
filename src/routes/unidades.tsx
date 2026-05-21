import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
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
import { unidadeTipoLabel } from "@/lib/format";

export const Route = createFileRoute("/unidades")({
  component: () => (
    <AppLayout>
      <UnidadesPage />
    </AppLayout>
  ),
});

type Unidade = {
  id: string;
  cliente_id: string;
  tipo: string;
  nome: string;
  endereco: string | null;
  responsavel_local: string | null;
  telefone: string | null;
  email: string | null;
  clientes?: { razao_social: string };
};

function UnidadesPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unidade | null>(null);

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("*, clientes(razao_social)")
        .order("nome");
      if (error) throw error;
      return data as any as Unidade[];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id,razao_social").order("razao_social");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (form: any) => {
      if (editing) {
        const { error } = await supabase.from("unidades").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("unidades").insert({ ...form, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unidades"] });
      toast.success("Salvo");
      setOpen(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["unidades"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Unidades"
        description={`${unidades.length} unidade(s) cadastrada(s)`}
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} disabled={!clientes.length}>
            <Plus className="h-4 w-4 mr-2" /> Nova unidade
          </Button>
        }
      />

      {!clientes.length && (
        <Card className="p-6 mb-4 text-sm text-muted-foreground">
          Cadastre um cliente antes de criar unidades.
        </Card>
      )}

      <Card>
        {unidades.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma unidade cadastrada.</div>
        ) : (
          <div className="divide-y">
            {unidades.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-accent/50">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{u.nome}</p>
                      <Badge variant="secondary">{unidadeTipoLabel[u.tipo]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{u.clientes?.razao_social}</p>
                    {u.endereco && <p className="text-xs text-muted-foreground mt-1 truncate">{u.endereco}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => confirm("Remover?") && remove.mutate(u.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <UnidadeDialog
        open={open}
        onOpenChange={setOpen}
        unidade={editing}
        clientes={clientes as any}
        onSave={(f) => save.mutate(f)}
        saving={save.isPending}
      />
    </>
  );
}

function UnidadeDialog({
  open, onOpenChange, unidade, clientes, onSave, saving,
}: any) {
  const [form, setForm] = useState<any>({ tipo: "matriz" });
  useEffect(() => {
    if (open) setForm(unidade ?? { tipo: "matriz" });
  }, [open, unidade]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unidade ? "Editar unidade" : "Nova unidade"}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Cliente *</Label>
            <Select value={form.cliente_id ?? ""} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(unidadeTipoLabel).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Responsável local</Label>
            <Input value={form.responsavel_local ?? ""} onChange={(e) => setForm({ ...form, responsavel_local: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.nome || !form.cliente_id}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
