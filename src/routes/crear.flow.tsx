import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
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
  Play,
  Pause,
  Plus,
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
  Clock,
  Cpu,
  Aperture,
  Palette,
  ChevronRight,
  Image as ImageIcon,
  Zap,
  AlertCircle,
  X,
  Save,
  Copy,
  Trash2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { FlowConnector } from "@/components/flow-connector";
import {
  saveFlowJob,
  listFlowJobs,
  deleteFlowJob,
  duplicateFlowJob,
  type FlowJob,
} from "@/lib/flow-jobs.functions";

const flowSearchSchema = z.object({
  from: fallback(z.string(), "").default(""),
  prompt: fallback(z.string(), "").default(""),
  variante: fallback(z.string(), "").default(""),
  titulo: fallback(z.string(), "").default(""),
  plataforma: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/crear/flow")({
  head: () => ({
    meta: [
      { title: "Flow Center — AI Content Studio" },
      {
        name: "description",
        content:
          "Centro cinematográfico para generar, extender y refinar videos con IA.",
      },
    ],
  }),
  validateSearch: zodValidator(flowSearchSchema),
  component: FlowCenter,
});

// ───────────────────────────── Mock data ─────────────────────────────

const actions = [
  { id: "create", label: "Crear Video", icon: Plus, hint: "Nuevo desde prompt" },
  { id: "extend", label: "Extender 8s", icon: FastForward, hint: "Continúa la escena" },
  { id: "frame", label: "Continuar desde frame", icon: ImageIcon, hint: "Usar último frame" },
  { id: "continuity", label: "Mejorar continuidad", icon: GitMerge, hint: "Suavizar transiciones" },
  { id: "colors", label: "Mejorar colores", icon: Palette, hint: "Color grading IA" },
];

const PRESETS: Array<{
  id: string;
  label: string;
  duration: string;
  resolution: string;
  aspect: string;
  model: string;
}> = [
  { id: "yt-shorts", label: "YouTube Shorts", duration: "15", resolution: "1080", aspect: "9:16", model: "veo3" },
  { id: "tiktok", label: "TikTok", duration: "15", resolution: "1080", aspect: "9:16", model: "runway" },
  { id: "reels", label: "Reels", duration: "15", resolution: "1080", aspect: "9:16", model: "pika" },
  { id: "facebook", label: "Facebook", duration: "10", resolution: "1080", aspect: "1:1", model: "flow" },
  { id: "cinematic", label: "Cinemático 16:9", duration: "8", resolution: "4k", aspect: "16:9", model: "veo3" },
];

const ASPECTS = ["9:16", "1:1", "4:3", "16:9"] as const;

const historyMock = [
  {
    id: "v7",
    title: "Cinematic neon alley · v7",
    model: "Veo 3",
    duration: "8s",
    res: "1080p",
    status: "ready",
    time: "hace 2 min",
    thumb: "linear-gradient(135deg,#1a103d 0%,#5b21b6 50%,#ec4899 100%)",
  },
  {
    id: "v6",
    title: "Cinematic neon alley · v6",
    model: "Runway Gen-3",
    duration: "5s",
    res: "1080p",
    status: "ready",
    time: "hace 14 min",
    thumb: "linear-gradient(135deg,#0c1f3b 0%,#1d4ed8 60%,#22d3ee 100%)",
  },
  {
    id: "v5",
    title: "Drone over desert dunes",
    model: "Pika 2.0",
    duration: "6s",
    res: "720p",
    status: "ready",
    time: "hace 1 h",
    thumb: "linear-gradient(135deg,#3b1d0b 0%,#b45309 60%,#fcd34d 100%)",
  },
  {
    id: "v4",
    title: "Slow-mo splash macro",
    model: "Veo 3",
    duration: "4s",
    res: "1080p",
    status: "rendering",
    time: "procesando",
    thumb: "linear-gradient(135deg,#052e2b 0%,#0d9488 60%,#a7f3d0 100%)",
  },
  {
    id: "v3",
    title: "Cyberpunk skyline pan",
    model: "Flow Pro",
    duration: "10s",
    res: "4K",
    status: "ready",
    time: "ayer",
    thumb: "linear-gradient(135deg,#1e1b4b 0%,#7c3aed 50%,#f472b6 100%)",
  },
];

const versions = [
  { id: "v7", label: "v7", note: "Color grading +12, extendido 8s", current: true },
  { id: "v6", label: "v6", note: "Frame inicial cambiado" },
  { id: "v5", label: "v5", note: "Prompt refinado · 'neon rainfall'" },
  { id: "v4", label: "v4", note: "Render base" },
];

// ────────────────────────────── Page ─────────────────────────────────

