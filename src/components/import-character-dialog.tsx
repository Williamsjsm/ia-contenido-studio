import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, Sparkles, ImagePlus, X, Wand2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  createVisualUploadTarget,
  uploadVisualImageForm,
  signVisualImage,
  analyzeCharacterFromImage,
  createVirtualCharacter,
} from "@/lib/visual-library.functions";
import { maybeCompressImage } from "@/lib/image-compress";

export type ImportAnalyzedPayload = {
  name: string;
  description: string;
  master_prompt: string;
  tags: string[];
  image_path: string;
  image_url: string | null;
  attributes: Record<string, string>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "save" persists as a virtual character; "temporal" returns payload to caller without saving. */
  mode?: "save" | "temporal";
  onSaved?: (character: { id: string; name: string }) => void;
  onAnalyzed?: (payload: ImportAnalyzedPayload) => void;
  title?: string;
  description?: string;
  /**
   * Optional pre-uploaded image (already in storage). If provided when the
   * dialog opens, the dialog skips the upload step and goes straight to
   * analysis.
   */
  initialImage?: { path: string; url: string | null } | null;
};

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"] as const;

function isTransientUploadText(value: unknown): boolean {
  return /timed out|timeout|522|544|connection|schema cache|retrying/i.test(String(value || ""));
}

function isBackendBusyText(value: unknown): boolean {
  return /too many connections|database.*connection|connection.*database/i.test(String(value || ""));
}

function recoverableUploadMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "Error de red");
  if (isTransientUploadText(raw)) {
    return isBackendBusyText(raw)
      ? "El backend está saturado. La imagen local queda visible; espera unos segundos y reintenta."
      : "El backend tardó demasiado. La imagen local queda visible; reintenta la subida en unos segundos.";
  }
  return raw;
}

function nameFromFilename(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 80) || "Referencia visual";
}

async function retryTransient<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
  shouldRetryResult?: (result: T) => boolean,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const result = await fn();
      if (!shouldRetryResult?.(result) || i === attempts - 1) return result;
      lastError = new Error("Transient upload response");
      logStage(`${label}:retry`, { attempt: i + 1, result });
    } catch (error) {
      lastError = error;
      if (i === attempts - 1) throw error;
      logStage(`${label}:retry`, { attempt: i + 1, error: String(error) });
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (i + 1)));
  }
  throw lastError;
}

type Stage =
  | { kind: "idle" }
  | { kind: "compressing" }
  | { kind: "uploading" }
  | { kind: "uploaded" }
  | { kind: "analyzing" }
  | { kind: "analyzed" }
  | { kind: "saving" }
  | { kind: "error"; at: "compress" | "upload" | "analyze" | "save"; message: string };

