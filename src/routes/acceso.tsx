import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAccessStatus, loginWithSecret } from "@/lib/access-control.functions";
import { storeAccessSessionToken } from "@/lib/access-token-attacher";

export const Route = createFileRoute("/acceso")({
  head: () => ({
    meta: [
      { title: "Acceso · Prompt Studio" },
      { name: "description", content: "Introduce tu clave de acceso para entrar al estudio." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AccesoPage,
});

function AccesoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const statusFn = useServerFn(getAccessStatus);
  const loginFn = useServerFn(loginWithSecret);
  const [password, setPassword] = useState("");

  // Si ya está autenticado, redirige al home.
  const { data: status } = useQuery({
    queryKey: ["access", "status"],
    queryFn: () => statusFn(),
    staleTime: 5_000,
  });
  useEffect(() => {
    if (status?.authenticated) {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, status?.authenticated]);

  const loginMut = useMutation({
    mutationFn: (pwd: string) => loginFn({ data: { password: pwd } }),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.message ?? "Acceso incorrecto.");
        return;
      }
      // Solo persistimos el token en sessionStorage cuando estamos dentro del iframe
      // de preview de Lovable, donde las cookies SameSite=Lax pueden ser bloqueadas.
      // En producción confiamos exclusivamente en la cookie httpOnly.
      if (typeof window !== "undefined") {
        const host = window.location.hostname.toLowerCase();
        const isPreview =
          host.includes("lovableproject.com") ||
          host.startsWith("id-preview--") ||
          host.includes("-dev.lovable.app");
        if (isPreview && res.sessionToken) {
          storeAccessSessionToken(res.sessionToken);
        }
      }
      qc.setQueryData(["access", "status"], { authenticated: true });
      toast.success("Acceso concedido.");
      window.location.replace("/");
    },
    onError: (err) => {
      console.error("login error", err);
      toast.error("No se pudo iniciar sesión.");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    loginMut.mutate(password);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="surface-card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="text-h3 font-semibold">Acceso al estudio</h1>
        <p className="mt-2 text-meta text-muted-foreground">
          Introduce tu clave compartida para continuar. Modo single-owner.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="password">Clave</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
                disabled={loginMut.isPending}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loginMut.isPending || !password.trim()}>
            {loginMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Comprobando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
        <p className="mt-6 text-[11px] text-muted-foreground">
          La clave nunca se almacena en el navegador. Se valida en el servidor y se emite una cookie firmada.
        </p>
      </div>
    </div>
  );
}