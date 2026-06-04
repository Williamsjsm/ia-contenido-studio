import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Send,
  CalendarClock,
  CalendarDays,
  History,
  Youtube,
  Music2,
  Facebook,
  Instagram,
  ImagePlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowConnector } from "@/components/flow-connector";

export const Route = createFileRoute("/publicar")({
  head: () => ({
    meta: [
      { title: "Centro de Publicación — AI Content Studio" },
      {
        name: "description",
        content:
          "Gestiona, programa y analiza la publicación de tu contenido en TikTok, Instagram, Facebook y YouTube desde un único panel premium.",
      },
    ],
  }),
  component: CentroPublicacion,
});

// ============ Types & Mock Data ============
type PlatformId = "tiktok" | "instagram" | "facebook" | "youtube";

interface Platform {
  id: PlatformId;
  name: string;
  icon: LucideIcon;
  gradient: string;
}

const platforms: Platform[] = [
  { id: "tiktok", name: "TikTok", icon: Music2, gradient: "from-[#25F4EE] to-[#FE2C55]" },
  { id: "instagram", name: "Instagram", icon: Instagram, gradient: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]" },
  { id: "facebook", name: "Facebook", icon: Facebook, gradient: "from-[#1877F2] to-[#0A52CC]" },
  { id: "youtube", name: "YouTube", icon: Youtube, gradient: "from-[#FF0000] to-[#CC0000]" },
];

const platformMap = Object.fromEntries(platforms.map((p) => [p.id, p])) as Record<PlatformId, Platform>;

type PostStatus = "published" | "scheduled" | "failed" | "draft";

interface ScheduledPost {
  id: string;
  title: string;
  platforms: PlatformId[];
  day: number; // day of month (June 2026)
  time: string;
  status: PostStatus;
  gradient: string;
}

const scheduled: ScheduledPost[] = [
  { id: "s1", title: "Pitahaya + Jaguar (8s)", platforms: ["tiktok", "instagram"], day: 2, time: "18:00", status: "scheduled", gradient: "from-[#FF6B35] to-[#F7C548]" },
  { id: "s2", title: "Influencer IA — Lookbook", platforms: ["instagram", "facebook"], day: 5, time: "12:30", status: "scheduled", gradient: "from-[#DD2A7B] to-[#8134AF]" },
  { id: "s3", title: "Tutorial Frutas Medicinales", platforms: ["youtube"], day: 9, time: "20:00", status: "scheduled", gradient: "from-[#FF0000] to-[#CC0000]" },
  { id: "s4", title: "Reto viral 8s", platforms: ["tiktok"], day: 14, time: "17:15", status: "scheduled", gradient: "from-[#25F4EE] to-[#FE2C55]" },
  { id: "s5", title: "Behind the scenes IA", platforms: ["instagram", "tiktok", "facebook"], day: 20, time: "11:00", status: "scheduled", gradient: "from-[#8E6FF7] to-[#4285F4]" },
];

interface HistoryPost {
  id: string;
  title: string;
  platform: PlatformId;
  date: string;
  status: PostStatus;
  views: string;
  likes: string;
  gradient: string;
}

const history: HistoryPost[] = [
  { id: "h1", title: "Mango Dragón animado", platform: "tiktok", date: "28 May, 19:00", status: "published", views: "248K", likes: "31.2K", gradient: "from-[#25F4EE] to-[#FE2C55]" },
  { id: "h2", title: "Influencer IA — Verano", platform: "instagram", date: "27 May, 13:00", status: "published", views: "92K", likes: "14.8K", gradient: "from-[#DD2A7B] to-[#8134AF]" },
  { id: "h3", title: "Documental Frutas 4K", platform: "youtube", date: "25 May, 21:00", status: "published", views: "61K", likes: "5.1K", gradient: "from-[#FF0000] to-[#CC0000]" },
  { id: "h4", title: "Promo flash", platform: "facebook", date: "24 May, 10:30", status: "failed", views: "—", likes: "—", gradient: "from-[#1877F2] to-[#0A52CC]" },
  { id: "h5", title: "Jaguar neón loop", platform: "tiktok", date: "22 May, 18:45", status: "published", views: "510K", likes: "78.9K", gradient: "from-[#25F4EE] to-[#FE2C55]" },
];

