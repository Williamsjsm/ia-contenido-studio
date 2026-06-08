import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bookmark,
  Heart,
  MoreHorizontal,
  Sparkles,
  FolderPlus,
  Wand2,
  Film,
  Flame,
  Brain,
  Apple,
  UserCircle,
  Clapperboard,
  TrendingUp,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowConnector } from "@/components/flow-connector";

export const Route = createFileRoute("/investigar/inspiracion")({
  head: () => ({
    meta: [
      { title: "Inspiración IA — AI Content Studio" },
      { name: "description", content: "Guarda, organiza y explora ideas para contenido viral con IA." },
    ],
  }),
  component: InspiracionPage,
});

// ============================================================
// Types & mock data
// ============================================================

type TabId = "viral" | "storytelling" | "ideas" | "frutas" | "influencers";
type Platform = "TikTok" | "Instagram" | "YouTube" | "Midjourney" | "Veo" | "Runway" | "Pinterest";

interface InspirationItem {
  id: string;
  title: string;
  category: string;
  platform: Platform;
  viral: number; // 0–100
  gradient: string;
  h: number; // tile height bucket for masonry (px)
  saved?: boolean;
  favorite?: boolean;
  badge?: string;
}

const g = (a: string, b: string, c?: string) =>
  c ? `linear-gradient(135deg, ${a}, ${b} 55%, ${c})` : `linear-gradient(135deg, ${a}, ${b})`;

const TABS: { id: TabId; label: string; icon: typeof Flame; emoji: string }[] = [
  { id: "viral", label: "Viral", icon: Flame, emoji: "🔥" },
  { id: "storytelling", label: "Storytelling", icon: Clapperboard, emoji: "🎬" },
  { id: "ideas", label: "Ideas IA", icon: Brain, emoji: "🧠" },
  { id: "frutas", label: "Frutas IA", icon: Apple, emoji: "🍉" },
  { id: "influencers", label: "Influencers IA", icon: UserCircle, emoji: "👩" },
];

