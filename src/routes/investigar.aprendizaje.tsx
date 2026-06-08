import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Brain, TrendingUp, Trophy, Layers, Clock, FolderKanban, Flame,
  BarChart3, Sparkles, Lightbulb, Target, ArrowUpRight, Workflow,
  Zap, ChevronRight, Activity, Eye, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowConnector } from "@/components/flow-connector";

export const Route = createFileRoute("/investigar/aprendizaje")({
  head: () => ({
    meta: [
      { title: "Aprendizaje Inteligente — AI Content Studio" },
      { name: "description", content: "Convierte tus datos, proyectos y tendencias en recomendaciones accionables." },
    ],
  }),
  component: Aprendizaje,
});

// ============ Mock Data ============
type Platform = "TikTok" | "YouTube" | "Facebook" | "Instagram";

const platformMeta: Record<Platform, { gradient: string; dot: string }> = {
  TikTok: { gradient: "from-[#FE2C55] to-[#25F4EE]", dot: "bg-[#FE2C55]" },
  YouTube: { gradient: "from-[#FF0000] to-[#FF6B6B]", dot: "bg-[#FF0000]" },
  Facebook: { gradient: "from-[#1877F2] to-[#42A5F5]", dot: "bg-[#1877F2]" },
  Instagram: { gradient: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]", dot: "bg-[#DD2A7B]" },
};

const summaryCards = [
  { label: "Mejor categoría", value: "Frutas Medicinales", sub: "+38% interacción", icon: Layers, accent: "text-rose-400" },
  { label: "Mejor plataforma", value: "TikTok", sub: "62% del alcance", icon: TrendingUp, accent: "text-sky-400" },
  { label: "Mejor duración", value: "8 segundos", sub: "Mejor retención", icon: Clock, accent: "text-amber-400" },
  { label: "Mejor proyecto", value: "Frutas de Animales", sub: "1.2M vistas", icon: FolderKanban, accent: "text-emerald-400" },
  { label: "Tendencia más fuerte", value: "Pitahaya + Jaguar", sub: "Explosivo", icon: Flame, accent: "text-orange-400" },
];

interface Niche {
  name: string;
  gradient: string;
  growth: number;
  potential: number;
  popularity: number;
  trend: string;
}
const niches: Niche[] = [
  { name: "Animales IA", gradient: "linear-gradient(135deg,#4a0e4e 0%,#ff8a00 100%)", growth: 84, potential: 91, popularity: 78, trend: "+24%" },
  { name: "Frutas Medicinales", gradient: "linear-gradient(135deg,#134e5e 0%,#71b280 100%)", growth: 95, potential: 97, popularity: 88, trend: "+38%" },
  { name: "Influencers IA", gradient: "linear-gradient(135deg,#2d1b69 0%,#ff6b9d 100%)", growth: 72, potential: 80, popularity: 92, trend: "+15%" },
  { name: "Restauraciones", gradient: "linear-gradient(135deg,#1e3c72 0%,#00d4ff 100%)", growth: 66, potential: 74, popularity: 69, trend: "+11%" },
];

interface PlatformPerf {
  platform: Platform;
  reach: number;
  engagement: number;
  growth: string;
}
const platformPerf: PlatformPerf[] = [
  { platform: "TikTok", reach: 92, engagement: 88, growth: "+34%" },
  { platform: "YouTube", reach: 71, engagement: 64, growth: "+18%" },
  { platform: "Instagram", reach: 58, engagement: 73, growth: "+22%" },
  { platform: "Facebook", reach: 44, engagement: 39, growth: "+7%" },
];

const patterns = [
  { text: "Los videos de 8 segundos tienen mejor retención.", icon: Clock, tag: "Duración" },
  { text: "Los animales creados con Pitahaya generan más interacción.", icon: Heart, tag: "Combinación" },
  { text: "Los videos con storytelling funcionan mejor.", icon: Sparkles, tag: "Formato" },
  { text: "Los contenidos educativos tienen crecimiento constante.", icon: Activity, tag: "Nicho" },
  { text: "Publicar antes en TikTok acelera el alcance en otras plataformas.", icon: TrendingUp, tag: "Distribución" },
];

const recommendations = [
  { text: "Crea más contenido de frutas medicinales.", impact: "Alto", icon: Layers },
  { text: "Publica este formato primero en TikTok.", impact: "Alto", icon: TrendingUp },
  { text: "Combina Pitahaya + Jaguar.", impact: "Explosivo", icon: Zap },
  { text: "Usa duración de 8 a 16 segundos.", impact: "Medio", icon: Clock },
  { text: "Refuerza storytelling en tus próximos 5 videos.", impact: "Alto", icon: Sparkles },
];

const impactVariant: Record<string, "destructive" | "warning" | "info"> = {
  Explosivo: "destructive",
  Alto: "warning",
  Medio: "info",
};


function Aprendizaje() {
  const [tab, setTab] = useState("resumen");

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Aprendizaje Inteligente"
        subtitle="Convierte tus datos, proyectos y tendencias en recomendaciones accionables."
        actions={
          <Button asChild className="gap-2">
            <Link to="/crear/flow"><Workflow className="h-4 w-4" /> Ir a Flow Center</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              <TabsTrigger value="resumen" className="gap-1.5"><Brain className="h-4 w-4" /> Resumen General</TabsTrigger>
              <TabsTrigger value="nicho" className="gap-1.5"><Layers className="h-4 w-4" /> Por Nicho</TabsTrigger>
              <TabsTrigger value="plataforma" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Por Plataforma</TabsTrigger>
              <TabsTrigger value="patrones" className="gap-1.5"><Activity className="h-4 w-4" /> Patrones</TabsTrigger>
              <TabsTrigger value="recomendaciones" className="gap-1.5"><Lightbulb className="h-4 w-4" /> Recomendaciones IA</TabsTrigger>
            </TabsList>

            {/* RESUMEN */}
            <TabsContent value="resumen" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {summaryCards.map((c) => (
                  <Card key={c.label} className="group relative overflow-hidden border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]">
                    <div className="absolute inset-0 bg-[image:var(--gradient-primary)] opacity-0 transition-opacity group-hover:opacity-[0.04]" />
                    <CardContent className="relative p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
                        <c.icon className={cn("h-5 w-5", c.accent)} />
                      </div>
                      <p className="mt-3 text-2xl font-bold tracking-tight">{c.value}</p>
                      <p className={cn("mt-1 text-sm font-medium", c.accent)}>{c.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* NICHO */}
            <TabsContent value="nicho" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {niches.map((n) => (
                  <Card key={n.name} className="overflow-hidden border-border/60 bg-card">
                    <div className="h-24 w-full" style={{ background: n.gradient }} />
                    <CardContent className="-mt-8 space-y-3 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="rounded-lg bg-card/90 px-2.5 py-1 text-base font-semibold backdrop-blur">{n.name}</h3>
                        <Badge variant="success">{n.trend}</Badge>
                      </div>
                      <Metric label="Crecimiento" value={n.growth} />
                      <Metric label="Potencial" value={n.potential} />
                      <Metric label="Popularidad" value={n.popularity} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* PLATAFORMA */}
            <TabsContent value="plataforma" className="space-y-4">
              <Card className="border-border/60 bg-card">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" /> Alcance comparado</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {platformPerf.map((p) => (
                    <div key={p.platform} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <span className={cn("h-2.5 w-2.5 rounded-full", platformMeta[p.platform].dot)} />
                          {p.platform}
                        </span>
                        <span className="text-muted-foreground">{p.reach}% · <span className="text-emerald-400">{p.growth}</span></span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full bg-gradient-to-r", platformMeta[p.platform].gradient)} style={{ width: `${p.reach}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-border/60 bg-card">
                  <CardHeader><CardTitle className="text-sm text-muted-foreground">Engagement por plataforma</CardTitle></CardHeader>
                  <CardContent className="flex items-end gap-4 pt-2">
                    {platformPerf.map((p) => (
                      <div key={p.platform} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-32 w-full items-end justify-center">
                          <div className={cn("w-8 rounded-t-lg bg-gradient-to-t", platformMeta[p.platform].gradient)} style={{ height: `${p.engagement}%` }} />
                        </div>
                        <span className="text-[11px] font-medium">{p.platform}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-card">
                  <CardHeader><CardTitle className="text-sm text-muted-foreground">Insight de distribución</CardTitle></CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold text-foreground">TikTok</span> lidera el alcance con un crecimiento sostenido del <span className="text-emerald-400">+34%</span>.
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Instagram convierte mejor en engagement relativo: prioriza formatos verticales con storytelling corto.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* PATRONES */}
            <TabsContent value="patrones" className="space-y-3">
              {patterns.map((p) => (
                <Card key={p.text} className="group border-border/60 bg-card transition-all hover:border-primary/40">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <p.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{p.text}</p>
                      <Badge variant="secondary" className="mt-2 text-[10px] uppercase tracking-wide">{p.tag}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* RECOMENDACIONES */}
            <TabsContent value="recomendaciones" className="space-y-3">
              {recommendations.map((r) => (
                <Card key={r.text} className="group border-border/60 bg-card transition-all hover:border-primary/40">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
                      <r.icon className="h-5 w-5" />
                    </div>
                    <p className="min-w-0 flex-1 text-sm font-medium">{r.text}</p>
                    <Badge variant={impactVariant[r.impact] ?? "soft"}>{r.impact}</Badge>
                    <Button size="icon" variant="ghost" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel */}
        <aside className="space-y-4">
          <Card className="overflow-hidden border-border/60 bg-card">
            <div className="h-28 w-full" style={{ background: "linear-gradient(135deg,#654ea3 0%,#eaafc8 100%)" }} />
            <CardContent className="-mt-6 space-y-2 p-5">
              <Badge className="bg-card/90 text-foreground backdrop-blur"><Lightbulb className="mr-1 h-3 w-3" /> Idea recomendada</Badge>
              <h3 className="text-base font-semibold">Pitahaya curativa transforma a un jaguar</h3>
              <p className="text-sm text-muted-foreground">Combina storytelling educativo con duración de 8s para TikTok.</p>
              <Button asChild size="sm" className="mt-2 w-full gap-1.5">
                <Link to="/crear/flow">Crear en Flow Center <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardContent className="space-y-1.5 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-orange-400" /> Tendencia recomendada
              </div>
              <h3 className="text-base font-semibold">Frutas Medicinales</h3>
              <p className="text-sm text-emerald-400">+38% interacción esta semana</p>
              <Progress value={88} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardContent className="space-y-1.5 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <FolderKanban className="h-3.5 w-3.5 text-emerald-400" /> Proyecto recomendado
              </div>
              <h3 className="text-base font-semibold">Frutas de Animales</h3>
              <p className="text-sm text-muted-foreground">1.2M vistas acumuladas · 12 versiones</p>
              <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                <Link to="/biblioteca/proyectos">Ver proyecto</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-[image:var(--gradient-primary)]/5">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold">Acceso rápido</h3>
              </div>
              <p className="text-sm text-muted-foreground">Lleva estas recomendaciones a producción.</p>
              <Button asChild className="w-full gap-1.5">
                <Link to="/crear/flow"><Sparkles className="h-4 w-4" /> Abrir Flow Center</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <FlowConnector
        title="Reinicia el ciclo con mejores ideas"
        description="Usa estos aprendizajes para descubrir nuevas tendencias y crear contenido más efectivo."
        steps={[
          { label: "Explorar Tendencias", to: "/investigar/tendencias", icon: TrendingUp },
          { label: "Generar Inspiración", to: "/investigar/inspiracion", icon: Sparkles },
        ]}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
