import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Play,
  Heart,
  Trash2,
  Copy,
  GitBranch,
  FolderOpen,
  Download,
  Search,
  Film,
  Star,
} from "lucide-react";
import {
  listVideosWithMeta,
  toggleVideoFavorite,
  duplicateVideo,
  deleteVideo,
  createVideoVersion,
  type GeneratedVideoWithMeta,
  type GeneratedVideoStatus,
} from "@/lib/generated-videos.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/videos/")({
  head: () => ({
    meta: [
      { title: "Galería de Videos — AI Content Studio" },
      { name: "description", content: "Todos tus videos generados y simulados." },
    ],
  }),
  component: VideosGallery,
});

type FilterKey = "all" | "favorites" | "draft" | "completed" | "failed";

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

function VideosGallery() {
  const qc = useQueryClient();
  const fetchVideos = useServerFn(listVideosWithMeta);
  const navigate = useNavigate();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["videos-gallery"],
    queryFn: () => fetchVideos(),
  });

  const [filter, setFilter] = useState<FilterKey>("all");
  const [providerFilter, setProviderFilter] = useState<string>("__all");
  const [projectFilter, setProjectFilter] = useState<string>("__all");
  const [search, setSearch] = useState("");

  const providers = useMemo(
    () =>
      Array.from(new Set(videos.map((v) => v.provider).filter(Boolean))) as string[],
    [videos],
  );
  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of videos) if (v.project_id && v.project_title) map.set(v.project_id, v.project_title);
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [videos]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (filter === "favorites" && !v.is_favorite) return false;
      if (filter === "draft" && v.status !== "draft") return false;
      if (filter === "completed" && v.status !== "completed") return false;
      if (filter === "failed" && v.status !== "failed") return false;
      if (providerFilter !== "__all" && v.provider !== providerFilter) return false;
      if (projectFilter !== "__all" && v.project_id !== projectFilter) return false;
      if (term) {
        const haystack = [
          v.title,
          v.project_title ?? "",
          v.character_name ?? "",
          v.provider ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [videos, filter, providerFilter, projectFilter, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["videos-gallery"] });

  const favMut = useMutation({
    mutationFn: (v: GeneratedVideoWithMeta) =>
      useServerFn(toggleVideoFavorite)({ data: { id: v.id, value: !v.is_favorite } }),
    onSuccess: () => invalidate(),
  });
  const dupMut = useMutation({
    mutationFn: (id: string) => useServerFn(duplicateVideo)({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else toast.success("Video duplicado");
      invalidate();
    },
  });
  const verMut = useMutation({
    mutationFn: (id: string) => useServerFn(createVideoVersion)({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else toast.success(`Versión ${r.video.version} creada`);
      invalidate();
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => useServerFn(deleteVideo)({ data: { id } }),
    onSuccess: (r) => {
      if (!r?.ok) toast.error(r?.message ?? "Error");
      else toast.success("Video eliminado");
      invalidate();
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-5 sm:p-8 xl:p-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Film className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-wider">Producción</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Galería de Videos
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {videos.length} videos · {videos.filter((v) => v.is_favorite).length} favoritos
          </p>
        </div>
      </header>

      {/* Filtros */}
      <section className="surface-card flex flex-wrap items-center gap-2 p-3">
        <div className="flex flex-wrap gap-1.5">
          {([
            ["all", "Todos"],
            ["favorites", "Favoritos"],
            ["draft", "Drafts"],
            ["completed", "Completados"],
            ["failed", "Fallidos"],
          ] as [FilterKey, string][]).map(([k, label]) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              className="h-8 text-[12px]"
              onClick={() => setFilter(k)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="h-8 w-[160px] text-[12px]">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos los proveedores</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-8 w-[200px] text-[12px]">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos los proyectos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-8 w-[200px] pl-7 text-[12px]"
            />
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <Film className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Sin videos para los filtros actuales.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/crear/video" search={{ draftId: "", fromImage: "", flowId: "" }}>
              Ir a Production Center
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <VideoCard
              key={v.id}
              v={v}
              onOpen={() => navigate({ to: "/videos/$id", params: { id: v.id } })}
              onFavorite={() => favMut.mutate(v)}
              onDuplicate={() => dupMut.mutate(v.id)}
              onVersion={() => verMut.mutate(v.id)}
              onDelete={() => {
                if (confirm("¿Eliminar este video?")) delMut.mutate(v.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({
  v,
  onOpen,
  onFavorite,
  onDuplicate,
  onVersion,
  onDelete,
}: {
  v: GeneratedVideoWithMeta;
  onOpen: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
  onVersion: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group surface-card hover-lift overflow-hidden p-0">
      <button
        onClick={onOpen}
        className="relative block aspect-video w-full overflow-hidden bg-muted"
      >
        {v.thumbnail_url ? (
          <img
            src={v.thumbnail_url}
            alt={v.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/30 to-sky-500/30">
            <Film className="h-8 w-8 text-white/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <Badge className={cn("border-0 text-[10px]", STATUS_TONE[v.status])}>
            {STATUS_LABEL[v.status]}
          </Badge>
          {v.version > 1 && (
            <Badge variant="outline" className="border-white/40 bg-black/40 text-[10px] text-white">
              v{v.version}
            </Badge>
          )}
        </div>
        {v.duration && (
          <Badge className="absolute bottom-2 right-2 border-0 bg-black/70 font-mono text-[10px] text-white">
            {v.duration}
          </Badge>
        )}
        {v.is_favorite && (
          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/90">
            <Heart className="h-3 w-3 fill-white text-white" />
          </div>
        )}
        {v.video_score !== null && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {v.video_score}
          </div>
        )}
      </button>
      <div className="p-3">
        <h3 className="truncate text-[13px] font-semibold">{v.title}</h3>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {v.project_title ?? "Sin proyecto"}
          {v.character_name ? ` · ${v.character_name}` : ""}
          {v.provider ? ` · ${v.provider}` : ""}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver" onClick={onOpen}>
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Descargar"
            disabled={!v.video_url}
            onClick={() => v.video_url && window.open(v.video_url, "_blank")}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Duplicar" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Nueva versión"
            onClick={onVersion}
          >
            <GitBranch className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-7 w-7", v.is_favorite && "text-rose-500")}
            title="Favorito"
            onClick={onFavorite}
          >
            <Heart className={cn("h-3.5 w-3.5", v.is_favorite && "fill-current")} />
          </Button>
          {v.project_id && (
            <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Abrir proyecto">
              <Link to="/proyectos/$id" params={{ id: v.project_id }}>
                <FolderOpen className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 ml-auto text-rose-500"
            title="Eliminar"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}