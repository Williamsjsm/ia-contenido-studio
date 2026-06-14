import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Download,
  FileJson,
  GitMerge,
  History,
  ImageIcon,
  Play,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  PROVIDERS,
  PROVIDER_LABEL,
  buildProviderPack,
  packToJson,
  packToTxt,
  downloadBlob,
  type ProviderId,
} from "@/lib/video-export-pack";
import type { VideoDraftDetail } from "@/lib/video-drafts.functions";

export type ContinuityContext = {
  sourceImage?: string | null; // url or base64 (data:...)
  projectTitle?: string | null;
  characterName?: string | null;
  preset?: string | null;
  providerTarget?: ProviderId | null;
  duration?: string | null;
  aspectRatio?: string | null;
  cameraMotion?: string | null;
  initialPrompt?: string;
  draftId?: string | null;
  projectId?: string | null;
};

type BlockId = "initial" | "continuation" | "extension";

type HistoryEntry = {
  id: string;
  date: string;
  provider: ProviderId;
  initial: string;
  continuation: string;
  extension: string;
  draftId?: string | null;
  projectId?: string | null;
};

const HISTORY_KEY = "flow:continuity-exports";
const MAX_HISTORY = 25;

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // ignore quota
  }
}

async function copy(text: string, label = "Copiado") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("No se pudo copiar.");
  }
}

// ─── Prompt builders ──────────────────────────────────────────────

function presetDirective(preset: string | null | undefined): string {
  switch (preset) {
    case "animal-ia":
    case "animal":
    case "animal+fruta":
      return [
        "MODE: Animal IA.",
        "Strict biological motion — species-accurate movement, breathing, blinking, subtle body motion.",
        "Authentic ambient sound of the animal and its environment only.",
        "No human voices. No music. No sounds from other animals.",
        "Only the specified fruit/object may appear; do not add new props.",
      ].join(" ");
    case "influencer-ia":
    case "influencer":
      return [
        "MODE: Influencer IA.",
        "Strict facial and body consistency with the reference character.",
        "Same identity, hair, skin tone, wardrobe and visual style.",
        "Same lighting setup and color grading as the reference image.",
      ].join(" ");
    case "cinematico":
      return "Cinematic look: anamorphic lens, controlled depth of field, film grain.";
    case "tiktok":
      return "Vertical, vibrant, fast-paced. Trend-ready first second.";
    case "reels-lifestyle":
      return "Warm lifestyle tone, soft natural light, lifestyle pacing.";
    case "producto":
      return "Studio hero shot, clean background, product as the only subject.";
    case "historia":
      return "Narrative beat with emotional arc, clear subject focus.";
    default:
      return "";
  }
}

const CONTINUATION_RULES = [
  "USE the screenshot of the LAST FRAME of the previous clip as exact visual reference.",
  "KEEP: camera, angle, zoom, lens.",
  "KEEP: lighting, colors, saturation, shadows, color grading.",
  "KEEP: subject identity (face, body, wardrobe, hair).",
  "DO NOT redesign the subject or scene.",
  "DO NOT add new objects, props, characters or environments.",
  "Continue the action seamlessly as if the clip never cut.",
].join("\n- ");

const EXTENSION_RULES = [
  "Continue forward in time from the last frame.",
  "Natural motion progression — no scene reset.",
  "DO NOT change the shot, framing or plane.",
  "DO NOT change color grading.",
  "DO NOT change the subject.",
  "Suggested duration: 8 seconds.",
].join("\n- ");

function buildInitial(ctx: ContinuityContext, userPrompt: string) {
  const lines: string[] = [];
  lines.push("[SHOT 1 — INITIAL]");
  if (ctx.characterName) lines.push(`Character: ${ctx.characterName}.`);
  if (ctx.projectTitle) lines.push(`Project: ${ctx.projectTitle}.`);
  if (userPrompt.trim()) lines.push(userPrompt.trim());
  const directive = presetDirective(ctx.preset);
  if (directive) lines.push(directive);
  lines.push(
    `Duration: ${ctx.duration ?? "8"}s. Aspect: ${ctx.aspectRatio ?? "9:16"}. Camera: ${ctx.cameraMotion ?? "static"}.`,
  );
  return lines.join("\n\n");
}

