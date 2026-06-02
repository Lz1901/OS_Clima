import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  Wrench,
  ClipboardCheck,
  ListChecks,
  Settings,
  Bell,
  LogOut,
  Snowflake,
  Activity,
  DollarSign,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pmocs", label: "PMOCs", icon: ClipboardCheck, permission: "pmoc.view" },
  { to: "/clientes", label: "Clientes", icon: Users, permission: "clientes.view" },
  { to: "/unidades", label: "Unidades", icon: Building2, permission: "clientes.view" },
  { to: "/equipamentos", label: "Equipamentos", icon: Wrench, permission: "equipamentos.manage" },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign, permission: "financeiro.view" },
  { to: "/checklists", label: "Checklists", icon: ListChecks, permission: "configuracoes.manage" },
  { to: "/logs", label: "Atividade", icon: Activity, permission: "configuracoes.manage" },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
  { to: "/configuracoes", label: "Configurações", icon: Settings, permission: "configuracoes.manage" },
  { to: "/admin", label: "Painel Super Admin", icon: ShieldCheck, superAdminOnly: true },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut, hasPermission } = useAuth();
  const { location } = useRouterState();

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Snowflake className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold tracking-tight">ClimaOS</span>
          <span className="text-xs text-sidebar-foreground/60">SO da Climatização</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map((item) => {
          if (item.superAdminOnly && !profile?.is_super_admin) return null;
          if (item.permission && !hasPermission(item.permission)) return null;

          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 py-2 mb-2">
          <p className="text-sm font-medium truncate">{profile?.nome ?? "Usuário"}</p>
          <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </aside>
  );
}
