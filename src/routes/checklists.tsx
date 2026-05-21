import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/checklists")({
  component: () => (
    <AppLayout>
      <Checklists />
    </AppLayout>
  ),
});

function Checklists() {
  const { data: templates = [] } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("checklist_templates")
        .select("*, checklist_items(id)")
        .order("created_at");
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader title="Checklists" description="Modelos de checklist personalizáveis" />
      <div className="grid md:grid-cols-2 gap-3">
        {(templates as any[]).map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ListChecks className="h-5 w-5" />
              </div>
              {t.ativo && <Badge>Ativo</Badge>}
            </div>
            <p className="font-semibold">{t.nome}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>
            <p className="text-xs mt-3 text-muted-foreground">{t.checklist_items?.length ?? 0} itens</p>
          </Card>
        ))}
      </div>
    </>
  );
}
