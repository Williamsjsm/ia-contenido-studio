import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  TrendingUp,
  Wand2,
  Workflow,
  ArrowRight,
  Lightbulb,
  CalendarClock,
  Brain,
  Clapperboard,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useDashboard } from "@/hooks/use-dashboard";
import { LoadingState } from "@/components/state/loading-state";
import { ErrorState } from "@/components/state/error-state";
import { EmptyState } from "@/components/state/empty-state";
import heroProject from "@/assets/hero-project.jpg";
import cardTrend from "@/assets/card-trend.jpg";
import cardIdea from "@/assets/card-idea.jpg";
import thumbVideo from "@/assets/thumb-video.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Content Studio" },
      { name: "description", content: "Centro creativo visual para tu contenido con IA." },
    ],
  }),
  component: Index,
});

const data = {
  activeProject: {
    name: "Frutas IA — Pitahaya",
    status: "En progreso",
    lastActivity: "hace 2 horas",
    lastVideo: "Pitahaya bioluminiscente · 0:08",
    lastPrompt: "Macro cinematográfico de pitahaya cortada, interior glow azul…",
  },
  trend: { category: "Frutas medicinales IA", viral: 94 },
  idea: {
    idea: "Serie de 8s: 'Pitahaya que cura'",
    reason: "El nicho crece +212% esta semana en TikTok.",
  },
  production: { project: "Restauraciones vintage", status: "Renderizando 70%" },
  nextPublish: { platform: "TikTok", date: "Hoy · 19:30", status: "Programada" },
  insight: "Los videos de Pitahaya superan al resto del catálogo.",
};

