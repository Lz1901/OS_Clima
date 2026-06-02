import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "tecnico", "financeiro", "supervisor"] as const;
type AppRole = (typeof ROLES)[number];

async function assertCompanyAdmin(context: { supabase: any; userId: string }) {
  const { supabase, userId } = context;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("company_id, is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) throw new Error("Acesso negado");
  if (profile.is_super_admin) return { companyId: profile.company_id as string };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", profile.company_id);
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Error("Apenas administradores podem gerenciar funcionários");
  return { companyId: profile.company_id as string };
}

export const listFuncionarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { companyId } = await assertCompanyAdmin(context);
    const { supabase } = context;

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, nome, email, avatar_url, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p: any) => p.id);
    let rolesMap: Record<string, AppRole[]> = {};
    if (ids.length > 0) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids)
        .eq("company_id", companyId);
      for (const r of roles ?? []) {
        rolesMap[r.user_id] = [...(rolesMap[r.user_id] ?? []), r.role];
      }
    }

    return {
      funcionarios: (profiles ?? []).map((p: any) => ({
        ...p,
        roles: rolesMap[p.id] ?? [],
      })),
    };
  });

export const inviteFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      nome: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(255),
      role: z.enum(ROLES),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { companyId } = await assertCompanyAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica se já existe usuário com esse e-mail
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const found = existing.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );
    if (found) throw new Error("Já existe um usuário com este e-mail");

    // Envia convite por e-mail (Supabase Auth dispara o template de invite)
    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: {
          nome: data.nome,
          invited_company_id: companyId,
          invited_role: data.role,
        },
      });
    if (inviteErr || !invited.user) {
      throw new Error(inviteErr?.message ?? "Erro ao convidar funcionário");
    }
    return { success: true, userId: invited.user.id };
  });

export const updateFuncionarioRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      roles: z.array(z.enum(ROLES)).min(1).max(4),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { companyId } = await assertCompanyAdmin(context);
    const { supabase, userId: callerId } = context;

    // Garante que o alvo é da mesma empresa
    const { data: target } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target || target.company_id !== companyId) {
      throw new Error("Funcionário não encontrado");
    }

    // Não permite o próprio admin remover seu papel de admin e ficar sem nenhum
    if (data.userId === callerId && !data.roles.includes("admin")) {
      throw new Error("Você não pode remover sua própria função de administrador");
    }

    await supabase.from("user_roles").delete().eq("user_id", data.userId).eq("company_id", companyId);
    const rows = data.roles.map((role) => ({
      user_id: data.userId,
      company_id: companyId,
      role,
    }));
    const { error } = await supabase.from("user_roles").insert(rows);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const removeFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { companyId } = await assertCompanyAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Você não pode remover a si mesmo");
    }
    const { supabase } = context;
    const { data: target } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target || target.company_id !== companyId) {
      throw new Error("Funcionário não encontrado");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const listPermissionMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCompanyAdmin(context);
    const { supabase } = context;
    const [{ data: permissions }, { data: rolePerms }] = await Promise.all([
      supabase.from("permissions").select("id, nome, modulo, descricao").order("modulo"),
      supabase.from("role_permissions").select("role, permission_id"),
    ]);
    return {
      permissions: permissions ?? [],
      rolePermissions: rolePerms ?? [],
    };
  });

export const updateRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      role: z.enum(ROLES),
      permissionIds: z.array(z.string().min(1).max(100)).max(100),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context);
    const { supabase } = context;
    await supabase.from("role_permissions").delete().eq("role", data.role);
    if (data.permissionIds.length > 0) {
      const rows = data.permissionIds.map((permission_id) => ({
        role: data.role,
        permission_id,
      }));
      const { error } = await supabase.from("role_permissions").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { success: true };
  });
