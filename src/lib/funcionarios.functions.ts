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
      appUrl: z.string().url().max(500),
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

    // Empresa para usar no template do e-mail
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("nome")
      .eq("id", companyId)
      .maybeSingle();

    // Cria um pending invite server-side. O trigger handle_new_user usa
    // essa tabela (não a metadata enviada pelo usuário) para vincular o
    // novo usuário à empresa correta, evitando escalonamento cross-tenant.
    const { error: pendingErr } = await supabaseAdmin
      .from("pending_invites")
      .insert({
        email: data.email.toLowerCase(),
        company_id: companyId,
        role: data.role,
        invited_by: context.userId,
      });
    if (pendingErr) throw new Error(pendingErr.message);

    // Gera um link de convite (cria o usuário em auth.users de forma
    // pendente) e envia via Resend com template próprio.
    const redirectTo = `${data.appUrl.replace(/\/$/, "")}/reset-password`;
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: data.email.toLowerCase(),
        options: { redirectTo, data: { nome: data.nome } },
      });

    if (linkErr || !linkData?.properties?.action_link || !linkData.user) {
      throw new Error(linkErr?.message ?? "Erro ao gerar link de convite");
    }

    const { sendEmail, inviteTemplate } = await import("@/lib/email.server");
    const emailResult = await sendEmail({
      to: data.email,
      subject: `Convite para ${company?.nome ?? "OS Clima"}`,
      html: inviteTemplate({
        nome: data.nome,
        empresa: company?.nome ?? "OS Clima",
        link: linkData.properties.action_link,
      }),
    });

    // Fallback: se o envio falhar, o usuário já foi criado e o invite
    // existe — retornamos o link para o admin compartilhar manualmente.
    return {
      success: true,
      userId: linkData.user.id,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? null : emailResult.error,
      inviteLink: emailResult.ok ? null : linkData.properties.action_link,
    };
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
    // Global table: only super admins may modify role_permissions
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_super_admin")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile?.is_super_admin) {
      throw new Error("Forbidden: apenas Super Admin pode alterar a matriz global de permissões");
    }

    const { error: delErr } = await supabaseAdmin
      .from("role_permissions")
      .delete()
      .eq("role", data.role);
    if (delErr) throw new Error(delErr.message);

    if (data.permissionIds.length > 0) {
      const rows = data.permissionIds.map((permission_id) => ({
        role: data.role,
        permission_id,
      }));
      const { error } = await supabaseAdmin.from("role_permissions").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { success: true, role: data.role, count: data.permissionIds.length };
  });
