import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Users,
  Wrench,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, statusLabel, formatCurrency } from "@/lib/format";
import { seedDemoData } from "@/lib/seed";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  ),
});

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
}: {
  label: string;
  value: number | string;
  icon: any;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const { profile, hasPermission } = useAuth();
  const qc = useQueryClient();
  
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const queries = [
        supabase.from("pmocs").select("id,status,created_at,data_finalizacao"),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("equipamentos").select("id", { count: "exact", head: true }),
      ];

      if (hasPermission('financeiro.view')) {
        queries.push(supabase.from("financial_transactions").select("valor, tipo").eq("status", "pago"));
      }

      const results = await Promise.all(queries as any[]);
      const pmocs = results[0].data ?? [];
      const clientesCount = results[1].count ?? 0;
      const equipamentosCount = results[2].count ?? 0;
      
      let receita = 0;
      let despesa = 0;
      if (results[3]?.data) {
        receita = results[3].data.filter((t: any) => t.tipo === 'receita').reduce((acc: number, t: any) => acc + Number(t.valor), 0);
        despesa = results[3].data.filter((t: any) => t.tipo === 'despesa').reduce((acc: number, t: any) => acc + Number(t.valor), 0);
      }

      return {
        totalPmocs: pmocs.length,
        finalizados: pmocs.filter((p: any) => p.status === "finalizado").length,
        pendentes: pmocs.filter((p: any) => ["pendente", "em_andamento"].includes(p.status)).length,
        clientes: clientesCount,
        equipamentos: equipamentosCount,
        pmocs,
        receita,
        despesa,
        saldo: receita - despesa
      };
    },
  });

  const { data: ultimas } = useQuery({
    queryKey: ["pmocs-ultimas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pmocs")
        .select("id, numero, status, data_finalizacao, created_at, clientes(razao_social), unidades(nome)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // gráfico mensal
  const chartData = (() => {
    const months: { mes: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("pt-BR", { month: "short" });
      const total = (stats?.pmocs ?? []).filter((p: any) => {
        const c = new Date(p.created_at);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).length;
      months.push({ mes: key, total });
    }
    return months;
  })();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral das operações de PMOC"
        action={
          (stats?.totalPmocs ?? 0) === 0 && (
            <Button variant="outline" size="sm" onClick={async () => {
              await seedDemoData(profile!.company_id, profile!.id);
              qc.invalidateQueries();
              toast.success("Dados de demonstração gerados!");
            }}>
              Gerar dados demo
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="PMOCs realizados" value={stats?.finalizados ?? 0} icon={CheckCircle2} variant="success" />
        <StatCard label="PMOCs pendentes" value={stats?.pendentes ?? 0} icon={Clock} variant="warning" />
        <StatCard label="Clientes ativos" value={stats?.clientes ?? 0} icon={Users} />
        <StatCard label="Equipamentos" value={stats?.equipamentos ?? 0} icon={Wrench} />
      </div>

      {hasPermission('financeiro.view') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Receita Líquida" value={formatCurrency(stats?.receita ?? 0)} icon={DollarSign} variant="success" />
          <StatCard label="Despesa Total" value={formatCurrency(stats?.despesa ?? 0)} icon={DollarSign} variant="danger" />
          <StatCard label="Saldo de Caixa" value={formatCurrency(stats?.saldo ?? 0)} icon={DollarSign} variant={ (stats?.saldo ?? 0) >= 0 ? "success" : "danger" } />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Manutenções mensais</h3>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="mes" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="total" fill="oklch(0.52 0.21 257)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h3 className="font-semibold">Alertas</h3>
          </div>
          <div className="space-y-3">
            {(stats?.pendentes ?? 0) > 0 ? (
              <div className="p-3 rounded-md bg-warning/10 text-sm">
                <p className="font-medium">{stats?.pendentes} PMOC(s) pendente(s)</p>
                <p className="text-xs text-muted-foreground mt-1">Verifique a agenda</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem alertas no momento.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck className="h-4 w-4" />
          <h3 className="font-semibold">Últimas PMOCs</h3>
        </div>
        {!ultimas?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma PMOC registrada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {ultimas.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-md hover:bg-accent">
                <div>
                  <p className="font-medium text-sm">
                    {p.clientes?.razao_social ?? "Cliente"} — {p.unidades?.nome ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</p>
                </div>
                <Badge variant={p.status === "finalizado" ? "default" : "secondary"}>
                  {statusLabel[p.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