const DATA: Record<TabId, InspirationItem[]> = {
  viral: [
    { id: "v1", title: "Tigre dorado bajo niebla volumétrica", category: "Cinemático", platform: "Midjourney", viral: 97, gradient: g("#f59e0b", "#7c2d12", "#1c1917"), h: 380, favorite: true },
    { id: "v2", title: "POV cocina ASMR — tungsteno cálido", category: "Social", platform: "TikTok", viral: 92, gradient: g("#dc2626", "#fb923c"), h: 280 },
    { id: "v3", title: "Skyline Tokyo neón cinemático", category: "Cinemático", platform: "Instagram", viral: 88, gradient: g("#0ea5e9", "#a855f7", "#0f172a"), h: 340 },
    { id: "v4", title: "Aurora boreal sintética", category: "Naturaleza", platform: "YouTube", viral: 84, gradient: g("#10b981", "#6366f1", "#020617"), h: 300 },
    { id: "v5", title: "Influencer IA presenta producto", category: "Branding", platform: "Runway", viral: 79, gradient: g("#a78bfa", "#ec4899"), h: 420 },
    { id: "v6", title: "Macro frutas cortadas en slow-mo", category: "Producto", platform: "TikTok", viral: 91, gradient: g("#fde68a", "#f59e0b"), h: 260 },
    { id: "v7", title: "Restauración foto 1920 — antes/después", category: "Educativo", platform: "Instagram", viral: 86, gradient: g("#57534e", "#e7e5e4"), h: 360 },
    { id: "v8", title: "Bosque encantado lluvia dorada", category: "Cinemático", platform: "Midjourney", viral: 82, gradient: g("#064e3b", "#22d3ee", "#022c22"), h: 320 },
    { id: "v9", title: "Reel campaña verano terracota", category: "Marketing", platform: "Pinterest", viral: 74, gradient: g("#fb923c", "#dc2626"), h: 280 },
    { id: "v10", title: "Macro átomo glassy bokeh", category: "Educativo", platform: "Veo", viral: 81, gradient: g("#1e3a8a", "#a855f7"), h: 300 },
    { id: "v11", title: "Brutalist mono logo motion", category: "Branding", platform: "Instagram", viral: 69, gradient: g("#fafaf9", "#a8a29e", "#1c1917"), h: 240 },
    { id: "v12", title: "Naranja-tucán surreal", category: "Lifestyle", platform: "Midjourney", viral: 89, gradient: g("#fb923c", "#1e293b"), h: 360 },
  ],
  storytelling: [
    { id: "s1", title: "Transformación extrema: 30 días en montaña", category: "Antes y después", platform: "YouTube", viral: 94, gradient: g("#78350f", "#fbbf24"), h: 360, badge: "Transformación" },
    { id: "s2", title: "Carta de un abuelo a su nieta", category: "Emocional", platform: "Instagram", viral: 91, gradient: g("#9b4423", "#f9a8a8"), h: 420, badge: "Emocional" },
    { id: "s3", title: "Antes / después de restaurar un pueblo", category: "Restauración", platform: "TikTok", viral: 88, gradient: g("#57534e", "#fde68a"), h: 300, badge: "Antes / después" },
    { id: "s4", title: "Misterio: la isla que aparece cada 7 años", category: "Misterio", platform: "YouTube", viral: 86, gradient: g("#020617", "#1e3a8a", "#22d3ee"), h: 380, badge: "Misterio" },
    { id: "s5", title: "Curiosidad: por qué el mar suena así", category: "Curiosidad", platform: "TikTok", viral: 83, gradient: g("#0c2340", "#5cbdb9"), h: 260, badge: "Curiosidad" },
    { id: "s6", title: "El hombre que cuidó 1000 árboles", category: "Emocional", platform: "Instagram", viral: 90, gradient: g("#064e3b", "#a0c49d"), h: 340, badge: "Emocional" },
    { id: "s7", title: "Transformación visual de una calle abandonada", category: "Restauración", platform: "Pinterest", viral: 78, gradient: g("#1c1917", "#c9a84c"), h: 280, badge: "Antes / después" },
    { id: "s8", title: "Misterio cinematográfico — luces sobre Andes", category: "Misterio", platform: "YouTube", viral: 81, gradient: g("#0f172a", "#6366f1"), h: 320, badge: "Misterio" },
  ],
  ideas: [
    { id: "ai1", title: "Combina Pitahaya + Jaguar", category: "Fusión visual", platform: "Midjourney", viral: 95, gradient: g("#ec4899", "#fb923c", "#1c1917"), h: 320, badge: "IA sugiere" },
    { id: "ai2", title: "Frutas medicinales + storytelling emocional", category: "Híbrido narrativo", platform: "Instagram", viral: 89, gradient: g("#10b981", "#fde68a"), h: 380, badge: "IA sugiere" },
    { id: "ai3", title: "Restauración + narrativa de duelo", category: "Híbrido narrativo", platform: "YouTube", viral: 84, gradient: g("#57534e", "#a78bfa"), h: 280, badge: "IA sugiere" },
    { id: "ai4", title: "Influencer rural + receta ancestral", category: "Lifestyle IA", platform: "TikTok", viral: 90, gradient: g("#7c2d12", "#fbbf24"), h: 340, badge: "IA sugiere" },
    { id: "ai5", title: "Animales hechos de cristal + niebla", category: "Fusión visual", platform: "Midjourney", viral: 87, gradient: g("#0ea5e9", "#e0f2fe"), h: 300, badge: "IA sugiere" },
    { id: "ai6", title: "Frutas gigantes en ecosistema imposible", category: "Surreal", platform: "Runway", viral: 92, gradient: g("#fb923c", "#10b981", "#020617"), h: 400, badge: "IA sugiere" },
    { id: "ai7", title: "Curiosidad científica + macro extremo", category: "Educativo viral", platform: "Veo", viral: 80, gradient: g("#1e3a8a", "#22d3ee"), h: 260, badge: "IA sugiere" },
    { id: "ai8", title: "Influencer IA + paisaje patagónico", category: "Lifestyle IA", platform: "Instagram", viral: 86, gradient: g("#0f172a", "#a78bfa", "#ec4899"), h: 360, badge: "IA sugiere" },
  ],
  frutas: [
    { id: "f1", title: "Pingüino-manzana surreal estudio", category: "Animales de frutas", platform: "Midjourney", viral: 96, gradient: g("#ef4444", "#fb923c"), h: 340 },
    { id: "f2", title: "Tucán-naranja luz dramática", category: "Animales de frutas", platform: "Midjourney", viral: 93, gradient: g("#fb923c", "#1e293b"), h: 380 },
    { id: "f3", title: "Sandía gigante flotando sobre selva", category: "Frutas gigantes", platform: "Runway", viral: 88, gradient: g("#10b981", "#fecaca"), h: 300 },
    { id: "f4", title: "Ecosistema de papayas-coral submarino", category: "Ecosistemas fantásticos", platform: "Midjourney", viral: 91, gradient: g("#fb923c", "#0ea5e9", "#020617"), h: 420 },
    { id: "f5", title: "Pitahaya medicinal — anatomía macro", category: "Frutas medicinales", platform: "Veo", viral: 82, gradient: g("#ec4899", "#7c2d12"), h: 260 },
    { id: "f6", title: "Jaguar-mango selva volumétrica", category: "Animales de frutas", platform: "Midjourney", viral: 95, gradient: g("#fbbf24", "#064e3b"), h: 360 },
    { id: "f7", title: "Arándanos curativos — bodegón editorial", category: "Frutas medicinales", platform: "Pinterest", viral: 76, gradient: g("#1e1b4b", "#a78bfa"), h: 280 },
    { id: "f8", title: "Bosque de uvas titánicas", category: "Frutas gigantes", platform: "Runway", viral: 84, gradient: g("#581c87", "#22d3ee"), h: 320 },
  ],
  influencers: [
    { id: "in1", title: "Mujer rural andina — golden hour", category: "Mujer rural", platform: "Instagram", viral: 92, gradient: g("#7c2d12", "#fde68a"), h: 420 },
    { id: "in2", title: "Lifestyle minimalista en cabaña", category: "Lifestyle", platform: "Pinterest", viral: 85, gradient: g("#fafaf9", "#a8a29e"), h: 320 },
    { id: "in3", title: "Viaje patagónico mochila + viento", category: "Viajes", platform: "Instagram", viral: 89, gradient: g("#0c2340", "#5cbdb9"), h: 360 },
    { id: "in4", title: "Influencer cuidando huerto al amanecer", category: "Campo", platform: "TikTok", viral: 87, gradient: g("#064e3b", "#fbbf24"), h: 300 },
    { id: "in5", title: "Mujer caminando bosque encantado", category: "Naturaleza", platform: "Instagram", viral: 90, gradient: g("#064e3b", "#22d3ee", "#022c22"), h: 380 },
    { id: "in6", title: "Retrato editorial AI — luz Hasselblad", category: "Lifestyle", platform: "Midjourney", viral: 83, gradient: g("#a78bfa", "#ec4899", "#1e1b4b"), h: 280 },
    { id: "in7", title: "Influencer rural cocinando a leña", category: "Mujer rural", platform: "YouTube", viral: 88, gradient: g("#78350f", "#f97316"), h: 340 },
    { id: "in8", title: "Trekking volcánico al atardecer", category: "Viajes", platform: "Instagram", viral: 81, gradient: g("#1c1917", "#dc2626"), h: 300 },
  ],
};

