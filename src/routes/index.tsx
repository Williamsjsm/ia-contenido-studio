import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  Heart,
  Download,
  ImageIcon,
  Wand2,
  Radar,
  Eye,
  Flame,
  TrendingUp,
  Users,
  Send,
  AlertTriangle,
  Activity,
  Play,
  PlusCircle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/lib/dashboard.functions";
import {
  getPublicationStats,
  listPublicationProjects,
} from "@/lib/publications.functions";
import {
  getRadarStats,
  listViralTrends,
  type ViralTrend,
} from "@/lib/viral-trends.functions";
import { listImageGenerations } from "@/lib/image-generation.functions";
import { listVirtualCharacters } from "@/lib/visual-library.functions";
import { listActiveProjects } from "@/lib/creation-projects.functions";
import { getProductionStats } from "@/lib/generated-videos.functions";
import { fmtDate } from "@/lib/library-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Content Studio" },
      { name: "description", content: "Centro creativo visual para tu contenido con IA." },
    ],
  }),
  component: Index,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function fmtCompact(n: number | null | undefined) {
  if (!n || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function useDashboardData() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchPubs = useServerFn(getPublicationStats);
  const fetchRadar = useServerFn(getRadarStats);
  const fetchTrends = useServerFn(listViralTrends);
  const fetchImages = useServerFn(listImageGenerations);
  const fetchChars = useServerFn(listVirtualCharacters);
  const fetchPubsList = useServerFn(listPublicationProjects);
  const fetchProd = useServerFn(getProductionStats);

  const opts = { retry: false, staleTime: 30_000, refetchOnWindowFocus: false };

  return {
    stats: useQuery({ queryKey: ["dashboard"], queryFn: () => fetchStats(), ...opts }),
    pubs: useQuery({ queryKey: ["dashboard", "pubs"], queryFn: () => fetchPubs(), ...opts }),
    radar: useQuery({ queryKey: ["dashboard", "radar"], queryFn: () => fetchRadar(), ...opts }),
    trends: useQuery({
      queryKey: ["dashboard", "trends"],
      queryFn: () => fetchTrends({ data: { limit: 8, orderBy: "viral_score" } }),
      ...opts,
    }),
    images: useQuery({ queryKey: ["dashboard", "images"], queryFn: () => fetchImages(), ...opts }),
    chars: useQuery({ queryKey: ["dashboard", "chars"], queryFn: () => fetchChars(), ...opts }),
    pubsList: useQuery({
      queryKey: ["dashboard", "pubsList"],
      queryFn: () => fetchPubsList(),
      ...opts,
    }),
    production: useQuery({
      queryKey: ["dashboard", "production"],
      queryFn: () => fetchProd(),
      ...opts,
    }),
  };
}

function Index() {
  const q = useDashboardData();

  const radar = q.radar.data ?? { detected: 0, saved: 0, favorites: 0, topCountry: null, topPlatform: null };
  const stats = q.stats.data ?? { total: 0, favorites: 0, thisWeek: 0, topPlatform: null, topCategory: null, recent: [] };
  const pubs = q.pubs.data ?? { total: 0, ready: 0, published: 0, draft: 0, byPlatform: [] };
  const trends: ViralTrend[] = q.trends.data ?? [];
  const images = q.images.data?.items ?? [];
  const characters = q.chars.data ?? [];
  const pubsList = q.pubsList.data ?? [];
  const production = q.production.data ?? {
    drafts: 0,
    prepared: 0,
    queued: 0,
    generating: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };

  const subtext = useMemo(() => {
    return `${radar.detected} tendencias · ${images.length} imágenes · ${characters.length} personajes · ${pubs.total} publicaciones`;
  }, [radar.detected, images.length, characters.length, pubs.total]);

  const activity = useMemo(() => buildActivity(stats.recent, images, pubsList, trends), [stats.recent, images, pubsList, trends]);
  const alerts = useMemo(() => buildAlerts(trends, radar), [trends, radar]);

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-8 p-5 sm:p-8 xl:p-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-[image:var(--gradient-primary)] p-7 sm:p-10 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-background/0 to-background/30" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 text-primary-foreground">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {greeting()}, Williams <span className="inline-block">👋</span>
            </h1>
            <p className="text-[14px] sm:text-[15px] opacity-90">{subtext}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" variant="secondary" className="h-11 rounded-xl">
              <Link to="/crear/prompts"><Sparkles className="mr-2 h-4 w-4" />Crear prompt</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-11 rounded-xl bg-background/20 text-primary-foreground hover:bg-background/30">
              <Link to="/crear/imagen"><ImageIcon className="mr-2 h-4 w-4" />Generar imagen</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-11 rounded-xl bg-background/20 text-primary-foreground hover:bg-background/30">
              <Link to="/investigar/tendencias"><Radar className="mr-2 h-4 w-4" />Radar Viral</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Radar className="h-5 w-5" />}
          label="Radar Viral"
          value={radar.detected.toLocaleString("es")}
          hint={`${radar.saved} guardadas · ${radar.favorites} favoritas`}
          to="/investigar/tendencias"
          accent="from-rose-500/20 to-orange-500/10"
        />
        <KpiCard
          icon={<Wand2 className="h-5 w-5" />}
          label="Prompts"
          value={stats.total.toLocaleString("es")}
          hint={`${stats.thisWeek} esta semana · ${stats.favorites} ★`}
          to="/biblioteca/prompts"
          accent="from-violet-500/20 to-indigo-500/10"
        />
        <KpiCard
          icon={<ImageIcon className="h-5 w-5" />}
          label="Imágenes"
          value={images.length.toLocaleString("es")}
          hint={images[0] ? `Último: ${timeAgo(images[0].created_at)}` : "Sin imágenes"}
          to="/crear/imagen"
          accent="from-cyan-500/20 to-sky-500/10"
        />
        <KpiCard
          icon={<Send className="h-5 w-5" />}
          label="Publicaciones"
          value={pubs.total.toLocaleString("es")}
          hint={`${pubs.ready} listas · ${pubs.published} publicadas`}
          to="/publicacion"
          accent="from-emerald-500/20 to-teal-500/10"
        />
      </section>

      {/* MAIN GRID: content + activity sidebar */}
      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <TrendsOfDay trends={trends.slice(0, 4)} loading={q.trends.isLoading} />
          <CharactersSection characters={characters.slice(0, 4)} loading={q.chars.isLoading} />
          <RecentImagesSection images={images.slice(0, 8)} loading={q.images.isLoading} />
          <VideoProductionSection production={production} />
          <div className="grid gap-6 lg:grid-cols-2">
            <PublicationsSection pubs={pubsList.slice(0, 5)} loading={q.pubsList.isLoading} />
            <AlertsSection alerts={alerts} />
          </div>
          <ProjectsSection />
        </div>
        <ActivitySidebar items={activity} />
      </section>
    </div>
  );
}

