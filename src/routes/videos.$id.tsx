import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Heart,
  Copy,
  GitBranch,
  Trash2,
  FolderOpen,
  Film,
  Star,
  Download,
  Sparkles,
  Wand2,
  ImageIcon,
  Video,
  Send,
  TrendingUp,
} from "lucide-react";
import {
  getVideoById,
  listVideoVersions,
  toggleVideoFavorite,
  duplicateVideo,
  createVideoVersion,
  deleteVideo,
  scoreVideo,
  type GeneratedVideoWithMeta,
  type GeneratedVideoStatus,
} from "@/lib/generated-videos.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/videos/$id")({
  component: VideoViewer,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-md p-10 text-center">
      <p className="text-sm text-rose-500">{error.message}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={reset}>
        Reintentar
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-10 text-center text-sm text-muted-foreground">
      Video no encontrado.
    </div>
  ),
});

const STATUS_LABEL: Record<GeneratedVideoStatus, string> = {
  draft: "Borrador",
  prepared: "Preparado",
  queued: "En cola",
  generating: "Generando",
  completed: "Completado",
  failed: "Fallido",
};
const STATUS_TONE: Record<GeneratedVideoStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  prepared: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  queued: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  generating: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  failed: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

function VideoViewer() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getVideoById);
  const versionsFn = useServerFn(listVideoVersions);
  const favFn = useServerFn(toggleVideoFavorite);
  const dupFn = useServerFn(duplicateVideo);
  const verFn = useServerFn(createVideoVersion);
  const delFn = useServerFn(deleteVideo);
  const scoreFn = useServerFn(scoreVideo);

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const { data: versions = [] } = useQuery({
    queryKey: ["video", id, "versions"],
    queryFn: () => versionsFn({ data: { id } }),
    enabled: !!video,
  });

  const [tab, setTab] = useState("info");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["video", id] });
    qc.invalidateQueries({ queryKey: ["videos-gallery"] });
  };

  const favMut = useMutation({
    mutationFn: () => favFn({ data: { id, value: !video!.is_favorite } }),
    onSuccess: invalidate,
  });
  const dupMut = useMutation({
    mutationFn: () => dupFn({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else {
        toast.success("Video duplicado");
        navigate({ to: "/videos/$id", params: { id: r.video.id } });
      }
    },
  });
  const verMut = useMutation({
    mutationFn: () => verFn({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else {
        toast.success(`Versión ${r.video.version} creada`);
        invalidate();
        navigate({ to: "/videos/$id", params: { id: r.video.id } });
      }
    },
  });
  const delMut = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else {
        toast.success("Video eliminado");
        navigate({ to: "/videos" });
      }
    },
  });
  const scoreMut = useMutation({
    mutationFn: () => scoreFn({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else toast.success(`Score: ${r.score}/100`);
      invalidate();
    },
  });

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!video) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Video no encontrado.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/videos" })}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Galería
        </Button>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className={cn(video.is_favorite && "text-rose-500 border-rose-500/40")}
            onClick={() => favMut.mutate()}
          >
            <Heart className={cn("mr-1.5 h-3.5 w-3.5", video.is_favorite && "fill-current")} />
            Favorito
          </Button>
          <Button size="sm" variant="outline" onClick={() => dupMut.mutate()}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicar
          </Button>
          <Button size="sm" variant="outline" onClick={() => verMut.mutate()}>
            <GitBranch className="mr-1.5 h-3.5 w-3.5" /> Nueva versión
          </Button>
          {video.project_id && (
            <Button asChild size="sm" variant="outline">
              <Link to="/proyectos/$id" params={{ id: video.project_id }}>
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Proyecto
              </Link>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-rose-500"
            onClick={() => {
              if (confirm("¿Eliminar este video?")) delMut.mutate();
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Preview */}
        <div className="surface-card overflow-hidden p-0">
          <div className="relative aspect-video w-full bg-black">
            {video.video_url ? (
              <video
                src={video.video_url}
                poster={video.thumbnail_url ?? undefined}
                controls
                className="h-full w-full"
              />
            ) : video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Film className="h-10 w-10 text-white/40" />
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold">{video.title}</h1>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {video.project_title ?? "Sin proyecto"}
                  {video.character_name ? ` · ${video.character_name}` : ""}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <Badge className={cn("border-0", STATUS_TONE[video.status])}>
                  {STATUS_LABEL[video.status]}
                </Badge>
                {video.version > 1 && (
                  <Badge variant="outline">v{video.version}</Badge>
                )}
                {video.video_score !== null && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {video.video_score}
                  </Badge>
                )}
              </div>
            </div>
            {video.video_url && (
              <Button asChild size="sm" variant="outline" className="mt-3">
                <a href={video.video_url} target="_blank" rel="noreferrer">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Descargar
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="surface-card p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Información</TabsTrigger>
              <TabsTrigger value="prompt" className="flex-1">Prompt</TabsTrigger>
              <TabsTrigger value="versions" className="flex-1">Versiones</TabsTrigger>
              <TabsTrigger value="production" className="flex-1">Producción</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-2 text-[13px]">
              <InfoRow label="Proveedor" value={video.provider ?? "—"} />
              <InfoRow label="Duración" value={video.duration ?? "—"} />
              <InfoRow label="Estado" value={STATUS_LABEL[video.status]} />
              <InfoRow label="Versión" value={String(video.version)} />
              <InfoRow label="Simulado" value={video.is_simulated ? "Sí" : "No"} />
              <div className="rounded-md border border-border/40 p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Score IA
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px]"
                    onClick={() => scoreMut.mutate()}
                    disabled={scoreMut.isPending}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {scoreMut.isPending
                      ? "Calculando…"
                      : video.video_score !== null
                      ? "Recalcular"
                      : "Calcular"}
                  </Button>
                </div>
                {video.video_score !== null ? (
                  <>
                    <div className="mb-2 flex items-baseline gap-1">
                      <span className="text-2xl font-semibold">{video.video_score}</span>
                      <span className="text-[11px] text-muted-foreground">/100</span>
                    </div>
                    {video.video_score_breakdown && (
                      <div className="space-y-1">
                        <ScoreBar label="Calidad" value={video.video_score_breakdown.calidad} />
                        <ScoreBar label="Continuidad" value={video.video_score_breakdown.continuidad} />
                        <ScoreBar label="Consistencia" value={video.video_score_breakdown.consistencia} />
                        <ScoreBar label="Viralidad" value={video.video_score_breakdown.viralidad} />
                        <ScoreBar label="Compatibilidad" value={video.video_score_breakdown.compatibilidad} />
                      </div>
                    )}
                    {video.video_score_reason && (
                      <p className="mt-2 text-[11px] italic text-muted-foreground">
                        {video.video_score_reason}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[12px] text-muted-foreground">Sin evaluar todavía.</p>
                )}
              </div>
              <InfoRow label="Creado" value={new Date(video.created_at).toLocaleString("es")} />
              {video.error_message && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-[12px] text-rose-600 dark:text-rose-300">
                  {video.error_message}
                </div>
              )}
            </TabsContent>

            <TabsContent value="prompt" className="mt-4">
              <PromptPanel draftId={video.draft_id} />
            </TabsContent>

            <TabsContent value="versions" className="mt-4">
              <VersionTree
                versions={versions}
                currentId={video.id}
                onOpen={(vid) => navigate({ to: "/videos/$id", params: { id: vid } })}
              />
            </TabsContent>

            <TabsContent value="production" className="mt-4">
              <ProductionTimeline video={video} />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

function PromptPanel({ draftId }: { draftId: string | null }) {
  if (!draftId) {
    return <p className="text-[12px] text-muted-foreground">Sin borrador asociado.</p>;
  }
  return (
    <p className="text-[12px] text-muted-foreground">
      Prompt vinculado al borrador <code className="font-mono text-[11px]">{draftId.slice(0, 8)}</code>.
      Abre Production Center para ver el detalle completo.
    </p>
  );
}

function VersionTree({
  versions,
  currentId,
  onOpen,
}: {
  versions: GeneratedVideoWithMeta[];
  currentId: string;
  onOpen: (id: string) => void;
}) {
  if (versions.length === 0) {
    return <p className="text-[12px] text-muted-foreground">Sin versiones todavía.</p>;
  }
  const root = versions.find((v) => v.parent_video_id === null) ?? versions[0];
  const children = versions.filter((v) => v.id !== root.id);
  return (
    <div className="space-y-2 text-[12px]">
      <VersionRow v={root} isCurrent={root.id === currentId} onOpen={onOpen} root />
      {children.map((c) => (
        <div key={c.id} className="pl-6">
          <VersionRow v={c} isCurrent={c.id === currentId} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}

function VersionRow({
  v,
  isCurrent,
  onOpen,
  root,
}: {
  v: GeneratedVideoWithMeta;
  isCurrent: boolean;
  onOpen: (id: string) => void;
  root?: boolean;
}) {
  return (
    <button
      onClick={() => onOpen(v.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-border/40 px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
        isCurrent && "border-primary/50 bg-primary/5",
      )}
    >
      <span className="font-mono text-[10px] text-muted-foreground">
        {root ? "Original" : `v${v.version}`}
      </span>
      <span className="truncate">{v.title}</span>
      <Badge className={cn("ml-auto border-0 text-[10px]", STATUS_TONE[v.status])}>
        {STATUS_LABEL[v.status]}
      </Badge>
    </button>
  );
}

function ProductionTimeline({ video }: { video: GeneratedVideoWithMeta }) {
  const steps = [
    { icon: TrendingUp, label: "Tendencia", active: true },
    { icon: Wand2, label: "Prompt", active: !!video.draft_id },
    { icon: ImageIcon, label: "Imagen", active: !!video.thumbnail_url },
    { icon: Sparkles, label: "Video Draft", active: !!video.draft_id },
    { icon: Video, label: "Video Generado", active: video.status === "completed" },
    { icon: Send, label: "Publicado", active: false },
  ];
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border",
              s.active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            <s.icon className="h-3.5 w-3.5" />
          </div>
          <span className={cn("text-[13px]", s.active ? "text-foreground" : "text-muted-foreground")}>
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}