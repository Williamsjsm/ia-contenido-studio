import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Video,
  Sparkles,
  Image as ImageIcon,
  Users,
  FolderKanban,
  Copy as CopyIcon,
  Plus,
  History,
  Film,
  Wand2,
  Trash2,
} from "lucide-react";
import {
  createVideoDraft,
  updateVideoDraft,
  duplicateVideoDraft,
  deleteVideoDraft,
  getVideoDraftDetail,
  listVideoDrafts,
  VIDEO_STATUSES,
} from "@/lib/video-drafts.functions";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoExportPack } from "@/components/video-export-pack";
import { buildProviderPack } from "@/lib/video-export-pack";

const searchSchema = z.object({
  draftId: fallback(z.string(), "").default(""),
  fromImage: fallback(z.string(), "").default(""),
  flowId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/crear/video")({
  head: () => ({ meta: [{ title: "Video Hub — AI Content Studio" }] }),
  validateSearch: zodValidator(searchSchema),
  component: VideoHub,
});

type Preset = {
  id: string;
  label: string;
  duration: string;
  aspect: string;
  camera: string;
  style: string;
};

const PRESETS: Preset[] = [
  { id: "cinematico", label: "Cinemático", duration: "10", aspect: "21:9", camera: "dolly", style: "cinematic, film grain, anamorphic" },
  { id: "tiktok", label: "TikTok Viral", duration: "8", aspect: "9:16", camera: "handheld", style: "vibrant, dynamic, trending" },
  { id: "reels-lifestyle", label: "Reels Lifestyle", duration: "8", aspect: "9:16", camera: "slow-pan", style: "warm, lifestyle, soft light" },
  { id: "producto", label: "Producto", duration: "5", aspect: "1:1", camera: "orbit", style: "studio, clean, hero shot" },
  { id: "historia", label: "Historia", duration: "15", aspect: "16:9", camera: "tracking", style: "narrative, emotional" },
  { id: "animal-ia", label: "Animal IA", duration: "8", aspect: "9:16", camera: "follow", style: "wildlife, hyperreal" },
  { id: "influencer-ia", label: "Influencer IA", duration: "8", aspect: "9:16", camera: "selfie", style: "vlog, authentic" },
];

const PROVIDERS = [
  { id: "veo", label: "Google Veo" },
  { id: "flow", label: "Flow" },
  { id: "kling", label: "Kling" },
  { id: "runway", label: "Runway" },
  { id: "pika", label: "Pika" },
];

