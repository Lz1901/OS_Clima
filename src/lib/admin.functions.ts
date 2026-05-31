import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.is_super_admin) throw new Error("Forbidden: Super Admin only");
}

export const adminGlobalStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const [companies, profiles, pmocs, equipamentos, transactions] = await Promise.all([
      supabaseAdmin.from("companies").select("id, status", { count: "exact" }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("pmocs").select("id, status", { count: "exact" }),
      supabaseAdmin.from("equipamentos").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("financial_transactions").select("valor, tipo, status, created_at"),
    ]);

    const cs = companies.data ?? [];
    const ativas = cs.filter((c: any) => c.status === "ativa").length;
    const suspensas = cs.filter((c: any) => c.status === "suspensa").length;
    const bloqueadas = cs.filter((c: any) => c.status === "bloqueada").length;
    const pmocsFinalizados = (pmocs.data ?? []).filter((p: any) => p.status === "finalizado").length;

    const receita = (transactions.data ?? [])
      .filter((t: any) => t.tipo === "receita" && t.status === "pago")
      .reduce((acc: number, t: any) => acc + Number(t.valor), 0);

    const thisMonth = new Date();
    const firstDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
    const receitaMensal = (transactions.data ?? [])
      .filter((t: any) => t.tipo === "receita" && t.status === "pago" && t.created_at >= firstDay)
      .reduce((acc: number, t: any) => acc + Number(t.valor), 0);

    return {
      totalCompanies: companies.count ?? 0,
      ativas,
      suspensas,
      bloqueadas,
      totalUsers: profiles.count ?? 0,
      totalPmocs: pmocs.count ?? 0,
      pmocsFinalizados,
      totalEquipamentos: equipamentos.count ?? 0,
      receitaTotal: receita,
      receitaMensal,
    };
  });

export const adminListCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (companies ?? []).map((c: any) => c.id);
    if (ids.length === 0) return { companies: [] };

    const [users, pmocs, equip] = await Promise.all([
      supabaseAdmin.from("profiles").select("company_id").in("company_id", ids),
      supabaseAdmin.from("pmocs").select("company_id").in("company_id", ids),
      supabaseAdmin.from("equipamentos").select("company_id").in("company_id", ids),
    ]);

    const count = (rows: any[] | null, id: string) =>
      (rows ?? []).filter((r) => r.company_id === id).length;

    return {
      companies: (companies ?? []).map((c: any) => ({
        ...c,
        users_count: count(users.data, c.id),
        pmocs_count: count(pmocs.data, c.id),
        equipamentos_count: count(equip.data, c.id),
      })),
    };
  });

export const adminCreateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      nome: z.string().trim().min(2).max(120),
      email: z.string().trim().email(),
      cnpj: z.string().trim().max(20).optional().nullable(),
      telefone: z.string().trim().max(30).optional().nullable(),
      adminNome: z.string().trim().min(2).max(120),
      adminSenha: z.string().min(8).max(72),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);

    // Create auth user — handle_new_user trigger creates company + profile + role
    const { data: created, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.adminSenha,
      email_confirm: true,
      user_metadata: { nome: data.adminNome, company_name: data.nome },
    });
    if (userErr || !created.user) throw new Error(userErr?.message ?? "Erro ao criar usuário");

    // Patch company with extra fields
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", created.user.id)
      .single();

    if (profile?.company_id) {
      await supabaseAdmin
        .from("companies")
        .update({ cnpj: data.cnpj ?? null, telefone: data.telefone ?? null })
        .eq("id", profile.company_id);
    }
    return { success: true, userId: created.user.id, companyId: profile?.company_id };
  });

export const adminSetCompanyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      companyId: z.string().uuid(),
      status: z.enum(["ativa", "suspensa", "bloqueada"]),
      reason: z.string().max(500).optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const patch: { status: "ativa" | "suspensa" | "bloqueada"; suspended_at: string | null; block_reason: string | null } = {
      status: data.status,
      suspended_at: null,
      block_reason: null,
    };
    if (data.status !== "ativa") {
      patch.suspended_at = new Date().toISOString();
      patch.block_reason = data.reason ?? null;
    }
    const { error } = await supabaseAdmin.from("companies").update(patch).eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().trim().email(),
      newPassword: z.string().min(8).max(72),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    const user = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) throw new Error("Usuário não encontrado");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminDeleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ companyId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    // Find users of this company and delete them (cascade clears their data)
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_id", data.companyId);
    for (const u of users ?? []) {
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
    const { error } = await supabaseAdmin.from("companies").delete().eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