const statusConfig: Record<PostStatus, { label: string; variant: "success" | "info" | "destructive" | "soft"; icon: LucideIcon }> = {
  published: { label: "Publicado",  variant: "success",     icon: CheckCircle2 },
  scheduled: { label: "Programado", variant: "info",        icon: Clock },
  failed:    { label: "Fallido",    variant: "destructive", icon: AlertCircle },
  draft:     { label: "Borrador",   variant: "soft",        icon: Clock },
};

// ============ Shared bits ============
function PlatformIcon({ id, size = "md" }: { id: PlatformId; size?: "sm" | "md" }) {
  const p = platformMap[id];
  const dims = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  const icon = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className={cn("flex items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", dims, p.gradient)}>
      <p.icon className={icon} />
    </div>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const c = statusConfig[status];
  return (
    <Badge variant={c.variant} className="font-medium">
      <c.icon /> {c.label}
    </Badge>
  );
}


function StatCard({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent: string }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60", accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Main ============
function CentroPublicacion() {
  const [selected, setSelected] = useState<PlatformId[]>(["tiktok", "instagram"]);
  const [caption, setCaption] = useState("");

  const toggle = (id: PlatformId) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const stats = useMemo(
    () => ({
      scheduled: scheduled.length,
      published: history.filter((h) => h.status === "published").length,
      reach: "1.4M",
    }),
    [],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6 lg:p-10">
      <PageHeader
        title="Centro de Publicación"
        subtitle="Publica, programa y analiza tu contenido en TikTok, Instagram, Facebook y YouTube desde un solo lugar."
        actions={
          <Button className="gap-2">
            <Send className="h-4 w-4" /> Nueva publicación
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="Programadas" value={`${stats.scheduled}`} accent="text-sky-400" />
        <StatCard icon={CheckCircle2} label="Publicadas este mes" value={`${stats.published}`} accent="text-emerald-400" />
        <StatCard icon={Sparkles} label="Alcance total" value={stats.reach} accent="text-primary" />
      </div>

      <Tabs defaultValue="now" className="space-y-6">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="now" className="gap-1.5"><Send className="h-4 w-4" /> Publicar Ahora</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5"><CalendarClock className="h-4 w-4" /> Programar</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Calendario</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-4 w-4" /> Historial</TabsTrigger>
        </TabsList>

        {/* ---- Publicar Ahora ---- */}
        <TabsContent value="now" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Composer
            selected={selected}
            toggle={toggle}
            caption={caption}
            setCaption={setCaption}
            mode="now"
          />
          <Preview selected={selected} caption={caption} />
        </TabsContent>

        {/* ---- Programar ---- */}
        <TabsContent value="schedule" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Composer
            selected={selected}
            toggle={toggle}
            caption={caption}
            setCaption={setCaption}
            mode="schedule"
          />
          <div className="space-y-4">
            <Preview selected={selected} caption={caption} />
            <Card className="border-border/60 bg-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-sm font-semibold">Próximas programadas</h3>
                {scheduled.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className={cn("h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br", p.gradient)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">Jun {p.day} · {p.time}</p>
                    </div>
                    <div className="flex -space-x-1">
                      {p.platforms.map((pl) => (
                        <PlatformIcon key={pl} id={pl} size="sm" />
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---- Calendario ---- */}
        <TabsContent value="calendar">
          <CalendarView />
        </TabsContent>

        {/* ---- Historial ---- */}
        <TabsContent value="history" className="space-y-3">
          {history.map((h) => {
            const c = statusConfig[h.status];
            return (
              <Card key={h.id} className="border-border/60 bg-card transition-colors hover:border-border">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn("h-14 w-20 shrink-0 rounded-lg bg-gradient-to-br", h.gradient)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PlatformIcon id={h.platform} size="sm" />
                      <p className="truncate font-medium">{h.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{h.date}</p>
                  </div>
                  <div className="hidden items-center gap-6 sm:flex">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Vistas</p>
                      <p className="text-sm font-semibold">{h.views}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Likes</p>
                      <p className="text-sm font-semibold">{h.likes}</p>
                    </div>
                  </div>
                  <StatusBadge status={h.status} />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <FlowConnector
        title="Cierra el ciclo de tu contenido"
        description="Analiza el rendimiento de tus publicaciones y descubre patrones para tu próxima creación."
        steps={[
          { label: "Ver Rendimiento", to: "/investigar/aprendizaje", icon: Sparkles },
        ]}
      />
    </div>
  );
}

// ============ Composer ============
function Composer({
  selected,
  toggle,
  caption,
  setCaption,
  mode,
}: {
  selected: PlatformId[];
  toggle: (id: PlatformId) => void;
  caption: string;
  setCaption: (v: string) => void;
  mode: "now" | "schedule";
}) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="space-y-6 p-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Plataformas</p>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => {
              const active = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-[var(--shadow-soft)]"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <PlatformIcon id={p.id} size="sm" />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Contenido</p>
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-muted-foreground transition-colors hover:border-border">
            <div className="flex flex-col items-center gap-1.5">
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm">Arrastra o selecciona un video / imagen</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Descripción</p>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Escribe una descripción cautivadora… #frutasIA #viral"
            className="min-h-28 resize-none bg-muted/30"
          />
        </div>

        {mode === "schedule" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Fecha</p>
              <Input type="date" defaultValue="2026-06-05" className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Hora</p>
              <Input type="time" defaultValue="18:00" className="bg-muted/30" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <Button variant="ghost" className="gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Sugerir mejor horario
          </Button>
          <Button className="gap-2" disabled={selected.length === 0}>
            {mode === "now" ? (
              <><Send className="h-4 w-4" /> Publicar ahora</>
            ) : (
              <><CalendarClock className="h-4 w-4" /> Programar</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Preview ============
function Preview({ selected, caption }: { selected: PlatformId[]; caption: string }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm font-semibold">Vista previa</p>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50">
          <div className="flex aspect-[9/16] max-h-80 items-center justify-center bg-[image:var(--gradient-card)]">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[image:var(--gradient-primary)]" />
              <span className="text-sm font-medium">aicontentstudio</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {caption || "Tu descripción aparecerá aquí…"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-xs text-muted-foreground">Selecciona al menos una plataforma</span>
          ) : (
            selected.map((id) => (
              <Badge key={id} variant="secondary" className="gap-1.5 border-0 bg-muted">
                <PlatformIcon id={id} size="sm" /> {platformMap[id].name}
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Calendar ============
const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function CalendarView() {
  // June 2026 starts on a Monday
  const daysInMonth = 30;
  const offset = 0; // Monday
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const byDay = useMemo(() => {
    const map = new Map<number, ScheduledPost[]>();
    for (const p of scheduled) {
      map.set(p.day, [...(map.get(p.day) ?? []), p]);
    }
    return map;
  }, []);

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Junio 2026</h3>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
          {weekDays.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const posts = byDay.get(day) ?? [];
            return (
              <div
                key={day}
                className={cn(
                  "min-h-20 rounded-lg border border-border/50 bg-muted/20 p-1.5 transition-colors hover:border-border",
                  posts.length > 0 && "bg-muted/40",
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">{day}</span>
                <div className="mt-1 space-y-1">
                  {posts.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "truncate rounded-md bg-gradient-to-r px-1.5 py-0.5 text-[10px] font-medium text-white",
                        p.gradient,
                      )}
                      title={`${p.title} · ${p.time}`}
                    >
                      {p.time} {p.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}