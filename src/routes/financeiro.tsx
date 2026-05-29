import { useState, useEffect } from "react";
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

export default function FinanceiroPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [stats, setStats] = useState({ receita: 0, despesa: 0, saldo: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const [transRes, catRes, cliRes] = await Promise.all([
        supabase
          .from("financial_transactions")
          .select("*, financial_categories(nome), clientes(razao_social)")
          .order("data_vencimento", { ascending: false }),
        supabase.from("financial_categories").select("*"),
        supabase.from("clientes").select("id, razao_social"),
      ]);

      if (transRes.data) {
        setTransactions(transRes.data);
        
        const receita = transRes.data
          .filter(t => t.tipo === "receita" && t.status === "pago")
          .reduce((acc, t) => acc + Number(t.valor), 0);
        const despesa = transRes.data
          .filter(t => t.tipo === "despesa" && t.status === "pago")
          .reduce((acc, t) => acc + Number(t.valor), 0);
        
        setStats({
          receita,
          despesa,
          saldo: receita - despesa
        });
      }
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

    try {
      const { error } = await supabase.from("financial_transactions").insert({
        ...formData,
        valor: parseFloat(formData.valor),
        company_id: profile.company_id,
        cliente_id: formData.cliente_id || null,
      });

      if (error) throw error;

      toast.success("Transação registrada com sucesso");
      setIsDialogOpen(false);
      fetchData();
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
      const { error } = await supabase
        .from("financial_transactions")
        .update({ 
          status: newStatus,
          data_pagamento: newStatus === 'pago' ? new Date().toISOString() : null
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status atualizado");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.financial_categories?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    onValueChange={(v) => setFormData({...formData, tipo: v})}
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
                            <DropdownMenuItem className="text-red-600">
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
      </div>
    </AppLayout>
  );
}