function Index() {
  const { data, isLoading, error, isEmpty } = useDashboard();

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 p-5 sm:p-8 lg:space-y-10 xl:p-12">
      <PageHeader
        title="Bienvenido de nuevo"
        subtitle="Tu estudio personal de creación de contenido con IA."
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
        <ErrorState description={error.message} />
      ) : isEmpty || !data ? (
        <EmptyState
          title="Sin contenido todavía"
          description="Crea tu primer prompt para comenzar."
        />
      ) : (
        <DashboardContent data={data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: NonNullable<ReturnType<typeof useDashboard>["data"]> }) {
  return (
    <>
      {/* ───────── HERO — Proyecto Activo ───────── */}
      <section className="motion-fade-in">
        <HeroProject data={data} />
      </section>

      {/* ───────── Visual cards row ───────── */}
      <section className="grid gap-5 md:grid-cols-2">
        <VisualCard
          image={cardTrend}
          eyebrow="Tendencia del día"
          eyebrowIcon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />}
          title={data.trend.category}
          meta={
            <div className="w-full">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                <span className="uppercase tracking-[0.14em]">Potencial viral</span>
                <span className="font-semibold text-white">{data.trend.viral}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/15 backdrop-blur">
                <div
                  className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                  style={{ width: `${data.trend.viral}%` }}
                />
              </div>
            </div>
          }
          cta={
            <Button asChild size="sm" className="h-9 rounded-xl bg-white/10 text-white backdrop-blur-md hover:bg-white/20">
              <Link to="/investigar/tendencias">
                Explorar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          }
          delay={60}
        />
        <VisualCard
          image={cardIdea}
          eyebrow="Idea recomendada"
          eyebrowIcon={<Lightbulb className="h-3.5 w-3.5" strokeWidth={2.4} />}
          title={data.idea.idea}
          subtitle={data.idea.reason}
          cta={
            <Button asChild size="sm" className="h-9 rounded-xl bg-white text-black hover:bg-white/90">
              <Link to="/crear/prompts">
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Crear prompt
              </Link>
            </Button>
          }
          delay={120}
        />
      </section>

      {/* ───────── Status row (compact) ───────── */}
      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={<Clapperboard className="h-4 w-4" strokeWidth={2.2} />}
          eyebrow="En producción"
          title={data.production.project}
          badge={data.production.status}
          to="/crear/flow"
          ctaIcon={<Workflow className="h-3.5 w-3.5" />}
          ctaLabel="Flow Center"
          delay={180}
        />
        <StatusCard
          icon={<CalendarClock className="h-4 w-4" strokeWidth={2.2} />}
          eyebrow="Próxima publicación"
          title={data.nextPublish.platform}
          subtitle={data.nextPublish.date}
          badge={data.nextPublish.status}
          to="/publicar"
          ctaLabel="Calendario"
          delay={240}
        />
        <StatusCard
          icon={<Brain className="h-4 w-4" strokeWidth={2.2} />}
          eyebrow="Insight principal"
          title={`"${data.insight}"`}
          to="/investigar/aprendizaje"
          ctaLabel="Ver aprendizaje"
          accent
          delay={300}
        />
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────── */
/*  HERO — Proyecto activo (Runway / Vision Pro)  */
/* ─────────────────────────────────────────────── */
function HeroProject({ data }: { data: NonNullable<ReturnType<typeof useDashboard>["data"]> }) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white/10 shadow-[var(--shadow-elevated)]">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroProject}
          alt="Proyecto activo"
          width={1920}
          height={1080}
          className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
        />
        {/* Cinematic dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
        {/* Color wash */}
        <div className="absolute inset-0 mix-blend-soft-light opacity-60 bg-[image:var(--gradient-primary)]" />
      </div>

      {/* Ambient glow */}
      <div className="ambient-blob -left-20 top-1/3 h-72 w-72 bg-primary" />
      <div className="ambient-blob -right-10 bottom-0 h-64 w-64 bg-secondary" />

      <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:p-12">
        {/* Left — copy */}
        <div className="flex flex-col justify-between gap-8 lg:min-h-[420px]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/80">
                Proyecto activo
              </span>
            </div>

            <h2 className="text-balance text-[40px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[52px] lg:text-[60px]">
              {data.activeProject.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft" className="rounded-full px-3 py-1 text-eyebrow uppercase">
                {data.activeProject.status}
              </Badge>
              <span className="text-[12px] text-white/60">
                Última actividad {data.activeProject.lastActivity}
              </span>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="group/btn h-12 w-fit rounded-2xl bg-white px-6 text-black shadow-[0_8px_28px_-8px_rgba(255,255,255,0.45)] transition-all hover:scale-[1.02] hover:bg-white/95"
          >
            <Link to="/crear/flow">
              <Play className="mr-2 h-4 w-4 fill-black" strokeWidth={2.4} />
              Continuar proyecto
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </Button>
        </div>

        {/* Right — visual mini panels (glassmorphism) */}
        <div className="flex flex-col gap-3">
          {/* Last video */}
          <div className="group/card relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] p-3 backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/[0.09]">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                <img
                  src={thumbVideo}
                  alt=""
                  width={192}
                  height={128}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-5 w-5 fill-white text-white drop-shadow-md" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
                  Último video
                </p>
                <p className="mt-1 truncate text-[13.5px] font-medium text-white">
                  {data.activeProject.lastVideo}
                </p>
              </div>
            </div>
          </div>

          {/* Last prompt */}
          <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/[0.09]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                <Wand2 className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
                  Último prompt
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/90">
                  {data.activeProject.lastPrompt}
                </p>
              </div>
            </div>
          </div>

          {/* Mini status pulse */}
          <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[11.5px] text-white/70">
              <span className="status-dot-success" aria-hidden />
              Sincronizado con Flow Center
            </div>
            <span className="text-[11px] font-mono text-white/50">{data.activeProject.version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/*  Visual card with image (Midjourney-style)     */
/* ─────────────────────────────────────────────── */
function VisualCard({
  image,
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  meta,
  cta,
  delay = 0,
}: {
  image: string;
  eyebrow: string;
  eyebrowIcon: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  cta: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 shadow-[var(--shadow-card)] animate-fade-in hover-lift"
      style={{ animationDelay: `${delay}ms` }}
    >
      <img
        src={image}
        alt=""
        width={1024}
        height={768}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
          <span className="text-white/90">{eyebrowIcon}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/90">
            {eyebrow}
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="text-[22px] font-semibold leading-tight tracking-tight text-white sm:text-[24px]">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-[12.5px] leading-relaxed text-white/70">{subtitle}</p>
          ) : null}
          {meta}
          <div className="pt-1">{cta}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/*  Compact status card                           */
/* ─────────────────────────────────────────────── */
function StatusCard({
  icon,
  eyebrow,
  title,
  subtitle,
  badge,
  to,
  ctaLabel,
  ctaIcon,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: string;
  to: string;
  ctaLabel: string;
  ctaIcon?: React.ReactNode;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="surface-card hover-lift relative overflow-hidden p-5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {accent ? <div className="ambient-blob -right-10 -top-10 h-40 w-40 bg-primary" /> : null}
      <div className="relative space-y-3">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <p className="line-clamp-2 text-[15.5px] font-semibold leading-snug tracking-tight">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {subtitle ? <span className="text-[12px] text-muted-foreground">{subtitle}</span> : null}
          {badge ? (
            <Badge variant="brand" className="text-eyebrow uppercase">
              {badge}
            </Badge>
          ) : null}
        </div>
        <Button asChild size="sm" variant="ghost" className="-ml-2 h-8 rounded-lg px-2 text-[12px] text-foreground/80 hover:bg-white/5">
          <Link to={to}>
            {ctaIcon ? <span className="mr-1.5">{ctaIcon}</span> : null}
            {ctaLabel}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
