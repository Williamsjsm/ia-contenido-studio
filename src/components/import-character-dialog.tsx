import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, Sparkles, ImagePlus, X, Wand2 } from "lucide-react";
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
import {
  uploadVisualImage,
  analyzeCharacterFromImage,
  createVirtualCharacter,
} from "@/lib/visual-library.functions";

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"] as const;

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
  const uploadFn = useServerFn(uploadVisualImage);
  const analyzeFn = useServerFn(analyzeCharacterFromImage);
  const createFn = useServerFn(createVirtualCharacter);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [descText, setDescText] = useState("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [analyzed, setAnalyzed] = useState(false);

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

  function reset() {
    setImagePath(null);
    setImageUrl(null);
    setName("");
    setDescText("");
    setMasterPrompt("");
    setTagsText("");
    setAttributes({});
    setAnalyzed(false);
    setUploading(false);
    setAnalyzing(false);
    setSaving(false);
  }

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Máx. 10 MB");
      return;
    }
    const ct = (file.type || "image/png") as (typeof ALLOWED_MIME)[number];
    if (!ALLOWED_MIME.includes(ct)) {
      toast.error("Formato no soportado", { description: "Usa PNG, JPG, WEBP o GIF." });
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const r = await uploadFn({
        data: { filename: file.name, contentType: ct, base64, scope: "character" },
      });
      if (!r.ok) {
        toast.error("No se pudo subir", { description: r.message });
        return;
      }
      setImagePath(r.path);
      setImageUrl(r.url);
      await analyze(r.path);
    } catch (e) {
      console.error(e);
      toast.error("Error al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function analyze(path: string) {
    setAnalyzing(true);
    try {
      const r = await analyzeFn({ data: { image_path: path } });
      if (!r.ok) {
        toast.error("No se pudo analizar la imagen", { description: r.message });
        return;
      }
      setName(r.name);
      setDescText(r.description);
      setMasterPrompt(r.master_prompt);
      setTagsText(r.tags.join(", "));
      setAttributes(r.attributes ?? {});
      setAnalyzed(true);
      toast.success("Imagen analizada. Revisa y corrige los campos.");
    } catch (e) {
      console.error(e);
      toast.error("Error al analizar.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleConfirm() {
    if (!imagePath) {
      toast.error("Sube una imagen primero.");
      return;
    }
    if (!analyzed) {
      toast.error("Espera al análisis de la IA.");
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
        master_prompt: masterPrompt,
        tags,
        image_path: imagePath,
        image_url: imageUrl,
        attributes,
      });
      reset();
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const r = await createFn({
        data: {
          name: name.trim(),
          description: descText.trim() || null,
          master_prompt: masterPrompt,
          tags,
          reference_image_path: imagePath,
        },
      });
      if (!r.ok) {
        toast.error("No se pudo guardar", { description: r.message });
        return;
      }
      toast.success("Personaje creado desde imagen.");
      qc.invalidateQueries({ queryKey: ["library", "characters"] });
      onSaved?.({ id: r.character.id, name: r.character.name });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? (mode === "temporal" ? "Imagen de referencia" : "Importar personaje desde imagen")}</DialogTitle>
          <DialogDescription>
            {description ??
              "Sube una imagen y la IA extraerá rasgos, ropa, accesorios y estilo. Podrás corregir antes de guardar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[180px,1fr]">
          <div className="space-y-2">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/30">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="ref" className="h-full w-full object-cover" />
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
                className="min-h-[60px] resize-none"
                disabled={!analyzed}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Master prompt</Label>
              <Textarea
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                className="min-h-[140px] resize-none font-mono text-xs"
                disabled={!analyzed}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
              <Input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="tag1, tag2"
                disabled={!analyzed}
              />
            </div>
            {attrEntries.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Atributos detectados</Label>
                <div className="flex flex-wrap gap-1">
                  {attrEntries.map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-[10px]">
                      {k.replace(/_/g, " ")}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!analyzed || saving || !name.trim()}>
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