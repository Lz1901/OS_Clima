import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/pmocs")({
  component: () => (
    <AppLayout>
      <PageHeader title="PMOCs" description="Ordens de serviço PMOC" />
      <Card className="p-12 text-center">
        <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Módulo PMOC em construção</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          O fluxo completo de PMOC (checklist mobile, assinatura digital, geração de PDF e envio automático por email) será habilitado na próxima fase.
        </p>
      </Card>
    </AppLayout>
  ),
});
