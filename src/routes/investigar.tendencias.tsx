import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Flame, TrendingUp, Rocket, Sparkles, Eye, Heart, Wand2, Bookmark,
  Play, ArrowUpRight, Zap, Target, Users, Lightbulb, ChevronRight,
  Clock, Star, Globe2, Loader2, Trash2, RefreshCw, Library as LibraryIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowConnector } from "@/components/flow-connector";
import {
  listViralTrends,
  seedViralTrends,
  toggleFavoriteTrend,
  toggleSavedTrend,
  deleteViralTrend,
  VIRAL_PLATFORMS,
  VIRAL_COUNTRIES,
  VIRAL_CATEGORIES,
  type ViralTrend,
} from "@/lib/viral-trends.functions";

export const Route = createFileRoute("/investigar/tendencias")({
  head: () => ({
    meta: [
      { title: "Centro de Tendencias IA — AI Content Studio" },
      { name: "description", content: "Descubre contenido viral y oportunidades de creación para TikTok, YouTube, Facebook e Instagram." },
    ],
  }),
  component: TrendsCenter,
});

// ============ Types & Mock Data ============
type Platform = "TikTok" | "YouTube" | "Facebook" | "Instagram";
type Virality = "bajo" | "medio" | "alto" | "explosivo";
type Category =
  | "Animales" | "Frutas" | "Curiosidades" | "Influencers"
  | "Restauraciones" | "Salud" | "Tecnología" | "Viral";

const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Facebook", "Instagram"];
const COUNTRIES = VIRAL_COUNTRIES;
const LANGUAGES = ["Portugués", "Español", "Inglés"] as const;
const PERIODS = ["24 horas", "7 días", "30 días"] as const;
const CATEGORIES = VIRAL_CATEGORIES;

const platformColor: Record<Platform, string> = {
  TikTok: "from-[#FE2C55] to-[#25F4EE]",
  YouTube: "from-[#FF0000] to-[#FF6B6B]",
  Facebook: "from-[#1877F2] to-[#42A5F5]",
  Instagram: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
};

const viralityMeta: Record<Virality, { label: string; dot: string; ring: string; text: string }> = {
  bajo:      { label: "Bajo",      dot: "bg-emerald-500",  ring: "ring-emerald-500/30",  text: "text-emerald-400" },
  medio:     { label: "Medio",     dot: "bg-amber-400",    ring: "ring-amber-400/30",    text: "text-amber-300" },
  alto:      { label: "Alto",      dot: "bg-orange-500",   ring: "ring-orange-500/30",   text: "text-orange-400" },
  explosivo: { label: "Explosivo", dot: "bg-rose-500",     ring: "ring-rose-500/40",     text: "text-rose-400" },
};

interface Trend {
  id: string;
  title: string;
  category: Category;
  platform: Platform;
  virality: Virality;
  views: string;
  growth: string;
  gradient: string;
  duration: string;
}

const gradients = [
  "linear-gradient(135deg, #2d1b69 0%, #ff6b9d 100%)",
  "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
  "linear-gradient(135deg, #4a0e4e 0%, #ff8a00 100%)",
  "linear-gradient(135deg, #1e3c72 0%, #2a5298 60%, #00d4ff 100%)",
  "linear-gradient(135deg, #ff512f 0%, #f09819 100%)",
  "linear-gradient(135deg, #355c7d 0%, #6c5b7b 50%, #c06c84 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
  "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
  "linear-gradient(135deg, #2c3e50 0%, #fd746c 100%)",
  "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)",
  "linear-gradient(135deg, #f5af19 0%, #f12711 100%)",
];