function buildContinuation(ctx: ContinuityContext, userPrompt: string) {
  const lines: string[] = [];
  lines.push("[SHOT 2 — CONTINUATION FROM LAST FRAME]");
  lines.push(`Rules:\n- ${CONTINUATION_RULES}`);
  if (ctx.characterName) lines.push(`Character: ${ctx.characterName}.`);
  if (userPrompt.trim()) lines.push(`Action: ${userPrompt.trim()}`);
  const directive = presetDirective(ctx.preset);
  if (directive) lines.push(directive);
  lines.push(`Duration: ${ctx.duration ?? "8"}s. Aspect: ${ctx.aspectRatio ?? "9:16"}.`);
  return lines.join("\n\n");
}

function buildExtension(ctx: ContinuityContext, userPrompt: string) {
  const lines: string[] = [];
  lines.push("[SHOT 3 — EXTENSION +8s]");
  lines.push(`Rules:\n- ${EXTENSION_RULES}`);
  if (userPrompt.trim()) lines.push(`Continuation hint: ${userPrompt.trim()}`);
  const directive = presetDirective(ctx.preset);
  if (directive) lines.push(directive);
  lines.push(`Duration: 8s. Aspect: ${ctx.aspectRatio ?? "9:16"}.`);
  return lines.join("\n\n");
}

function optimizeFor(provider: ProviderId, base: string, ctx: ContinuityContext): string {
  // Wrap the base prompt with provider-specific cinematography headers,
  // without losing the user content.
  const draftLike: VideoDraftDetail = {
    id: "tmp",
    user_id: "tmp",
    project_id: ctx.projectId ?? null,
    character_id: null,
    source_image_id: null,
    source_image_url: null,
    parent_draft_id: null,
    title: ctx.projectTitle ?? "Flow Job",
    prompt: base,
    preset: ctx.preset ?? null,
    status: "draft",
    provider,
    duration: ctx.duration ?? "8",
    aspect_ratio: ctx.aspectRatio ?? "9:16",
    camera_motion: ctx.cameraMotion ?? "static",
    version: 1,
    created_at: "",
    updated_at: "",
    source_image_base64: null,
    source_image_prompt: null,
    character_name: ctx.characterName ?? null,
    project_title: ctx.projectTitle ?? null,
    versions: [],
  };
  const pack = buildProviderPack(provider, draftLike);
  return pack.prompts.initial;
}

// ──────────────────────────────────────────────────────────────────