function logStage(label: string, extra?: Record<string, unknown>) {
  if (typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[import-character] ${label}`, extra ?? {});
  }
}

export function ImportCharacterDialog({
  open,
  onOpenChange,
  mode = "save",
  onSaved,
  onAnalyzed,
  title,
  description,
  initialImage,
}: Props) {
  const createUploadTargetFn = useServerFn(createVisualUploadTarget);
  const uploadFormFn = useServerFn(uploadVisualImageForm);
  const signImageFn = useServerFn(signVisualImage);
  const analyzeFn = useServerFn(analyzeCharacterFromImage);
  const createFn = useServerFn(createVirtualCharacter);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [descText, setDescText] = useState("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [analyzed, setAnalyzed] = useState(false);
  const [secondaryPaths, setSecondaryPaths] = useState<{ path: string; url: string | null }[]>([]);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);
  const secondaryRef = useRef<HTMLInputElement | null>(null);

  const uploading = stage.kind === "uploading" || stage.kind === "compressing";
  const analyzing = stage.kind === "analyzing";
  const saving = stage.kind === "saving";

  // Auto-load a pre-uploaded image when the dialog opens.
  useEffect(() => {
    if (!open || !initialImage?.path) return;
    if (imagePath === initialImage.path) return;
    setImagePath(initialImage.path);
    setImageUrl(initialImage.url);
    setAnalyzed(false);
    void analyze(initialImage.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialImage?.path]);

  // Liberar objectURL al desmontar / cambiar.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImagePath(null);
    setImageUrl(null);
    setPreviewUrl(null);
    setPendingFile(null);
    setName("");
    setDescText("");
    setMasterPrompt("");
    setTagsText("");
    setAttributes({});
    setAnalyzed(false);
    setStage({ kind: "idle" });
    setSecondaryPaths([]);
    setUploadingSecondary(false);
  }

  async function handleFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Imagen demasiado grande", { description: "Máx. 15 MB. Reduce el tamaño e intenta de nuevo." });
      return;
    }
    const ct = (file.type || "image/png") as (typeof ALLOWED_MIME)[number];
    if (!ALLOWED_MIME.includes(ct)) {
      toast.error("Formato no soportado", { description: "Usa PNG, JPG, WEBP o GIF." });
      return;
    }
    // Preview local inmediato.
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setImageUrl(objUrl);
    setPendingFile(file);
    await runUpload(file);
  }

  async function runUpload(file: File) {
    const tUpload = performance.now();
    let working = file;
    try {
      if (file.size > 3 * 1024 * 1024) {
        setStage({ kind: "compressing" });
        logStage("compress:start", { size: file.size, type: file.type });
        const c = await maybeCompressImage(file);
        working = c.file;
        logStage("compress:done", {
          originalSize: c.originalSize,
          finalSize: c.finalSize,
          compressed: c.compressed,
        });
        if (c.compressed) {
          toast.message("Imagen optimizada", {
            description: `Reducida de ${(c.originalSize / 1024 / 1024).toFixed(1)} MB a ${(c.finalSize / 1024 / 1024).toFixed(1)} MB.`,
          });
        }
      }
    } catch (e) {
      logStage("compress:error", { error: String(e) });
    }

    setStage({ kind: "uploading" });
    const ct = (working.type || "image/png") as (typeof ALLOWED_MIME)[number];
    try {
      logStage("upload:prepare", { size: working.size, type: ct });
      const target = await retryTransient("upload:prepare", () =>
        createUploadTargetFn({
          data: { filename: working.name, contentType: ct, scope: "character" },
        }),
        3,
        (result) => !result.ok && isTransientUploadText(result.message),
      );
      let uploadedPath: string;
      let uploadedUrl: string | null = null;
      if (!target.ok) {
        logStage("upload:prepare:fallback", { message: target.message });
        toast.message("Preparación saturada", { description: "Intentando ruta alternativa de subida." });
        const fallback = await uploadThroughServer(working, "character");
        if (!fallback.ok) {
          setStage({ kind: "error", at: "upload", message: fallback.message });
          toast.error("No se pudo subir la imagen", { description: recoverableUploadMessage(fallback.message) });
          return;
        }
        uploadedPath = fallback.path;
        uploadedUrl = fallback.url;
      } else {
        logStage("upload:start", { path: target.path });
        const uploaded = await retryTransient("upload:file", () =>
          supabase.storage
            .from(target.bucket)
            .uploadToSignedUrl(target.path, target.token, working, {
              contentType: ct,
              cacheControl: "31536000",
            }),
          3,
          (result) => Boolean(result.error && isTransientUploadText(result.error.message)),
        );
        logStage("upload:done", { ms: Math.round(performance.now() - tUpload), ok: !uploaded.error });
        if (uploaded.error) {
          setStage({ kind: "error", at: "upload", message: uploaded.error.message });
          toast.error("No se pudo subir la imagen", { description: uploaded.error.message });
          return;
        }
        uploadedPath = target.path;
      }
      setImagePath(uploadedPath);
      setName((current) => current.trim() || nameFromFilename(working.name));
      if (uploadedUrl) setImageUrl(uploadedUrl);
      void signImageFn({ data: { image_path: uploadedPath } }).then((r) => {
        if (r.ok && r.url) setImageUrl(r.url);
      }).catch((e) => logStage("sign:error", { error: String(e) }));
      setStage({ kind: "uploaded" });
      void analyze(uploadedPath);
    } catch (e) {
      const msg = recoverableUploadMessage(e);
      logStage("upload:error", { error: msg });
      setStage({ kind: "error", at: "upload", message: msg });
      toast.error("Error recuperable al subir", { description: "Pulsa Reintentar. La vista previa no se pierde." });
    }
  }

  async function retryUpload() {
    if (!pendingFile) return;
    await runUpload(pendingFile);
  }

  async function uploadThroughServer(file: File, scope: "reference" | "character") {
    const body = new FormData();
    body.append("file", file);
    body.append("scope", scope);
    return retryTransient(
      "upload:server-fallback",
      () => uploadFormFn({ data: body }),
      2,
      (result) => !result.ok && isTransientUploadText(result.message),
    );
  }

  async function analyze(path: string) {
    setStage({ kind: "analyzing" });
    const t = performance.now();
    try {
      const r = await analyzeFn({ data: { image_path: path } });
      logStage("analyze:done", { ms: Math.round(performance.now() - t), ok: r.ok });
      if (!r.ok) {
        setStage({ kind: "error", at: "analyze", message: r.message });
        toast.warning("Imagen subida. Análisis pendiente.", { description: r.message });
        return;
      }
      setName(r.name);
      setDescText(r.description);
      setMasterPrompt(r.master_prompt);
      setTagsText(r.tags.join(", "));
      setAttributes(r.attributes ?? {});
      setAnalyzed(true);
      setStage({ kind: "analyzed" });
      toast.success("Imagen analizada. Revisa y corrige los campos.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado";
      logStage("analyze:error", { error: msg });
      setStage({ kind: "error", at: "analyze", message: msg });
      toast.warning("Imagen subida. Análisis pendiente.", { description: "Pulsa Reintentar análisis." });
    }
  }

  async function handleConfirm() {
    if (!imagePath) {
      toast.error("Sube una imagen primero.");
      return;
    }
    if (!name.trim()) {
      toast.error("Añade un nombre.");
      return;
    }
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    if (mode === "temporal") {
      onAnalyzed?.({
        name: name.trim(),
        description: descText.trim(),
          master_prompt: masterPrompt.trim() || descText.trim() || name.trim(),
        tags,
        image_path: imagePath,
        image_url: imageUrl,
        attributes,
      });
      reset();
      onOpenChange(false);
      return;
    }
    setStage({ kind: "saving" });
    const t = performance.now();
    try {
      const r = await createFn({
        data: {
          name: name.trim(),
          description: descText.trim() || null,
          master_prompt: masterPrompt.trim() || descText.trim() || name.trim(),
          tags,
          reference_image_path: imagePath,
          secondary_reference_paths: secondaryPaths.map((s) => s.path),
        },
      });
      logStage("save:done", { ms: Math.round(performance.now() - t), ok: r.ok });
      if (!r.ok) {
        setStage({ kind: "error", at: "save", message: r.message });
        toast.error("Imagen subida, pero no se pudo guardar el registro", {
          description: `${r.message}. Pulsa Reintentar guardar.`,
        });
        return;
      }
      toast.success("Personaje creado desde imagen.");
      // Invalidación quirúrgica: solo la lista de personajes.
      qc.invalidateQueries({ queryKey: ["library", "characters"], exact: true });
      onSaved?.({ id: r.character.id, name: r.character.name });
      reset();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado";
      logStage("save:error", { error: msg });
      setStage({ kind: "error", at: "save", message: msg });
      toast.error("No se pudo guardar el registro", { description: "Pulsa Reintentar guardar." });
    }
  }

  const attrEntries = Object.entries(attributes).filter(([, v]) => v && v.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <DialogTitle>{title ?? (mode === "temporal" ? "Imagen de referencia" : "Importar personaje desde imagen")}</DialogTitle>
          <DialogDescription>
            {description ??
              "Sube una imagen y la IA extraerá rasgos, ropa, accesorios y estilo. Podrás corregir antes de guardar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4 sm:grid-cols-[180px,1fr]">
          <div className="space-y-2">
            <div className="relative mx-auto flex h-[180px] w-full max-h-[220px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/30">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="ref" className="h-full w-full object-contain" />
                  {(analyzing || uploading) && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-xs text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {analyzing ? "Analizando..." : "Subiendo..."}
                    </div>
                  )}
                  {!analyzing && !uploading && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePath(null);
                        setImageUrl(null);
                        setAnalyzed(false);
                      }}
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <span>{uploading ? "Subiendo..." : "Subir imagen"}</span>
                </button>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full gap-1"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || analyzing}
            >
              <Upload className="h-3.5 w-3.5" /> {imageUrl ? "Cambiar" : "Subir"}
            </Button>
            {imagePath && !analyzed && !analyzing && !uploading && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full gap-1"
                onClick={() => analyze(imagePath)}
              >
                <Wand2 className="h-3.5 w-3.5" /> Analizar
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-3">
            {!imagePath && (
              <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
                Sube una foto de tu personaje. La IA extraerá color de cabello, ojos, piel, edad, complexión, ropa, accesorios y estilo fotográfico.
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del personaje"
                disabled={!imagePath}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descripción</Label>
              <Textarea
                value={descText}
                onChange={(e) => setDescText(e.target.value)}
                rows={3}
                className="min-h-[56px] resize-y"
                disabled={!imagePath}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Master prompt</Label>
              <Textarea
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                rows={5}
                className="min-h-[96px] resize-y font-mono text-xs"
                disabled={!imagePath}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
              <Input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="tag1, tag2"
                disabled={!imagePath}
              />
            </div>
            {attrEntries.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Atributos detectados</Label>
                <div className="flex flex-wrap gap-1">
                  {attrEntries.map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="px-1.5 py-0 text-[9px] leading-4">
                      {k.replace(/_/g, " ")}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {mode === "save" && imagePath && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Imágenes secundarias ({secondaryPaths.length})
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() => secondaryRef.current?.click()}
                    disabled={uploadingSecondary || secondaryPaths.length >= 10}
                  >
                    {uploadingSecondary ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Añadir
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  La imagen principal es la analizada arriba. Añade hasta 10 referencias adicionales (poses, ángulos, vestuario).
                </p>
                {secondaryPaths.length > 0 && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {secondaryPaths.map((s, i) => (
                      <div
                        key={s.path}
                        className="relative aspect-square overflow-hidden rounded border border-border/60 bg-muted/30"
                      >
                        {s.url ? (
                          <img src={s.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                            #{i + 1}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setSecondaryPaths((arr) => arr.filter((x) => x.path !== s.path))
                          }
                          className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 hover:bg-background"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={secondaryRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length === 0) return;
                    setUploadingSecondary(true);
                    try {
                      for (const file of files) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error(`${file.name}: máx. 10 MB`);
                          continue;
                        }
                        const ct = (file.type || "image/png") as (typeof ALLOWED_MIME)[number];
                        if (!ALLOWED_MIME.includes(ct)) continue;
                        const target = await retryTransient(
                          "secondary:prepare",
                          () => createUploadTargetFn({
                            data: { filename: file.name, contentType: ct, scope: "character" },
                          }),
                          3,
                          (result) => !result.ok && isTransientUploadText(result.message),
                        );
                        if (!target.ok) {
                          const fallback = await uploadThroughServer(file, "character");
                          if (fallback.ok) {
                            setSecondaryPaths((arr) =>
                              arr.length >= 10 ? arr : [...arr, { path: fallback.path, url: fallback.url }],
                            );
                          } else {
                            toast.error(`${file.name}: ${recoverableUploadMessage(fallback.message)}`);
                          }
                          continue;
                        }
                        const uploaded = await retryTransient(
                          "secondary:file",
                          () => supabase.storage
                            .from(target.bucket)
                            .uploadToSignedUrl(target.path, target.token, file, {
                              contentType: ct,
                              cacheControl: "31536000",
                            }),
                          3,
                          (result) => Boolean(result.error && isTransientUploadText(result.error.message)),
                        );
                        if (uploaded.error) {
                          toast.error(`${file.name}: ${uploaded.error.message}`);
                          continue;
                        }
                        let url: string | null = null;
                        try {
                          const signed = await signImageFn({ data: { image_path: target.path } });
                          url = signed.ok ? signed.url : null;
                        } catch {
                          url = null;
                        }
                        setSecondaryPaths((arr) =>
                          arr.length >= 10 ? arr : [...arr, { path: target.path, url }],
                        );
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Error al subir referencias.");
                    } finally {
                      setUploadingSecondary(false);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-background/80 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mr-auto flex items-center gap-2 text-xs">
            {stage.kind === "compressing" && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizando imagen…</>
            )}
            {stage.kind === "uploading" && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo imagen…</>
            )}
            {stage.kind === "uploaded" && (
              <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Imagen subida</>
            )}
            {stage.kind === "analyzing" && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando…</>
            )}
            {stage.kind === "analyzed" && (
              <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Listo para guardar</>
            )}
            {stage.kind === "saving" && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>
            )}
            {stage.kind === "error" && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {stage.at === "upload" && "No se pudo subir"}
                {stage.at === "analyze" && "Análisis pendiente"}
                {stage.at === "save" && "No se pudo guardar"}
                {stage.at === "compress" && "Error al optimizar"}
              </span>
            )}
            {stage.kind === "error" && stage.at === "upload" && pendingFile && (
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={retryUpload}>
                <RefreshCw className="h-3 w-3" /> Reintentar
              </Button>
            )}
            {stage.kind === "error" && stage.at === "analyze" && imagePath && (
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => analyze(imagePath)}>
                <RefreshCw className="h-3 w-3" /> Reintentar análisis
              </Button>
            )}
            {stage.kind === "error" && stage.at === "save" && (
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={handleConfirm}>
                <RefreshCw className="h-3 w-3" /> Reintentar guardar
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!imagePath || saving || !name.trim()}>
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {mode === "temporal" ? "Usar como referencia" : "Guardar personaje"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}