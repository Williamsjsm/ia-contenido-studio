import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Film, Star, Sparkles, Heart, Copy, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  getVideoById,
  scoreVideo,
  toggleVideoFavorite,
  duplicateVideo,
  type GeneratedVideoWithMeta,
  type GeneratedVideoStatus,
} from "@/lib/generated-videos.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SearchSchema = z.object({
  ids: z.string().optional().default(""),
});

export const Route = createFileRoute("/videos/compare")({
  validateSearch: (input: Record<string, unknown>) => SearchSchema.parse(input),
  head: () => ({
    meta: [{ title: "Comparar videos — AI Content Studio" }],
  }),
  component: VideosCompare,
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

function VideosCompare() {
  const { ids } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getVideoById);
  const scoreFn = useServerFn(scoreVideo);
  const favFn = useServerFn(toggleVideoFavorite);
  const dupFn = useServerFn(duplicateVideo);

  const idList = useMemo(
    () =>
      ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3),
    [ids],
  );

  const queries = useQueries({
    queries: idList.map((id) => ({
      queryKey: ["video", id],
      queryFn: () => getFn({ data: { id } }),
    })),
  });

  const videos = queries
    .map((q) => q.data)
    .filter((v): v is GeneratedVideoWithMeta => !!v);

  const isLoading = queries.some((q) => q.isLoading);
  const invalidateAll = () => {
    for (const id of idList) qc.invalidateQueries({ queryKey: ["video", id] });
    qc.invalidateQueries({ queryKey: ["videos-gallery"] });
  };

  const scoreMut = useMutation({
    mutationFn: (id: string) => scoreFn({ data: { id } }),
    onSuccess: (r, id) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else toast.success(`Score: ${r.score}/100`);
      qc.invalidateQueries({ queryKey: ["video", id] });
    },
  });
  const favMut = useMutation({
    mutationFn: (v: GeneratedVideoWithMeta) =>
      favFn({ data: { id: v.id, value: !v.is_favorite } }),
    onSuccess: invalidateAll,
  });
  const dupMut = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else toast.success("Video duplicado");
      invalidateAll();
    },
  });

  const removeFromCompare = (id: string) => {
    const next = idList.filter((x) => x !== id).join(",");
    navigate({ to: "/videos/compare", search: { ids: next } });
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="ghost" asChild>
          <Link to="/videos">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Galería
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Comparar videos</h1>
          <p className="text-[12px] text-muted-foreground">
            {idList.length}/3 seleccionados
          </p>
        </div>
      </header>

      {idList.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <Film className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Selecciona 2 o 3 videos desde la galería para compararlos.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/videos">Ir a la galería</Link>
          </Button>
        </div>
      ) : isLoading && videos.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            videos.length === 1 && "md:grid-cols-1",
            videos.length === 2 && "md:grid-cols-2",
            videos.length >= 3 && "md:grid-cols-3",
          )}
        >
          {videos.map((v) => (
            <CompareCard
              key={v.id}
              v={v}
              onScore={() => scoreMut.mutate(v.id)}
              scoring={scoreMut.isPending && scoreMut.variables === v.id}
              onFav={() => favMut.mutate(v)}
              onDup={() => dupMut.mutate(v.id)}
              onRemove={() => removeFromCompare(v.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompareCard({
  v,
  onScore,
  scoring,
  onFav,
  onDup,
  onRemove,
}: {
  v: GeneratedVideoWithMeta;
  onScore: () => void;
  scoring: boolean;
  onFav: () => void;
  onDup: () => void;
  onRemove: () => void;
}) {
  const breakdown = v.video_score_breakdown;
  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="relative aspect-video w-full bg-black">
        {v.video_url ? (
          <video src={v.video_url} poster={v.thumbnail_url ?? undefined} controls className="h-full w-full" />
        ) : v.thumbnail_url ? (
          <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-8 w-8 text-white/40" />
          </div>
        )}
        {v.video_score !== null && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] text-white">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {v.video_score}
          </div>
        )}
      </div>
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/videos/$id"
              params={{ id: v.id }}
              className="block truncate text-[13px] font-semibold hover:underline"
            >
              {v.title}
            </Link>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {v.project_title ?? "Sin proyecto"}
              {v.character_name ? ` · ${v.character_name}` : ""}
            </p>
          </div>
          <Badge className={cn("border-0 text-[10px]", STATUS_TONE[v.status])}>
            {STATUS_LABEL[v.status]}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <Meta label="Proveedor" value={v.provider ?? "—"} />
          <Meta label="Duración" value={v.duration ?? "—"} />
          <Meta label="Versión" value={`v${v.version}`} />
          <Meta label="Simulado" value={v.is_simulated ? "Sí" : "No"} />
        </dl>

        <div className="rounded-md border border-border/40 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium">Score IA</span>
            <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={onScore} disabled={scoring}>
              <Sparkles className="mr-1 h-3 w-3" />
              {scoring ? "Calculando…" : v.video_score !== null ? "Recalcular" : "Calcular"}
            </Button>
          </div>
          {v.video_score !== null ? (
            <>
              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-xl font-semibold">{v.video_score}</span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
              {breakdown && (
                <div className="space-y-1">
                  <Bar label="Calidad" value={breakdown.calidad} />
                  <Bar label="Continuidad" value={breakdown.continuidad} />
                  <Bar label="Consistencia" value={breakdown.consistencia} />
                  <Bar label="Viralidad" value={breakdown.viralidad} />
                  <Bar label="Compatibilidad" value={breakdown.compatibilidad} />
                </div>
              )}
              {v.video_score_reason && (
                <p className="mt-2 text-[11px] italic text-muted-foreground">
                  {v.video_score_reason}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">Sin evaluar todavía.</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className={cn("h-7 text-[11px]", v.is_favorite && "text-rose-500 border-rose-500/40")}
            onClick={onFav}
          >
            <Heart className={cn("mr-1 h-3 w-3", v.is_favorite && "fill-current")} />
            {v.is_favorite ? "Favorito" : "Favorito"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onDup}>
            <Copy className="mr-1 h-3 w-3" /> Duplicar
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-[11px] text-rose-500" onClick={onRemove}>
            <Trash2 className="mr-1 h-3 w-3" /> Quitar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{v}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}