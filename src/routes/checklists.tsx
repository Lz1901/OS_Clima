import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ListChecks, ChevronRight, Save, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/checklists")({
  component: () => (
    <AppLayout>
      <ChecklistsPage />
    </AppLayout>
  ),
});

function ChecklistsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("*, checklist_items(*)")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checklist-templates"] }); toast.success("Template removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Checklists"
        description="Gerencie seus modelos de inspeção PMOC"
        action={
          <Button onClick={() => { setEditingTemplate(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Modelo
          </Button>
        }
      />

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((t: any) => (
          <Card key={t.id} className="p-5 hover:border-primary/40 transition-colors group">
            <div className="flex items-start justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ListChecks className="h-5 w-5" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => { setEditingTemplate(t); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => confirm("Excluir este modelo?") && remove.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="font-semibold text-lg">{t.nome}</p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.descricao || "Sem descrição"}</p>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary">{t.checklist_items?.length ?? 0} itens</Badge>
              {!t.ativo && <Badge variant="outline">Inativo</Badge>}
            </div>
          </Card>
        ))}
      </div>

      <TemplateDialog
        open={open}
        onOpenChange={setOpen}
        template={editingTemplate}
      />
    </>
  );
}

function TemplateDialog({ open, onOpenChange, template }: any) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({ nome: "", descricao: "", ativo: true });
  const [items, setItems] = useState<any[]>([]);

  useState(() => {
    if (template) {
      setForm({ nome: template.nome, descricao: template.descricao, ativo: template.ativo });
      setItems(template.checklist_items?.sort((a: any, b: any) => a.ordem - b.ordem) ?? []);
    } else {
      setForm({ nome: "", descricao: "", ativo: true });
      setItems([]);
    }
  });

  // Handle template change when dialog opens/reopens
  useEffect(() => {
    if (open) {
      if (template) {
        setForm({ nome: template.nome, descricao: template.descricao, ativo: template.ativo });
        setItems(template.checklist_items?.sort((a: any, b: any) => a.ordem - b.ordem) ?? []);
      } else {
        setForm({ nome: "", descricao: "", ativo: true });
        setItems([]);
      }
    }
  }, [open, template]);

  const save = useMutation({
    mutationFn: async () => {
      let templateId = template?.id;
      
      // Save template
      if (templateId) {
        const { error } = await supabase.from("checklist_templates").update(form).eq("id", templateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("checklist_templates").insert({ ...form, company_id: profile!.company_id }).select().single();
        if (error) throw error;
        templateId = data.id;
      }

      // Save items (simple approach: delete all and re-insert)
      await supabase.from("checklist_items").delete().eq("template_id", templateId);
      if (items.length > 0) {
        const { error } = await supabase.from("checklist_items").insert(
          items.map((it, i) => ({
            template_id: templateId,
            categoria: it.categoria,
            label: it.label,
            tipo_campo: it.tipo_campo,
            obrigatorio: it.obrigatorio,
            ordem: i,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast.success("Modelo salvo");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = () => setItems([...items, { label: "", tipo_campo: "checkbox", obrigatorio: true }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    setItems(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{template ? "Editar Modelo" : "Novo Modelo"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do modelo *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Checklist Split Padrão" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição do modelo" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Itens do Checklist</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2 items-start bg-muted/30 p-3 rounded-lg group">
                  <div className="mt-2 text-muted-foreground"><GripVertical className="h-4 w-4" /></div>
                  <div className="flex-1 grid md:grid-cols-3 gap-2">
                    <div className="md:col-span-2 space-y-1">
                      <Input value={it.label} onChange={(e) => updateItem(i, "label", e.target.value)} placeholder="O que deve ser verificado?" className="bg-background" />
                      <Input value={it.categoria ?? ""} onChange={(e) => updateItem(i, "categoria", e.target.value)} placeholder="Categoria (opcional)" className="h-7 text-xs bg-background" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Select value={it.tipo_campo} onValueChange={(v) => updateItem(i, "tipo_campo", v)}>
                        <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checkbox">Sim/Não (OK)</SelectItem>
                          <SelectItem value="texto">Texto</SelectItem>
                          <SelectItem value="numero">Número</SelectItem>
                          <SelectItem value="observacao">Observação</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={it.obrigatorio} onChange={(e) => updateItem(i, "obrigatorio", e.target.checked)} className="rounded border-input" />
                        Obrigatório
                      </label>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeItem(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  Nenhum item adicionado. Adicione o primeiro item acima.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!form.nome || save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar Checklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}