function VideoHub() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const createFn = useServerFn(createVideoDraft);
  const updateFn = useServerFn(updateVideoDraft);
  const dupFn = useServerFn(duplicateVideoDraft);
  const delFn = useServerFn(deleteVideoDraft);
  const getFn = useServerFn(getVideoDraftDetail);
  const listFn = useServerFn(listVideoDrafts);

  const activeId = search.draftId || "";

  const list = useQuery({
    queryKey: ["video-drafts"],
    queryFn: () => listFn(),
  });
  const detail = useQuery({
    queryKey: ["video-draft", activeId],
    queryFn: () => getFn({ data: { id: activeId } }),
    enabled: !!activeId,
  });

  // Local editable state (debounced save on blur)
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [aspect, setAspect] = useState<string>("");
  const [camera, setCamera] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!detail.data) return;
    setTitle(detail.data.title);
    setPrompt(detail.data.prompt);
    setPreset(detail.data.preset ?? "");
    setDuration(detail.data.duration ?? "");
    setAspect(detail.data.aspect_ratio ?? "");
    setCamera(detail.data.camera_motion ?? "");
    setProvider(detail.data.provider ?? "");
  }, [detail.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["video-drafts"] });
    if (activeId) qc.invalidateQueries({ queryKey: ["video-draft", activeId] });
  }

  async function handleNew() {
    const r = await createFn({ data: {} });
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    invalidate();
    navigate({ to: "/crear/video", search: { draftId: r.draft.id, fromImage: "", flowId: "" } });
  }

  async function handleSave() {
    if (!activeId) return;
    setSaving(true);
    try {
      const r = await updateFn({
        data: {
          id: activeId,
          title,
          prompt,
          preset: preset || null,
          duration: duration || null,
          aspectRatio: aspect || null,
          cameraMotion: camera || null,
          provider: provider || null,
        },
      });
      if (!r.ok) toast.error(r.message);
      else {
        toast.success("Borrador guardado.");
        invalidate();
      }
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(p.id);
    setDuration(p.duration);
    setAspect(p.aspect);
    setCamera(p.camera);
    // append style hint to prompt if not present
    if (p.style && !prompt.toLowerCase().includes(p.style.toLowerCase().split(",")[0])) {
      setPrompt((prev) => (prev ? `${prev}\n\nEstilo: ${p.style}` : `Estilo: ${p.style}`));
    }
    toast(`Preset «${p.label}» aplicado.`);
  }

  async function handleDuplicate() {
    if (!activeId) return;
    const r = await dupFn({ data: { id: activeId } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success("Nueva versión creada.");
      invalidate();
      if (r.id) navigate({ to: "/crear/video", search: { draftId: r.id, fromImage: "", flowId: "" } });
    }
  }

  async function handleDelete() {
    if (!activeId) return;
    const r = await delFn({ data: { id: activeId } });
    if (!r.ok) toast.error(r.message);
    else {
      toast.success("Borrador eliminado.");
      qc.invalidateQueries({ queryKey: ["video-drafts"] });
      navigate({ to: "/crear/video", search: { draftId: "", fromImage: "", flowId: "" } });
    }
  }

  const drafts = Array.isArray(list.data) ? list.data : [];

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Video Hub"
        subtitle="Centro operativo de video: imagen → personaje → proyecto → versiones."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleNew}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Nuevo borrador
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_300px]">
        {/* Left: drafts list */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Film className="h-4 w-4" /> Borradores
              <span className="ml-auto text-[11px] text-muted-foreground">{drafts.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {drafts.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                Aún no hay borradores. Envía una imagen a video o crea uno nuevo.
              </p>
            ) : (
              drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() =>
                    navigate({ to: "/crear/video", search: { draftId: d.id, fromImage: "", flowId: "" } })
                  }
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left text-xs transition hover:bg-muted/50",
                    activeId === d.id && "bg-muted/70 ring-1 ring-border",
                  )}
                >
                  <p className="line-clamp-1 font-medium">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    v{d.version} · {d.status}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Center: editor */}
        {!activeId ? (
          <Card className="flex min-h-[480px] flex-col items-center justify-center border-dashed border-border/60 bg-card lg:col-span-2">
            <Video className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Selecciona un borrador o crea uno nuevo para empezar.
            </p>
            <Button className="mt-4" onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo borrador
            </Button>
          </Card>
        ) : detail.isLoading || !detail.data ? (
          <Card className="flex min-h-[480px] items-center justify-center border-border/60 bg-card lg:col-span-2">
            <p className="text-sm text-muted-foreground">Cargando borrador…</p>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              <Card className="border-border/60 bg-card">
                <CardContent className="space-y-4 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ContextChip
                      icon={<ImageIcon className="h-3.5 w-3.5" />}
                      label="Imagen origen"
                      value={detail.data.source_image_id ? "Sí" : "—"}
                    />
                    <ContextChip
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="Personaje"
                      value={detail.data.character_name ?? "—"}
                    />
                    <ContextChip
                      icon={<FolderKanban className="h-3.5 w-3.5" />}
                      label="Proyecto"
                      value={detail.data.project_title ?? "—"}
                      href={
                        detail.data.project_id
                          ? `/proyectos/${detail.data.project_id}`
                          : undefined
                      }
                    />
                  </div>
                  {detail.data.source_image_base64 && (
                    <div className="overflow-hidden rounded-md border border-border/40">
                      <img
                        src={`data:image/png;base64,${detail.data.source_image_base64}`}
                        alt="Imagen origen"
                        className="max-h-72 w-full object-contain bg-black/20"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prompt de video</Label>
                    <Textarea
                      rows={6}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe el movimiento y la escena…"
                    />
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Wand2 className="h-3 w-3" /> Generado automáticamente desde imagen / personaje. Editable.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="Duración">
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5s</SelectItem>
                          <SelectItem value="8">8s</SelectItem>
                          <SelectItem value="10">10s</SelectItem>
                          <SelectItem value="15">15s</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Aspecto">
                      <Select value={aspect} onValueChange={setAspect}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9:16">9:16</SelectItem>
                          <SelectItem value="16:9">16:9</SelectItem>
                          <SelectItem value="1:1">1:1</SelectItem>
                          <SelectItem value="21:9">21:9</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Cámara">
                      <Select value={camera} onValueChange={setCamera}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="static">Fija</SelectItem>
                          <SelectItem value="dolly">Dolly</SelectItem>
                          <SelectItem value="orbit">Orbit</SelectItem>
                          <SelectItem value="tracking">Tracking</SelectItem>
                          <SelectItem value="handheld">Handheld</SelectItem>
                          <SelectItem value="slow-pan">Slow pan</SelectItem>
                          <SelectItem value="follow">Follow</SelectItem>
                          <SelectItem value="selfie">Selfie</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Proveedor">
                      <Select value={provider} onValueChange={setProvider}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSave} disabled={saving} className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
                      <Sparkles className="mr-2 h-4 w-4" /> {saving ? "Guardando…" : "Guardar borrador"}
                    </Button>
                    <Button variant="outline" onClick={handleDuplicate}>
                      <CopyIcon className="mr-2 h-4 w-4" /> Nueva versión
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast("Función preparada", { description: "Extender video estará disponible al conectar proveedor." })}
                    >
                      Extender
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast("Función preparada", { description: "Continuar desde frame estará disponible al conectar proveedor." })}
                    >
                      Continuar desde frame
                    </Button>
                    <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Plantillas</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className={cn(
                        "rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-left text-xs transition hover:border-primary/50 hover:bg-muted/40",
                        preset === p.id && "border-primary bg-primary/10",
                      )}
                    >
                      <p className="font-medium">{p.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {p.duration}s · {p.aspect} · {p.camera}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <DraftTabs draft={detail.data} />
            </div>

            {/* Right: versions */}
            <Card className="border-border/60 bg-card h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" /> Versiones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {detail.data.versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin versiones todavía.</p>
                ) : (
                  detail.data.versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() =>
                        navigate({ to: "/crear/video", search: { draftId: v.id, fromImage: "", flowId: "" } })
                      }
                      className={cn(
                        "w-full rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-left text-xs transition hover:border-primary/50",
                        activeId === v.id && "border-primary bg-primary/10",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Versión {v.version}</span>
                        <Badge variant="secondary" className="text-[9px]">{v.status}</Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{v.title}</p>
                    </button>
                  ))
                )}
                <p className="pt-2 text-[10px] text-muted-foreground">
                  Estados: {VIDEO_STATUSES.join(" · ")}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/crear/flow" className="underline hover:text-foreground">Flow Center</Link>
        <span>·</span>
        <span>La generación real con proveedor estará disponible al conectar la API.</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ContextChip({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-xs">{value}</p>
      </div>
    </div>
  );
  if (href) return <Link to={href} className="block hover:opacity-80">{body}</Link>;
  return body;
}