const TRENDS: Trend[] = [
  { id: "t1", title: "Animales hechos con Pitahaya — el reto que rompe TikTok", category: "Animales", platform: "TikTok", virality: "explosivo", views: "24.8M", growth: "+482%", duration: "0:08", gradient: gradients[0] },
  { id: "t2", title: "Frutas gigantes generadas con IA en Veo 3", category: "Frutas", platform: "YouTube", virality: "alto", views: "9.1M", growth: "+218%", duration: "0:45", gradient: gradients[1] },
  { id: "t3", title: "Restauración extrema de un Mustang del 67", category: "Restauraciones", platform: "Instagram", virality: "explosivo", views: "12.4M", growth: "+356%", duration: "0:30", gradient: gradients[2] },
  { id: "t4", title: "Influencer rural muestra su rutina diaria", category: "Influencers", platform: "TikTok", virality: "alto", views: "7.2M", growth: "+164%", duration: "0:15", gradient: gradients[3] },
  { id: "t5", title: "Curiosidades de frutas medicinales que pocos conocen", category: "Salud", platform: "Facebook", virality: "medio", views: "3.8M", growth: "+92%", duration: "1:12", gradient: gradients[4] },
  { id: "t6", title: "5 datos curiosos sobre el cerebro humano", category: "Curiosidades", platform: "YouTube", virality: "alto", views: "6.6M", growth: "+201%", duration: "2:08", gradient: gradients[5] },
  { id: "t7", title: "La nueva generación de IA en 60 segundos", category: "Tecnología", platform: "Instagram", virality: "medio", views: "2.9M", growth: "+74%", duration: "1:00", gradient: gradients[6] },
  { id: "t8", title: "Transformación en 30 días: antes y después", category: "Viral", platform: "TikTok", virality: "explosivo", views: "18.2M", growth: "+412%", duration: "0:12", gradient: gradients[7] },
  { id: "t9", title: "Animales escondidos en frutas: ¿los encuentras?", category: "Animales", platform: "Facebook", virality: "alto", views: "5.4M", growth: "+138%", duration: "0:22", gradient: gradients[8] },
  { id: "t10", title: "Restauración de una bicicleta de 1960", category: "Restauraciones", platform: "YouTube", virality: "medio", views: "2.1M", growth: "+68%", duration: "3:45", gradient: gradients[9] },
  { id: "t11", title: "El zumo que dicen 'cura todo' — la verdad", category: "Salud", platform: "TikTok", virality: "bajo", views: "880K", growth: "+34%", duration: "0:18", gradient: gradients[10] },
  { id: "t12", title: "Pitahaya negra: la fruta que se hizo viral", category: "Frutas", platform: "Instagram", virality: "alto", views: "4.3M", growth: "+187%", duration: "0:14", gradient: gradients[11] },
];

interface Niche {
  id: string;
  name: string;
  description: string;
  growth: number;     // %
  potential: number;  // 0-100
  competition: number;// 0-100
  category: Category;
  gradient: string;
}

const NICHES: Niche[] = [
  { id: "n1", name: "Frutas gigantes IA", description: "Frutas hiperrealistas a escala imposible generadas con modelos de video.", growth: 482, potential: 94, competition: 28, category: "Frutas", gradient: gradients[0] },
  { id: "n2", name: "Animales creados con frutas", description: "Microcriaturas surrealistas hechas con sandía, pitahaya y cítricos.", growth: 356, potential: 91, competition: 22, category: "Animales", gradient: gradients[1] },
  { id: "n3", name: "Restauraciones extremas", description: "Antes/después dramatizados de objetos casi perdidos.", growth: 214, potential: 86, competition: 41, category: "Restauraciones", gradient: gradients[2] },
  { id: "n4", name: "Influencers rurales", description: "Vida en el campo, animales y cocina tradicional.", growth: 168, potential: 78, competition: 52, category: "Influencers", gradient: gradients[3] },
  { id: "n5", name: "Curiosidades de salud", description: "Datos virales respaldados por ciencia visual.", growth: 142, potential: 81, competition: 47, category: "Salud", gradient: gradients[4] },
  { id: "n6", name: "Tecnología explicada", description: "IA, gadgets y futurismo en piezas cortas.", growth: 122, potential: 74, competition: 63, category: "Tecnología", gradient: gradients[5] },
];

