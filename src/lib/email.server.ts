// Server-only Resend sender via Lovable connector gateway.
// SECURITY: Never import this file from client/route components.
// API keys are read from process.env at runtime and never exposed.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function getFrom(): string {
  // Allow override via env; default to Resend's onboarding sender (works without verified domain).
  return (
    process.env.RESEND_FROM_EMAIL ||
    "OS Clima <onboarding@resend.dev>"
  );
}

export async function sendEmail({ to, subject, html, from }: SendArgs): Promise<SendResult> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.error("[email] Missing LOVABLE_API_KEY or RESEND_API_KEY", {
      hasLovable: !!LOVABLE_API_KEY,
      hasResend: !!RESEND_API_KEY,
    });
    return { ok: false, error: "email_provider_not_configured" };
  }

  const payload = { from: from ?? getFrom(), to: [to], subject, html };
  console.log("[email] -> Resend send", {
    to,
    from: payload.from,
    subject,
    htmlBytes: html.length,
  });

  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }

    if (!res.ok) {
      const message =
        body?.message ||
        body?.error?.message ||
        body?.raw ||
        `http_${res.status}`;
      console.error("[email] <- Resend ERROR", {
        status: res.status,
        name: body?.name,
        message,
        body,
      });
      return { ok: false, error: message };
    }

    console.log("[email] <- Resend OK", { id: body?.id, to });
    return { ok: true, id: body?.id };
  } catch (err: any) {
    console.error("[email] Resend send exception", err);
    return { ok: false, error: err?.message ?? "unknown_error" };
  }
}

// ---------- Templates ----------

const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f6f8fb;padding:32px 0;color:#0f172a;`;
const cardStyle = `max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(15,23,42,0.08);`;
const btnStyle = `display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;`;

function wrap(content: string): string {
  return `<!doctype html><html><body style="${baseStyle}"><div style="${cardStyle}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
      <div style="width:32px;height:32px;border-radius:8px;background:#0ea5e9;color:#fff;display:inline-block;text-align:center;line-height:32px;font-weight:700;">❄</div>
      <strong style="font-size:18px;">OS Clima</strong>
    </div>
    ${content}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;" />
    <p style="font-size:12px;color:#64748b;margin:0;">OS Clima · Sistema operacional para climatização</p>
  </div></body></html>`;
}

export function inviteTemplate(args: { nome: string; empresa: string; link: string }) {
  return wrap(`
    <h2 style="margin:0 0 12px;font-size:22px;">Você foi convidado(a)!</h2>
    <p style="margin:0 0 16px;line-height:1.6;">Olá <strong>${escapeHtml(args.nome)}</strong>, você foi convidado(a) para acessar a empresa <strong>${escapeHtml(args.empresa)}</strong> no OS Clima.</p>
    <p style="margin:0 0 24px;line-height:1.6;">Clique no botão abaixo para criar sua conta e começar a usar o sistema.</p>
    <p style="margin:0 0 24px;"><a href="${args.link}" style="${btnStyle}">Aceitar convite</a></p>
    <p style="margin:0;font-size:13px;color:#64748b;">Se o botão não funcionar, copie e cole este link no navegador:<br/><span style="word-break:break-all;">${args.link}</span></p>
  `);
}

export function resetTemplate(args: { link: string }) {
  return wrap(`
    <h2 style="margin:0 0 12px;font-size:22px;">Redefinir senha</h2>
    <p style="margin:0 0 16px;line-height:1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no OS Clima.</p>
    <p style="margin:0 0 24px;"><a href="${args.link}" style="${btnStyle}">Criar nova senha</a></p>
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.</p>
    <p style="margin:0;font-size:13px;color:#64748b;word-break:break-all;">${args.link}</p>
  `);
}

export function welcomeTemplate(args: { nome: string; empresa: string; appUrl: string }) {
  return wrap(`
    <h2 style="margin:0 0 12px;font-size:22px;">Bem-vindo(a) ao OS Clima 🎉</h2>
    <p style="margin:0 0 16px;line-height:1.6;">Olá <strong>${escapeHtml(args.nome)}</strong>, sua conta da empresa <strong>${escapeHtml(args.empresa)}</strong> está pronta.</p>
    <p style="margin:0 0 24px;line-height:1.6;">Você já pode acessar o sistema, cadastrar clientes, equipamentos e gerar PMOCs.</p>
    <p style="margin:0 0 24px;"><a href="${args.appUrl}" style="${btnStyle}">Acessar OS Clima</a></p>
    <p style="margin:0;font-size:13px;color:#64748b;">Qualquer dúvida, responda este e-mail.</p>
  `);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
