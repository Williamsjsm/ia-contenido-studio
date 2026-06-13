import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Play,
  Pause,
  FastForward,
  GitMerge,
  Wand2,
  Sparkles,
  Film,
  Layers,
  History,
  Download,
  Share2,
  Maximize2,
  Volume2,
  Palette,
  Image as ImageIcon,
  AlertCircle,
  X,
  Save,
  Copy,
  Trash2,
  RotateCcw,
  Loader2,
  Send,
} from "lucide-react";
import { FlowConnector } from "@/components/flow-connector";
import {
  saveFlowJob,
  listFlowJobs,
  deleteFlowJob,
  duplicateFlowJob,
  type FlowJob,
} from "@/lib/flow-jobs.functions";
import { FlowContinuityStudio, type ContinuityContext } from "@/components/flow-continuity-studio";
import type { ProviderId } from "@/lib/video-export-pack";

const flowSearchSchema = z.object({
  from: fallback(z.string(), "").default(""),
  prompt: fallback(z.string(), "").default(""),
  variante: fallback(z.string(), "").default(""),
  titulo: fallback(z.string(), "").default(""),
  plataforma: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
  preset: fallback(z.string(), "").default(""),
  proveedor: fallback(z.string(), "").default(""),
  personaje: fallback(z.string(), "").default(""),
  proyecto: fallback(z.string(), "").default(""),
  imagenUrl: fallback(z.string(), "").default(""),
  draftId: fallback(z.string(), "").default(""),
  proyectoId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/crear/flow")({
  head: () => ({
    meta: [
      { title: "Flow Center — AI Content Studio" },
      {
        name: "description",
        content:
          "Estación de trabajo compacta para generar, extender y refinar videos con IA.",
      },
    ],
  }),
  validateSearch: zodValidator(flowSearchSchema),
  component: FlowCenter,
});

const PRESETS = [
  { id: "yt-shorts", label: "Shorts", duration: "15", resolution: "1080", aspect: "9:16", model: "veo3" },
  { id: "tiktok", label: "TikTok", duration: "15", resolution: "1080", aspect: "9:16", model: "runway" },
  { id: "reels", label: "Reels", duration: "15", resolution: "1080", aspect: "9:16", model: "pika" },
  { id: "cinematic", label: "Cine 16:9", duration: "8", resolution: "4k", aspect: "16:9", model: "veo3" },
] as const;

const ASPECTS = ["9:16", "1:1", "4:3", "16:9"] as const;
const TIPOS = ["video", "imagen"] as const;
const MODOS = ["fotogramas", "ingredientes"] as const;
const VARIATIONS = [1, 2, 3, 4] as const;
const DURATIONS = ["4", "6", "8", "10", "15"] as const;

const heroThumb = "linear-gradient(135deg,#1a103d 0%,#5b21b6 50%,#ec4899 100%)";

const versions = [
  { id: "v7", label: "v7", note: "Color grading +12, extendido 8s", current: true },
  { id: "v6", label: "v6", note: "Frame inicial cambiado" },
  { id: "v5", label: "v5", note: "Prompt refinado · 'neon rainfall'" },
];