// ============================================================
// Page
// ============================================================

function InspiracionPage() {
  const [tab, setTab] = useState<TabId>("viral");
  const items = useMemo(() => DATA[tab], [tab]);
  const total = useMemo(() => Object.values(DATA).reduce((n, arr) => n + arr.length, 0), []);

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Inspiración IA"
        subtitle="Guarda, organiza y explora ideas visuales para tu próximo contenido viral."
        actions={
          <>
            <div className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="font-medium text-foreground">{total}</span>
              <span>referencias</span>
            </div>
            <Button size="sm" className="gap-1.5">
              <Wand2 className="h-3.5 w-3.5" /> Generar inspiración
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <div className="-mx-1 overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all",
                  active
                    ? "bg-accent text-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <span className="text-base leading-none">{t.emoji}</span>
                {t.label}
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-0.5 h-5 rounded-full px-1.5 text-[10px] font-normal",
                    active ? "bg-primary/15 text-primary" : "bg-accent/60"
                  )}
                >
                  {DATA[t.id].length}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Masonry */}
        <div>
          <div className="[column-fill:_balance] columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {items.map((it) => (
              <InspirationCard key={it.id} item={it} />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <WidgetIdeaOfDay />
          <WidgetRelatedProject />
          <WidgetShortcut
            title="Prompt Generator"
            desc="Convierte cualquier inspiración en un prompt cinemático."
            to="/crear/prompts"
            icon={Wand2}
            gradient={g("#a78bfa", "#ec4899")}
          />
          <WidgetShortcut
            title="Flow Center"
            desc="Lleva tu idea a un video extendido en segundos."
            to="/crear/flow"
            icon={Film}
            gradient={g("#0ea5e9", "#6366f1")}
          />
        </aside>
      </div>

      <FlowConnector
        title="Lleva tu inspiración a producción"
        description="Transforma estas referencias en prompts y videos listos para tu biblioteca."
        steps={[
          { label: "Crear Prompt", to: "/crear/prompts", icon: Wand2 },
          { label: "Enviar a Flow", to: "/crear/flow", icon: Film },
        ]}
      />
    </div>
  );
}

// ============================================================
// Card
// ============================================================

function viralColor(v: number) {
  if (v >= 90) return "text-rose-400";
  if (v >= 80) return "text-amber-400";
  if (v >= 70) return "text-emerald-400";
  return "text-muted-foreground";
}