export function FlowContinuityStudio({ ctx }: { ctx: ContinuityContext }) {
  const [provider, setProvider] = useState<ProviderId>(ctx.providerTarget ?? "flow");
  const [initial, setInitial] = useState<string>(() => buildInitial(ctx, ctx.initialPrompt ?? ""));
  const [continuation, setContinuation] = useState<string>(() => buildContinuation(ctx, ""));
  const [extension, setExtension] = useState<string>(() => buildExtension(ctx, ""));
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  // Re-seed when ctx changes meaningfully (preset / source prompt).
  useEffect(() => {
    setInitial(buildInitial(ctx, ctx.initialPrompt ?? ""));
    setContinuation(buildContinuation(ctx, ""));
    setExtension(buildExtension(ctx, ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.preset, ctx.initialPrompt, ctx.characterName, ctx.projectTitle]);

  const blocks = useMemo<Array<{ id: BlockId; label: string; value: string; setValue: (v: string) => void; icon: typeof Play; rebuild: () => string }>>(
    () => [
      {
        id: "initial",
        label: "Prompt Inicial",
        value: initial,
        setValue: setInitial,
        icon: Play,
        rebuild: () => buildInitial(ctx, ctx.initialPrompt ?? ""),
      },
      {
        id: "continuation",
        label: "Continuar desde último frame",
        value: continuation,
        setValue: setContinuation,
        icon: GitMerge,
        rebuild: () => buildContinuation(ctx, ""),
      },
      {
        id: "extension",
        label: "Extender 8 segundos",
        value: extension,
        setValue: setExtension,
        icon: Sparkles,
        rebuild: () => buildExtension(ctx, ""),
      },
    ],
    [initial, continuation, extension, ctx],
  );

  function optimizeAll(p: ProviderId) {
    setInitial((v) => optimizeFor(p, v, ctx));
    setContinuation((v) => optimizeFor(p, v, ctx));
    setExtension((v) => optimizeFor(p, v, ctx));
    toast.success(`Prompts optimizados para ${PROVIDER_LABEL[p]}`);
  }

  function pushHistory(entry: Omit<HistoryEntry, "id" | "date">) {
    const next: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    const merged = [next, ...history].slice(0, MAX_HISTORY);
    setHistory(merged);
    saveHistory(merged);
  }

  function makeTxtAll(p: ProviderId): string {
    return [
      `# ${PROVIDER_LABEL[p]} — Continuity Pack`,
      ctx.projectTitle ? `Project: ${ctx.projectTitle}` : "",
      ctx.characterName ? `Character: ${ctx.characterName}` : "",
      ctx.preset ? `Preset: ${ctx.preset}` : "",
      `Aspect: ${ctx.aspectRatio ?? "9:16"} · Duration: ${ctx.duration ?? "8"}s · Camera: ${ctx.cameraMotion ?? "static"}`,
      "",
      "## Prompt Inicial",
      initial,
      "",
      "## Prompt Continuación",
      continuation,
      "",
      "## Prompt Extensión",
      extension,
    ]
      .filter((l) => l !== "")
      .join("\n");
  }

  function makeJsonAll(p: ProviderId): string {
    return JSON.stringify(
      {
        provider: p,
        label: PROVIDER_LABEL[p],
        context: {
          project: ctx.projectTitle ?? null,
          character: ctx.characterName ?? null,
          preset: ctx.preset ?? null,
          aspect: ctx.aspectRatio ?? "9:16",
          duration: ctx.duration ?? "8",
          camera: ctx.cameraMotion ?? "static",
          draftId: ctx.draftId ?? null,
          projectId: ctx.projectId ?? null,
        },
        prompts: { initial, continuation, extension },
      },
      null,
      2,
    );
  }

  function copyForProvider(p: ProviderId) {
    copy(makeTxtAll(p), `Pack copiado para ${PROVIDER_LABEL[p]}`);
    pushHistory({
      provider: p,
      initial,
      continuation,
      extension,
      draftId: ctx.draftId ?? null,
      projectId: ctx.projectId ?? null,
    });
  }

  function exportTxt() {
    downloadBlob(`flow-continuity-${provider}.txt`, makeTxtAll(provider), "text/plain");
    pushHistory({
      provider,
      initial,
      continuation,
      extension,
      draftId: ctx.draftId ?? null,
      projectId: ctx.projectId ?? null,
    });
    toast.success("TXT descargado.");
  }

  function exportJson() {
    downloadBlob(`flow-continuity-${provider}.json`, makeJsonAll(provider), "application/json");
    pushHistory({
      provider,
      initial,
      continuation,
      extension,
      draftId: ctx.draftId ?? null,
      projectId: ctx.projectId ?? null,
    });
    toast.success("JSON descargado.");
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
    toast.success("Historial limpio.");
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ─── Source panel ─── */}
      <Card className="surface-card border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-primary" /> Imagen origen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-0">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
            {ctx.sourceImage ? (
              <img
                src={ctx.sourceImage}
                alt={ctx.projectTitle ?? "Imagen origen"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon className="h-8 w-8 opacity-40" />
                <p className="text-[10px]">Sin imagen origen</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-[11px]">
            <Row label="Proyecto" value={ctx.projectTitle ?? "—"} />
            <Row label="Personaje" value={ctx.characterName ?? "—"} />
            <Row label="Preset" value={ctx.preset ?? "—"} />
            <Row label="Proveedor" value={PROVIDER_LABEL[provider]} />
            <Row label="Aspecto" value={ctx.aspectRatio ?? "9:16"} />
            <Row label="Duración" value={`${ctx.duration ?? "8"}s`} />
          </div>
        </CardContent>
      </Card>

      {/* ─── Continuity blocks + export ─── */}
      <Card className="surface-card border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitMerge className="h-4 w-4 text-primary" /> Continuidad
            <span className="ml-auto text-[10px] text-muted-foreground">
              Editable · sin conectar API
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-0">
          {/* Provider tabs */}
          <Tabs value={provider} onValueChange={(v) => setProvider(v as ProviderId)}>
            <TabsList className="grid w-full grid-cols-4">
              {PROVIDERS.map((p) => (
                <TabsTrigger key={p} value={p} className="text-xs">
                  {PROVIDER_LABEL[p]}
                </TabsTrigger>
              ))}
            </TabsList>

            {PROVIDERS.map((p) => (
              <TabsContent key={p} value={p} className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => optimizeAll(p)}>
                    <Wand2 className="h-3 w-3" /> Optimizar para {PROVIDER_LABEL[p]}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => copyForProvider(p)}>
                    <Copy className="h-3 w-3" /> Copiar para {PROVIDER_LABEL[p]}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Three blocks */}
          <div className="grid gap-3 md:grid-cols-3">
            {blocks.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/40 p-2.5"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <Icon className="h-3.5 w-3.5 text-primary" /> {b.label}
                  </div>
                  <Textarea
                    value={b.value}
                    onChange={(e) => b.setValue(e.target.value)}
                    className="min-h-[170px] resize-none bg-background/60 text-[11px] leading-snug"
                  />
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => copy(b.value, `${b.label} copiado`)}
                    >
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => b.setValue(optimizeFor(provider, b.value, ctx))}
                    >
                      <Wand2 className="h-3 w-3" /> Optimizar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => {
                        b.setValue(b.rebuild());
                        toast.success(`${b.label} regenerado`);
                      }}
                    >
                      <Save className="h-3 w-3" /> Reset
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick export */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-2.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Exportación rápida · {PROVIDER_LABEL[provider]}
            </span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                onClick={() => copy(makeTxtAll(provider), "Pack completo copiado.")}
              >
                <Copy className="h-3 w-3" /> Copiar todo
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={exportTxt}>
                <Download className="h-3 w-3" /> TXT
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={exportJson}>
                <FileJson className="h-3 w-3" /> JSON
              </Button>
            </div>
          </div>

          {/* History */}
          <div className="rounded-md border border-border/60 bg-background/40">
            <div className="flex items-center gap-2 border-b border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Exportaciones recientes
              <Badge variant="outline" className="ml-1 px-1.5 text-[9px]">
                {history.length}
              </Badge>
              {history.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-6 gap-1 px-2 text-[10px] text-destructive hover:text-destructive"
                  onClick={clearHistory}
                >
                  <Trash2 className="h-3 w-3" /> Limpiar
                </Button>
              )}
            </div>
            <ScrollArea className="h-[130px]">
              {history.length === 0 ? (
                <div className="p-3 text-center text-[10px] text-muted-foreground">
                  Aún no hay exportaciones.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px]">
                      <Badge variant="secondary" className="px-1.5 text-[9px]">
                        {PROVIDER_LABEL[h.provider]}
                      </Badge>
                      <span className="truncate text-muted-foreground">
                        {new Date(h.date).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-5 px-1.5 text-[10px]"
                        onClick={() => {
                          setInitial(h.initial);
                          setContinuation(h.continuation);
                          setExtension(h.extension);
                          setProvider(h.provider);
                          toast.success("Pack restaurado");
                        }}
                      >
                        Cargar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="truncate text-[11px] text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}