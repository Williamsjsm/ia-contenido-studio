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
import { ImageIcon, Sparkles, Loader2, Download, Copy, RotateCcw, Send, AlertCircle, Info, Users, ImagePlus, UserPlus } from "lucide-react";
import { generateImage, listImageGenerations } from "@/lib/image-generation.functions";
import { listVirtualCharacters, type VirtualCharacter } from "@/lib/visual-library.functions";
import { ImportCharacterDialog } from "@/components/import-character-dialog";

const searchSchema = z.object({
  personajeId: fallback(z.string(), "").default(""),
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

  return (
    <>
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 lg:p-10">
      <PageHeader title="Imagen IA" subtitle="Genera imágenes reales con Gemini Imagen o OpenAI Images." />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
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
                  <img src={upscaledImage ?? imageData} alt={lastPrompt} className="max-h-[60vh] max-w-full object-contain" />
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

      <Card className="border-border/60 bg-card">
        <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
        <CardContent>
          {history.data?.ok && history.data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {history.data.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="group relative aspect-square overflow-hidden rounded-md border border-border/40 hover:border-primary/60"
                  onClick={() => {
                    setImageData(`data:image/png;base64,${it.image_base64}`);
                    setLastPrompt(it.prompt);
                    setStatus("success");
                  }}
                  title={it.prompt}
                >
                  <img
                    src={`data:image/png;base64,${it.image_base64}`}
                    alt={it.prompt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {it.character_name && (
                    <Badge
                      variant="secondary"
                      className="absolute bottom-1 left-1 max-w-[90%] truncate px-1.5 py-0 text-[9px]"
                    >
                      <Users className="mr-0.5 h-2.5 w-2.5" />
                      {it.character_name}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no has generado imágenes.</p>
          )}
        </CardContent>
      </Card>
    </div>
    {/* Import-from-image dialog */}
    {/* eslint-disable-next-line react/jsx-no-useless-fragment */}
    <ImportCharacterDialog
      open={importMode !== null}
      onOpenChange={(o) => { if (!o) setImportMode(null); }}
      mode={importMode ?? "save"}
      onSaved={(c) => {
        setImportMode(null);
        qc.invalidateQueries({ queryKey: ["library", "characters"] });
        setUseCharacter(true);
        setSelectedCharacterId(c.id);
        toast.success(`Personaje "${c.name}" creado y seleccionado.`);
      }}
      onAnalyzed={(payload) => {
        setImportMode(null);
        const injection = [
          payload.master_prompt,
          payload.description ? `(${payload.description})` : "",
        ].filter(Boolean).join(" ");
        setPrompt((p) => (p.trim() ? `${p}\n\nReferencia visual: ${injection}` : `Referencia visual: ${injection}`));
        toast.success("Referencia visual añadida al prompt.");
      }}
    />
    </>
  );
}