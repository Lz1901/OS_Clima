import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-layout";

export function AccessDenied({ title = "Acesso negado", message }: { title?: string; message?: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="p-10 text-center">
        <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">
          {message ?? "Você não possui permissão para acessar este recurso. Solicite ao administrador da sua empresa."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">Voltar ao painel</Link>
        </Button>
      </Card>
    </>
  );
}

/**
 * Gate a page by permission. Renders <AccessDenied /> when missing.
 * Loading state of auth context is respected (renders nothing until profile loads).
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) {
  const { hasPermission, loading, profile } = useAuth();
  if (loading || !profile) return null;
  const perms = Array.isArray(permission) ? permission : [permission];
  const ok = perms.some((p) => hasPermission(p));
  if (!ok) return <AccessDenied />;
  return <>{children}</>;
}

/** Inline gate: renders children only when the user has the permission. */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useAuth();
  const perms = Array.isArray(permission) ? permission : [permission];
  const ok = perms.some((p) => hasPermission(p));
  return <>{ok ? children : fallback}</>;
}
