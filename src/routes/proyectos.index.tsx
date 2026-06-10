import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FolderKanban,
  Image as ImageIcon,
  Wand2,
  Video,
  Send,
  Users,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy as CopyIcon,
  Pencil,
  ExternalLink,
  MoreHorizontal,
  PlusCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listCreationProjects,
  renameProject,
  archiveProject,
  duplicateProject,
  deleteProject,
  deriveLifecycleStatus,
  type LifecycleStatus,
  type CreationProjectListItem,
} from "@/lib/creation-projects.functions";

export const Route = createFileRoute("/proyectos/")({
  head: () => ({ meta: [{ title: "Proyectos — AI Content Studio" }] }),
  component: ProyectosIndex,
});

type Filter =
  | "active"
  | "paused"
  | "completed"
  | "archived"
  | "with_publications"
  | "with_flow"
  | "with_character"
  | "all";

function ProyectosIndex() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const listFn = useServerFn(listCreationProjects);
  const renameFn = useServerFn(renameProject);
  const archiveFn = useServerFn(archiveProject);
  const duplicateFn = useServerFn(duplicateProject);
  const deleteFn = useServerFn(deleteProject);

  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [renameTarget, setRenameTarget] = useState<CreationProjectListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CreationProjectListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const projects = useQuery({
    queryKey: ["creation-projects"],
    queryFn: () => listFn(),
  });

  const all = projects.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      const ls = deriveLifecycleStatus(p);
      if (filter === "active" && ls !== "active") return false;
      if (filter === "paused" && ls !== "paused") return false;
      if (filter === "completed" && ls !== "completed") return false;
      if (filter === "archived" && ls !== "archived") return false;
      if (filter === "with_publications" && p.publication_count === 0) return false;
      if (filter === "with_flow" && p.flow_count === 0) return false;
      if (filter === "with_character" && !p.character_name) return false;
      if (!q) return true;
      const haystack = [
        p.title,
        p.character_name ?? "",
      ]
        .join(" \u0000 ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [all, filter, search]);

  const kpis = useMemo(
    () => ({
      total: all.length,
      active: all.filter((p) => deriveLifecycleStatus(p) === "active").length,
      archived: all.filter((p) => p.is_archived).length,
      lastActivity: all[0]?.updated_at ?? null,
    }),
    [all],
  );

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["creation-projects"] });
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    setBusy(true);
    try {
      const r = await renameFn({ data: { id: renameTarget.id, title: renameValue.trim() } });
      if (!r.ok) toast.error(r.message);
      else {
        toast.success("Proyecto renombrado.");
        setRenameTarget(null);
        invalidate();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(p: CreationProjectListItem) {
    const r = await archiveFn({ data: { id: p.id, archived: !p.is_archived } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success(p.is_archived ? "Proyecto restaurado." : "Proyecto archivado.");
      invalidate();
    }
  }

  async function handleDuplicate(p: CreationProjectListItem) {
    const r = await duplicateFn({ data: { id: p.id } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success("Proyecto duplicado.");
      invalidate();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const r = await deleteFn({ data: { id: deleteTarget.id } });
      if (!r.ok) toast.error(r.message);
      else {
        toast.success("Proyecto eliminado.");
        setDeleteTarget(null);
        invalidate();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Centro de Proyectos"
        subtitle="Cada idea, prompt e imagen agrupada en un proyecto operativo."
        actions={
          <Button asChild size="sm">
            <Link to="/crear">
              <PlusCircle className="mr-2 h-3.5 w-3.5" />
              Nuevo proyecto
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total" value={kpis.total} />
        <Kpi label="Activos" value={kpis.active} />
        <Kpi label="Archivados" value={kpis.archived} />
        <Kpi
          label="Última actividad"
          value={
            kpis.lastActivity
              ? new Date(kpis.lastActivity).toLocaleDateString()
              : "—"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-8 flex-wrap">
            <TabsTrigger value="active" className="h-6 px-3 text-[11px]">Activos</TabsTrigger>
            <TabsTrigger value="paused" className="h-6 px-3 text-[11px]">Pausados</TabsTrigger>
            <TabsTrigger value="completed" className="h-6 px-3 text-[11px]">Completados</TabsTrigger>
            <TabsTrigger value="archived" className="h-6 px-3 text-[11px]">Archivados</TabsTrigger>
            <TabsTrigger value="with_publications" className="h-6 px-3 text-[11px]">Con publicaciones</TabsTrigger>
            <TabsTrigger value="with_flow" className="h-6 px-3 text-[11px]">Con flow</TabsTrigger>
            <TabsTrigger value="with_character" className="h-6 px-3 text-[11px]">Con personaje</TabsTrigger>
            <TabsTrigger value="all" className="h-6 px-3 text-[11px]">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o personaje…"
          className="h-8 max-w-xs text-sm"
        />
      </div>

      {projects.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando proyectos…</p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "Aún no hay proyectos. Genera una imagen y se creará uno automáticamente."
              : "Ningún proyecto coincide con el filtro."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              onOpen={() => navigate({ to: "/proyectos/$id", params: { id: p.id } })}
              onRename={() => {
                setRenameTarget(p);
                setRenameValue(p.title);
              }}
              onDuplicate={() => handleDuplicate(p)}
              onArchive={() => handleArchive(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar proyecto</DialogTitle>
            <DialogDescription>Cambia el nombre del proyecto.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nuevo nombre"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={busy || !renameValue.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el proyecto «{deleteTarget?.title}» y sus enlaces a assets. Las imágenes
              y prompts originales se conservan. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={busy}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ProjectCard({
  p,
  onOpen,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  p: CreationProjectListItem;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group overflow-hidden border-border/60 bg-card transition hover:border-primary/60 hover:shadow-lg">
      <button
        onClick={onOpen}
        className="block aspect-video w-full overflow-hidden bg-muted/40 text-left"
      >
        {p.cover_image_base64 ? (
          <img
            src={`data:image/png;base64,${p.cover_image_base64}`}
            alt={p.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </button>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="flex-1 text-left">
            <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
            {p.character_name && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                <Users className="mr-1 inline h-3 w-3" />
                {p.character_name}
              </p>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Abrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Renombrar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <CopyIcon className="mr-2 h-3.5 w-3.5" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                {p.is_archived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Restaurar
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-3.5 w-3.5" /> Archivar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Stat icon={<ImageIcon className="h-3 w-3" />} value={p.image_count} title="Imágenes" />
          <Stat icon={<Wand2 className="h-3 w-3" />} value={p.prompt_id ? 1 : 0} title="Prompts" />
          <Stat icon={<Video className="h-3 w-3" />} value={p.flow_count} title="Flow jobs" />
          <Stat icon={<Send className="h-3 w-3" />} value={p.publication_count} title="Publicaciones" />
          <StatusBadge status={deriveLifecycleStatus(p)} className="ml-auto" />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Actualizado {new Date(p.updated_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, value, title }: { icon: React.ReactNode; value: number; title: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
    >
      {icon}
      {value}
    </span>
  );
}