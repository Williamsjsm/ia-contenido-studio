import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function ownerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export const SUBJECT_TYPES = [
  "animal",
  "influencer",
  "producto",
  "paisaje",
  "vehiculo",
  "arquitectura",
  "comida",
  "naturaleza",
  "otro",
] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export type PromptVariant = {
  id: string;
  label: string;
  prompt: string;
  score: number;
  scoring: {
    continuidad: number;
    realismo: number;
    viralidad: number;
    estabilidad: number;
    compatibilidad: number;
  };
};

export type AnalysisResult = {
  subject_type: SubjectType;
  confidence: number;
  rationale: string;
  recommendation: {
    camera: string;
    duration: string;
    aspect: string;
    rhythm: string;
    complexity: string;
    visual_style: string;
  };
  variants: PromptVariant[];
};

const InputSchema = z.object({
  draftId: z.string().uuid().optional(),
  prompt: z.string().trim().max(20_000).optional().default(""),
  characterName: z.string().nullable().optional(),
  characterDescription: z.string().nullable().optional(),
  projectTitle: z.string().nullable().optional(),
  imagePrompt: z.string().nullable().optional(),
  preset: z.string().nullable().optional(),
});

const SYSTEM_PROMPT = `Eres un director creativo experto en video con IA (Flow, Veo, Kling, Runway).
Analiza el contexto y responde SOLO con JSON estricto, sin markdown ni texto fuera del objeto.

Esquema obligatorio:
{
  "subject_type": "animal" | "influencer" | "producto" | "paisaje" | "vehiculo" | "arquitectura" | "comida" | "naturaleza" | "otro",
  "confidence": number entre 0 y 100,
  "rationale": string breve explicando por qué,
  "recommendation": {
    "camera": string (ej. "fija", "dolly", "orbit", "follow"),
    "duration": string ("5"|"8"|"10"|"15"),
    "aspect": string ("9:16"|"16:9"|"1:1"|"21:9"),
    "rhythm": string ("lento"|"medio"|"dinámico"),
    "complexity": string ("baja"|"media"|"alta"),
    "visual_style": string corto descriptivo
  },
  "variants": [
    { "id": "inicial", "label": "Prompt Inicial", "prompt": string, "score": 0-100, "scoring": {"continuidad":0-100,"realismo":0-100,"viralidad":0-100,"estabilidad":0-100,"compatibilidad":0-100} },
    { "id": "continuacion", "label": "Prompt Continuación", "prompt": string, "score": 0-100, "scoring": {...} },
    { "id": "extension", "label": "Prompt Extensión", "prompt": string, "score": 0-100, "scoring": {...} },
    { "id": "fija", "label": "Prompt Cámara Fija", "prompt": string, "score": 0-100, "scoring": {...} },
    { "id": "cinematico", "label": "Prompt Cinemático", "prompt": string, "score": 0-100, "scoring": {...} },
    { "id": "tiktok", "label": "Prompt TikTok Viral", "prompt": string, "score": 0-100, "scoring": {...} },
    { "id": "reels", "label": "Prompt Reels", "prompt": string, "score": 0-100, "scoring": {...} },
    { "id": "documental", "label": "Prompt Documental", "prompt": string, "score": 0-100, "scoring": {...} }
  ]
}

Reglas:
- Si subject_type = "animal": aplica continuidad exacta (mismo ángulo, zoom, grading, color, sujeto), movimiento natural y sonido auténtico del animal.
- Si subject_type = "influencer": aplica consistencia facial y corporal, misma identidad, mismo tono de piel, mismo cabello, misma vestimenta, misma iluminación.
- Cada variant.prompt debe ser distinto y optimizado para su intención.
- score es la media ponderada de scoring.
- Sin texto fuera del JSON.`;

function fallbackAnalysis(text: string): AnalysisResult {
  const t = text.toLowerCase();
  const detect: SubjectType = /perro|gato|animal|tigre|león|leon|ave|p[aá]jaro|fauna|wildlife/.test(t)
    ? "animal"
    : /influencer|modelo|chica|chico|persona|rostro|cara|selfie/.test(t)
      ? "influencer"
      : /producto|botella|zapatilla|reloj|gadget/.test(t)
        ? "producto"
        : /paisaje|monta[ñn]a|playa|atardecer/.test(t)
          ? "paisaje"
          : /coche|moto|veh[ií]culo|car/.test(t)
            ? "vehiculo"
            : /edificio|arquitectura|ciudad|skyline/.test(t)
              ? "arquitectura"
              : /comida|plato|gastronom/.test(t)
                ? "comida"
                : /naturaleza|bosque|selva|r[ií]o/.test(t)
                  ? "naturaleza"
                  : "otro";
  const base = text.slice(0, 400) || "Escena descrita por el usuario.";
  const variant = (id: string, label: string, suffix: string, score: number): PromptVariant => ({
    id,
    label,
    prompt: `${base}\n\n${suffix}`,
    score,
    scoring: { continuidad: score, realismo: score, viralidad: score, estabilidad: score, compatibilidad: score },
  });
  return {
    subject_type: detect,
    confidence: 55,
    rationale: "Análisis heurístico local (sin IA disponible).",
    recommendation: {
      camera: detect === "animal" ? "fija" : "dolly",
      duration: "8",
      aspect: "9:16",
      rhythm: "medio",
      complexity: "media",
      visual_style: "HDR cinemático",
    },
    variants: [
      variant("inicial", "Prompt Inicial", "Plano abierto, foco al sujeto, iluminación coherente.", 70),
      variant("continuacion", "Prompt Continuación", "Continúa la acción sin cortes, mismo encuadre.", 72),
      variant("extension", "Prompt Extensión", "Extiende el último frame manteniendo identidad y motion vector.", 70),
      variant("fija", "Prompt Cámara Fija", "Cámara fija, sin pan ni zoom, sujeto en movimiento.", 68),
      variant("cinematico", "Prompt Cinemático", "Lente anamórfica, grano fílmico, profundidad de campo controlada.", 74),
      variant("tiktok", "Prompt TikTok Viral", "Vertical 9:16, primer segundo con hook visual fuerte.", 76),
      variant("reels", "Prompt Reels", "Tono lifestyle cálido, luz natural suave.", 71),
      variant("documental", "Prompt Documental", "Look documental HDR, narración visual sobria.", 69),
    ],
  };
}