// ----- KPI Card -----
function KpiCard({
  icon, label, value, hint, to, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  to: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="surface-card hover-lift group relative overflow-hidden p-5 animate-fade-in"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100", accent)} aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 text-primary backdrop-blur">
            {icon}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="mt-4 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight">{value}</p>
        {hint && <p className="mt-2 text-[11.5px] text-muted-foreground">{hint}</p>}
      </div>
    </Link>
  );
}

// ----- Trends of Day -----
function TrendsOfDay({ trends, loading }: { trends: ViralTrend[]; loading: boolean }) {
  return (
    <SectionCard
      title="Tendencias del Día"
      subtitle="Top virales detectadas en tu radar"
      icon={<Flame className="h-4 w-4 text-rose-500" />}
      action={<SectionLink to="/investigar/tendencias">Ver Radar</SectionLink>}
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : trends.length === 0 ? (
        <EmptyHint text="Aún no hay tendencias. Abre Radar Viral para detectar." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {trends.map((t) => (
            <Link
              key={t.id}
              to="/investigar/tendencias"
              className="group surface-card hover-lift overflow-hidden p-0"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {t.thumbnail_url ? (
                  <img src={t.thumbnail_url} alt={t.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><Play className="h-7 w-7" /></div>
                )}
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[10.5px] font-semibold text-foreground backdrop-blur">
                  <Flame className="h-3 w-3 text-rose-500" />{t.viral_score}
                </div>
                <Badge variant="secondary" className="absolute left-2 top-2 text-[10px]">{t.platform}</Badge>
              </div>
              <div className="space-y-1.5 p-3">
                <p className="line-clamp-2 text-[13px] font-medium leading-snug">{t.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Eye className="h-3 w-3" />{fmtCompact(t.views)}
                  <span>·</span>
                  <span className="truncate">{t.category}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ----- Characters -----
function CharactersSection({ characters, loading }: { characters: Array<{ id: string; name: string; description: string | null; reference_image_url: string | null }>; loading: boolean }) {
  return (
    <SectionCard
      title="Personajes Virtuales"
      subtitle="Reutiliza personajes en prompts e imágenes"
      icon={<Users className="h-4 w-4 text-violet-500" />}
      action={<SectionLink to="/biblioteca/personajes">Ver todos</SectionLink>}
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      ) : characters.length === 0 ? (
        <EmptyHint text="Aún no tienes personajes. Importa uno desde una imagen." cta={{ to: "/biblioteca/personajes", label: "Crear personaje" }} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {characters.map((c) => (
            <div key={c.id} className="surface-card hover-lift overflow-hidden p-0">
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                {c.reference_image_url ? (
                  <img src={c.reference_image_url} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><Users className="h-7 w-7" /></div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-[13px] font-medium">{c.name}</p>
                <p className="line-clamp-2 text-[11px] text-muted-foreground">{c.description || "Sin descripción"}</p>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                    <Link to="/crear/prompts" search={{ personajeId: c.id }}><Wand2 className="mr-1 h-3 w-3" />Prompt</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                    <Link to="/crear/imagen" search={{ personajeId: c.id }}><ImageIcon className="mr-1 h-3 w-3" />Imagen</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ----- Recent Images -----
function RecentImagesSection({ images, loading }: { images: Array<{ id: string; prompt: string; image_base64: string | null; created_at: string }>; loading: boolean }) {
  return (
    <SectionCard
      title="Imágenes recientes"
      subtitle="Tus últimas generaciones"
      icon={<ImageIcon className="h-4 w-4 text-cyan-500" />}
      action={<SectionLink to="/crear/imagen">Ir a Imagen IA</SectionLink>}
    >
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      ) : images.length === 0 ? (
        <EmptyHint text="Aún no has generado imágenes." cta={{ to: "/crear/imagen", label: "Generar imagen" }} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {images.map((img) => {
            const src = img.image_base64 ? `data:image/png;base64,${img.image_base64}` : null;
            return (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted">
                {src ? (
                  <img src={src} alt={img.prompt.slice(0, 60)} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
                )}
                <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-background/85 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button asChild size="icon" variant="secondary" className="h-7 w-7">
                    <Link to="/crear/imagen"><Eye className="h-3.5 w-3.5" /></Link>
                  </Button>
                  {src && (
                    <a href={src} download={`imagen-${img.id}.png`} className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ----- Publications -----
function PublicationsSection({ pubs, loading }: { pubs: Array<{ id: string; title: string; platform: string | null; status: string; updated_at: string }>; loading: boolean }) {
  return (
    <SectionCard
      title="Publicaciones"
      subtitle="Próximas y listas para publicar"
      icon={<Send className="h-4 w-4 text-emerald-500" />}
      action={<SectionLink to="/publicacion">Centro</SectionLink>}
    >
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
      ) : pubs.length === 0 ? (
        <EmptyHint text="Sin publicaciones todavía." />
      ) : (
        <ul className="divide-y divide-border/50">
          {pubs.map((p) => (
            <li key={p.id}>
              <Link to="/publicacion" className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent/40">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  p.status === "ready" && "bg-emerald-500/15 text-emerald-500",
                  p.status === "published" && "bg-cyan-500/15 text-cyan-500",
                  p.status === "draft" && "bg-muted text-muted-foreground",
                )}>
                  <Send className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.platform ?? "Sin plataforma"} · {fmtDate(p.updated_at)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{p.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ----- Alerts -----
type Alert = { id: string; kind: "growth" | "emerging" | "category" | "country"; title: string; detail: string };

function buildAlerts(trends: ViralTrend[], radar: { topCountry: { name: string; count: number } | null; topPlatform: { name: string; count: number } | null }): Alert[] {
  const alerts: Alert[] = [];
  const top = [...trends].sort((a, b) => b.viral_score - a.viral_score)[0];
  if (top && top.viral_score >= 85) {
    alerts.push({ id: "growth", kind: "growth", title: "Crecimiento anormal detectado", detail: `${top.title} alcanzó score ${top.viral_score} en ${top.platform}.` });
  }
  const recent = [...trends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (recent) {
    alerts.push({ id: "emerging", kind: "emerging", title: "Tendencia emergente", detail: `${recent.title} apareció ${timeAgo(recent.created_at)}.` });
  }
  const catCount = new Map<string, number>();
  trends.forEach((t) => catCount.set(t.category, (catCount.get(t.category) ?? 0) + 1));
  const topCat = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCat) alerts.push({ id: "category", kind: "category", title: "Categoría en ascenso", detail: `${topCat[0]} acumula ${topCat[1]} tendencias activas.` });
  if (radar.topCountry) alerts.push({ id: "country", kind: "country", title: "País con mayor actividad", detail: `${radar.topCountry.name} concentra ${radar.topCountry.count} tendencias.` });
  return alerts;
}

function AlertsSection({ alerts }: { alerts: Alert[] }) {
  return (
    <SectionCard
      title="Alertas Virales IA"
      subtitle="Movimientos detectados por el radar"
      icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
      action={<SectionLink to="/investigar/tendencias">Ver radar</SectionLink>}
    >
      {alerts.length === 0 ? (
        <EmptyHint text="Sin alertas. El radar está tranquilo." />
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{a.title}</p>
                <p className="line-clamp-2 text-[11.5px] text-muted-foreground">{a.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ----- Projects (placeholder for future structure) -----
function ProjectsSection() {
  const fn = useServerFn(listActiveProjects);
  const q = useQuery({ queryKey: ["dashboard", "active-projects"], queryFn: () => fn() });
  const projects = Array.isArray(q.data) ? q.data : [];
  return (
    <SectionCard
      title="Proyectos activos"
      subtitle="Tus líneas creativas en curso"
      icon={<Layers className="h-4 w-4 text-indigo-500" />}
      action={
        <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 text-[12px]">
          <Link to="/proyectos">Ver todos <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      }
    >
      {q.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyHint text="Aún no tienes proyectos activos." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 6).map((p) => (
            <Link
              key={p.id}
              to="/proyectos/$id"
              params={{ id: p.id }}
              className="surface-card hover-lift overflow-hidden"
            >
              <div className="flex items-stretch">
                <div className="h-20 w-20 shrink-0 bg-muted/40">
                  {p.cover_image_base64 ? (
                    <img
                      src={`data:image/png;base64,${p.cover_image_base64}`}
                      alt={p.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <Layers className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium">{p.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{p.progress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                    Actualizado {timeAgo(p.updated_at)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ----- Activity sidebar -----
type ActivityItem = { id: string; kind: "prompt" | "image" | "publication" | "trend"; title: string; when: string };

function buildActivity(
  recent: Array<{ id: string; title: string; created_at: string }>,
  images: Array<{ id: string; prompt: string; created_at: string }>,
  pubs: Array<{ id: string; title: string; updated_at: string }>,
  trends: ViralTrend[],
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...recent.map((r) => ({ id: `p-${r.id}`, kind: "prompt" as const, title: r.title, when: r.created_at })),
    ...images.slice(0, 5).map((i) => ({ id: `i-${i.id}`, kind: "image" as const, title: i.prompt.slice(0, 80), when: i.created_at })),
    ...pubs.slice(0, 5).map((p) => ({ id: `b-${p.id}`, kind: "publication" as const, title: p.title, when: p.updated_at })),
    ...trends.filter((t) => t.saved).slice(0, 5).map((t) => ({ id: `t-${t.id}`, kind: "trend" as const, title: t.title, when: t.created_at })),
  ];
  return items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 12);
}

function ActivitySidebar({ items }: { items: ActivityItem[] }) {
  return (
    <aside className="surface-card animate-fade-in self-start p-5 xl:sticky xl:top-6">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-[14px] font-semibold tracking-tight">Actividad reciente</h2>
      </div>
      {items.length === 0 ? (
        <EmptyHint text="Sin actividad reciente." />
      ) : (
        <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border/60">
          {items.map((it) => (
            <li key={it.id} className="relative pl-9">
              <span className={cn(
                "absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background",
                it.kind === "prompt" && "text-violet-500",
                it.kind === "image" && "text-cyan-500",
                it.kind === "publication" && "text-emerald-500",
                it.kind === "trend" && "text-rose-500",
              )}>
                {it.kind === "prompt" && <Wand2 className="h-3.5 w-3.5" />}
                {it.kind === "image" && <ImageIcon className="h-3.5 w-3.5" />}
                {it.kind === "publication" && <Send className="h-3.5 w-3.5" />}
                {it.kind === "trend" && <Flame className="h-3.5 w-3.5" />}
              </span>
              <p className="line-clamp-2 text-[12.5px] leading-snug">{it.title}</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">{timeAgo(it.when)}</p>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

// ----- Section helpers -----
function SectionCard({
  title, subtitle, icon, action, children,
}: { title: string; subtitle?: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface-card animate-fade-in p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <div className="mt-0.5">{icon}</div>}
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-[12px]">
      <Link to={to}>{children} <ArrowRight className="h-3.5 w-3.5" /></Link>
    </Button>
  );
}

function EmptyHint({ text, cta }: { text: string; cta?: { to: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-[13px] text-muted-foreground">{text}</p>
      {cta && (
        <Button asChild size="sm" variant="outline" className="h-8 text-[12px]">
          <Link to={cta.to}><PlusCircle className="mr-1.5 h-3.5 w-3.5" />{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
function VideoProductionSection({
  production,
}: {
  production: {
    drafts: number;
    prepared: number;
    queued: number;
    generating: number;
    completed: number;
    failed: number;
    total: number;
  };
}) {
  const cells = [
    { icon: <Clock className="h-4 w-4" />, label: "Drafts", value: production.drafts, tone: "text-muted-foreground" },
    { icon: <Loader2 className="h-4 w-4" />, label: "En cola", value: production.queued + production.generating, tone: "text-amber-500" },
    { icon: <CheckCircle2 className="h-4 w-4" />, label: "Completados", value: production.completed, tone: "text-emerald-500" },
    { icon: <XCircle className="h-4 w-4" />, label: "Fallidos", value: production.failed, tone: "text-rose-500" },
  ];
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Producción de Video</h2>
        </div>
        <Link
          to="/crear/video"
          search={{ draftId: "", fromImage: "", flowId: "" }}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Abrir Production Center <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-3">
            <div className={cn("flex items-center gap-2", c.tone)}>
              {c.icon}
              <p className="text-[10px] uppercase tracking-wider">{c.label}</p>
            </div>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
