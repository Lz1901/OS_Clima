import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Retorna metadados básicos do convite — usado pela página /accept-invite
// para mostrar empresa/email antes do usuário preencher o formulário.
export const getInviteByToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("pending_invites")
      .select("email, company_id, role, used_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) return { ok: false as const, reason: "not_found" as const };
    if (invite.used_at) return { ok: false as const, reason: "used" as const };
    if (new Date(invite.expires_at) < new Date()) {
      return { ok: false as const, reason: "expired" as const };
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("nome")
      .eq("id", invite.company_id)
      .maybeSingle();

    return {
      ok: true as const,
      email: invite.email,
      role: invite.role,
      empresa: company?.nome ?? "OS Clima",
    };
  });

// Aceita o convite: cria o usuário via Admin API e marca o convite como usado.
// Não depende de redirect URL do Supabase Auth.
export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      token: z.string().uuid(),
      nome: z.string().trim().min(2).max(120),
      password: z.string().min(6).max(200),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("pending_invites")
      .select("id, email, company_id, role, used_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (inviteErr) throw new Error(inviteErr.message);
    if (!invite) throw new Error("Convite inválido");
    if (invite.used_at) throw new Error("Este convite já foi utilizado");
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("Este convite expirou");
    }

    // Se o usuário já existir (ex.: alguém com mesmo e-mail), apenas
    // garantimos a associação à empresa via user_roles e marcamos o convite.
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const existing = usersPage.users.find(
      (u) => u.email?.toLowerCase() === invite.email.toLowerCase()
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Garante profile vinculado à empresa do convite
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            company_id: invite.company_id,
            nome: data.nome,
            email: invite.email,
          },
          { onConflict: "id" }
        );
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, company_id: invite.company_id, role: invite.role },
        { onConflict: "user_id,company_id,role" }
      );
    } else {
      // O trigger handle_new_user lê pending_invites por e-mail e
      // associa profile + user_roles à empresa correta automaticamente.
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: invite.email,
          password: data.password,
          email_confirm: true,
          user_metadata: { nome: data.nome },
        });
      if (createErr || !created.user) {
        throw new Error(createErr?.message ?? "Erro ao criar usuário");
      }
      userId = created.user.id;
    }

    // Marca o convite específico como usado (mesmo que o trigger já tenha marcado outro).
    await supabaseAdmin
      .from("pending_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { ok: true, email: invite.email };
  });
