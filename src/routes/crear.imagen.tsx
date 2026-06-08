import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Sparkles, Loader2, Download, Copy, RotateCcw, Send, AlertCircle } from "lucide-react";
import { generateImage, listImageGenerations } from "@/lib/image-generation.functions";

export const Route = createFileRoute("/crear/imagen")({
  head: () => ({ meta: [{ title: "Imagen IA — AI Content Studio" }] }),
  component: ImagenIA,
});

type Provider = "gemini" | "openai";
type Resolution = "1024x1024" | "1792x1024" | "1024x1792";
type Status = "idle" | "loading" | "success" | "error";

function ImagenIA() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateImage);
  const listFn = useServerFn(listImageGenerations);

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [resolution, setResolution] = useState<Resolution>("1024x1024");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");

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
    try {
      const res = await generate({ data: { prompt: trimmed, provider, resolution } });
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(res.message);
        toast.error(res.message);
        return;
      }
      setImageData(`data:${res.mime_type};base64,${res.image_base64}`);
      setLastPrompt(res.prompt);
      setStatus("success");
      toast.success("Imagen generada.");
      qc.invalidateQueries({ queryKey: ["image-generations"] });
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Error inesperado al generar la imagen.");
      toast.error("Error inesperado.");
    }
  }

  function downloadCurrent() {
    if (!imageData) return;
    const a = document.createElement("a");
    a.href = imageData;
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
                  <img src={imageData} alt={lastPrompt} className="max-h-[60vh] max-w-full object-contain" />
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
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no has generado imágenes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}