function DraftTabs({ draft }: { draft: import("@/lib/video-drafts.functions").VideoDraftDetail }) {
  const flowPack = buildProviderPack("flow", draft);
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-4">
        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="image">Imagen origen</TabsTrigger>
            <TabsTrigger value="initial">Prompt Inicial</TabsTrigger>
            <TabsTrigger value="continuation">Continuación</TabsTrigger>
            <TabsTrigger value="extension">Extensión</TabsTrigger>
            <TabsTrigger value="export">Export Pack</TabsTrigger>
          </TabsList>
          <TabsContent value="image" className="mt-4">
            {draft.source_image_base64 ? (
              <img
                src={`data:image/png;base64,${draft.source_image_base64}`}
                alt="Imagen origen"
                className="max-h-96 w-full rounded-md border border-border/40 object-contain bg-black/20"
              />
            ) : (
              <p className="text-xs text-muted-foreground">Este borrador no tiene imagen origen.</p>
            )}
            {draft.source_image_prompt && (
              <p className="mt-3 text-[11px] text-muted-foreground">{draft.source_image_prompt}</p>
            )}
          </TabsContent>
          <TabsContent value="initial" className="mt-4">
            <PromptBlock text={flowPack.prompts.initial} />
          </TabsContent>
          <TabsContent value="continuation" className="mt-4">
            <PromptBlock text={flowPack.prompts.continuation} />
          </TabsContent>
          <TabsContent value="extension" className="mt-4">
            <PromptBlock text={flowPack.prompts.extension} />
          </TabsContent>
          <TabsContent value="export" className="mt-4">
            <VideoExportPack draft={draft} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PromptBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 p-3">
      <div className="mb-2 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              toast.success("Copiado.");
            } catch {
              toast.error("No se pudo copiar.");
            }
          }}
        >
          <CopyIcon className="mr-1.5 h-3 w-3" /> Copiar
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
        {text}
      </pre>
    </div>
  );
}