import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  CopyCheck,
  Sparkles,
  Save,
  Loader2,
  Trash2,
  Files,
  History,
  Send,
  Wand2,
  Hash,
  Type as TypeIcon,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowConnector } from "@/components/flow-connector";
import {
  listPublicationProjects,
  savePublicationProject,
  updatePublicationProject,
  deletePublicationProject,
  duplicatePublicationProject,
  generatePublicationPackage,
  PUBLICATION_PLATFORMS,
  type PublicationProject,
  type PublicationPlatform,
} from "@/lib/publications.functions";

const searchSchema = z.object({
  prompt: fallback(z.string(), "").default(""),
  titulo: fallback(z.string(), "").default(""),
  plataforma: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
  flow_job_id: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/publicacion")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Centro de Publicación — AI Content Studio" },
      {
        name: "description",
        content:
          "Genera títulos virales, descripciones optimizadas y hashtags para TikTok, YouTube Shorts, Facebook e Instagram Reels.",
      },
    ],
  }),
  component: CentroPublicacion,
});

const PLATFORM_LABEL: Record<PublicationPlatform, string> = {
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  facebook: "Facebook",
  instagram_reels: "Instagram Reels",
};

const PLATFORM_GRADIENT: Record<PublicationPlatform, string> = {
  tiktok: "from-[#25F4EE] to-[#FE2C55]",
  youtube_shorts: "from-[#FF0000] to-[#CC0000]",
  facebook: "from-[#1877F2] to-[#0A52CC]",
  instagram_reels: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
};

function normalizePlatform(p: string): PublicationPlatform {
  const k = p.toLowerCase();
  if (k.includes("tiktok")) return "tiktok";
  if (k.includes("youtube")) return "youtube_shorts";
  if (k.includes("facebook")) return "facebook";
  if (k.includes("instagram") || k.includes("reels")) return "instagram_reels";
  return "tiktok";
}

