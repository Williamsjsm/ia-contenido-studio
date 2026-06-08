import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Save, Sparkles, Loader2, AlertTriangle, Film, KeyRound, Library, AlertCircle, X, Users } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
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
import { ClientOnly, SelectTriggerSkeleton } from "@/components/ui/client-only";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  generatePrompt,
  hasGeneratorConfigured,
  type GeneratePromptResult,
} from "@/lib/generate-prompt.functions";
import { savePrompt } from "@/lib/prompts.functions";
import {
  listVirtualCharacters,
  type VirtualCharacter,
} from "@/lib/visual-library.functions";

const searchSchema = z.object({
  from: fallback(z.string(), "").default(""),
  idea: fallback(z.string(), "").default(""),
  plataforma: fallback(z.string(), "").default(""),
  pais: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
  tags: fallback(z.string(), "").default(""),
  tipo: fallback(z.string(), "").default(""),
  personajeId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/crear/prompts")({
  head: () => ({ meta: [{ title: "Generador de Prompts — AI Content Studio" }] }),
  validateSearch: zodValidator(searchSchema),
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

type ReferenceMode = "none" | "reference" | "character";
type CharacterMode =
  | "text_only"
  | "keep_character"
  | "keep_style"
  | "keep_character_style";

const MAX_LEN = 20_000;

function PromptsGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkKey = useServerFn(hasGeneratorConfigured);
  const runGenerate = useServerFn(generatePrompt);
  const runSave = useServerFn(savePrompt);
  const search = Route.useSearch();

  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState<string | null>(null);
  const [showTrendAlert, setShowTrendAlert] = useState(false);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("none");
  const [characterMode, setCharacterMode] = useState<CharacterMode>("keep_character");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");

  const listCharactersFn = useServerFn(listVirtualCharacters);
  const charactersQuery = useQuery({
    queryKey: ["library", "characters"],
    queryFn: () => listCharactersFn(),
  });
  const characters: VirtualCharacter[] = charactersQuery.data ?? [];
  const selectedCharacter =
    characters.find((c) => c.id === selectedCharacterId) ?? null;

  // Prefill form from trend search params
  useEffect(() => {
    const hasTrendData = search.from === "tendencia" && (search.idea || search.categoria);
    if (!hasTrendData) return;

    const idea = search.idea || search.categoria || "";
    const platformRaw = search.plataforma?.toLowerCase() || "";
    const country = search.pais || "";
    const tags = search.tags || "";
    const styleRaw = search.tipo?.toLowerCase() || "";

    const platformMap: Record<string, string> = {
      youtube: "youtube",
      tiktok: "tiktok",
      instagram: "instagram",
      facebook: "facebook",
    };

    const langMap: Record<string, string> = {
      brasil: "pt",
      españa: "es",
      spain: "es",
      usa: "en",
      "estados unidos": "en",
    };

    const styleMap: Record<string, string> = {
      cinematic: "cinematic",
      realistic: "realistic",
      cartoon: "cartoon",
      anime: "anime",
    };

    setForm({
      categoria: idea,
      plataforma: platformMap[platformRaw] || initialForm.plataforma,
      estilo: styleMap[styleRaw] || initialForm.estilo,
      idioma: langMap[country.toLowerCase()] || initialForm.idioma,
      duracion: initialForm.duracion,
      descripcion: tags ? `Tendencia: ${tags}` : "",
    });

    setShowTrendAlert(true);
  }, [search]);

  // Preselect character coming from /biblioteca/personajes
  useEffect(() => {
    if (!search.personajeId) return;
    setReferenceMode("character");
    setSelectedCharacterId(search.personajeId);
  }, [search.personajeId]);

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
      const useCharacter =
        referenceMode === "character" && !!selectedCharacter;
      const r = await runGenerate({
        data: {
          idea: [form.categoria, form.descripcion].filter((s) => s.trim()).join(" — "),
          tipo: form.estilo,
          idioma: form.idioma,
          duracion: form.duracion,
          plataforma: form.plataforma,
          mode: useCharacter ? characterMode : "text_only",
          character: useCharacter
            ? {
                name: selectedCharacter!.name,
                description: selectedCharacter!.description,
                master_prompt: selectedCharacter!.master_prompt,
                tags: selectedCharacter!.tags ?? [],
              }
            : null,
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

  function sendToFlow(text: string, variantLabel: string) {
    if (!text) return;
    navigate({
      to: "/crear/flow",
      search: {
        from: "crear",
        prompt: text,
        variante: variantLabel,
        titulo: form.categoria || text.slice(0, 60),
        plataforma: form.plataforma,
        categoria: form.categoria,
      },
    });
  }

  const currentSignature = useMemo(() => {
    if (!result) return "";
    const title = (form.categoria || result.original_prompt.slice(0, 60)).trim();
    return `${title}::${result.original_prompt.trim()}`;
  }, [form.categoria, result]);

  const isDuplicateOfLastSave =
    Boolean(lastSavedSignature) && currentSignature === lastSavedSignature;

  async function handleSave() {
    if (!result || saving) return;
    if (isDuplicateOfLastSave) {
      toast.info("Este prompt ya fue guardado.");
      return;
    }
    const title = (form.categoria || result.original_prompt.slice(0, 60)).trim();
    if (!title) {
      toast.error("Añade una categoría o un prompt base para usar como título.");
      return;
    }
    setSaving(true);
    try {
      const r = await runSave({
        data: {
          title,
          category: form.categoria || null,
          platform: form.plataforma,
          style: form.estilo,
          language: form.idioma,
          duration: form.duracion,
          original_prompt: result.original_prompt,
          flow_prompt: result.flow_prompt,
          youtube_prompt: result.youtube_prompt,
          veo_prompt: result.veo_prompt,
          kling_prompt: result.kling_prompt,
        },
      });
      if (!r.ok) {
        toast.error("No se pudo guardar el prompt", { description: r.message });
        return;
      }
      setLastSavedSignature(currentSignature);
      if (r.duplicate) {
        toast.info("Ya existía un prompt idéntico. No se duplicó.");
      } else {
        toast.success("Prompt guardado en tu biblioteca.");
      }
      // Invalida la lista de la biblioteca y cualquier contador relacionado.
      queryClient.invalidateQueries({ queryKey: ["library", "prompts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["library", "counts"] });
    } catch (e) {
      console.error(e);
      toast.error("Error inesperado al guardar.");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveAndGoLibrary() {
    handleSave().then(() => navigate({ to: "/biblioteca/prompts" }));
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

      {showTrendAlert && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Prompt creado desde tendencia. Revisa los campos y genera cuando estés listo.</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowTrendAlert(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
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
              <ClientOnly fallback={<SelectTriggerSkeleton />}>
                <Select value={form.plataforma} onValueChange={(v) => set("plataforma", v)} disabled={status === "loading"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
            </Field>
            <Field label="Estilo">
              <ClientOnly fallback={<SelectTriggerSkeleton />}>
                <Select value={form.estilo} onValueChange={(v) => set("estilo", v)} disabled={status === "loading"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cinematic">Cinemático</SelectItem>
                    <SelectItem value="realistic">Realista</SelectItem>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Idioma">
                <ClientOnly fallback={<SelectTriggerSkeleton />}>
                  <Select value={form.idioma} onValueChange={(v) => set("idioma", v)} disabled={status === "loading"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">Inglés</SelectItem>
                      <SelectItem value="pt">Portugués</SelectItem>
                    </SelectContent>
                  </Select>
                </ClientOnly>
              </Field>
              <Field label="Duración">
                <ClientOnly fallback={<SelectTriggerSkeleton />}>
                  <Select value={form.duracion} onValueChange={(v) => set("duracion", v)} disabled={status === "loading"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 segundos</SelectItem>
                      <SelectItem value="8">8 segundos</SelectItem>
                      <SelectItem value="15">15 segundos</SelectItem>
                      <SelectItem value="30">30 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </ClientOnly>
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

            <ReferenceVisualSection
              mode={referenceMode}
              onModeChange={setReferenceMode}
              characters={characters}
              loadingCharacters={charactersQuery.isLoading}
              selectedCharacterId={selectedCharacterId}
              onCharacterChange={setSelectedCharacterId}
              selectedCharacter={selectedCharacter}
              characterMode={characterMode}
              onCharacterModeChange={setCharacterMode}
              disabled={status === "loading"}
            />

            {referenceMode === "character" && selectedCharacter && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Personaje aplicado: {selectedCharacter.name}
                </span>
              </div>
            )}

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
                  // Cambios manuales invalidan el "ya guardado".
                  setLastSavedSignature(null);
                }}
                onCopy={copy}
                onSendFlow={sendToFlow}
                onSave={handleSave}
                onSaveAndGo={handleSaveAndGoLibrary}
                saving={saving}
                disabled={saving || isDuplicateOfLastSave}
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

function ReferenceVisualSection({
  mode,
  onModeChange,
  characters,
  loadingCharacters,
  selectedCharacterId,
  onCharacterChange,
  selectedCharacter,
  characterMode,
  onCharacterModeChange,
  disabled,
}: {
  mode: ReferenceMode;
  onModeChange: (m: ReferenceMode) => void;
  characters: VirtualCharacter[];
  loadingCharacters: boolean;
  selectedCharacterId: string;
  onCharacterChange: (id: string) => void;
  selectedCharacter: VirtualCharacter | null;
  characterMode: CharacterMode;
  onCharacterModeChange: (m: CharacterMode) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Referencia visual
        </Label>
      </div>
      <ClientOnly fallback={<SelectTriggerSkeleton />}>
        <Select
          value={mode}
          onValueChange={(v) => onModeChange(v as ReferenceMode)}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin referencia</SelectItem>
            <SelectItem value="reference" disabled>
              Referencia visual (próximamente)
            </SelectItem>
            <SelectItem value="character">Personaje virtual</SelectItem>
          </SelectContent>
        </Select>
      </ClientOnly>

      {mode === "character" && (
        <div className="space-y-3">
          <ClientOnly fallback={<SelectTriggerSkeleton />}>
            <Select
              value={selectedCharacterId}
              onValueChange={onCharacterChange}
              disabled={disabled || loadingCharacters || characters.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingCharacters
                      ? "Cargando personajes..."
                      : characters.length === 0
                        ? "No hay personajes — créalos en Biblioteca"
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
          </ClientOnly>

          {selectedCharacter && (
            <div className="flex gap-3 rounded-md border border-border/60 bg-card p-2">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted/40">
                {selectedCharacter.reference_image_url ? (
                  <img
                    src={selectedCharacter.reference_image_url}
                    alt={selectedCharacter.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{selectedCharacter.name}</p>
                {selectedCharacter.description && (
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {selectedCharacter.description}
                  </p>
                )}
                {selectedCharacter.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedCharacter.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Modo
            </Label>
            <ClientOnly fallback={<SelectTriggerSkeleton />}>
              <Select
                value={characterMode}
                onValueChange={(v) => onCharacterModeChange(v as CharacterMode)}
                disabled={disabled}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text_only">Solo texto (ignorar personaje)</SelectItem>
                  <SelectItem value="keep_character">Mantener personaje</SelectItem>
                  <SelectItem value="keep_style">Mantener estilo</SelectItem>
                  <SelectItem value="keep_character_style">
                    Mantener personaje + estilo
                  </SelectItem>
                </SelectContent>
              </Select>
            </ClientOnly>
          </div>
        </div>
      )}
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
  onSaveAndGo,
  onSendFlow,
  saving,
  disabled,
}: {
  getText: (key: VariantKey) => string;
  setText: (key: VariantKey, text: string) => void;
  onCopy: (text: string) => void;
  onSave: () => void;
  onSaveAndGo: () => void;
  onSendFlow: (text: string, variantLabel: string) => void;
  saving: boolean;
  disabled: boolean;
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
              maxLength={MAX_LEN}
              className="min-h-[240px] resize-none bg-background/40 font-mono text-sm"
            />
            <div className="flex justify-end text-[11px] text-muted-foreground">
              {text.length.toLocaleString("es")} / {MAX_LEN.toLocaleString("es")} caracteres
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onCopy(text)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSendFlow(text, t.label)}>
                <Film className="mr-1.5 h-3.5 w-3.5" /> Enviar a Flow Center
              </Button>
            </div>
          </TabsContent>
        );
      })}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/40 pt-4">
        <Button size="sm" variant="outline" onClick={onSave} disabled={disabled}>
          {saving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          {saving ? "Guardando..." : "Guardar todas las variantes"}
        </Button>
        <Button size="sm" onClick={onSaveAndGo} disabled={disabled}>
          <Library className="mr-1.5 h-3.5 w-3.5" /> Guardar y ver biblioteca
        </Button>
      </div>
    </Tabs>
  );
}