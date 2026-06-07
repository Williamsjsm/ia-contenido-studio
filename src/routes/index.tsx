import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  ArrowRight,
  Heart,
  Library,
  Download,
  FileText,
  Layers,
  CalendarRange,
  Tag,
  Wand2,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/state/loading-state";
import { ErrorState } from "@/components/state/error-state";
import { EmptyState } from "@/components/state/empty-state";
import { getDashboardStats, type DashboardStats } from "@/lib/dashboard.functions";
import { getPublicationStats, type PublicationStats } from "@/lib/publications.functions";
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

function Index() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchStats(),
    retry: 1,
    staleTime: 30_000,
  });
  const fetchPubs = useServerFn(getPublicationStats);
  const pubsQuery = useQuery({
    queryKey: ["publications", "stats"],
    queryFn: () => fetchPubs(),
    retry: 1,
    staleTime: 30_000,
  });
  const isEmpty = !!data && data.total === 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 p-5 sm:p-8 lg:space-y-10 xl:p-12">
      <PageHeader
        title="Bienvenido de nuevo"
        subtitle="Resumen de tu actividad y atajos a tu estudio creativo."
        actions={
          <Button
            asChild
            className="h-10 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:scale-[1.02] hover:opacity-95"
          >
            <Link to="/crear/prompts">
              <Sparkles className="mr-2 h-4 w-4" strokeWidth={2.2} />
              Crear nuevo
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState label="Cargando tu estudio…" />
      ) : error ? (
        <ErrorState
          title="No pudimos cargar las métricas"
          description="Reintenta en unos segundos."
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => refetch()}
        />
      ) : !data ? null : isEmpty ? (
        <>
          <QuickActions />
          <EmptyState
            title="Aún no tienes prompts guardados"
            description="Crea tu primer prompt con IA para ver tus métricas aparecer aquí."
          />
        </>
      ) : (
        <>
          <DashboardContent stats={data} />
          {pubsQuery.data ? <PublicationStatsSection stats={pubsQuery.data} /> : null}
        </>
      )}
    </div>
  );
}

function DashboardContent({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label="Total de prompts"
          value={stats.total.toLocaleString("es")}
          delay={0}
        />
        <MetricCard
          icon={<Heart className="h-4 w-4" />}
          label="Favoritos"
          value={stats.favorites.toLocaleString("es")}
          delay={60}
        />
        <MetricCard
          icon={<CalendarRange className="h-4 w-4" />}
          label="Creados esta semana"
          value={stats.thisWeek.toLocaleString("es")}
          delay={120}
        />
        <MetricCard
          icon={<Layers className="h-4 w-4" />}
          label="Plataforma más usada"
          value={stats.topPlatform?.name ?? "—"}
          hint={stats.topPlatform ? `${stats.topPlatform.count} prompts` : "Sin datos"}
          delay={180}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr]">
        <MetricCard
          icon={<Tag className="h-4 w-4" />}
          label="Categoría más usada"
          value={stats.topCategory?.name ?? "—"}
          hint={stats.topCategory ? `${stats.topCategory.count} prompts` : "Sin datos"}
          delay={0}
        />
        <QuickActions compact />
      </section>

      <section className="surface-card animate-fade-in p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Actividad reciente</h2>
            <p className="text-[12px] text-muted-foreground">Tus últimos 5 prompts generados.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-[12px]">
            <Link to="/biblioteca/prompts">
              Ver biblioteca <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {stats.recent.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">
            Aún no hay actividad. Genera tu primer prompt.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {stats.recent.map((p) => (
              <li key={p.id}>
                <Link
                  to="/biblioteca/prompts"
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-accent/40 -mx-2 px-2 rounded-md"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/60">
                    <Wand2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{p.title}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {fmtDate(p.created_at)}
                      {p.category ? ` · ${p.category}` : ""}
                      {p.platform ? ` · ${p.platform}` : ""}
                    </p>
                  </div>
                  {p.is_favorite && <Heart className="h-3.5 w-3.5 fill-primary text-primary" />}
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Prompt
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <div
      className="surface-card hover-lift animate-fade-in p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-3 truncate text-[26px] font-semibold leading-none tracking-tight">{value}</p>
      {hint && <p className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PublicationStatsSection({ stats }: { stats: PublicationStats }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Publicaciones</h2>
          <p className="text-[12px] text-muted-foreground">
            Paquetes generados en el Centro de Publicación.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-[12px]">
          <Link to="/publicacion">
            Abrir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Send className="h-4 w-4" />}
          label="Total creadas"
          value={stats.total.toLocaleString("es")}
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Listas"
          value={stats.ready.toLocaleString("es")}
        />
        <MetricCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Publicadas"
          value={stats.published.toLocaleString("es")}
        />
        <MetricCard
          icon={<Layers className="h-4 w-4" />}
          label="Plataforma top"
          value={stats.byPlatform[0]?.name ?? "—"}
          hint={
            stats.byPlatform[0]
              ? `${stats.byPlatform[0].count} publicaciones`
              : "Sin datos"
          }
        />
      </div>
    </section>
  );
}

type QuickAction = {
  to: string;
  label: string;
  icon: typeof Sparkles;
  primary?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  { to: "/crear/prompts", label: "Crear prompt", icon: Sparkles, primary: true },
  { to: "/biblioteca/prompts", label: "Biblioteca de prompts", icon: Library },
  { to: "/biblioteca/favoritos", label: "Favoritos", icon: Heart },
  { to: "/biblioteca/descargas", label: "Exportar biblioteca", icon: Download },
];

function QuickActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("surface-card animate-fade-in p-5", compact ? "" : "")}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Accesos rápidos
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Button
            key={a.to}
            asChild
            variant={a.primary ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-auto justify-start gap-2 py-3 text-[12.5px]",
              a.primary && "bg-[image:var(--gradient-primary)] text-primary-foreground",
            )}
          >
            <Link to={a.to}>
              <a.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{a.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