function FlowCenter() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [promptText, setPromptText] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "blurry, low quality, deformed, watermark",
  );
  const [title, setTitle] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const [model, setModel] = useState("veo3");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("video");
  const [aspect, setAspect] = useState("16:9");
  const [modo, setModo] = useState<(typeof MODOS)[number]>("fotogramas");
  const [duration, setDuration] = useState("8");
  const [variations, setVariations] = useState<(typeof VARIATIONS)[number]>(1);
  const [resolution, setResolution] = useState("1080");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (search.from && search.prompt) {
      setPromptText(search.prompt);
      setShowAlert(true);
      if (search.titulo) setTitle(search.titulo);
    }
  }, [search]);

  const fetchJobs = useServerFn(listFlowJobs);
  const jobsQuery = useQuery({
    queryKey: ["flow", "jobs"],
    queryFn: () => fetchJobs(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["flow", "jobs"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useServerFn(saveFlowJob);
  const saveMut = useMutation({
    mutationFn: save,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Guardado en Flow");
        invalidate();
      } else toast.error(res.message);
    },
  });

  const del = useServerFn(deleteFlowJob);
  const delMut = useMutation({
    mutationFn: del,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Eliminado");
        invalidate();
      } else toast.error(res.message);
    },
  });

  const dup = useServerFn(duplicateFlowJob);
  const dupMut = useMutation({
    mutationFn: dup,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Duplicado");
        invalidate();
      } else toast.error(res.message);
    },
  });

  function applyPreset(p: (typeof PRESETS)[number]) {
    setActivePreset(p.id);
    setDuration(p.duration);
    setResolution(p.resolution);
    setAspect(p.aspect);
    setModel(p.model);
    toast.message(`Preset: ${p.label}`);
  }

  function handleSave() {
    if (!promptText.trim()) {
      toast.error("Escribe un prompt antes de guardar.");
      return;
    }
    saveMut.mutate({
      data: {
        title: title.trim() || promptText.trim().slice(0, 60),
        prompt: promptText.trim(),
        source_variant: search.variante || null,
        platform: search.plataforma || activePreset || null,
        category: search.categoria || null,
        duration,
        resolution,
        aspect_ratio: aspect,
        model,
        status: "draft",
        flow_mode: tipo,
        flow_media_type: modo,
        variations,
      },
    });
  }

  function handleReuse(job: FlowJob) {
    setPromptText(job.prompt);
    setTitle(job.title);
    if (job.duration) setDuration(job.duration);
    if (job.resolution) setResolution(job.resolution);
    if (job.aspect_ratio) setAspect(job.aspect_ratio);
    if (job.model) setModel(job.model);
    toast.success("Prompt reutilizado");
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Prompt copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  function handleGenerate() {
    if (!promptText.trim()) {
      toast.error("Agrega un prompt antes de generar.");
      return;
    }
    setIsGenerateOpen(true);
  }

  function handleSendToPublication() {
    if (!promptText.trim()) {
      toast.error("Agrega un prompt antes de enviar.");
      return;
    }
    navigate({
      to: "/publicacion",
      search: {
        prompt: promptText.trim(),
        titulo: title.trim() || promptText.trim().slice(0, 60),
        plataforma: search.plataforma || activePreset || "",
        categoria: search.categoria || "",
        flow_job_id: "",
      },
    });
  }

  const continuityCtx: ContinuityContext = {
    sourceImage: search.imagenUrl || null,
    projectTitle: search.proyecto || search.titulo || null,
    characterName: search.personaje || null,
    preset: search.preset || activePreset || null,
    providerTarget: (search.proveedor as ProviderId) || "flow",
    duration,
    aspectRatio: aspect,
    cameraMotion: null,
    initialPrompt: promptText,
    draftId: search.draftId || null,
    projectId: search.proyectoId || null,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 lg:p-4">
      <PageHeader
        title="Flow Center"
        subtitle="Estación de trabajo para generar y refinar videos con IA."
        actions={
          <>
            <Badge
              variant="outline"
              className="gap-1.5 border-border/60 bg-card/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
              Motor Flow online
            </Badge>
            <Button
              size="sm"
              className="gap-1.5 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
              onClick={handleGenerate}
            >
              <Sparkles className="h-3.5 w-3.5" /> Generar
            </Button>
          </>
        }
      />

      {showAlert && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            {search.from === "biblioteca"
              ? "Prompt cargado desde Biblioteca"
              : "Prompt cargado desde Crear"}
            {search.variante ? ` · Variante: ${search.variante}` : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setShowAlert(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ───────── Continuity Studio (prioridad visual) ───────── */}
      <FlowContinuityStudio ctx={continuityCtx} />

      {/* Main 70/30 workspace */}
      <div className="grid gap-3 lg:grid-cols-[7fr_3fr]">
        {/* ───────── LEFT 70% ───────── */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Video player — compact 16:9, height-capped */}
          <Card className="surface-card overflow-hidden border-border/60">
            <div
              className="relative mx-auto aspect-video w-full overflow-hidden"
              style={{ background: heroThumb, maxHeight: "46vh" }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
              <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-3 py-2">
                <Badge className="gap-1.5 border-white/10 bg-black/40 text-[10px] text-white backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  REC · V7
                </Badge>
                <Badge className="border-white/10 bg-black/40 text-[10px] text-white backdrop-blur-md">
                  {model} · {resolution}p · {duration}s
                </Badge>
              </div>
              <button className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md ring-1 ring-white/20 transition hover:scale-105 hover:bg-white/20">
                  <Play className="h-6 w-6 fill-white" />
                </span>
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-6">
                <div className="flex items-center gap-2 text-white">
                  <Pause className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] tabular-nums text-white/70">
                    00:03 / 00:08
                  </span>
                  <div className="relative mx-1 h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-white" />
                  </div>
                  <Volume2 className="h-3.5 w-3.5 text-white/70" />
                  <Maximize2 className="h-3.5 w-3.5 text-white/70" />
                </div>
              </div>
            </div>
          </Card>

          {/* Configuración — single compact row */}
          <Card className="surface-card border-border/60">
            <CardContent className="grid gap-2 p-3 md:grid-cols-6">
              <Field label="Modelo">
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-8 bg-background/60 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veo3">Veo 3</SelectItem>
                    <SelectItem value="runway">Runway Gen-3</SelectItem>
                    <SelectItem value="pika">Pika 2.0</SelectItem>
                    <SelectItem value="flow">Flow Pro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo">
                <PillRow
                  value={tipo}
                  options={TIPOS as readonly string[]}
                  onChange={(v) => setTipo(v as (typeof TIPOS)[number])}
                />
              </Field>
              <Field label="Aspecto">
                <PillRow
                  value={aspect}
                  options={ASPECTS as readonly string[]}
                  onChange={setAspect}
                />
              </Field>
              <Field label="Modo">
                <PillRow
                  value={modo}
                  options={MODOS as readonly string[]}
                  onChange={(v) => setModo(v as (typeof MODOS)[number])}
                />
              </Field>
              <Field label="Duración">
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-8 bg-background/60 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Variaciones">
                <PillRow
                  value={String(variations)}
                  options={VARIATIONS.map((v) => `x${v}`)}
                  onChange={(v) =>
                    setVariations(
                      Number(v.replace("x", "")) as (typeof VARIATIONS)[number],
                    )
                  }
                  display={(o) => o}
                  match={(o) => o === `x${variations}`}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="surface-card border-border/60">
            <CardContent className="flex flex-wrap items-center gap-2 p-2.5">
              <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Presets
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={[
                    "rounded-md border px-2 py-1 text-[11px] font-medium transition",
                    activePreset === p.id
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/80",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
              <div className="mx-2 hidden h-5 w-px bg-border/60 md:block" />
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                <FastForward className="h-3.5 w-3.5" /> Extender 8s
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" /> Color grade
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                <ImageIcon className="h-3.5 w-3.5" /> Continuar frame
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                <GitMerge className="h-3.5 w-3.5" /> Continuidad
              </Button>
              <Button size="sm" className="ml-auto h-7 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ───────── RIGHT 30% ───────── */}
        <Card className="surface-card border-border/60">
          <Tabs defaultValue="prompt" className="w-full">
            <div className="p-3 pb-2">
              <TabsList className="grid w-full grid-cols-3 bg-secondary/30">
                <TabsTrigger value="prompt" className="text-xs">
                  Prompt
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  Historial
                </TabsTrigger>
                <TabsTrigger value="versions" className="text-xs">
                  Versiones
                </TabsTrigger>
              </TabsList>
            </div>
            <CardContent className="space-y-3 p-3 pt-0">
              <TabsContent value="prompt" className="mt-0 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Título
                  </Label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mi job de Flow"
                    className="flex h-8 w-full rounded-md border border-border/60 bg-background/60 px-2.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Prompt
                  </Label>
                  <Textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Describe tu escena cinematográfica..."
                    className="max-h-[140px] min-h-[140px] resize-none bg-background/60 text-xs leading-relaxed"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Negative prompt
                  </Label>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="max-h-[90px] min-h-[90px] resize-none bg-background/60 text-[11px]"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {["cinematic", "neon", "rain", "anamorphic", "teal/magenta"].map(
                    (t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="border-border/60 bg-background/40 text-[10px] font-normal text-muted-foreground"
                      >
                        {t}
                      </Badge>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Mejorar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => handleCopy(promptText)}
                    disabled={!promptText.trim()}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-[image:var(--gradient-primary)] text-xs text-primary-foreground hover:opacity-90"
                    onClick={handleSave}
                    disabled={saveMut.isPending}
                  >
                    {saveMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleSendToPublication}
                    disabled={!promptText.trim()}
                  >
                    <Send className="h-3.5 w-3.5" /> Publicar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <ScrollArea className="h-[380px] pr-2">
                  <div className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                    <History className="h-3.5 w-3.5" /> Historial
                    {jobsQuery.data ? (
                      <span className="ml-auto text-[10px]">
                        {jobsQuery.data.length}
                      </span>
                    ) : null}
                  </div>
                  {jobsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Cargando…
                    </div>
                  ) : jobsQuery.error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                      No se pudo cargar el historial.
                    </div>
                  ) : !jobsQuery.data || jobsQuery.data.length === 0 ? (
                    <div className="rounded-md border border-border/60 bg-background/40 p-3 text-center text-[11px] text-muted-foreground">
                      Sin prompts guardados.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {jobsQuery.data.map((j) => (
                        <div
                          key={j.id}
                          className="space-y-1.5 rounded-md border border-border/60 bg-background/40 p-2 transition hover:bg-background/70"
                        >
                          <p className="truncate text-[11px] font-medium text-foreground">
                            {j.title}
                          </p>
                          <p className="line-clamp-2 text-[10px] text-muted-foreground">
                            {j.prompt}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 flex-1 gap-1 px-2 text-[10px]"
                              onClick={() => handleReuse(j)}
                            >
                              <RotateCcw className="h-3 w-3" /> Reusar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                dupMut.mutate({ data: { id: j.id } })
                              }
                              disabled={dupMut.isPending}
                              title="Duplicar"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() =>
                                delMut.mutate({ data: { id: j.id } })
                              }
                              disabled={delMut.isPending}
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="versions" className="mt-0 space-y-1.5">
                <div className="flex items-center gap-2 pb-1 text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" /> Iteraciones
                </div>
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={[
                      "flex items-start gap-2 rounded-md border p-2 transition",
                      v.current
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 bg-background/40 hover:bg-background/70",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-semibold",
                        v.current
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary/20 text-secondary",
                      ].join(" ")}
                    >
                      {v.label}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-foreground">
                        Versión {v.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {v.note}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Generate modal */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              Generación de video
            </DialogTitle>
            <DialogDescription>
              La generación de video aún no está conectada. Copia el prompt o
              guárdalo en Flow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                handleCopy(promptText);
                setIsGenerateOpen(false);
              }}
              disabled={!promptText.trim()}
            >
              <Copy className="h-4 w-4" /> Copiar prompt
            </Button>
            <Button
              className="gap-2 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
              onClick={() => {
                handleSave();
                setIsGenerateOpen(false);
              }}
              disabled={saveMut.isPending || !promptText.trim()}
            >
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar en Flow
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                setIsGenerateOpen(false);
                handleSendToPublication();
              }}
              disabled={!promptText.trim()}
            >
              <Send className="h-4 w-4" /> Enviar a Publicación
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsGenerateOpen(false)}>
              <X className="h-4 w-4" /> Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FlowConnector
        title="Tu video está listo"
        description="Guárdalo en tu biblioteca o prográmalo para publicación."
        steps={[
          { label: "Guardar en Biblioteca", to: "/biblioteca/videos", icon: Film },
          { label: "Programar Publicación", to: "/publicar", icon: Share2 },
        ]}
      />
    </div>
  );
}

// ───────────────────────── Helpers ─────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function PillRow({
  value,
  options,
  onChange,
  display,
  match,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  display?: (o: string) => string;
  match?: (o: string) => boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const isActive = match ? match(o) : o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={[
              "rounded-md border px-1.5 py-1 text-[10px] font-medium transition",
              isActive
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/80",
            ].join(" ")}
          >
            {display ? display(o) : o}
          </button>
        );
      })}
    </div>
  );
}