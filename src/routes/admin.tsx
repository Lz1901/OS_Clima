import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Building2, Users, ClipboardCheck, DollarSign, Search, ShieldAlert,
  Plus, MoreVertical, Ban, CheckCircle2, KeyRound, Trash2, Wrench, TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  adminGlobalStats, adminListCompanies, adminCreateCompany,
  adminSetCompanyStatus, adminResetUserPassword, adminDeleteCompany,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: SuperAdminPage,
});

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    ativa: { label: "Ativa", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    suspensa: { label: "Suspensa", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    bloqueada: { label: "Bloqueada", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? map.ativa;
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

function SuperAdminPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const getStats = useServerFn(adminGlobalStats);
  const listCompanies = useServerFn(adminListCompanies);
  const createCompany = useServerFn(adminCreateCompany);
  const setStatus = useServerFn(adminSetCompanyStatus);
  const resetPwd = useServerFn(adminResetUserPassword);
  const deleteCompany = useServerFn(adminDeleteCompany);

  const enabled = !!profile?.is_super_admin;

  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => getStats(),
    enabled,
  });
  const companies = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: () => listCompanies(),
    enabled,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const mCreate = useMutation({
    mutationFn: (input: Parameters<typeof createCompany>[0]["data"]) => createCompany({ data: input }),
    onSuccess: () => { toast.success("Empresa criada"); setCreateOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mStatus = useMutation({
    mutationFn: (input: Parameters<typeof setStatus>[0]["data"]) => setStatus({ data: input }),
    onSuccess: () => { toast.success("Status atualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mDelete = useMutation({
    mutationFn: (companyId: string) => deleteCompany({ data: { companyId } }),
    onSuccess: () => { toast.success("Empresa excluída"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!profile) {
    return <AppLayout><div className="p-8">Carregando...</div></AppLayout>;
  }
  if (!profile.is_super_admin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">Esta área é exclusiva do Super Admin do ClimaOS.</p>
        </div>
      </AppLayout>
    );
  }

  const list = (companies.data?.companies ?? []).filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(q) ||
      c.cnpj?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const s = stats.data;

  return (
    <AppLayout>
      <PageHeader
        title="Painel Super Admin"
        description="Visão global do ClimaOS — todas as empresas e métricas do SaaS."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova empresa</Button>
            </DialogTrigger>
            <CreateCompanyDialog onSubmit={(d) => mCreate.mutate(d)} loading={mCreate.isPending} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Empresas" value={s?.totalCompanies ?? "—"} hint={`${s?.ativas ?? 0} ativas · ${s?.suspensas ?? 0} suspensas`} />
        <StatCard icon={Users} label="Usuários" value={s?.totalUsers ?? "—"} />
        <StatCard icon={ClipboardCheck} label="PMOCs" value={s?.totalPmocs ?? "—"} hint={`${s?.pmocsFinalizados ?? 0} finalizados`} />
        <StatCard icon={Wrench} label="Equipamentos" value={s?.totalEquipamentos ?? "—"} />
        <StatCard icon={DollarSign} label="Receita total" value={formatCurrency(s?.receitaTotal ?? 0)} />
        <StatCard icon={TrendingUp} label="Receita mensal" value={formatCurrency(s?.receitaMensal ?? 0)} />
        <StatCard icon={Ban} label="Bloqueadas" value={s?.bloqueadas ?? 0} />
        <StatCard icon={CheckCircle2} label="Ativas" value={s?.ativas ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <CardTitle>Empresas clientes</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CNPJ ou email…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>PMOCs</TableHead>
                <TableHead>Equipamentos</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma empresa encontrada.</TableCell></TableRow>
              ) : list.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.cnpj ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                  <TableCell>{c.users_count}</TableCell>
                  <TableCell>{c.pmocs_count}</TableCell>
                  <TableCell>{c.equipamentos_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-right">
                    <CompanyActions
                      company={c}
                      onStatus={(status) => mStatus.mutate({ companyId: c.id, status })}
                      onReset={async (email, pwd) => {
                        try {
                          await resetPwd({ data: { email, newPassword: pwd } });
                          toast.success("Senha redefinida");
                        } catch (e: any) { toast.error(e.message); }
                      }}
                      onDelete={() => mDelete.mutate(c.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: any; hint?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function CreateCompanyDialog({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    nome: "", email: "", cnpj: "", telefone: "", adminNome: "", adminSenha: "",
  });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova empresa</DialogTitle>
        <DialogDescription>Cria a empresa e o usuário administrador (com senha definida por você).</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Nome da empresa *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="space-y-1"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Email do admin *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Nome do admin *</Label><Input value={form.adminNome} onChange={(e) => setForm({ ...form, adminNome: e.target.value })} /></div>
          <div className="space-y-1"><Label>Senha inicial *</Label><Input type="password" minLength={8} value={form.adminSenha} onChange={(e) => setForm({ ...form, adminSenha: e.target.value })} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !form.nome || !form.email || !form.adminNome || form.adminSenha.length < 8}
          onClick={() => onSubmit({
            nome: form.nome.trim(),
            email: form.email.trim(),
            cnpj: form.cnpj.trim() || null,
            telefone: form.telefone.trim() || null,
            adminNome: form.adminNome.trim(),
            adminSenha: form.adminSenha,
          })}
        >
          {loading ? "Criando…" : "Criar empresa"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CompanyActions({
  company, onStatus, onReset, onDelete,
}: {
  company: any;
  onStatus: (s: "ativa" | "suspensa" | "bloqueada") => void;
  onReset: (email: string, newPassword: string) => void;
  onDelete: () => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [email, setEmail] = useState(company.email ?? "");
  const [pwd, setPwd] = useState("");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {company.status !== "ativa" && (
            <DropdownMenuItem onClick={() => onStatus("ativa")}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Reativar
            </DropdownMenuItem>
          )}
          {company.status !== "suspensa" && (
            <DropdownMenuItem onClick={() => onStatus("suspensa")}>
              <Ban className="h-4 w-4 mr-2" /> Suspender
            </DropdownMenuItem>
          )}
          {company.status !== "bloqueada" && (
            <DropdownMenuItem onClick={() => onStatus("bloqueada")} className="text-destructive">
              <Ban className="h-4 w-4 mr-2" /> Bloquear
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" /> Redefinir senha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              if (confirm(`Excluir definitivamente "${company.nome}"? Esta ação remove todos os dados da empresa.`)) onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Excluir empresa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Informe o email do usuário desta empresa e a nova senha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label>Nova senha (mín. 8)</Label><Input type="password" minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button
              disabled={!email || pwd.length < 8}
              onClick={() => { onReset(email, pwd); setResetOpen(false); setPwd(""); }}
            >
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
