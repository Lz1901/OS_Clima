import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/notificacoes")({
  component: () => (
    <AppLayout>
      <Notificacoes />
    </AppLayout>
  ),
});

function Notificacoes() {
  const { data: items = [] } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader title="Notificações" />
      <Card>
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sem notificações.</p>
          </div>
        ) : (
          <div className="divide-y">
            {(items as any[]).map((n) => (
              <div key={n.id} className="p-4">
                <p className="font-medium text-sm">{n.titulo}</p>
                <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
