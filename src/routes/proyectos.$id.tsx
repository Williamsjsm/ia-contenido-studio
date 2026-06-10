import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Image as ImageIcon,
  Wand2,
  Video,
  Send,
  Users,
  Star,
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  Copy as CopyIcon,
  ImagePlus,
  ExternalLink,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  getProjectDetail,
  renameProject,
  archiveProject,
  deleteProject,
  setProjectCover,
  duplicateProject,
  setProjectStatus,
  getProjectTimeline,
  deriveLifecycleStatus,
  type TimelineEvent,
} from "@/lib/creation-projects.functions";
import { StatusBadge } from "@/components/project-status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/proyectos/$id")({
  head: () => ({ meta: [{ title: "Proyecto — AI Content Studio" }] }),
  component: ProyectoDetalle,
});

type Tab = "resumen" | "timeline" | "imagenes" | "prompts" | "flow" | "publicaciones";

function ProyectoDetalle() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getProjectDetail);
  const renameFn = useServerFn(renameProject);
  const archiveFn = useServerFn(archiveProject);
  const deleteFn = useServerFn(deleteProject);
  const coverFn = useServerFn(setProjectCover);
  const duplicateFn = useServerFn(duplicateProject);
  const statusFn = useServerFn(setProjectStatus);
  const timelineFn = useServerFn(getProjectTimeline);

  const [tab, setTab] = useState<Tab>("resumen");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const detail = useQuery({
    queryKey: ["creation-project", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const timeline = useQuery({
    queryKey: ["creation-project-timeline", id],
    queryFn: () => timelineFn({ data: { id } }),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["creation-project", id] });
    qc.invalidateQueries({ queryKey: ["creation-project-timeline", id] });
    qc.invalidateQueries({ queryKey: ["creation-projects"] });
  }

  if (detail.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] p-6">
        <p className="text-sm text-muted-foreground">Cargando proyecto…</p>
      </div>
    );
  }
  if (!detail.data) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-4 p-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/proyectos">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Volver
          </Link>
        </Button>
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Proyecto no encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, images, flow_jobs, publications } = detail.data;

  async function handleRename() {
    if (!renameValue.trim()) return;
    setBusy(true);
    try {
      const r = await renameFn({ data: { id: project.id, title: renameValue.trim() } });
      if (!r.ok) toast.error(r.message);
      else {
        toast.success("Proyecto renombrado.");
        setRenameOpen(false);
        invalidate();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    const r = await archiveFn({ data: { id: project.id, archived: !project.is_archived } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success(project.is_archived ? "Proyecto restaurado." : "Proyecto archivado.");
      invalidate();
    }
  }

  async function handleDuplicate() {
    const r = await duplicateFn({ data: { id: project.id } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success("Proyecto duplicado.");
      qc.invalidateQueries({ queryKey: ["creation-projects"] });
      if (r.id) navigate({ to: "/proyectos/$id", params: { id: r.id } });
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const r = await deleteFn({ data: { id: project.id } });
      if (!r.ok) toast.error(r.message);
      else {
        toast.success("Proyecto eliminado.");
        qc.invalidateQueries({ queryKey: ["creation-projects"] });
        navigate({ to: "/proyectos" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSetCover(imageId: string) {
    const r = await coverFn({ data: { projectId: project.id, imageId } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success("Portada actualizada.");
      invalidate();
    }
  }

  async function handleSetStatus(status: "active" | "paused" | "completed") {
    const r = await statusFn({ data: { id: project.id, status } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success(
        status === "active" ? "Proyecto reactivado." : status === "paused" ? "Proyecto pausado." : "Proyecto completado.",
      );
      invalidate();
    }
  }

  const lifecycle = deriveLifecycleStatus(project);
  const charactersUsed = new Set(
    images.map((i) => i.character_name).filter((n): n is string => !!n),
  ).size;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6 lg:p-10">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/proyectos">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Proyectos
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRenameValue(project.title);
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" /> Renombrar
          </Button>
          <Button size="sm" variant="outline" onClick={handleDuplicate}>
            <CopyIcon className="mr-2 h-3.5 w-3.5" /> Duplicar
          </Button>
          <Button size="sm" variant="outline" onClick={handleArchive}>
            {project.is_archived ? (
              <>
                <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Restaurar
              </>
            ) : (
              <>
                <Archive className="mr-2 h-3.5 w-3.5" /> Archivar
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
          </Button>
        </div>
      </div>

      <PageHeader
        title={project.title}
        subtitle={[
          project.character_name ? `Personaje: ${project.character_name}` : null,
          `Actualizado ${new Date(project.updated_at).toLocaleString()}`,
          project.is_archived ? "Archivado" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden border-border/60 bg-card">
          <div className="aspect-video w-full bg-muted/40">
            {project.cover_image_base64 ? (
              <img
                src={`data:image/png;base64,${project.cover_image_base64}`}
                alt={project.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant="secondary">{project.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Imágenes</span>
              <span>{images.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Flow jobs</span>
              <span>{flow_jobs.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Publicaciones</span>
              <span>{publications.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="imagenes">
                Imágenes <span className="ml-1 text-muted-foreground">({images.length})</span>
              </TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="flow">
                Flow <span className="ml-1 text-muted-foreground">({flow_jobs.length})</span>
              </TabsTrigger>
              <TabsTrigger value="publicaciones">
                Publicaciones <span className="ml-1 text-muted-foreground">({publications.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="mt-4 space-y-4">
              <Card className="border-border/60 bg-card">
                <CardContent className="space-y-3 p-4 text-sm">
                  <SummaryRow
                    label="Personaje"
                    value={project.character_name ?? "—"}
                    icon={<Users className="h-3.5 w-3.5" />}
                    href={project.character_id ? "/biblioteca/personajes" : undefined}
                  />
                  <SummaryRow
                    label="Prompt origen"
                    value={project.prompt_text ? project.prompt_text.slice(0, 220) + (project.prompt_text.length > 220 ? "…" : "") : "—"}
                    icon={<Wand2 className="h-3.5 w-3.5" />}
                  />
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-3">
                <Mini label="Imágenes" value={images.length} icon={<ImageIcon className="h-4 w-4" />} />
                <Mini label="Flow jobs" value={flow_jobs.length} icon={<Video className="h-4 w-4" />} />
                <Mini label="Publicaciones" value={publications.length} icon={<Send className="h-4 w-4" />} />
              </div>
            </TabsContent>

            <TabsContent value="imagenes" className="mt-4">
              {images.length === 0 ? (
                <EmptyTab label="Aún no hay imágenes en este proyecto." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((img) => {
                    const isCover = project.cover_image_id === img.id;
                    const src = img.image_base64 ? `data:image/png;base64,${img.image_base64}` : null;
                    return (
                      <div
                        key={img.id}
                        className={cn(
                          "group relative aspect-square overflow-hidden rounded-md border bg-muted/20 transition",
                          isCover ? "border-primary ring-2 ring-primary/50" : "border-border/40",
                        )}
                      >
                        {src && (
                          <img
                            src={src}
                            alt={img.prompt}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                        <Badge
                          variant="secondary"
                          className="absolute top-1.5 left-1.5 px-1.5 py-0 text-[9px] uppercase"
                        >
                          {img.provider}
                        </Badge>
                        {img.is_favorite && (
                          <Star className="absolute top-1.5 right-1.5 h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {isCover && (
                          <Badge className="absolute bottom-1.5 left-1.5 text-[9px] uppercase">
                            Portada
                          </Badge>
                        )}
                        <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                          {!isCover && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 gap-1"
                              onClick={() => handleSetCover(img.id)}
                            >
                              <ImagePlus className="h-3.5 w-3.5" />
                              Portada
                            </Button>
                          )}
                          <Button asChild size="icon" variant="secondary" className="h-7 w-7">
                            <Link to="/crear/imagen">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="prompts" className="mt-4">
              {project.prompt_text ? (
                <Card className="border-border/60 bg-card">
                  <CardContent className="p-4 text-sm">
                    <p className="whitespace-pre-wrap text-foreground/90">{project.prompt_text}</p>
                  </CardContent>
                </Card>
              ) : (
                <EmptyTab label="Este proyecto no tiene prompt origen registrado." />
              )}
            </TabsContent>

            <TabsContent value="flow" className="mt-4">
              {flow_jobs.length === 0 ? (
                <EmptyTab label="Aún no hay videos preparados para este proyecto." />
              ) : (
                <Card className="border-border/60 bg-card">
                  <CardContent className="divide-y divide-border/50 p-0">
                    {flow_jobs.map((j) => (
                      <div key={j.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-medium">{j.title ?? "Sin título"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(j.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="secondary">{j.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="publicaciones" className="mt-4">
              {publications.length === 0 ? (
                <EmptyTab label="Sin publicaciones enlazadas todavía." />
              ) : (
                <Card className="border-border/60 bg-card">
                  <CardContent className="divide-y divide-border/50 p-0">
                    {publications.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-medium">{p.title ?? "Sin título"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(p.created_at).toLocaleString()}
                          </p>
                        </div>
                        {p.status && <Badge variant="secondary">{p.status}</Badge>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
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
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={busy || !renameValue.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{project.title}» y sus enlaces a assets. Las imágenes y prompts
              originales se conservan. Esta acción no se puede deshacer.
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

function SummaryRow({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
  if (href) return <Link to={href} className="block hover:opacity-80">{content}</Link>;
  return content;
}

function Mini({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-border/60 bg-card/40">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}