import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { RequirePermission } from "@/components/permission-gate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/logs")({
  component: () => (
    <AppLayout>
      <LogsPage />
    </AppLayout>
  ),
});

function LogsPage() {
  const [search, setSearch] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*, profiles(nome)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const filtered = (logs as any[]).filter((l) =>
    [l.acao, l.entidade, l.profiles?.nome].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Logs de atividade" description="Histórico de ações realizadas no sistema" />
      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filtrar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>
      <Card>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum log registrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((l) => (
              <div key={l.id} className="p-4 flex items-start gap-3 hover:bg-accent/50">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {l.profiles?.nome ?? "Sistema"} <span className="font-normal text-muted-foreground">{l.acao}</span>
                    </p>
                    <Badge variant="outline">{l.entidade}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(l.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
