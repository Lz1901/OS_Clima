import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  UserPlus,
  Trash2,
  Pencil,
  Shield,
  Users as UsersIcon,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { RequirePermission } from "@/components/permission-gate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
import {
  inviteFuncionario,
  listFuncionarios,
  listPermissionMatrix,
  removeFuncionario,
  updateFuncionarioRoles,
  updateRolePermissions,
} from "@/lib/funcionarios.functions";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  financeiro: "Financeiro",
  supervisor: "Supervisor",
};

const ROLES = ["admin", "tecnico", "financeiro", "supervisor"] as const;
type Role = (typeof ROLES)[number];

export const Route = createFileRoute("/funcionarios")({
  component: () => (
    <AppLayout>
      <RequirePermission permission="funcionarios.view">
        <FuncionariosPage />
      </RequirePermission>
    </AppLayout>
  ),
});

function FuncionariosPage() {
  const { profile, hasPermission } = useAuth();
  const canManage =
    profile?.is_super_admin ||
    hasPermission("funcionarios.edit") ||
    hasPermission("funcionarios.create") ||
    hasPermission("configuracoes.manage");

  if (!canManage) {
    return (
      <>
        <PageHeader title="Funcionários" />
        <Card className="p-8 text-center">
          <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Você pode visualizar a equipe, mas apenas administradores podem
            convidar ou alterar cargos.
          </p>
        </Card>
      </>
    );
  }

  const isSuperAdmin = !!profile?.is_super_admin;

  return (
    <>
      <PageHeader title="Funcionários & Permissões" />
      <Tabs defaultValue="team" className="w-full">
        <TabsList>
          <TabsTrigger value="team">
            <UsersIcon className="h-4 w-4 mr-2" /> Equipe
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="matrix">
              <Shield className="h-4 w-4 mr-2" /> Matriz de permissões
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="team" className="mt-4">
          <TeamTab />
        </TabsContent>
        {isSuperAdmin && (
          <TabsContent value="matrix" className="mt-4">
            <PermissionMatrixTab />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

// ---- TEAM TAB --------------------------------------------------------------

function TeamTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fetchList = useServerFn(listFuncionarios);
  const { data, isLoading } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: () => fetchList(),
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<null | {
    userId: string;
    nome: string;
    roles: string[];
  }>(null);
  const [removeTarget, setRemoveTarget] = useState<null | {
    userId: string;
    nome: string;
  }>(null);

  const removeFn = useServerFn(removeFuncionario);
  const removeMut = useMutation({
    mutationFn: (userId: string) => removeFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Funcionário removido");
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
      setRemoveTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">Equipe da empresa</h2>
          <p className="text-xs text-muted-foreground">
            Convide funcionários por e-mail e atribua cargos.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Convidar
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : (data?.funcionarios?.length ?? 0) === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Nenhum funcionário cadastrado ainda.
        </div>
      ) : (
        <div className="divide-y">
          {data!.funcionarios.map((f: any) => (
            <div
              key={f.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{f.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                <p className="text-xs text-muted-foreground">
                  Desde {formatDate(f.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {f.roles.length === 0 ? (
                  <Badge variant="outline">Sem cargo</Badge>
                ) : (
                  f.roles.map((r: string) => (
                    <Badge key={r} variant="secondary">
                      {ROLE_LABEL[r] ?? r}
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditTarget({ userId: f.id, nome: f.nome, roles: f.roles })
                  }
                >
                  <Pencil className="h-4 w-4 mr-1" /> Cargos
                </Button>
                {f.id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget({ userId: f.id, nome: f.nome })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {editTarget && (
        <EditRolesDialog
          target={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.nome} perderá o acesso à empresa imediatamente. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && removeMut.mutate(removeTarget.userId)}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const inviteFn = useServerFn(inviteFuncionario);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("tecnico");

  const mut = useMutation({
    mutationFn: () =>
      inviteFn({ data: { nome, email, role, appUrl: window.location.origin } }),
    onSuccess: (res: any) => {
      if (res?.emailSent === false && res?.inviteLink) {
        const errMsg = res.emailError ?? "Falha desconhecida no envio";
        // Mostra o link no clipboard + toast persistente com o erro real.
        navigator.clipboard?.writeText(res.inviteLink).catch(() => {});
        toast.error(
          `E-mail falhou: ${errMsg}. Link copiado para a área de transferência — envie manualmente ao funcionário.`,
          { duration: 20000, description: res.inviteLink }
        );
      } else {
        toast.success("Convite enviado por e-mail");
      }
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
      setNome("");
      setEmail("");
      setRole("tecnico");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar funcionário</DialogTitle>
          <DialogDescription>
            Um e-mail será enviado com link para definir senha e entrar na empresa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="i-nome">Nome</Label>
            <Input
              id="i-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="João Silva"
            />
          </div>
          <div>
            <Label htmlFor="i-email">E-mail</Label>
            <Input
              id="i-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@empresa.com"
            />
          </div>
          <div>
            <Label>Cargo inicial</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!nome.trim() || !email.trim() || mut.isPending}
          >
            <Mail className="h-4 w-4 mr-2" />
            {mut.isPending ? "Enviando…" : "Enviar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRolesDialog({
  target,
  onClose,
}: {
  target: { userId: string; nome: string; roles: string[] };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isSelf = user?.id === target.userId;
  const updateFn = useServerFn(updateFuncionarioRoles);
  const [selected, setSelected] = useState<Set<Role>>(
    new Set(target.roles.filter((r) => (ROLES as readonly string[]).includes(r)) as Role[])
  );
  const mut = useMutation({
    mutationFn: () =>
      updateFn({
        data: { userId: target.userId, roles: Array.from(selected) },
      }),
    onSuccess: () => {
      toast.success("Cargos atualizados");
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (r: Role) => {
    // Bloqueia o próprio admin de remover seu cargo de administrador
    if (isSelf && r === "admin" && selected.has(r)) {
      toast.error("Você não pode remover sua própria função de administrador");
      return;
    }
    const next = new Set(selected);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    setSelected(next);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargos de {target.nome}</DialogTitle>
          <DialogDescription>
            Um funcionário pode ter mais de um cargo. As permissões são
            cumulativas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {ROLES.map((r) => {
            const lockSelfAdmin = isSelf && r === "admin";
            return (
              <label
                key={r}
                className={`flex items-center gap-3 p-3 rounded-md border ${
                  lockSelfAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-accent"
                }`}
              >
                <Checkbox
                  checked={selected.has(r)}
                  disabled={lockSelfAdmin}
                  onCheckedChange={() => toggle(r)}
                />
                <span className="text-sm font-medium">{ROLE_LABEL[r]}</span>
                {lockSelfAdmin && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Você não pode remover seu próprio admin
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={selected.size === 0 || mut.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- PERMISSION MATRIX -----------------------------------------------------

function PermissionMatrixTab() {
  const qc = useQueryClient();
  const fetchMatrix = useServerFn(listPermissionMatrix);
  const updateFn = useServerFn(updateRolePermissions);
  const { data, isLoading } = useQuery({
    queryKey: ["permission-matrix"],
    queryFn: () => fetchMatrix(),
  });

  // local edit state: role -> Set<permissionId>
  const baseline = useMemo(() => {
    const map: Record<Role, Set<string>> = {
      admin: new Set(),
      tecnico: new Set(),
      financeiro: new Set(),
      supervisor: new Set(),
    };
    for (const rp of data?.rolePermissions ?? []) {
      const role = rp.role as Role;
      if (map[role]) map[role].add(rp.permission_id);
    }
    return map;
  }, [data]);

  const [edits, setEdits] = useState<Record<Role, Set<string>> | null>(null);
  const state = edits ?? baseline;

  const toggle = (role: Role, permId: string) => {
    const next: Record<Role, Set<string>> = {
      admin: new Set(state.admin),
      tecnico: new Set(state.tecnico),
      financeiro: new Set(state.financeiro),
      supervisor: new Set(state.supervisor),
    };
    if (next[role].has(permId)) next[role].delete(permId);
    else next[role].add(permId);
    setEdits(next);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!edits) return;
      for (const role of ROLES) {
        await updateFn({
          data: { role, permissionIds: Array.from(edits[role]) },
        });
      }
    },
    onSuccess: () => {
      toast.success("Matriz de permissões atualizada");
      qc.invalidateQueries({ queryKey: ["permission-matrix"] });
      setEdits(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Carregando…
      </Card>
    );
  }

  const grouped: Record<string, any[]> = {};
  for (const p of data?.permissions ?? []) {
    grouped[p.modulo] = [...(grouped[p.modulo] ?? []), p];
  }

  return (
    <Card>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">Matriz de permissões</h2>
          <p className="text-xs text-muted-foreground">
            Defina quais ações cada cargo pode executar. Admin sempre tem acesso
            total recomendado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {edits && (
            <Button variant="outline" onClick={() => setEdits(null)}>
              Descartar
            </Button>
          )}
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!edits || saveMut.isPending}
          >
            {saveMut.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3 font-medium">Permissão</th>
              {ROLES.map((r) => (
                <th key={r} className="text-center p-3 font-medium whitespace-nowrap">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([modulo, perms]) => (
              <Fragment key={`m-${modulo}`}>
                <tr className="bg-muted/20">
                  <td colSpan={5} className="p-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">
                    {modulo}
                  </td>
                </tr>
                {perms.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.id}</p>
                    </td>
                    {ROLES.map((r) => (
                      <td key={r} className="text-center p-3">
                        <Checkbox
                          checked={state[r].has(p.id)}
                          onCheckedChange={() => toggle(r, p.id)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