function FlowCenter() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [active, setActive] = useState("create");
  const [selected, setSelected] = useState("v7");
  const [strength, setStrength] = useState([72]);
  const [promptText, setPromptText] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [title, setTitle] = useState("");
  const [model, setModel] = useState("veo3");
  const [resolution, setResolution] = useState("1080");
  const [duration, setDuration] = useState("8");
  const [aspect, setAspect] = useState("16:9");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (search.from && search.prompt) {
      setPromptText(search.prompt);
      setShowAlert(true);
      if (search.titulo) setTitle(search.titulo);
    }
  }, [search]);

  const current = historyMock.find((h) => h.id === selected) ?? historyMock[0];

  // ── Flow jobs query ───────────────────────────────────────────
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
      } else {
        toast.error(res.message);
      }
    },
  });

  const del = useServerFn(deleteFlowJob);
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

  const dup = useServerFn(duplicateFlowJob);
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

  function applyPreset(p: (typeof PRESETS)[number]) {
    setActivePreset(p.id);
    setDuration(p.duration);
    setResolution(p.resolution);
    setAspect(p.aspect);
    setModel(p.model);
    toast.message(`Preset aplicado: ${p.label}`);
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

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 lg:p-8">
      <PageHeader
        title="Flow Center"
        subtitle="Estudio cinematográfico para generar, extender y refinar tus videos con IA."
        actions={
          <>
            <Badge
              variant="outline"
              className="gap-1.5 border-border/60 bg-card/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
              Motor Flow online
            </Badge>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Compartir
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
            >
              <Sparkles className="h-3.5 w-3.5" /> Nueva generación
            </Button>
          </>
        }
      />

      {showAlert && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {search.from === "biblioteca" ? "Prompt cargado desde Biblioteca" : "Prompt cargado desde Crear"}
            {search.variante ? ` · Variante: ${search.variante}` : ""}
          </span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowAlert(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Action rail */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {actions.map((a) => {
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setActive(a.id)}
              className={[
                "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                isActive
                  ? "border-primary/50 bg-[image:var(--gradient-primary)]/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_32px_-12px_hsl(var(--primary)/0.4)]"
                  : "border-border/60 bg-card/60 hover:border-border hover:bg-card",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary/15 text-secondary group-hover:bg-secondary/25",
                ].join(" ")}
              >
                <a.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {a.label}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.hint}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3-column workspace */}
      {/* Presets */}
      <Card className="surface-card border-border/60">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Presets
          </span>
          {PRESETS.map((p) => {
            const isOn = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={[
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                  isOn
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/80",
                ].join(" ")}
              >
                {p.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[300px_1fr_340px]">
        {/* ───────── Left: Configuration ───────── */}
        <Card className="surface-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="h-4 w-4 text-primary" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Modelo" icon={Sparkles}>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-9 bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veo3">Veo 3 · Cinematic</SelectItem>
                  <SelectItem value="runway">Runway Gen-3</SelectItem>
                  <SelectItem value="pika">Pika 2.0</SelectItem>
                  <SelectItem value="flow">Flow Pro</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Resolución" icon={Aperture}>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="h-9 bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720">720p</SelectItem>
                  <SelectItem value="1080">1080p Full HD</SelectItem>
                  <SelectItem value="2k">2K</SelectItem>
                  <SelectItem value="4k">4K Ultra</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Duración" icon={Clock}>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-9 bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 segundos</SelectItem>
                  <SelectItem value="5">5 segundos</SelectItem>
                  <SelectItem value="8">8 segundos</SelectItem>
                  <SelectItem value="10">10 segundos</SelectItem>
                  <SelectItem value="15">15 segundos</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Relación de aspecto" icon={Maximize2}>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECTS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspect(r)}
                    className={[
                      "rounded-md border px-2 py-1.5 text-[11px] font-medium transition",
                      aspect === r
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/80",
                    ].join(" ")}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Calidad" icon={Zap}>
              <Select defaultValue="high">
                <SelectTrigger className="h-9 bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador · rápido</SelectItem>
                  <SelectItem value="standard">Estándar</SelectItem>
                  <SelectItem value="high">Alta fidelidad</SelectItem>
                  <SelectItem value="ultra">Ultra · lento</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Separator className="bg-border/60" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Intensidad creativa
                </Label>
                <span className="text-xs font-mono tabular-nums text-foreground">
                  {strength[0]}%
                </span>
              </div>
              <Slider
                value={strength}
                onValueChange={setStrength}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <Button className="h-10 w-full gap-2 bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Generar
            </Button>
          </CardContent>
        </Card>

        {/* ───────── Center: Preview ───────── */}
        <div className="flex flex-col gap-4">
          <Card className="surface-card overflow-hidden border-border/60">
            <div
              className="relative aspect-video w-full overflow-hidden"
              style={{ background: current.thumb }}
            >
              {/* Ambient glow */}
              <div className="ambient-blob absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
              <div className="ambient-blob absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-secondary/30 blur-3xl" />

              {/* Film grain overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

              {/* Top bar */}
              <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-4 py-3">
                <Badge className="gap-1.5 border-white/10 bg-black/40 text-[11px] text-white backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  REC · {current.id.toUpperCase()}
                </Badge>
                <Badge className="border-white/10 bg-black/40 text-[11px] text-white backdrop-blur-md">
                  {current.model} · {current.res} · {current.duration}
                </Badge>
              </div>

              {/* Play button */}
              <button className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md ring-1 ring-white/20 transition hover:scale-105 hover:bg-white/20">
                  <Play className="h-7 w-7 fill-white" />
                </span>
              </button>

              {/* Bottom timeline */}
              <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-8">
                <div className="flex items-center gap-3 text-white">
                  <button className="text-white/90 hover:text-white">
                    <Pause className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-[11px] tabular-nums text-white/70">
                    00:03 / 00:08
                  </span>
                  <div className="relative mx-1 h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-white" />
                    <div className="absolute inset-y-0 left-[38%] w-[12%] rounded-full bg-white/30" />
                  </div>
                  <Volume2 className="h-4 w-4 text-white/70" />
                  <Maximize2 className="h-4 w-4 text-white/70" />
                </div>
              </div>
            </div>

            <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {current.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {current.time} · {current.model}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <FastForward className="h-3.5 w-3.5" /> Extender 8s
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Color grade
                </Button>
                <Button size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Frame strip */}
          <Card className="surface-card border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Film className="h-4 w-4 text-primary" /> Timeline · frames clave
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                Continuar desde frame <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <button
                    key={i}
                    className={[
                      "relative h-16 w-28 shrink-0 overflow-hidden rounded-md border transition",
                      i === 3
                        ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.4)]"
                        : "border-border/60 hover:border-border",
                    ].join(" ")}
                    style={{ background: current.thumb }}
                  >
                    <span className="absolute bottom-0.5 right-1 rounded bg-black/60 px-1 py-0.5 font-mono text-[9px] text-white">
                      0:0{i}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ───────── Right: Prompt / History / Versions ───────── */}
        <Card className="surface-card border-border/60">
          <Tabs defaultValue="prompt" className="w-full">
            <CardHeader className="pb-3">
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
            </CardHeader>

            <CardContent className="space-y-4">
              <TabsContent value="prompt" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Prompt utilizado
                  </Label>
                  <Textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Describe tu escena cinematográfica..."
                    className="min-h-[140px] resize-none bg-background/60 text-sm leading-relaxed"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Negative prompt
                  </Label>
                  <Textarea
                    defaultValue="blurry, low quality, deformed, watermark"
                    className="min-h-[60px] resize-none bg-background/60 text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
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
                <Button size="sm" variant="outline" className="w-full gap-1.5">
                  <Wand2 className="h-3.5 w-3.5" /> Mejorar prompt
                </Button>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <ScrollArea className="h-[440px] pr-2">
                  <div className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                    <History className="h-3.5 w-3.5" /> Generaciones recientes
                  </div>
                  <div className="space-y-2">
                    {history.map((h) => {
                      const isSel = h.id === selected;
                      return (
                        <button
                          key={h.id}
                          onClick={() => setSelected(h.id)}
                          className={[
                            "flex w-full items-center gap-3 rounded-lg border p-2 text-left transition",
                            isSel
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/60 bg-background/40 hover:bg-background/80",
                          ].join(" ")}
                        >
                          <div
                            className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md"
                            style={{ background: h.thumb }}
                          >
                            {h.status === "rendering" ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              </div>
                            ) : (
                              <Play className="absolute inset-0 m-auto h-4 w-4 fill-white/90 text-white/90" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">
                              {h.title}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {h.model} · {h.duration} · {h.res}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {h.time}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="versions" className="mt-0 space-y-2">
                <div className="flex items-center gap-2 pb-1 text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" /> Iteraciones del proyecto
                </div>
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={[
                      "flex items-start gap-3 rounded-lg border p-3 transition",
                      v.current
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 bg-background/40 hover:bg-background/70",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-semibold",
                        v.current
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary/20 text-secondary",
                      ].join(" ")}
                    >
                      {v.label}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-foreground">
                          Versión {v.label}
                        </p>
                        {v.current && (
                          <Badge className="h-4 border-0 bg-primary/15 px-1.5 text-[9px] text-primary">
                            actual
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
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

      <FlowConnector
        title="Tu video está listo"
        description="Guárdalo en tu biblioteca o prográmalo para publicación en tus redes."
        steps={[
          { label: "Guardar en Biblioteca", to: "/biblioteca/videos", icon: Film },
          { label: "Programar Publicación", to: "/publicar", icon: Share2 },
        ]}
      />
    </div>
  );
}

// ────────────────────────────── Helpers ──────────────────────────────

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </Label>
      {children}
    </div>
  );
}