function CentroPublicacion() {
  const search = Route.useSearch();
  const qc = useQueryClient();

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [platform, setPlatform] = useState<PublicationPlatform>("tiktok");
  const [category, setCategory] = useState("");
  const [sourceFlowJobId, setSourceFlowJobId] = useState<string | null>(null);
  const [tab, setTab] = useState<"editor" | "history">("editor");

  // Prefill from query string (e.g. coming from Flow Center)
  useEffect(() => {
    if (search.prompt) setPrompt(search.prompt);
    if (search.titulo) setTitle(search.titulo);
    if (search.categoria) setCategory(search.categoria);
    if (search.plataforma) setPlatform(normalizePlatform(search.plataforma));
    if (search.flow_job_id) setSourceFlowJobId(search.flow_job_id);
  }, [search]);

  // ── Queries
  const fetchList = useServerFn(listPublicationProjects);
  const listQuery = useQuery({
    queryKey: ["publications"],
    queryFn: () => fetchList(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["publications"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const gen = useServerFn(generatePublicationPackage);
  const genMut = useMutation({
    mutationFn: gen,
    onSuccess: (res) => {
      if (res.ok) {
        setTitle(res.title);
        setDescription(res.description);
        setHashtags(res.hashtags);
        toast.success("Paquete generado");
      } else {
        toast.error(res.message);
      }
    },
  });

  const save = useServerFn(savePublicationProject);
  const saveMut = useMutation({
    mutationFn: save,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Publicación guardada");
        invalidate();
      } else {
        toast.error(res.message);
      }
    },
  });

  const dup = useServerFn(duplicatePublicationProject);
  const dupMut = useMutation({
    mutationFn: dup,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Duplicado");
        invalidate();
      } else {
        toast.error(res.message);
      }
    },
  });

  const del = useServerFn(deletePublicationProject);
  const delMut = useMutation({
    mutationFn: del,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Eliminado");
        invalidate();
      } else {
        toast.error(res.message);
      }
    },
  });

  const update = useServerFn(updatePublicationProject);
  const updateMut = useMutation({
    mutationFn: update,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Actualizado");
        invalidate();
      } else {
        toast.error(res.message);
      }
    },
  });

  function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Agrega un prompt o idea base.");
      return;
    }
    genMut.mutate({
      data: {
        prompt: prompt.trim(),
        platform,
        category: category.trim() || null,
        baseTitle: title.trim() || null,
        language: "es",
      },
    });
  }

  function handleSave(status: "draft" | "ready" | "published" = "draft") {
    if (!title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    saveMut.mutate({
      data: {
        title: title.trim(),
        description: description.trim() || null,
        hashtags: hashtags.trim() || null,
        platform,
        category: category.trim() || null,
        source_flow_job_id: sourceFlowJobId,
        status,
      },
    });
  }

  async function handleCopy(text: string, label: string) {
    if (!text.trim()) {
      toast.error(`Nada que copiar en ${label}.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  function handleCopyAll() {
    const text = [title, "", description, "", hashtags].filter(Boolean).join("\n").trim();
    if (!text) {
      toast.error("Nada que copiar.");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => toast.success("Paquete completo copiado"),
      () => toast.error("No se pudo copiar"),
    );
  }

  function handleReuse(p: PublicationProject) {
    setPrompt("");
    setTitle(p.title);
    setDescription(p.description ?? "");
    setHashtags(p.hashtags ?? "");
    if (p.platform) setPlatform(normalizePlatform(p.platform));
    setCategory(p.category ?? "");
    setSourceFlowJobId(p.source_flow_job_id);
    setTab("editor");
    toast.success("Cargado en el editor");
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-4 lg:p-8">
      <PageHeader
        title="Centro de Publicación"
        subtitle="Genera el paquete completo —título viral, descripción optimizada y hashtags— listo para publicar."
        actions={
          <Badge
            variant="outline"
            className="gap-1.5 border-border/60 bg-card/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            <Sparkles className="h-3 w-3 text-primary" /> Powered by Lovable AI
          </Badge>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "editor" | "history")}>
        <TabsList className="bg-muted/40">
          <TabsTrigger value="editor" className="gap-1.5">
            <Wand2 className="h-4 w-4" /> Editor
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> Historial
            {listQuery.data ? (
              <span className="ml-1 rounded bg-muted px-1.5 text-[10px]">
                {listQuery.data.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[300px_1fr_360px]">
            {/* ─── LEFT: base data ─── */}
            <Card className="border-border/60 bg-card">
              <CardContent className="space-y-5 p-5">
                <div className="space-y-2">
                  <Label htmlFor="plat" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Plataforma
                  </Label>
                  <Select
                    value={platform}
                    onValueChange={(v) => setPlatform(v as PublicationPlatform)}
                  >
                    <SelectTrigger id="plat" className="bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLICATION_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PLATFORM_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Categoría
                  </Label>
                  <Input
                    id="cat"
                    placeholder="Ej: lifestyle, tech, tutorial…"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-background/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Prompt / idea base
                  </Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe el contenido, escena o tema del video…"
                    className="min-h-40 resize-none bg-background/60 text-sm"
                  />
                </div>

                <Button
                  className="w-full gap-2 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
                  onClick={handleGenerate}
                  disabled={genMut.isPending}
                >
                  {genMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generar paquete
                </Button>

                {sourceFlowJobId ? (
                  <p className="text-[11px] text-muted-foreground">
                    Origen: Flow Job <span className="font-mono">{sourceFlowJobId.slice(0, 8)}</span>
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {/* ─── CENTER: editor ─── */}
            <Card className="border-border/60 bg-card">
              <CardContent className="space-y-5 p-5">
                <FieldRow
                  icon={<TypeIcon className="h-3.5 w-3.5" />}
                  label="Título viral"
                  onCopy={() => handleCopy(title, "Título")}
                >
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tu título aparecerá aquí…"
                    className="bg-background/60 text-base font-semibold"
                  />
                </FieldRow>

                <FieldRow
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Descripción optimizada"
                  onCopy={() => handleCopy(description, "Descripción")}
                >
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción adaptada a la plataforma…"
                    className="min-h-40 resize-none bg-background/60 text-sm"
                  />
                </FieldRow>

                <FieldRow
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Hashtags"
                  onCopy={() => handleCopy(hashtags, "Hashtags")}
                >
                  <Textarea
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#viral #trending …"
                    className="min-h-24 resize-none bg-background/60 text-sm"
                  />
                </FieldRow>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyAll}>
                    <CopyCheck className="h-3.5 w-3.5" /> Copiar todo
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleSave("draft")}
                      disabled={saveMut.isPending}
                    >
                      {saveMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Guardar borrador
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
                      onClick={() => handleSave("ready")}
                      disabled={saveMut.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como lista
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─── RIGHT: preview ─── */}
            <Card className="border-border/60 bg-card">
              <CardContent className="space-y-3 p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Vista previa final
                </p>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50">
                  <div
                    className={cn(
                      "flex aspect-[9/16] max-h-96 items-center justify-center bg-gradient-to-br",
                      PLATFORM_GRADIENT[platform],
                    )}
                  >
                    <Sparkles className="h-10 w-10 text-white/80" />
                  </div>
                  <div className="space-y-2 p-4">
                    <Badge variant="outline" className="text-[10px]">
                      {PLATFORM_LABEL[platform]}
                    </Badge>
                    <p className="text-sm font-semibold">{title || "Tu título…"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                      {description || "Tu descripción aparecerá aquí…"}
                    </p>
                    <p className="text-[11px] text-primary/90 break-words">
                      {hashtags || "#hashtags"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4">
              {listQuery.isLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando historial…
                </div>
              ) : listQuery.error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  No se pudo cargar el historial.
                </div>
              ) : !listQuery.data || listQuery.data.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aún no hay publicaciones guardadas. Genera un paquete y guárdalo.
                </div>
              ) : (
                <ScrollArea className="max-h-[600px] pr-2">
                  <ul className="divide-y divide-border/50">
                    {listQuery.data.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{p.title}</p>
                            <StatusBadge status={p.status} />
                            {p.platform ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {PLATFORM_LABEL[normalizePlatform(p.platform)]}
                              </Badge>
                            ) : null}
                          </div>
                          {p.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {p.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => handleReuse(p)}
                          >
                            <Wand2 className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => dupMut.mutate({ data: { id: p.id } })}
                            disabled={dupMut.isPending}
                          >
                            <Files className="h-3.5 w-3.5" /> Duplicar
                          </Button>
                          {p.status !== "published" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              onClick={() =>
                                updateMut.mutate({
                                  data: { id: p.id, status: "published" },
                                })
                              }
                              disabled={updateMut.isPending}
                            >
                              <Send className="h-3.5 w-3.5" /> Marcar publicada
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-destructive hover:text-destructive"
                            onClick={() => delMut.mutate({ data: { id: p.id } })}
                            disabled={delMut.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FlowConnector
        title="Cierra el ciclo de tu contenido"
        description="Vuelve a la biblioteca o al Flow Center para alimentar el siguiente paquete."
        steps={[
          { label: "Volver a Flow Center", to: "/crear/flow", icon: Wand2 },
          { label: "Ver Biblioteca", to: "/biblioteca/prompts", icon: FileText },
        ]}
      />
    </div>
  );
}

function FieldRow({
  icon,
  label,
  onCopy,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </Label>
        <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onCopy}>
          <Copy className="h-3 w-3" /> Copiar
        </Button>
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: PublicationProject["status"] }) {
  if (status === "published")
    return (
      <Badge variant="success" className="text-[10px]">
        Publicada
      </Badge>
    );
  if (status === "ready")
    return (
      <Badge variant="info" className="text-[10px]">
        Lista
      </Badge>
    );
  return (
    <Badge variant="soft" className="text-[10px]">
      Borrador
    </Badge>
  );
}