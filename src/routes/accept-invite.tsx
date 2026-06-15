import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Snowflake } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { acceptInvite, getInviteByToken } from "@/lib/invites.functions";

const searchSchema = z.object({ token: z.string().uuid().optional() });

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AcceptInvitePage,
});

type InviteInfo =
  | { ok: true; email: string; empresa: string; role: string }
  | { ok: false; reason: "not_found" | "used" | "expired" };

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const getInfo = useServerFn(getInviteByToken);
  const accept = useServerFn(acceptInvite);

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [nome, setNome] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInfo({ ok: false, reason: "not_found" });
      return;
    }
    getInfo({ data: { token } }).then((r) => setInfo(r as InviteInfo));
  }, [token, getInfo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (pwd.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    setLoading(true);
    try {
      const res = await accept({ data: { token, nome, password: pwd } });
      // Faz login automático
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: res.email,
        password: pwd,
      });
      if (loginErr) {
        toast.success("Conta criada! Faça login para entrar.");
        navigate({ to: "/auth" });
        return;
      }
      toast.success("Bem-vindo(a) ao OS Clima!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao aceitar convite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-3">
            <Snowflake className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ClimaOS</h1>
          <p className="text-sm text-muted-foreground">Aceitar convite</p>
        </div>

        <Card className="p-6">
          {!info && <p className="text-sm text-muted-foreground">Validando convite...</p>}

          {info && !info.ok && (
            <div className="space-y-3">
              <h2 className="font-semibold">Convite indisponível</h2>
              <p className="text-sm text-muted-foreground">
                {info.reason === "used" && "Este convite já foi utilizado."}
                {info.reason === "expired" && "Este convite expirou. Solicite um novo ao administrador."}
                {info.reason === "not_found" && "Link de convite inválido ou não encontrado."}
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Ir para login
              </Button>
            </div>
          )}

          {info?.ok && (
            <form onSubmit={submit} className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                Você foi convidado(a) para a empresa{" "}
                <strong>{info.empresa}</strong> com o e-mail{" "}
                <strong>{info.email}</strong>.
              </div>
              <div className="space-y-2">
                <Label>Seu nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label>Crie uma senha</Label>
                <Input
                  type="password"
                  minLength={6}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando conta..." : "Aceitar e entrar"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