export const analyzeVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; analysis: AnalysisResult } | { ok: false; message: string }> => {
    const ctx = [
      data.prompt && `Prompt actual: ${data.prompt}`,
      data.characterName && `Personaje: ${data.characterName}`,
      data.characterDescription && `Descripción personaje: ${data.characterDescription}`,
      data.projectTitle && `Proyecto: ${data.projectTitle}`,
      data.imagePrompt && `Imagen origen prompt: ${data.imagePrompt}`,
      data.preset && `Preset elegido: ${data.preset}`,
    ]
      .filter(Boolean)
      .join("\n");
    const text = ctx || "Sin contexto, sugiere un análisis genérico.";

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: true, analysis: fallbackAnalysis(text) };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: text },
          ],
        }),
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error("analyzeVideoDraft request failed:", err);
      return { ok: true, analysis: fallbackAnalysis(text) };
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("analyzeVideoDraft gateway error", response.status, body);
      if (response.status === 429)
        return { ok: false, message: "Límite de IA alcanzado. Espera unos segundos." };
      if (response.status === 402)
        return { ok: false, message: "Sin crédito IA disponible." };
      return { ok: true, analysis: fallbackAnalysis(text) };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: true, analysis: fallbackAnalysis(text) };
    }
    const content = (payload as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
    if (!content) return { ok: true, analysis: fallbackAnalysis(text) };

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: true, analysis: fallbackAnalysis(text) };
    }

    const Scoring = z.object({
      continuidad: z.number(),
      realismo: z.number(),
      viralidad: z.number(),
      estabilidad: z.number(),
      compatibilidad: z.number(),
    });
    const Schema = z.object({
      subject_type: z.enum(SUBJECT_TYPES),
      confidence: z.number().min(0).max(100),
      rationale: z.string(),
      recommendation: z.object({
        camera: z.string(),
        duration: z.string(),
        aspect: z.string(),
        rhythm: z.string(),
        complexity: z.string(),
        visual_style: z.string(),
      }),
      variants: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            prompt: z.string(),
            score: z.number().min(0).max(100),
            scoring: Scoring,
          }),
        )
        .min(1),
    });
    const r = Schema.safeParse(parsed);
    if (!r.success) {
      console.error("analyzeVideoDraft schema mismatch", r.error.flatten());
      return { ok: true, analysis: fallbackAnalysis(text) };
    }
    return { ok: true, analysis: r.data };
  });

// ----------------- Winning prompts library -----------------

export type WinningPrompt = {
  id: string;
  user_id: string;
  draft_id: string | null;
  project_id: string | null;
  subject_type: string | null;
  provider: string | null;
  variant: string;
  prompt: string;
  score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const SaveSchema = z.object({
  draftId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  subjectType: z.string().max(40).nullable().optional(),
  provider: z.string().max(40).nullable().optional(),
  variant: z.string().min(1).max(40),
  prompt: z.string().min(1).max(20_000),
  score: z.number().int().min(0).max(100).default(0),
  notes: z.string().max(1000).nullable().optional(),
});

export const saveWinningPrompt = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("winning_video_prompts")
      .insert({
        user_id: ownerId(),
        draft_id: data.draftId ?? null,
        project_id: data.projectId ?? null,
        subject_type: data.subjectType ?? null,
        provider: data.provider ?? null,
        variant: data.variant,
        prompt: data.prompt,
        score: data.score,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error || !row) return { ok: false as const, message: error?.message ?? "No se pudo guardar." };
    return { ok: true as const, id: row.id };
  });

const ListSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listWinningPrompts = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<WinningPrompt[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("winning_video_prompts")
      .select("id, user_id, draft_id, project_id, subject_type, provider, variant, prompt, score, notes, created_at, updated_at")
      .eq("user_id", ownerId())
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) {
      console.error("listWinningPrompts failed", error);
      return [];
    }
    return (rows ?? []) as unknown as WinningPrompt[];
  });

const DelSchema = z.object({ id: z.string().uuid() });
export const deleteWinningPrompt = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => DelSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("winning_video_prompts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", ownerId());
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });