import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { hasOpenAIKey } from "@/lib/openai.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Sparkles,
  Gem,
  Workflow,
  Film,
  Video,
  Youtube,
  Music2,
  Facebook,
  Instagram,
  Cpu,
  Share2,
  Zap,
  Activity,
  RefreshCw,
  Settings2,
  Plug,
  PlugZap,
  UserCog,
  Wand2,
  ArrowRightLeft,
  Library,
  CalendarClock,
  CheckCircle2,
  Clock,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integraciones")({
  head: () => ({
    meta: [
      { title: "Centro de Integraciones — AI Content Studio" },
      {
        name: "description",
        content:
          "Centraliza y gestiona todas las herramientas externas del ecosistema AI Content Studio: IA, redes sociales y automatizaciones.",
      },
    ],
  }),
  component: CentroIntegraciones,
});

// ============ Types & Mock Data ============
type Status = "connected" | "disconnected";

interface AIService {
  id: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  status: Status;
  account: string | null;
  lastSync: string | null;
  category: string;
}

const aiServices: AIService[] = [
  { id: "chatgpt", name: "ChatGPT (OpenAI)", icon: MessageSquare, gradient: "from-[#10A37F] to-[#1FD0A3]", status: "disconnected", account: null, lastSync: null, category: "Lenguaje · Generador de Prompts" },
  { id: "google-ai", name: "Google AI Studio", icon: Sparkles, gradient: "from-[#4285F4] to-[#9B72CB]", status: "connected", account: "studio@aicontent.io", lastSync: "Hace 12 min", category: "Lenguaje" },
  { id: "gemini", name: "Gemini", icon: Gem, gradient: "from-[#8E6FF7] to-[#4285F4]", status: "connected", account: "creator@gmail.com", lastSync: "Hace 1 h", category: "Multimodal" },
  { id: "flow", name: "Flow", icon: Workflow, gradient: "from-[#FF6B35] to-[#F7C548]", status: "disconnected", account: null, lastSync: null, category: "Video" },
  { id: "veo", name: "Veo", icon: Film, gradient: "from-[#1A73E8] to-[#34A0FF]", status: "disconnected", account: null, lastSync: null, category: "Video" },
  { id: "kling", name: "Kling", icon: Video, gradient: "from-[#FF2E63] to-[#9333EA]", status: "disconnected", account: null, lastSync: null, category: "Video" },
];

interface SocialService {
  id: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  status: Status;
  account: string | null;
  connectedOn: string | null;
}

const socialServices: SocialService[] = [
  { id: "tiktok", name: "TikTok", icon: Music2, gradient: "from-[#FE2C55] to-[#25F4EE]", status: "connected", account: "@aicontentstudio", connectedOn: "12 mar 2025" },
  { id: "youtube", name: "YouTube", icon: Youtube, gradient: "from-[#FF0000] to-[#FF6B6B]", status: "connected", account: "AI Content Studio", connectedOn: "28 feb 2025" },
  { id: "facebook", name: "Facebook", icon: Facebook, gradient: "from-[#1877F2] to-[#42A5F5]", status: "disconnected", account: null, connectedOn: null },
  { id: "instagram", name: "Instagram", icon: Instagram, gradient: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]", status: "disconnected", account: null, connectedOn: null },
];

interface Automation {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const automations: Automation[] = [
  { id: "gen-prompt", title: "Generar Prompt automáticamente", description: "Crea prompts optimizados a partir de una tendencia detectada.", icon: Wand2, accent: "text-amber-400" },
  { id: "send-flow", title: "Enviar a Flow", description: "Convierte un prompt aprobado en un video dentro de Flow Center.", icon: ArrowRightLeft, accent: "text-sky-400" },
  { id: "save-library", title: "Guardar en Biblioteca", description: "Archiva resultados generados en la carpeta del proyecto activo.", icon: Library, accent: "text-emerald-400" },
  { id: "schedule", title: "Programar publicación", description: "Agenda la publicación en redes en el mejor horario sugerido.", icon: CalendarClock, accent: "text-violet-400" },
];

// ============ Helpers ============
function StatusPill({ status }: { status: Status }) {
  return (
    <Badge
      className={cn(
        "gap-1.5 border-transparent font-medium",
        status === "connected"
          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20"
          : "bg-muted text-muted-foreground hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "connected" ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/60",
        )}
      />
      {status === "connected" ? "Conectado" : "Desconectado"}
    </Badge>
  );
}

function ServiceIcon({ icon: Icon, gradient }: { icon: LucideIcon; gradient: string }) {
  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", gradient)}>
      <Icon className="h-6 w-6" />
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-medium text-foreground/90">{value}</span>
    </div>
  );
}