interface Opportunity {
  id: string;
  title: string;
  description: string;
  potential: number;   // 0-100
  difficulty: "Baja" | "Media" | "Alta";
  competition: "Baja" | "Media" | "Alta";
  tags: string[];
  gradient: string;
}

const OPPORTUNITIES: Opportunity[] = [
  { id: "o1", title: "Animales creados con Pitahaya", description: "Combinación virala de animales surrealistas + fruta de moda. Veo 3 + Flow.", potential: 96, difficulty: "Baja", competition: "Baja", tags: ["TikTok", "Reels", "8s"], gradient: gradients[7] },
  { id: "o2", title: "Curiosidades de frutas medicinales", description: "Datos sorprendentes con visual editorial. Carrusel + voz IA.", potential: 88, difficulty: "Baja", competition: "Media", tags: ["Reels", "YouTube Shorts"], gradient: gradients[1] },
  { id: "o3", title: "Historias de transformación", description: "Antes/después con storytelling emocional. Perfecto para Facebook.", potential: 82, difficulty: "Media", competition: "Media", tags: ["Facebook", "Stories"], gradient: gradients[4] },
  { id: "o4", title: "Restauraciones de vehículos", description: "Clips de 30s con timelapse y música cinemática.", potential: 79, difficulty: "Media", competition: "Alta", tags: ["YouTube", "Instagram"], gradient: gradients[2] },
  { id: "o5", title: "Mini-documentales de IA", description: "Explica un concepto IA con voz, b-roll y subtítulos.", potential: 74, difficulty: "Alta", competition: "Media", tags: ["YouTube", "Shorts"], gradient: gradients[5] },
  { id: "o6", title: "Influencers virtuales rurales", description: "Personaje IA recurrente en escenarios de campo.", potential: 71, difficulty: "Alta", competition: "Baja", tags: ["TikTok", "Reels"], gradient: gradients[3] },
];

interface Recommendation {
  id: string;
  text: string;
  insight: string;
  metric: string;
  icon: typeof Sparkles;
}

const RECOMMENDATIONS: Recommendation[] = [
  { id: "r1", text: "Los animales de frutas funcionan mejor en TikTok",        insight: "Engagement 3.2x superior al resto de formatos.", metric: "+320% engagement", icon: Flame },
  { id: "r2", text: "Los videos de 8 segundos generan más retención",          insight: "Completion rate medio 87% en formato vertical.", metric: "87% retención",    icon: Clock },
  { id: "r3", text: "Los contenidos de Pitahaya tienen mayor potencial",       insight: "Tendencia emergente con baja competencia global.", metric: "+482% growth",     icon: Zap },
  { id: "r4", text: "Las curiosidades de salud están creciendo",               insight: "Categoría con +140% vs. mes anterior.",            metric: "+142% MoM",        icon: TrendingUp },
  { id: "r5", text: "Reels verticales 9:16 superan a 1:1 en Instagram",        insight: "El alcance sube +56% vs. cuadrado.",               metric: "+56% reach",       icon: Target },
  { id: "r6", text: "Storytelling personal mejora el guardado en Facebook",    insight: "Saves +2.1x cuando hay narrador en primera persona.", metric: "2.1x saves",     icon: Heart },
];

