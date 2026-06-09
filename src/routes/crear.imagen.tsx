import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Sparkles, Loader2, Download, Copy, RotateCcw, Send, AlertCircle, Info, Users, ImagePlus, UserPlus, Trash2, Eye, CheckSquare, Square, Filter, Wand2, Star, Video } from "lucide-react";
import {
  generateImage,
  listImageGenerations,
  deleteImageGeneration,
  deleteImageGenerations,
  clearImageGenerations,
  promoteGenerationToReference,
  toggleImageFavorite,
} from "@/lib/image-generation.functions";
import { saveFlowJob } from "@/lib/flow-jobs.functions";
import { listVirtualCharacters, type VirtualCharacter } from "@/lib/visual-library.functions";
import { ImportCharacterDialog } from "@/components/import-character-dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  personajeId: fallback(z.string(), "").default(""),
  prompt: fallback(z.string(), "").default(""),
  promptId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/crear/imagen")({
  head: () => ({ meta: [{ title: "Imagen IA — AI Content Studio" }] }),
  validateSearch: zodValidator(searchSchema),
  component: ImagenIA,
});

type Provider = "gemini" | "openai";
type Resolution = "1024x1024" | "1792x1024" | "1024x1792";
type FinalRes = "1024" | "2048" | "3840" | "7680" | "12288";
type Upscale = "none" | "2k" | "4k" | "8k" | "12k";
type Status = "idle" | "loading" | "success" | "error";

const FINAL_LABEL: Record<FinalRes, string> = {
  "1024": "1024×1024",
  "2048": "2048×2048 (2K)",
  "3840": "3840×2160 (4K)",
  "7680": "7680×4320 (8K)",
  "12288": "12288×6480 (12K)",
};

const UPSCALE_LABEL: Record<Upscale, string> = {
  none: "Sin upscaling",
  "2k": "Upscaling 2K",
  "4k": "Upscaling 4K",
  "8k": "Upscaling 8K",
  "12k": "Upscaling 12K",
};

async function upscaleDataUrl(dataUrl: string, targetW: number, targetH: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas no disponible"));
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("No se pudo cargar imagen para upscaling"));
    img.src = dataUrl;
  });
}