// ============ Main ============
function CentroIntegraciones() {
  const [ai, setAi] = useState<AIService[]>(aiServices);
  const [social, setSocial] = useState<SocialService[]>(socialServices);
  const checkKey = useServerFn(hasOpenAIKey);

  useEffect(() => {
    checkKey()
      .then((r) => {
        setAi((prev) =>
          prev.map((s) =>
            s.id === "chatgpt"
              ? r.configured
                ? { ...s, status: "connected", account: "API Key configurada", lastSync: "Activo" }
                : { ...s, status: "disconnected", account: null, lastSync: null }
              : s,
          ),
        );
      })
      .catch(() => {
        /* noop */
      });
  }, [checkKey]);

  const toggleAi = (id: string) =>
    setAi((prev) =>
      prev.map((s) =>
        s.id === id
          ? s.status === "connected"
            ? { ...s, status: "disconnected", account: null, lastSync: null }
            : { ...s, status: "connected", account: "studio@aicontent.io", lastSync: "Justo ahora" }
          : s,
      ),
    );

  const toggleSocial = (id: string) =>
    setSocial((prev) =>
      prev.map((s) =>
        s.id === id
          ? s.status === "connected"
            ? { ...s, status: "disconnected", account: null, connectedOn: null }
            : { ...s, status: "connected", account: "@aicontentstudio", connectedOn: "Hoy" }
          : s,
      ),
    );

  const stats = useMemo(() => {
    const all = [...ai, ...social];
    const connected = all.filter((s) => s.status === "connected").length;
    return { connected, pending: all.length - connected, total: all.length };
  }, [ai, social]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto w-full max-w-[1800px] space-y-8 p-6 lg:p-10">
        <PageHeader
          title="Centro de Integraciones"
          subtitle="Centraliza todas las herramientas externas de tu ecosistema creativo en un solo panel."
          actions={
            <Button className="gap-2">
              <Plug className="h-4 w-4" /> Añadir integración
            </Button>
          }
        />

        {/* Quick overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard icon={PlugZap} label="APIs conectadas" value={`${stats.connected}`} accent="text-emerald-400" />
          <OverviewCard icon={Clock} label="APIs pendientes" value={`${stats.pending}`} accent="text-amber-400" />
          <OverviewCard icon={Activity} label="Último acceso" value="Hoy, 14:32" accent="text-sky-400" />
          <OverviewCard icon={Wifi} label="Estado general" value="Operativo" accent="text-emerald-400" />
        </div>

        <Tabs defaultValue="ia" className="space-y-6">
          <TabsList className="bg-muted/40">
            <TabsTrigger value="ia" className="gap-1.5"><Cpu className="h-4 w-4" /> IA</TabsTrigger>
            <TabsTrigger value="social" className="gap-1.5"><Share2 className="h-4 w-4" /> Redes Sociales</TabsTrigger>
            <TabsTrigger value="auto" className="gap-1.5"><Zap className="h-4 w-4" /> Automatizaciones</TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5"><Activity className="h-4 w-4" /> Estado del Sistema</TabsTrigger>
          </TabsList>

          {/* ---- IA ---- */}
          <TabsContent value="ia" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ai.map((s) => (
              <Card key={s.id} className="group overflow-hidden border-border/60 bg-card transition-all hover:border-border hover:shadow-[var(--shadow-elevated)]">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ServiceIcon icon={s.icon} gradient={s.gradient} />
                      <div>
                        <h3 className="font-semibold leading-tight">{s.name}</h3>
                        <span className="text-xs text-muted-foreground">{s.category}</span>
                      </div>
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="space-y-2 border-t border-border/50 pt-3">
                    <MetaRow icon={RefreshCw} label="Última sincronización" value={s.lastSync ?? "—"} />
                    <MetaRow icon={UserCog} label="Cuenta conectada" value={s.account ?? "Sin cuenta"} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {s.status === "connected" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleAi(s.id)}>Desconectar</Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">Cambiar cuenta</Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Configurar</TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={() => toggleAi(s.id)}>
                        <Plug className="h-3.5 w-3.5" /> Conectar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ---- Redes Sociales ---- */}
          <TabsContent value="social" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {social.map((s) => (
              <Card key={s.id} className="group overflow-hidden border-border/60 bg-card transition-all hover:border-border hover:shadow-[var(--shadow-elevated)]">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ServiceIcon icon={s.icon} gradient={s.gradient} />
                      <h3 className="font-semibold leading-tight">{s.name}</h3>
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="space-y-2 border-t border-border/50 pt-3">
                    <MetaRow icon={UserCog} label="Cuenta" value={s.account ?? "Sin cuenta"} />
                    <MetaRow icon={CalendarClock} label="Fecha de conexión" value={s.connectedOn ?? "—"} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {s.status === "connected" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleSocial(s.id)}>Desconectar</Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">Cambiar cuenta</Button>
                      </>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={() => toggleSocial(s.id)}>
                        <Plug className="h-3.5 w-3.5" /> Conectar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ---- Automatizaciones ---- */}
          <TabsContent value="auto" className="space-y-4">
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Próximamente.</span> Configura flujos automáticos entre tus
              herramientas. Estos espacios están preparados para futuras conexiones.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {automations.map((a) => (
                <Card key={a.id} className="border-border/60 bg-card transition-all hover:border-border">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                      <a.icon className={cn("h-5 w-5", a.accent)} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold leading-tight">{a.title}</h3>
                      <p className="text-sm text-muted-foreground">{a.description}</p>
                    </div>
                    <Badge variant="outline" className="border-border/60 text-muted-foreground">Pronto</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ---- Estado del Sistema ---- */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OverviewCard icon={CheckCircle2} label="APIs conectadas" value={`${stats.connected} / ${stats.total}`} accent="text-emerald-400" />
              <OverviewCard icon={Clock} label="APIs pendientes" value={`${stats.pending}`} accent="text-amber-400" />
              <OverviewCard icon={Activity} label="Último acceso" value="Hoy, 14:32" accent="text-sky-400" />
              <OverviewCard icon={Wifi} label="Estado general" value="Operativo" accent="text-emerald-400" />
            </div>
            <Card className="border-border/60 bg-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Activity className="h-4 w-4 text-primary" /> Detalle por servicio
                </h3>
                <div className="divide-y divide-border/50">
                  {[...ai, ...social].map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white", s.gradient)}>
                          <s.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{s.name}</span>
                      </div>
                      <StatusPill status={s.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

function OverviewCard({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent: string }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60">
          <Icon className={cn("h-5 w-5", accent)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}