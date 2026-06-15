import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  DollarSign, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createFileRoute } from "@tanstack/react-router";


export const Route = createFileRoute("/financeiro")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { user, profile, hasPermission, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [stats, setStats] = useState({ receita: 0, despesa: 0, saldo: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    tipo: "receita",
    categoria_id: "",
    cliente_id: "",
    data_vencimento: new Date().toISOString().split('T')[0],
    status: "pendente",
  });

  const calculateStats = (items: any[]) => {
    const receita = items
      .filter((t) => t.tipo === "receita" && t.status === "pago")
      .reduce((acc, t) => acc + Number(t.valor), 0);
    const despesa = items
      .filter((t) => t.tipo === "despesa" && t.status === "pago")
      .reduce((acc, t) => acc + Number(t.valor), 0);

    return { receita, despesa, saldo: receita - despesa };
  };

  const applyTransactions = (items: any[]) => {
    setTransactions(items);
    setStats(calculateStats(items));
  };

  const logDeleteStep = (message: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.log(`[Financeiro][Excluir] ${message}`, payload);
      return;
    }
    console.log(`[Financeiro][Excluir] ${message}`);
  };

  useEffect(() => {
    if (user?.id) {
      refreshProfile().catch((error) => {
        console.log("Erro:", error);
      });
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!profile?.company_id) {
      applyTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [transRes, catRes, cliRes] = await Promise.all([
        supabase
          .from("financial_transactions")
          .select("*, financial_categories(nome), clientes(razao_social)")
          .eq("company_id", profile.company_id)
          .order("data_vencimento", { ascending: false }),
        supabase.from("financial_categories").select("*").eq("company_id", profile.company_id).order("nome"),
        supabase.from("clientes").select("id, razao_social").eq("company_id", profile.company_id).order("razao_social"),
      ]);

      console.log("[Financeiro][fetchData] Resultado:", { transRes, catRes, cliRes });
      console.log("[Financeiro][fetchData] Erro:", transRes.error ?? catRes.error ?? cliRes.error);

      if (transRes.error) throw transRes.error;
      if (catRes.error) throw catRes.error;
      if (cliRes.error) throw cliRes.error;

      applyTransactions(transRes.data ?? []);
      if (catRes.data) setCategories(catRes.data);
      if (cliRes.data) setClientes(cliRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    const valor = Number(formData.valor);
    if (!formData.categoria_id) {
      toast.error("Selecione uma categoria para salvar a transação.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    try {
      const result = await supabase.from("financial_transactions").insert({
        ...formData,
        valor,
        company_id: profile.company_id,
        cliente_id: formData.cliente_id || null,
      }).select("id").single();

      console.log("[Financeiro][Criar] Resultado:", result);
      console.log("[Financeiro][Criar] Erro:", result.error);

      if (result.error) throw result.error;

      toast.success("Transação registrada com sucesso");
      setIsDialogOpen(false);
      await fetchData();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setFormData({
        descricao: "",
        valor: "",
        tipo: "receita",
        categoria_id: "",
        cliente_id: "",
        data_vencimento: new Date().toISOString().split('T')[0],
        status: "pendente",
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const result = await supabase
        .from("financial_transactions")
        .update({ 
          status: newStatus,
          data_pagamento: newStatus === 'pago' ? new Date().toISOString() : null
        })
        .eq("id", id)
        .eq("company_id", profile?.company_id ?? "")
        .select("id")
        .maybeSingle();

      console.log("[Financeiro][Status] Resultado:", result);
      console.log("[Financeiro][Status] Erro:", result.error);

      if (result.error) throw result.error;
      if (!result.data) throw new Error("Status não atualizado. Registro não encontrado ou sem permissão.");
      toast.success("Status atualizado");
      await fetchData();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string, origem = "confirmacao") => {
    console.log("Iniciando exclusão");
    console.log("ID da transação:", id);
    console.log("Usuário:", user?.id);
    logDeleteStep("Origem do clique", origem);
    logDeleteStep("Profile", profile);
    logDeleteStep("Permissões financeiras", {
      view: hasPermission("financeiro.view"),
      create: hasPermission("financeiro.create"),
      edit: hasPermission("financeiro.edit"),
      delete: hasPermission("financeiro.delete"),
      manage: hasPermission("financeiro.manage"),
    });

    if (!id) {
      const error = new Error("ID da transação não foi recebido.");
      console.log("Erro:", error);
      toast.error(error.message);
      return;
    }

    if (!profile?.company_id) {
      const error = new Error("Empresa do usuário não carregada. Recarregue a página e tente novamente.");
      console.log("Erro:", error);
      toast.error(error.message);
      return;
    }

    setDeleting(true);
    let result: any = null;
    let error: any = null;
    try {
      const userResult = await supabase.auth.getUser();
      console.log("Usuário:", userResult.data.user?.id);
      console.log("Resultado:", userResult);
      console.log("Erro:", userResult.error);
      if (userResult.error || !userResult.data.user) {
        throw userResult.error ?? new Error("Usuário não autenticado para excluir transações.");
      }

      const existsResult = await supabase
        .from("financial_transactions")
        .select("id, company_id, descricao, valor, status")
        .eq("id", id)
        .maybeSingle();
      console.log("Resultado:", existsResult);
      console.log("Erro:", existsResult.error);
      if (existsResult.error) throw existsResult.error;
      if (!existsResult.data) {
        throw new Error("Transação não encontrada ou sem permissão de visualização.");
      }

      result = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id)
        .eq("company_id", profile.company_id)
        .select("id, descricao")
        .maybeSingle();
      error = result.error;
      console.log("Resultado:", result);
      console.log("Erro:", error);
      if (error) throw error;
      if (!result.data) {
        throw new Error("A exclusão não foi aplicada. Verifique permissão de exclusão ou se o registro ainda existe.");
      }

      const verifyResult = await supabase
        .from("financial_transactions")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      console.log("Resultado:", verifyResult);
      console.log("Erro:", verifyResult.error);
      if (verifyResult.error) throw verifyResult.error;
      if (verifyResult.data) {
        throw new Error("O banco retornou sucesso, mas o registro continua existindo após a exclusão.");
      }

      const nextTransactions = transactions.filter((t) => t.id !== id);
      applyTransactions(nextTransactions);
      toast.success("Transação excluída");
      await fetchData();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: any) {
      console.log("Resultado:", result);
      console.log("Erro:", error);
      toast.error(error.message ?? "Falha ao excluir transação");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch = !term || [
        t.descricao,
        t.financial_categories?.nome,
        t.clientes?.razao_social,
        t.status,
        t.tipo,
        String(t.valor ?? ""),
      ].join(" ").toLowerCase().includes(term);
      const matchesStatus = statusFilter === "todos" || t.status === statusFilter;
      const matchesType = typeFilter === "todos" || t.tipo === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [transactions, searchTerm, statusFilter, typeFilter]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">Gestão de fluxo de caixa e contas a pagar/receber.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Registrar Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(v) => setFormData({...formData, tipo: v, categoria_id: ""})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita (Entrada)</SelectItem>
                      <SelectItem value="despesa">Despesa (Saída)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Input 
                    required 
                    placeholder="Ex: Contrato Mensal PMOC" 
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Valor (R$)</Label>
                    <Input 
                      required 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00" 
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vencimento</Label>
                    <Input 
                      required 
                      type="date" 
                      value={formData.data_vencimento}
                      onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select 
                    required
                    value={formData.categoria_id} 
                    onValueChange={(v) => setFormData({...formData, categoria_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.tipo === formData.tipo).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.tipo === 'receita' && (
                  <div className="grid gap-2">
                    <Label>Cliente (Opcional)</Label>
                    <Select 
                      value={formData.cliente_id} 
                      onValueChange={(v) => setFormData({...formData, cliente_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vincular a um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map(cli => (
                          <SelectItem key={cli.id} value={cli.id}>{cli.razao_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-green-50/50 border-green-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Total Receitas (Pagas)</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.receita)}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50/50 border-red-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Total Despesas (Pagas)</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{formatCurrency(stats.despesa)}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50/50 border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Saldo Atual</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(stats.saldo)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Últimas Transações</CardTitle>
              <div className="flex w-full md:w-auto gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar transação..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada.</TableCell></TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{formatDate(t.data_vencimento)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{t.descricao}</span>
                          <span className="text-xs text-muted-foreground">{t.clientes?.razao_social}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.financial_categories?.nome}</Badge>
                      </TableCell>
                      <TableCell className={t.tipo === 'receita' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(t.valor)}
                      </TableCell>
                      <TableCell>
                        {t.status === 'pago' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
                          </Badge>
                        ) : t.status === 'pendente' ? (
                          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">
                            <Clock className="h-3 w-3 mr-1" /> Pendente
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">
                            <AlertCircle className="h-3 w-3 mr-1" /> Cancelado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {t.status !== 'pago' && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'pago')}>
                                Marcar como Pago
                              </DropdownMenuItem>
                            )}
                            {t.status !== 'pendente' && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'pendente')}>
                                Marcar como Pendente
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onSelect={(e) => { e.preventDefault(); setPendingDelete(t); }}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && !deleting && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete && (
                  <>
                    Tem certeza que deseja excluir <strong>{pendingDelete.descricao}</strong>
                    {pendingDelete.valor && (
                      <> no valor de <strong>{formatCurrency(pendingDelete.valor)}</strong></>
                    )}? Esta ação não pode ser desfeita.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={(e) => { e.preventDefault(); if (pendingDelete) handleDelete(pendingDelete.id); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
