import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { RequirePermission, PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/configuracoes")({
  component: () => (
    <AppLayout>
      <RequirePermission permission="configuracoes.view">
        <Config />
      </RequirePermission>
    </AppLayout>
  ),
});

function Config() {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  const { data: company } = useQuery({
    queryKey: ["company"],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile!.company_id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => { if (company) setForm(company); }, [company]);

  const save = useMutation({
    mutationFn: async () => {
      // Allowlist apenas campos editáveis pelo admin da empresa.
      // status/suspended_at/block_reason são reservados ao Super Admin.
      const safe = {
        nome: form.nome ?? null,
        cnpj: form.cnpj ?? null,
        email: form.email ?? null,
        telefone: form.telefone ?? null,
        endereco: form.endereco ?? null,
        crea: form.crea ?? null,
        responsavel_tecnico: form.responsavel_tecnico ?? null,
        cor_primaria: form.cor_primaria ?? null,
        logo_url: form.logo_url ?? null,
        assinatura_url: form.assinatura_url ?? null,
      };
      const { error } = await supabase.from("companies").update(safe).eq("id", profile!.company_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company"] });
      refreshProfile();
      toast.success("Empresa atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadLogo = async (file: File) => {
    const path = `${profile!.company_id}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    setForm({ ...form, logo_url: data.publicUrl });
    toast.success("Logo enviada");
  };

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Configurações da empresa" description="Dados que aparecerão nos PMOCs e relatórios" />
      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {form.logo_url && <img src={form.logo_url} alt="logo" className="h-16 w-16 rounded-md object-contain bg-muted" />}
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </div>
          </div>
          <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={f("nome")} /></div>
          <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj ?? ""} onChange={f("cnpj")} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={f("email")} /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={f("telefone")} /></div>
          <div className="space-y-2"><Label>CREA / CRT</Label><Input value={form.crea ?? ""} onChange={f("crea")} /></div>
          <div className="space-y-2"><Label>Responsável técnico</Label><Input value={form.responsavel_tecnico ?? ""} onChange={f("responsavel_tecnico")} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Endereço</Label><Input value={form.endereco ?? ""} onChange={f("endereco")} /></div>
          <div className="space-y-2">
            <Label>Cor primária</Label>
            <div className="flex gap-2 items-center">
              <Input type="color" value={form.cor_primaria ?? "#2563eb"} onChange={f("cor_primaria")} className="w-16 h-10 p-1" />
              <Input value={form.cor_primaria ?? "#2563eb"} onChange={f("cor_primaria")} />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </Card>
    </>
  );
}
