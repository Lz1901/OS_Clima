import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Users, ClipboardCheck, DollarSign, Search, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [stats, setStats] = useState({ companies: 0, users: 0, pmocs: 0, totalRevenue: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchGlobalStats = async () => {
    if (!profile?.is_super_admin) return;
    setLoading(true);
    try {
      // For Super Admin, we might need a separate API or use a service role client
      // Since we are in the client side, RLS will block if we aren't careful.
      // But we added a bypass for Super Admin in 'check_user_permission' function logic (sort of)
      // Actually, standard RLS policies I created earlier don't have the bypass yet.
      
      // Let's assume for now we use a server-side route or a special bypass.
      // I'll update the RLS policies in a bit to allow Super Admin access.
      
      const [compRes, usersRes, pmocRes, transRes] = await Promise.all([
        supabase.from("companies").select("*"),
        supabase.from("profiles").select("id", { count: 'exact' }),
        supabase.from("pmocs").select("id", { count: 'exact' }),
        supabase.from("financial_transactions").select("valor").eq("status", "pago").eq("tipo", "receita")
      ]);

      if (compRes.data) setCompanies(compRes.data);
      setStats({
        companies: compRes.data?.length || 0,
        users: usersRes.count || 0,
        pmocs: pmocRes.count || 0,
        totalRevenue: transRes.data?.reduce((acc, t) => acc + Number(t.valor), 0) || 0
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados globais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.is_super_admin) {
      fetchGlobalStats();
    }
  }, [profile]);

  if (!profile?.is_super_admin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
        </div>
      </AppLayout>
    );
  }

  const filteredCompanies = companies.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm)
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Super Admin</h1>
          <p className="text-muted-foreground">Visão global de todos os tenants e métricas do SaaS.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.companies}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">PMOCs Gerados</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pmocs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Global</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Empresas Clientes</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma empresa encontrada.</TableCell></TableRow>
                ) : (
                  filteredCompanies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.cnpj || "-"}</TableCell>
                      <TableCell>{c.responsavel_tecnico || "-"}</TableCell>
                      <TableCell>{formatDate(c.created_at)}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Ativo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Ver detalhes</Button>
                        <Button variant="ghost" size="sm" className="text-red-600">Bloquear</Button>
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