function ImagenIA() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateImage);
  const listFn = useServerFn(listImageGenerations);
  const listCharactersFn = useServerFn(listVirtualCharacters);
  const search = Route.useSearch();

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [resolution, setResolution] = useState<Resolution>("1024x1024");
  const [finalRes, setFinalRes] = useState<FinalRes>("1024");
  const [upscale, setUpscale] = useState<Upscale>("none");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [generatedResLabel, setGeneratedResLabel] = useState<string>("");
  const [finalResLabel, setFinalResLabel] = useState<string>("");
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [upscaling, setUpscaling] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [useCharacter, setUseCharacter] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [importMode, setImportMode] = useState<"save" | "temporal" | null>(null);
  const [importInitial, setImportInitial] = useState<{ path: string; url: string | null } | null>(null);

  // Historial: filtros + selección + confirmaciones
  type HistoryFilter = "all" | "favorites" | "with-character" | "without-character" | "gemini" | "openai";
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<
    | null
    | { kind: "one"; id: string }
    | { kind: "many"; ids: string[] }
    | { kind: "all" }
  >(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const deleteOneFn = useServerFn(deleteImageGeneration);
  const deleteManyFn = useServerFn(deleteImageGenerations);
  const clearAllFn = useServerFn(clearImageGenerations);
  const promoteFn = useServerFn(promoteGenerationToReference);
  const favoriteFn = useServerFn(toggleImageFavorite);
  const saveFlowFn = useServerFn(saveFlowJob);

  const charactersQuery = useQuery({
    queryKey: ["library", "characters"],
    queryFn: () => listCharactersFn(),
  });
  const characters: VirtualCharacter[] = charactersQuery.data ?? [];
  const selectedCharacter =
    characters.find((c) => c.id === selectedCharacterId) ?? null;

  useEffect(() => {
    if (!search.personajeId) return;
    setUseCharacter(true);
    setSelectedCharacterId(search.personajeId);
  }, [search.personajeId]);

  // Autorellenar prompt cuando llega desde el generador de prompts.
  useEffect(() => {
    if (search.prompt && !prompt) {
      setPrompt(search.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.prompt]);

  const history = useQuery({
    queryKey: ["image-generations"],
    queryFn: () => listFn(),
  });

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Escribe un prompt para generar.");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    setImageData(null);
    setUpscaledImage(null);
    try {
      const character = useCharacter && selectedCharacter ? selectedCharacter : null;
      const characterInjection = character
        ? [
            character.master_prompt,
            character.description ? `Descripción: ${character.description}` : "",
            character.tags?.length ? `Tags: ${character.tags.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : null;
      const res = await generate({
        data: {
          prompt: trimmed,
          provider,
          resolution,
          finalResolution: finalRes,
          upscaleLevel: upscale,
          characterId: character?.id ?? null,
          characterName: character?.name ?? null,
          characterPromptInjection: characterInjection,
          promptId: search.promptId && search.promptId.length === 36 ? search.promptId : null,
        },
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(res.message);
        toast.error(res.message);
        return;
      }
      const dataUrl = `data:${res.mime_type};base64,${res.image_base64}`;
      setImageData(dataUrl);
      setLastPrompt(res.prompt);
      setGeneratedResLabel(res.generated_resolution);
      setFinalResLabel(res.final_resolution);
      setStatus("success");
      toast.success("Imagen generada.");
      qc.invalidateQueries({ queryKey: ["image-generations"] });
      // Apply client-side upscaling if final differs from generated
      const [gw, gh] = res.generated_resolution.split("x").map((n) => parseInt(n, 10));
      const [fw, fh] = res.final_resolution.split("x").map((n) => parseInt(n, 10));
      if (fw > gw || fh > gh) {
        setUpscaling(true);
        try {
          const upDataUrl = await upscaleDataUrl(dataUrl, fw, fh);
          setUpscaledImage(upDataUrl);
        } catch (e) {
          console.error("upscale error", e);
          toast.error("No se pudo aplicar upscaling. Se conserva la resolución original.");
        } finally {
          setUpscaling(false);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Error inesperado al generar la imagen.");
      toast.error("Error inesperado.");
    }
  }

  function downloadCurrent() {
    const src = upscaledImage ?? imageData;
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `imagen-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function copyPrompt() {
    if (!lastPrompt) return;
    navigator.clipboard.writeText(lastPrompt).then(
      () => toast.success("Prompt copiado."),
      () => toast.error("No se pudo copiar."),
    );
  }

  function reusePrompt() {
    if (!lastPrompt) return;
    setPrompt(lastPrompt);
    toast("Prompt cargado en el editor.");
  }

  function sendToPublish() {
    if (!imageData) return;
    try {
      sessionStorage.setItem(
        "pending-publication",
        JSON.stringify({ type: "image", prompt: lastPrompt, image_base64: imageData }),
      );
    } catch {
      /* noop */
    }
    navigate({ to: "/publicar" });
  }

  async function sendToVideo() {
    if (!imageData || !lastPrompt) {
      toast.error("Genera o selecciona una imagen primero.");
      return;
    }
    try {
      const r = await saveFlowFn({
        data: {
          title: lastPrompt.slice(0, 60) || "Video sin título",
          prompt: lastPrompt,
          source_variant: "imagen",
          status: "draft",
        },
      });
      if (!r.ok) {
        toast.error("No se pudo preparar el video.", { description: r.message });
        return;
      }
      toast.success("Borrador de video creado. Generación próximamente.");
      navigate({ to: "/crear/video", search: { fromImage: "1", flowId: r.job.id } });
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar a Video.");
    }
  }

  return (
    <>
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-6 lg:p-10">
      <PageHeader title="Imagen IA" subtitle="Genera imágenes reales con Gemini Imagen o OpenAI Images." />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        <Card className="border-border/60 bg-card">
          <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prompt</Label>
              <Textarea
                rows={5}
                placeholder="Describe la imagen que quieres generar..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={status === "loading"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Proveedor</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)} disabled={status === "loading"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini Imagen</SelectItem>
                  <SelectItem value="openai">ChatGPT Imagen (OpenAI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Resolución</Label>
              <Select value={resolution} onValueChange={(v) => setResolution(v as Resolution)} disabled={status === "loading"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024×1024 (cuadrado)</SelectItem>
                  <SelectItem value="1792x1024">1792×1024 (horizontal)</SelectItem>
                  <SelectItem value="1024x1792">1024×1792 (vertical)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Resolución final</Label>
              <Select value={finalRes} onValueChange={(v) => setFinalRes(v as FinalRes)} disabled={status === "loading"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FINAL_LABEL) as FinalRes[]).map((k) => (
                    <SelectItem key={k} value={k}>{FINAL_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Upscaling IA</Label>
              <Select value={upscale} onValueChange={(v) => setUpscale(v as Upscale)} disabled={status === "loading"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(UPSCALE_LABEL) as Upscale[]).map((k) => (
                    <SelectItem key={k} value={k}>{UPSCALE_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/30 p-2 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>La resolución final puede utilizar upscaling IA dependiendo de las capacidades del proveedor.</span>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Generar usando personaje
                </Label>
                <Switch
                  checked={useCharacter}
                  onCheckedChange={(v) => setUseCharacter(Boolean(v))}
                  disabled={status === "loading"}
                />
              </div>
              {useCharacter && (
                <>
                  <Select
                    value={selectedCharacterId}
                    onValueChange={setSelectedCharacterId}
                    disabled={
                      status === "loading" ||
                      charactersQuery.isLoading ||
                      characters.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          charactersQuery.isLoading
                            ? "Cargando..."
                            : characters.length === 0
                              ? "Sin personajes — créalos en Biblioteca"
                              : "Selecciona un personaje"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {characters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCharacter && (
                    <div className="flex gap-2 rounded-md border border-border/60 bg-card p-2">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted/40">
                        {selectedCharacter.reference_image_url ? (
                          <img
                            src={selectedCharacter.reference_image_url}
                            alt={selectedCharacter.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground/60" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-xs font-medium">
                          {selectedCharacter.name}
                        </p>
                        {selectedCharacter.description && (
                          <p className="line-clamp-2 text-[10px] text-muted-foreground">
                            {selectedCharacter.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <Button
              className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
              onClick={handleGenerate}
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generar imagen</>
              )}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => setImportMode("temporal")}
                disabled={status === "loading"}
              >
                <ImagePlus className="h-3.5 w-3.5" /> Referencia temporal
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => setImportMode("save")}
                disabled={status === "loading"}
              >
                <UserPlus className="h-3.5 w-3.5" /> Crear personaje permanente
              </Button>
            </div>
            {status === "error" && errorMsg && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[480px] flex-col border-border/60 bg-card">
          <CardContent className="flex flex-1 flex-col p-6">
            {status === "loading" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Generando imagen…</p>
              </div>
            ) : imageData ? (
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex flex-1 items-center justify-center overflow-hidden rounded-md bg-muted/30">
                  <img src={upscaledImage ?? imageData} alt={lastPrompt} className="max-h-[78vh] max-w-full object-contain" />
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="rounded-md border border-border/40 bg-muted/40 px-2 py-1">
                    <span className="text-muted-foreground">Resolución generada:</span>{" "}
                    <span className="font-medium text-foreground">{generatedResLabel}</span>
                  </span>
                  <span className="rounded-md border border-border/40 bg-muted/40 px-2 py-1">
                    <span className="text-muted-foreground">Resolución final:</span>{" "}
                    <span className="font-medium text-foreground">
                      {finalResLabel}{upscaling ? " (upscaling…)" : ""}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={downloadCurrent}>
                    <Download className="mr-2 h-3.5 w-3.5" /> Descargar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={copyPrompt}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copiar prompt
                  </Button>
                  <Button variant="secondary" size="sm" onClick={reusePrompt}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reutilizar
                  </Button>
                  <Button size="sm" onClick={sendToPublish}>
                    <Send className="mr-2 h-3.5 w-3.5" /> Enviar a publicación
                  </Button>
                  <Button size="sm" variant="outline" onClick={sendToVideo}>
                    <Video className="mr-2 h-3.5 w-3.5" /> Enviar a Video
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">Tu imagen aparecerá aquí</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(() => {
        const items = history.data?.ok ? history.data.items : [];
        const filtered = items.filter((it) => {
          switch (historyFilter) {
            case "favorites": return Boolean((it as { is_favorite?: boolean }).is_favorite);
            case "with-character": return Boolean(it.character_id);
            case "without-character": return !it.character_id;
            case "gemini": return it.provider === "gemini";
            case "openai": return it.provider === "openai";
            default: return true;
          }
        });
        const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
        const toggleId = (id: string) => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        };
        const selectedCount = selectedIds.size;
        return (
          <Card className="border-border/60 bg-card">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                Historial
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "imagen" : "imágenes"}
                </span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={historyFilter} onValueChange={(v) => setHistoryFilter(v as HistoryFilter)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="h-6 px-2 text-[11px]"><Filter className="mr-1 h-3 w-3" />Todas</TabsTrigger>
                    <TabsTrigger value="with-character" className="h-6 px-2 text-[11px]">Con personaje</TabsTrigger>
                    <TabsTrigger value="without-character" className="h-6 px-2 text-[11px]">Sin personaje</TabsTrigger>
                    <TabsTrigger value="gemini" className="h-6 px-2 text-[11px]">Gemini</TabsTrigger>
                    <TabsTrigger value="openai" className="h-6 px-2 text-[11px]">OpenAI</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  size="sm"
                  variant={selectMode ? "default" : "outline"}
                  className="h-8 gap-1"
                  onClick={() => {
                    setSelectMode((s) => !s);
                    setSelectedIds(new Set());
                  }}
                >
                  {selectMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {selectMode ? "Salir" : "Seleccionar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete({ kind: "all" })}
                  disabled={items.length === 0}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Limpiar historial
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectMode && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/40 bg-muted/30 p-2 text-xs">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => {
                      if (v) setSelectedIds(new Set(filtered.map((i) => i.id)));
                      else setSelectedIds(new Set());
                    }}
                  />
                  <span className="text-muted-foreground">
                    {selectedCount} seleccionada{selectedCount === 1 ? "" : "s"}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1"
                      disabled={selectedCount === 0}
                      onClick={() => {
                        const sel = filtered.filter((i) => selectedIds.has(i.id));
                        sel.forEach((it, idx) => {
                          const a = document.createElement("a");
                          a.href = `data:image/png;base64,${it.image_base64}`;
                          a.download = `imagen-${it.id.slice(0, 8)}.png`;
                          document.body.appendChild(a);
                          setTimeout(() => { a.click(); a.remove(); }, idx * 80);
                        });
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1"
                      disabled={selectedCount !== 1}
                      onClick={async () => {
                        const id = Array.from(selectedIds)[0];
                        if (!id) return;
                        try {
                          const r = await promoteFn({ data: { id } });
                          if (!r.ok) { toast.error(r.message); return; }
                          setImportInitial({ path: r.path, url: r.url });
                          setImportMode("save");
                        } catch (e) {
                          console.error(e);
                          toast.error("No se pudo preparar la imagen.");
                        }
                      }}
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Crear personaje
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 gap-1"
                      disabled={selectedCount === 0}
                      onClick={() => setConfirmDelete({ kind: "many", ids: Array.from(selectedIds) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                  </div>
                </div>
              )}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {items.length === 0 ? "Aún no has generado imágenes." : "Ninguna imagen coincide con el filtro."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {filtered.map((it) => {
                    const isSelected = selectedIds.has(it.id);
                    const dataUrl = `data:image/png;base64,${it.image_base64}`;
                    const date = new Date(it.created_at);
                    return (
                      <div
                        key={it.id}
                        className={cn(
                          "group relative aspect-square overflow-hidden rounded-md border bg-muted/20 transition",
                          isSelected ? "border-primary ring-2 ring-primary/50" : "border-border/40 hover:border-primary/60",
                        )}
                      >
                        <img
                          src={dataUrl}
                          alt={it.prompt}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          onClick={() => {
                            if (selectMode) toggleId(it.id);
                            else {
                              setImageData(dataUrl);
                              setLastPrompt(it.prompt);
                              setStatus("success");
                            }
                          }}
                        />
                        {/* Top-left: checkbox in select mode */}
                        {selectMode && (
                          <div className="absolute top-1.5 left-1.5 rounded bg-background/80 p-0.5 backdrop-blur">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleId(it.id)} />
                          </div>
                        )}
                        {/* Top-right: provider chip */}
                        <Badge
                          variant="secondary"
                          className="absolute top-1.5 right-1.5 px-1.5 py-0 text-[9px] uppercase"
                        >
                          {it.provider}
                        </Badge>
                        {/* Bottom: character + date */}
                        <div className="pointer-events-none absolute inset-x-1 bottom-1 flex items-end justify-between gap-1">
                          {it.character_name ? (
                            <Badge
                              variant="secondary"
                              className="max-w-[70%] truncate px-1.5 py-0 text-[9px]"
                            >
                              <Users className="mr-0.5 h-2.5 w-2.5" />
                              {it.character_name}
                            </Badge>
                          ) : <span />}
                          <span className="rounded bg-background/70 px-1 py-0.5 text-[9px] text-foreground/80 backdrop-blur">
                            {date.toLocaleDateString()}
                          </span>
                        </div>
                        {/* Hover overlay actions */}
                        {!selectMode && (
                          <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              title="Ver"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageData(dataUrl);
                                setLastPrompt(it.prompt);
                                setStatus("success");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              title="Descargar"
                              onClick={(e) => {
                                e.stopPropagation();
                                const a = document.createElement("a");
                                a.href = dataUrl;
                                a.download = `imagen-${it.id.slice(0, 8)}.png`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              title="Copiar prompt"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(it.prompt).then(
                                  () => toast.success("Prompt copiado."),
                                  () => toast.error("No se pudo copiar."),
                                );
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              title="Usar como referencia"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const r = await promoteFn({ data: { id: it.id } });
                                  if (!r.ok) { toast.error(r.message); return; }
                                  setImportInitial({ path: r.path, url: r.url });
                                  setImportMode("temporal");
                                } catch (err) {
                                  console.error(err);
                                  toast.error("No se pudo preparar la referencia.");
                                }
                              }}
                            >
                              <ImagePlus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-7 w-7"
                              title="Eliminar"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete({ kind: "one", id: it.id });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
    {/* Import-from-image dialog */}
    {/* eslint-disable-next-line react/jsx-no-useless-fragment */}
    <ImportCharacterDialog
      open={importMode !== null}
      onOpenChange={(o) => { if (!o) { setImportMode(null); setImportInitial(null); } }}
      mode={importMode ?? "save"}
      initialImage={importInitial}
      onSaved={(c) => {
        setImportMode(null);
        setImportInitial(null);
        qc.invalidateQueries({ queryKey: ["library", "characters"] });
        setUseCharacter(true);
        setSelectedCharacterId(c.id);
        toast.success(`Personaje "${c.name}" creado y seleccionado.`);
      }}
      onAnalyzed={(payload) => {
        setImportMode(null);
        setImportInitial(null);
        const injection = [
          payload.master_prompt,
          payload.description ? `(${payload.description})` : "",
        ].filter(Boolean).join(" ");
        setPrompt((p) => (p.trim() ? `${p}\n\nReferencia visual: ${injection}` : `Referencia visual: ${injection}`));
        toast.success("Referencia visual añadida al prompt.");
      }}
    />
    {/* Confirmación de borrado */}
    <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmDelete?.kind === "all"
              ? "¿Limpiar todo el historial?"
              : confirmDelete?.kind === "many"
              ? `¿Eliminar ${confirmDelete.ids.length} imágenes?`
              : "¿Eliminar esta imagen del historial?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminarán los registros y los archivos asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busyDelete}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busyDelete}
            onClick={async (e) => {
              e.preventDefault();
              if (!confirmDelete) return;
              setBusyDelete(true);
              try {
                if (confirmDelete.kind === "one") {
                  const r = await deleteOneFn({ data: { id: confirmDelete.id } });
                  if (!r.ok) { toast.error(r.message); return; }
                  toast.success("Imagen eliminada.");
                } else if (confirmDelete.kind === "many") {
                  const r = await deleteManyFn({ data: { ids: confirmDelete.ids } });
                  if (!r.ok) { toast.error(r.message); return; }
                  toast.success(`${r.count} imágenes eliminadas.`);
                } else {
                  const r = await clearAllFn();
                  if (!r.ok) { toast.error(r.message); return; }
                  toast.success(`Historial limpio (${r.count}).`);
                }
                setSelectedIds(new Set());
                qc.invalidateQueries({ queryKey: ["image-generations"] });
              } catch (err) {
                console.error(err);
                toast.error("Error al eliminar.");
              } finally {
                setBusyDelete(false);
                setConfirmDelete(null);
              }
            }}
          >
            {busyDelete ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}