function InspirationCard({ item }: { item: InspirationItem }) {
  const [saved, setSaved] = useState(!!item.saved);
  const [fav, setFav] = useState(!!item.favorite);

  return (
    <div className="group mb-4 break-inside-avoid">
      <div className="surface-card hover-lift relative overflow-hidden rounded-2xl border border-border/60 p-0 transition-all">
        {/* Image */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: `${item.h}px`, background: item.gradient }}
        >
          {/* viral glow overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Top-left badge */}
          {item.badge && (
            <div className="absolute left-3 top-3">
              <Badge className="rounded-full border-0 bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                {item.badge}
              </Badge>
            </div>
          )}

          {/* Top-right actions (hover) */}
          <div className="absolute right-2 top-2 flex translate-y-1 items-center gap-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <IconBtn label="Favorito" active={fav} onClick={() => setFav((v) => !v)}>
              <Heart className={cn("h-3.5 w-3.5", fav && "fill-rose-400 text-rose-400")} />
            </IconBtn>
            <IconBtn label="Guardar" active={saved} onClick={() => setSaved((v) => !v)}>
              <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-primary text-primary")} />
            </IconBtn>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65"
                  aria-label="Más"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <FolderPlus className="mr-2 h-3.5 w-3.5" /> Agregar a proyecto
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/crear/prompts">
                    <Wand2 className="mr-2 h-3.5 w-3.5" /> Crear prompt similar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/crear/flow">
                    <Film className="mr-2 h-3.5 w-3.5" /> Enviar a Flow Center
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFav((v) => !v)}>
                  <Heart className="mr-2 h-3.5 w-3.5" /> {fav ? "Quitar favorito" : "Marcar favorito"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bottom meta */}
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-white drop-shadow">
              {item.title}
            </h3>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge className="rounded-full border-0 bg-white/15 px-2 py-0.5 text-[10px] font-normal text-white backdrop-blur">
                {item.category}
              </Badge>
              <Badge className="rounded-full border-0 bg-white/15 px-2 py-0.5 text-[10px] font-normal text-white backdrop-blur">
                {item.platform}
              </Badge>
              <div className="ml-auto flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">
                <TrendingUp className={cn("h-3 w-3", viralColor(item.viral))} />
                <span className={cn("text-[10px] font-semibold tabular-nums", viralColor(item.viral))}>
                  {item.viral}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full backdrop-blur transition-colors",
        active ? "bg-white/90 text-foreground" : "bg-black/45 text-white hover:bg-black/65"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// Right panel widgets
// ============================================================

function WidgetIdeaOfDay() {
  return (
    <div className="surface-card overflow-hidden rounded-2xl border border-border/60">
      <div
        className="relative h-36 w-full"
        style={{ background: g("#ec4899", "#fb923c", "#1c1917") }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Badge className="absolute left-3 top-3 rounded-full border-0 bg-black/45 px-2.5 py-1 text-[10px] text-white backdrop-blur">
          <Lightbulb className="mr-1 h-3 w-3" /> Idea del día
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        <h3 className="text-sm font-semibold leading-snug">
          Pitahaya × Jaguar — bodegón cinemático con niebla volumétrica
        </h3>
        <p className="text-xs text-muted-foreground">
          Combina texturas frutales y depredador en un set negro. Luz lateral cálida, lente 85mm.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-8 flex-1 gap-1.5" asChild>
            <Link to="/crear/prompts">
              <Wand2 className="h-3 w-3" /> Generar prompt
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0">
            <Bookmark className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function WidgetRelatedProject() {
  return (
    <div className="surface-card rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Proyecto relacionado
        </p>
        <Link
          to="/biblioteca/proyectos"
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Ver todos →
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-14 w-14 flex-none rounded-xl"
          style={{ background: g("#fb923c", "#dc2626", "#1c1917") }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Animales de Frutas</p>
          <p className="text-xs text-muted-foreground">24 recursos · actualizado hace 2 h</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Progreso creativo</span>
          <span className="tabular-nums text-foreground">68%</span>
        </div>
        <Progress value={68} className="h-1.5" />
      </div>
    </div>
  );
}

function WidgetShortcut({
  title,
  desc,
  to,
  icon: Icon,
  gradient,
}: {
  title: string;
  desc: string;
  to: string;
  icon: typeof Wand2;
  gradient: string;
}) {
  return (
    <Link
      to={to}
      className="surface-card group flex items-center gap-3 rounded-2xl border border-border/60 p-3.5 transition-all hover:border-primary/50"
    >
      <div
        className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-white shadow-[var(--shadow-soft)]"
        style={{ background: gradient }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
