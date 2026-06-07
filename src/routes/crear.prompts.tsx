import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Save, Sparkles, Loader2, AlertTriangle, Film, KeyRound, Library } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  generatePrompt,
  hasGeneratorConfigured,
  type GeneratePromptResult,
} from "@/lib/generate-prompt.functions";

export const Route = createFileRoute("/crear/prompts")({
  head: () => ({ meta: [{ title: "Generador de Prompts — AI Content Studio" }] }),
  component: PromptsGenerator,
});

type FormState = {
  categoria: string;
  plataforma: string;
  estilo: string;
  idioma: string;
  duracion: string;
  descripcion: string;
};

const initialForm: FormState = {
  categoria: "",
  plataforma: "youtube",
  estilo: "cinematic",
  idioma: "es",
  duracion: "8",
  descripcion: "",
};

type VariantKey = "base" | "flow" | "youtube" | "veo" | "kling";

const VARIANT_TABS: { key: VariantKey; label: string }[] = [
  { key: "base", label: "Base" },
  { key: "flow", label: "Flow" },
  { key: "youtube", label: "YouTube" },
  { key: "veo", label: "Veo" },
  { key: "kling", label: "Kling" },
];

type SuccessResult = Extract<GeneratePromptResult, { ok: true }>;

function PromptsGenerator() {
  const navigate = useNavigate();
  const checkKey = useServerFn(hasGeneratorConfigured);
  const runGenerate = useServerFn(generatePrompt);

  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkKey()
      .then((r) => setKeyConfigured(r.configured))
      .catch(() => setKeyConfigured(false));
  }, [checkKey]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit =
    keyConfigured === true &&
    status !== "loading" &&
    form.categoria.trim().length > 0;

  async function onGenerate() {
    if (!canSubmit) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const r = await runGenerate({
        data: {
          idea: [form.categoria, form.descripcion].filter((s) => s.trim()).join(" — "),
          tipo: form.estilo,
          idioma: form.idioma,
          duracion: form.duracion,
          plataforma: form.plataforma,
        },
      });
      if (r.ok) {
        setResult(r);
        setStatus("success");
      } else {
        if (r.error === "not_configured") setKeyConfigured(false);
        setErrorMsg(r.message);
        setStatus("error");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Error inesperado al generar el prompt.");
      setStatus("error");
    }
  }

  function getVariantText(key: VariantKey): string {
    if (!result) return "";
    switch (key) {
      case "base":
        return result.original_prompt;
      case "flow":
        return result.flow_prompt;
      case "youtube":
        return result.youtube_prompt;
      case "veo":
        return result.veo_prompt;
      case "kling":
        return result.kling_prompt;
    }
  }

  function copy(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  }

  function saveToLibrary(text: string) {
    if (!text) return;
    toast.info("Guardado disponible cuando inicies sesión.");
  }

  function sendToFlow(text: string) {
    if (!text) return;
    try {
      sessionStorage.setItem("flow:pending-prompt", text);
    } catch {
      // ignore
    }
    navigate({ to: "/crear/flow" });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Generador de Prompts"
        subtitle="Crea prompts optimizados por categoría, plataforma y estilo, conectado a OpenAI."
      />

      {keyConfigured === false && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-amber-400" />
              <p className="text-sm text-foreground/90">
                Configura tu API Key de OpenAI en Integraciones para activar esta función.
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/integraciones">Ir a Integraciones</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Configura tu prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Categoría">
              <Input
                placeholder="Ej. Pitahaya tropical"
                value={form.categoria}
                onChange={(e) => set("categoria", e.target.value)}
                disabled={status === "loading"}
              />
            </Field>
            <Field label="Plataforma">
              <Select value={form.plataforma} onValueChange={(v) => set("plataforma", v)} disabled={status === "loading"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estilo">
              <Select value={form.estilo} onValueChange={(v) => set("estilo", v)} disabled={status === "loading"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">Cinemático</SelectItem>
                  <SelectItem value="realistic">Realista</SelectItem>
                  <SelectItem value="cartoon">Cartoon</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Idioma">
                <Select value={form.idioma} onValueChange={(v) => set("idioma", v)} disabled={status === "loading"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">Inglés</SelectItem>
                    <SelectItem value="pt">Portugués</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duración">
                <Select value={form.duracion} onValueChange={(v) => set("duracion", v)} disabled={status === "loading"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 segundos</SelectItem>
                    <SelectItem value="8">8 segundos</SelectItem>
                    <SelectItem value="15">15 segundos</SelectItem>
                    <SelectItem value="30">30 segundos</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Descripción (opcional)">
              <Textarea
                placeholder="Detalles, referencias, tono, intención..."
                value={form.descripcion}
                onChange={(e) => set("descripcion", e.target.value)}
                disabled={status === "loading"}
                className="min-h-[80px] resize-none"
              />
            </Field>

            <Button
              className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
              onClick={onGenerate}
              disabled={!canSubmit}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Generar prompt
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "idle" && (
              <EmptyResult />
            )}
            {status === "loading" && (
              <LoadingResult />
            )}
            {status === "error" && (
              <ErrorResult message={errorMsg} onRetry={onGenerate} />
            )}
            {status === "success" && result && (
              <ResultTabs
                getText={getVariantText}
                setText={(key, text) => {
                 setResult((prev) => {
                    if (!prev) return prev;
                    const fieldMap: Record<VariantKey, keyof SuccessResult> = {
                      base: "original_prompt",
                      flow: "flow_prompt",
                      youtube: "youtube_prompt",
                      veo: "veo_prompt",
                      kling: "kling_prompt",
                    };
                    return { ...prev, [fieldMap[key]]: text };
                  });
                }}
                onCopy={copy}
                onSave={saveToLibrary}
                onSendFlow={sendToFlow}
                onSendLibrary={(text) => {
                  saveToLibrary(text);
                  navigate({ to: "/biblioteca/prompts" });
                }}
              />
            )}
          </CardContent>
        </Card>
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

function EmptyResult() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <Sparkles className="h-8 w-8 opacity-50" />
      <p className="text-sm">Configura los campos y genera tu primer prompt.</p>
      <p className="text-xs opacity-70">Obtendrás variantes para Flow, YouTube, Veo y Kling.</p>
    </div>
  );
}

function LoadingResult() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">Generando con OpenAI...</p>
      <div className="w-full max-w-sm space-y-2">
        <div className="h-2 w-full animate-pulse rounded bg-muted/60" />
        <div className="h-2 w-4/5 animate-pulse rounded bg-muted/60" />
        <div className="h-2 w-2/3 animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}

function ErrorResult({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-foreground/90">{message || "Algo salió mal."}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>Reintentar</Button>
    </div>
  );
}

function ResultTabs({
  getText,
  setText,
  onCopy,
  onSave,
  onSendFlow,
  onSendLibrary,
}: {
  getText: (key: VariantKey) => string;
  setText: (key: VariantKey, text: string) => void;
  onCopy: (text: string) => void;
  onSave: (text: string) => void;
  onSendFlow: (text: string) => void;
  onSendLibrary: (text: string) => void;
}) {
  return (
    <Tabs defaultValue="base" className="w-full">
      <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
        {VARIANT_TABS.map((t) => (
          <TabsTrigger
            key={t.key}
            value={t.key}
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {VARIANT_TABS.map((t) => {
        const text = getText(t.key);
        return (
          <TabsContent key={t.key} value={t.key} className="mt-4 space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(t.key, e.target.value)}
              className="min-h-[240px] resize-none bg-background/40 font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onCopy(text)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSave(text)}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSendFlow(text)}>
                <Film className="mr-1.5 h-3.5 w-3.5" /> Enviar a Flow Center
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSendLibrary(text)}>
                <Library className="mr-1.5 h-3.5 w-3.5" /> Guardar en Biblioteca
              </Button>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}