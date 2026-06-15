import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { RequirePermission, PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/clientes")({
  component: () => (
    <AppLayout>
      <RequirePermission permission="clientes.view">
        <ClientesPage />
      </RequirePermission>
    </AppLayout>
  ),
});

type Cliente = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  responsavel: string | null;
  telefone: string | null;
  email: string | null;
  whatsapp: string | null;
  endereco: string | null;
  observacoes: string | null;
};

function ClientesPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const save = useMutation({
    mutationFn: async (form: Partial<Cliente>) => {
      if (editing) {
        const { error } = await supabase.from("clientes").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert({ ...form, company_id: profile!.company_id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(editing ? "Cliente atualizado" : "Cliente criado");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente removido");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = clientes.filter((c) =>
    [c.razao_social, c.nome_fantasia, c.cnpj].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} cliente(s) cadastrado(s)`}
        action={
          <PermissionGate permission="clientes.create">
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo cliente
            </Button>
          </PermissionGate>
        }
      />

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-accent/50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{c.razao_social}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    {c.nome_fantasia && <span>{c.nome_fantasia}</span>}
                    {c.cnpj && <span>CNPJ: {c.cnpj}</span>}
                    {c.telefone && <span>{c.telefone}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ClienteDialog
        open={open}
        onOpenChange={setOpen}
        cliente={editing}
        onSave={(f: any) => save.mutate(f)}
        saving={save.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate(deleteId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ClienteDialog({
  open, onOpenChange, cliente, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente: Cliente | null;
  onSave: (f: Partial<Cliente>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Cliente>>({});

  useEffect(() => {
    if (open) setForm(cliente ?? {});
  }, [open, cliente]);


  const f = (k: keyof Cliente) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Razão social *</Label>
            <Input value={form.razao_social ?? ""} onChange={f("razao_social")} required />
          </div>
          <div className="space-y-2">
            <Label>Nome fantasia</Label>
            <Input value={form.nome_fantasia ?? ""} onChange={f("nome_fantasia")} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj ?? ""} onChange={f("cnpj")} />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input value={form.responsavel ?? ""} onChange={f("responsavel")} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={f("telefone")} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp ?? ""} onChange={f("whatsapp")} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={f("email")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.endereco ?? ""} onChange={f("endereco")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes ?? ""} onChange={f("observacoes")} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.razao_social}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