// ============ Page ============
function TrendsCenter() {
  const [platform, setPlatform] = useState<Platform | "Todas">("Todas");
  const [country, setCountry] = useState<string>("Global");
  const [language, setLanguage] = useState<string>("Portugués");
  const [period, setPeriod] = useState<string>("7 días");
  const [category, setCategory] = useState<string>("Todas");

  const filteredTrends = useMemo(() => {
    return TRENDS.filter((t) =>
      (platform === "Todas" || t.platform === platform) &&
      (category === "Todas" || t.category === category)
    );
  }, [platform, category]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Centro de Tendencias IA"
        subtitle="Descubre contenido viral y oportunidades de creación para TikTok, YouTube, Facebook e Instagram."
        actions={
          <>
            <Badge className="hidden h-8 items-center gap-1.5 rounded-full border-0 bg-gradient-to-r from-rose-500/20 to-orange-500/20 px-3 text-rose-300 sm:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
              </span>
              Live · {new Date().toLocaleDateString("es")}
            </Badge>
            <Button size="sm" className="gap-1.5">
              <Wand2 className="h-3.5 w-3.5" /> Crear desde tendencia
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="surface-card flex flex-wrap items-center gap-2 p-3">
        <FilterSelect value={platform} onChange={(v) => setPlatform(v as Platform | "Todas")} label="Plataforma" options={["Todas", ...PLATFORMS]} />
        <FilterSelect value={country} onChange={setCountry} label="País" options={[...COUNTRIES]} />
        <FilterSelect value={language} onChange={setLanguage} label="Idioma" options={[...LANGUAGES]} />
        <FilterSelect value={period} onChange={setPeriod} label="Periodo" options={[...PERIODS]} />
        <FilterSelect value={category} onChange={(v) => setCategory(v as Category | "Todas")} label="Categoría" options={["Todas", ...CATEGORIES]} />
        <div className="ml-auto hidden text-[11px] text-muted-foreground md:block">
          {filteredTrends.length} resultados · actualizado hace 4 min
        </div>
      </div>

      {/* Body: Tabs + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="radar" className="space-y-5">
          <TabsList className="h-11 rounded-xl bg-card/60 p-1">
            <TabTrigger value="radar" icon={Globe2}>Radar Viral</TabTrigger>
            <TabTrigger value="tendencias" icon={Flame}>Tendencias</TabTrigger>
            <TabTrigger value="nichos" icon={TrendingUp}>Nichos Emergentes</TabTrigger>
            <TabTrigger value="oportunidades" icon={Rocket}>Oportunidades Virales</TabTrigger>
            <TabTrigger value="recomendaciones" icon={Sparkles}>Recomendaciones IA</TabTrigger>
          </TabsList>

          <TabsContent value="radar" className="space-y-5">
            <ViralRadar
              platform={platform === "Todas" ? null : platform}
              country={country === "Global" ? null : country}
              category={category === "Todas" ? null : category}
            />
          </TabsContent>

          <TabsContent value="tendencias" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTrends.map((t) => <TrendCard key={t.id} t={t} />)}
            </div>
          </TabsContent>

          <TabsContent value="nichos" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {NICHES.map((n) => <NicheCard key={n.id} n={n} />)}
            </div>
          </TabsContent>

          <TabsContent value="oportunidades" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {OPPORTUNITIES.map((o) => <OpportunityCard key={o.id} o={o} />)}
            </div>
          </TabsContent>

          <TabsContent value="recomendaciones" className="space-y-3">
            {RECOMMENDATIONS.map((r) => <RecommendationRow key={r.id} r={r} />)}
          </TabsContent>
        </Tabs>

        {/* Right sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <WidgetTrendOfDay />
          <WidgetTopCategory />
          <WidgetRecommendedIdea />
          <WidgetPromptShortcut />
        </aside>
      </div>

      <FlowConnector
        title="Siguiente paso en tu flujo creativo"
        description="Convierte estas tendencias en ideas visuales y prompts listos para producir."
        steps={[
          { label: "Guardar en Inspiración", to: "/investigar/inspiracion", icon: Sparkles },
          { label: "Crear Prompt", to: "/crear/prompts", icon: Wand2 },
        ]}
      />
    </div>
  );
}

// ============ Building blocks ============
function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: string[]; }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px] border-border/60 bg-background/40 text-[12.5px]">
        <span className="mr-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function TabTrigger({ value, icon: Icon, children }: { value: string; icon: typeof Flame; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="h-9 gap-1.5 rounded-lg px-3 text-[13px] data-[state=active]:bg-accent data-[state=active]:shadow-[var(--shadow-soft)]"
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </TabsTrigger>
  );
}

function ViralityPill({ v }: { v: Virality }) {
  const m = viralityMeta[v];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-black/40 px-2 py-0.5 text-[10.5px] font-medium backdrop-blur-md ring-1", m.ring, m.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function PlatformBadge({ p }: { p: Platform }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm", platformColor[p])}>
      {p}
    </span>
  );
}

function TrendCard({ t }: { t: Trend }) {
  return (
    <div className="group surface-card hover-lift overflow-hidden p-0">
      <div className="relative aspect-[16/10] overflow-hidden" style={{ background: t.gradient }}>
        {/* film grain */}
        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 25% 30%, white 1px, transparent 1px), radial-gradient(circle at 75% 70%, white 1px, transparent 1px)", backgroundSize: "8px 8px, 12px 12px" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <PlatformBadge p={t.platform} />
          <ViralityPill v={t.virality} />
        </div>

        <button className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/90 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
          <Bookmark className="h-3.5 w-3.5" />
        </button>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <Badge className="border-0 bg-black/60 text-[10px] text-white backdrop-blur-md">{t.duration}</Badge>
          <div className="flex items-center gap-2 text-[11px] text-white/95">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {t.views}</span>
            <span className="flex items-center gap-1 text-emerald-300"><ArrowUpRight className="h-3 w-3" /> {t.growth}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3.5">
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{t.title}</h3>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="rounded-full text-[10px] font-normal">{t.category}</Badge>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver detalles"><Eye className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Guardar en inspiración"><Bookmark className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Crear prompt" asChild>
              <Link
                to="/crear/prompts"
                search={{ from: "tendencia", idea: t.title, plataforma: t.platform.toLowerCase(), categoria: t.category, tags: t.title }}
              >
                <Wand2 className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NicheCard({ n }: { n: Niche }) {
  return (
    <div className="group surface-card hover-lift overflow-hidden p-0">
      <div className="relative h-28 overflow-hidden" style={{ background: n.gradient }}>
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <Badge className="border-0 bg-black/50 text-[10px] text-white backdrop-blur-md">{n.category}</Badge>
        </div>
        <div className="absolute bottom-2 right-3 flex items-baseline gap-1 text-emerald-300">
          <ArrowUpRight className="h-4 w-4" />
          <span className="text-[20px] font-bold tabular-nums">+{n.growth}%</span>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-[15px] font-semibold">{n.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{n.description}</p>
        </div>
        <div className="space-y-2">
          <Meter label="Potencial"   value={n.potential}   tone="emerald" />
          <Meter label="Competencia" value={n.competition} tone="amber" />
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <Badge variant="secondary" className="rounded-full text-[10px] font-normal">
            <Flame className="mr-1 h-3 w-3 text-rose-400" /> Tendencia ascendente
          </Badge>
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[12px]" asChild>
            <Link
              to="/crear/prompts"
              search={{ from: "tendencia", idea: n.name, categoria: n.category, tags: n.description }}
            >
              <Wand2 className="h-3 w-3" /> Crear prompt
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "primary" }) {
  const color = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-400" : "bg-primary";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/60">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function OpportunityCard({ o }: { o: Opportunity }) {
  return (
    <div className="surface-card hover-lift relative overflow-hidden p-0">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: o.gradient }} />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[var(--shadow-soft)]" style={{ background: o.gradient }}>
            <Rocket className="h-4 w-4" />
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Potencial</div>
            <div className="text-[22px] font-bold leading-none text-foreground">{o.potential}<span className="text-[12px] text-muted-foreground">/100</span></div>
          </div>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold leading-snug">{o.title}</h3>
          <p className="mt-1 text-[12.5px] text-muted-foreground">{o.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatChip label="Dificultad"  value={o.difficulty} tone={o.difficulty === "Baja" ? "good" : o.difficulty === "Media" ? "warn" : "bad"} />
          <StatChip label="Competencia" value={o.competition} tone={o.competition === "Baja" ? "good" : o.competition === "Media" ? "warn" : "bad"} />
        </div>

        <div className="flex flex-wrap gap-1">
          {o.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent/60 px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
          ))}
        </div>

        <Button asChild size="sm" className="w-full gap-1.5">
          <Link
            to="/crear/prompts"
            search={{ from: "tendencia", idea: o.title, categoria: o.tags.join(", "), tags: o.description }}
          >
            <Wand2 className="h-3.5 w-3.5" /> Crear contenido ahora
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" }) {
  const styles =
    tone === "good" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : tone === "warn" ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
    : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return (
    <div className={cn("flex items-center justify-between rounded-lg border px-2.5 py-1.5", styles)}>
      <span className="text-[10.5px] uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-[11.5px] font-semibold">{value}</span>
    </div>
  );
}

function RecommendationRow({ r }: { r: Recommendation }) {
  const Icon = r.icon;
  return (
    <div className="surface-card hover-lift flex items-center gap-4 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
        <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold leading-snug">{r.text}</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{r.insight}</p>
      </div>
      <Badge variant="secondary" className="hidden shrink-0 rounded-full bg-emerald-500/10 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/20 sm:inline-flex">
        {r.metric}
      </Badge>
      <Button size="icon" variant="ghost" className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============ Right sidebar widgets ============
function WidgetCard({ title, icon: Icon, children, accent }: { title: string; icon: typeof Sparkles; children: React.ReactNode; accent?: string; }) {
  return (
    <div className="surface-card relative overflow-hidden p-4">
      {accent && <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/60">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

function WidgetTrendOfDay() {
  const t = TRENDS[0];
  return (
    <WidgetCard title="Tendencia del día" icon={Flame} accent={t.gradient}>
      <div className="relative mb-3 aspect-video overflow-hidden rounded-lg" style={{ background: t.gradient }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <PlatformBadge p={t.platform} />
        <div className="absolute top-2 left-2"><PlatformBadge p={t.platform} /></div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10.5px] text-white">
          <ViralityPill v={t.virality} />
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {t.views}</span>
        </div>
      </div>
      <h4 className="line-clamp-2 text-[13px] font-semibold">{t.title}</h4>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
        <ArrowUpRight className="h-3 w-3" /> {t.growth} en 24h
      </div>
    </WidgetCard>
  );
}

function WidgetTopCategory() {
  const items = [
    { label: "Animales",      pct: 38 },
    { label: "Frutas",        pct: 29 },
    { label: "Restauraciones",pct: 18 },
    { label: "Salud",         pct: 15 },
  ];
  return (
    <WidgetCard title="Top categoría" icon={Star}>
      <div className="space-y-2.5">
        {items.map((i, idx) => (
          <div key={i.label} className="space-y-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-orange-400" : idx === 2 ? "bg-amber-300" : "bg-emerald-400")} />
                {i.label}
              </span>
              <span className="text-muted-foreground tabular-nums">{i.pct}%</span>
            </div>
            <Progress value={i.pct} className="h-1" />
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

function WidgetRecommendedIdea() {
  return (
    <WidgetCard title="Idea recomendada" icon={Lightbulb} accent="linear-gradient(90deg, #f59e0b, #ef4444)">
      <p className="text-[13px] font-semibold leading-snug">Animales hechos con Pitahaya negra</p>
      <p className="mt-1 text-[12px] text-muted-foreground">Combina tendencia explosiva con baja competencia. Ideal para Reels verticales de 8s.</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <MiniStat label="Potencial"  value="96" />
        <MiniStat label="Dificultad" value="Baja" />
        <MiniStat label="Comp."      value="Baja" />
      </div>
      <Button asChild size="sm" className="mt-3 w-full gap-1.5">
        <Link to="/crear/flow"><Sparkles className="h-3.5 w-3.5" /> Usar en Flow</Link>
      </Button>
    </WidgetCard>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-1.5 py-1.5">
      <div className="text-[13px] font-semibold leading-tight">{value}</div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function WidgetPromptShortcut() {
  return (
    <WidgetCard title="Acceso rápido" icon={Wand2}>
      <Link to="/crear/prompts" className="group block rounded-lg border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-3 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Wand2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">Generador de Prompts</div>
            <div className="text-[11px] text-muted-foreground">Convierte una tendencia en prompt</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-1.5 text-[11.5px]">
          <Link to="/crear/imagen"><Sparkles className="h-3 w-3" /> Imagen</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-1.5 text-[11.5px]">
          <Link to="/crear/video"><Play className="h-3 w-3" /> Video</Link>
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md bg-accent/40 px-2.5 py-2 text-[11px] text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>2.4K creadores usaron tendencias hoy</span>
      </div>
    </WidgetCard>
  );
}

// ============ Radar Viral (DB-backed) ============
function ViralRadar({
  platform,
  country,
  category,
}: {
  platform: string | null;
  country: string | null;
  category: string | null;
}) {
  const qc = useQueryClient();
  const list = useServerFn(listViralTrends);
  const seed = useServerFn(seedViralTrends);
  const toggleFav = useServerFn(toggleFavoriteTrend);
  const toggleSaved = useServerFn(toggleSavedTrend);
  const remove = useServerFn(deleteViralTrend);

  const [savedOnly, setSavedOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const filters = { platform, country, category, savedOnly, favoritesOnly };

  const trendsQuery = useQuery({
    queryKey: ["viral", "list", filters],
    queryFn: () => list({ data: filters }),
  });
  const savedQuery = useQuery({
    queryKey: ["viral", "saved"],
    queryFn: () => list({ data: { savedOnly: true, limit: 30 } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["viral"] });
    qc.invalidateQueries({ queryKey: ["radar", "stats"] });
  };

  const seedMut = useMutation({
    mutationFn: seed,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(
          res.inserted > 0
            ? `Catálogo cargado · ${res.inserted} tendencias`
            : `Catálogo ya cargado · ${res.skipped} tendencias`,
        );
        invalidate();
      } else {
        toast.error(res.message);
      }
    },
  });
  const favMut = useMutation({ mutationFn: toggleFav, onSuccess: invalidate });
  const savedMut = useMutation({
    mutationFn: toggleSaved,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(res.saved ? "Guardada en Biblioteca" : "Quitada de Biblioteca");
        invalidate();
      } else if ("message" in res) {
        toast.error(res.message);
      }
    },
  });
  const delMut = useMutation({
    mutationFn: remove,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Eliminada");
        invalidate();
      } else {
        toast.error(res.message);
      }
    },
  });

  const trends = trendsQuery.data ?? [];
  const saved = savedQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="surface-card flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Globe2 className="h-3.5 w-3.5 text-primary" />
          <span>
            Radar real: {trends.length} tendencias
            {platform ? ` · ${platform}` : ""}
            {country ? ` · ${country}` : ""}
            {category ? ` · ${category}` : ""}
          </span>
        </div>
        <Button
          size="sm"
          variant={savedOnly ? "default" : "outline"}
          className="h-8 gap-1.5"
          onClick={() => setSavedOnly((v) => !v)}
        >
          <Bookmark className="h-3.5 w-3.5" /> Guardadas
        </Button>
        <Button
          size="sm"
          variant={favoritesOnly ? "default" : "outline"}
          className="h-8 gap-1.5"
          onClick={() => setFavoritesOnly((v) => !v)}
        >
          <Heart className="h-3.5 w-3.5" /> Favoritas
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto gap-1.5"
          onClick={() => trendsQuery.refetch()}
          disabled={trendsQuery.isFetching}
        >
          {trendsQuery.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refrescar
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
          onClick={() => seedMut.mutate(undefined)}
          disabled={seedMut.isPending}
        >
          {seedMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Cargar catálogo
        </Button>
      </div>

      <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
        Mostrando catálogo curado de Radar Viral. Las fuentes externas en tiempo real se
        conectarán cuando el conector correspondiente esté disponible.
      </div>

      {trendsQuery.isLoading ? (
        <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Escaneando radar…
        </div>
      ) : trends.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-8 text-center">
          <Globe2 className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium">El radar está vacío</p>
          <p className="max-w-md text-[12px] text-muted-foreground">
            Carga el catálogo curado para empezar a descubrir tendencias virales.
          </p>
          <Button
            size="sm"
            className="gap-1.5 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
            onClick={() => seedMut.mutate(undefined)}
            disabled={seedMut.isPending}
          >
            <Sparkles className="h-3.5 w-3.5" /> Cargar catálogo
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trends.map((t) => (
            <ViralTrendCard
              key={t.id}
              t={t}
              onFav={() => favMut.mutate({ data: { id: t.id } })}
              onSave={() => savedMut.mutate({ data: { id: t.id } })}
              onDelete={() => delMut.mutate({ data: { id: t.id } })}
            />
          ))}
        </div>
      )}

      {/* Historial guardado */}
      <div className="surface-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <LibraryIcon className="h-4 w-4 text-primary" />
          <h3 className="text-[13.5px] font-semibold">Historial · tendencias guardadas</h3>
          <Badge variant="outline" className="ml-auto border-border/60 bg-background/60 text-[10px] font-normal">
            {saved.length}
          </Badge>
        </div>
        {savedQuery.isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Cargando…
          </div>
        ) : saved.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-muted-foreground">
            Aún no has guardado tendencias. Usa el botón de guardar en cada tarjeta.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {saved.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Bookmark className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">{t.title}</p>
                  <p className="truncate text-[10.5px] text-muted-foreground">
                    {t.platform} · {t.country} · {t.category} · score {t.viral_score}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10.5px]">
                  <Link
                    to="/crear/prompts"
                    search={{
                      from: "tendencia",
                      idea: t.title,
                      plataforma: t.platform.toLowerCase(),
                      pais: t.country,
                      categoria: t.category,
                      tags: t.keywords ?? t.title,
                    }}
                  >
                    <Wand2 className="h-3 w-3" /> Prompt
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ViralTrendCard({
  t,
  onFav,
  onSave,
  onDelete,
}: {
  t: ViralTrend;
  onFav: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const score = Math.max(0, Math.min(100, t.viral_score));
  const detected = new Date(t.created_at).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
  });
  return (
    <div className="surface-card hover-lift overflow-hidden p-0">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-0 bg-[image:var(--gradient-primary)] text-[10px] text-primary-foreground">
            {t.platform}
          </Badge>
          <Badge variant="outline" className="border-border/60 bg-background/40 text-[10px] font-normal">
            <Globe2 className="mr-1 h-2.5 w-2.5" />
            {t.country}
          </Badge>
          <Badge variant="secondary" className="rounded-full text-[10px] font-normal">
            {t.category}
          </Badge>
        </div>

        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{t.title}</h3>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Viral score</span>
            <span className="font-mono tabular-nums font-semibold text-primary">{score}</span>
          </div>
          <Progress value={score} className="h-1.5" />
        </div>

        {t.keywords && (
          <p className="line-clamp-2 text-[10.5px] text-muted-foreground">
            {t.keywords.split(",").map((k) => `#${k.trim()}`).join(" ")}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <span className="text-[10.5px] text-muted-foreground">Detectada · {detected}</span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title={t.favorite ? "Quitar favorito" : "Marcar favorito"}
              onClick={onFav}
            >
              <Heart className={cn("h-3.5 w-3.5", t.favorite && "fill-primary text-primary")} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title={t.saved ? "Quitar de Biblioteca" : "Enviar a Biblioteca"}
              onClick={onSave}
            >
              <Bookmark className={cn("h-3.5 w-3.5", t.saved && "fill-primary text-primary")} />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Crear prompt" asChild>
              <Link
                to="/crear/prompts"
                search={{
                  from: "tendencia",
                  idea: t.title,
                  plataforma: t.platform.toLowerCase(),
                  pais: t.country,
                  categoria: t.category,
                  tags: t.keywords ?? t.title,
                }}
              >
                <Wand2 className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Eliminar"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
