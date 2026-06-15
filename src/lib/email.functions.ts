import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public reset-password request: user is not authenticated yet.
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      email: z.string().trim().email().max(255),
      redirectTo: z.string().url().max(500),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, resetTemplate } = await import("@/lib/email.server");

    // Always return success to avoid email enumeration.
    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email.toLowerCase(),
      options: { redirectTo: data.redirectTo },
    });

    if (error || !linkData?.properties?.action_link) {
      // User may not exist — still return ok.
      return { success: true };
    }

    await sendEmail({
      to: data.email,
      subject: "Redefinir sua senha — OS Clima",
      html: resetTemplate({ link: linkData.properties.action_link }),
    });
    return { success: true };
  });

// Welcome email — called by client after successful signup.
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ appUrl: z.string().url().max(500) }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, email, company_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.email) return { success: false };

    const { data: company } = await supabase
      .from("companies")
      .select("nome")
      .eq("id", profile.company_id)
      .maybeSingle();

    const { sendEmail, welcomeTemplate } = await import("@/lib/email.server");
    const result = await sendEmail({
      to: profile.email,
      subject: "Bem-vindo(a) ao OS Clima",
      html: welcomeTemplate({
        nome: profile.nome ?? "",
        empresa: company?.nome ?? "sua empresa",
        appUrl: data.appUrl,
      }),
    });
    return { success: result.ok };
  });
