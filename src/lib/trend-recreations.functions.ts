import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export type TrendRecreation = {
  id: string;
  trend_id: string | null;
  platform: string | null;
  title: string;
  idea_base: string | null;
  prompt_image: string | null;
  prompt_video: string | null;
  hook: string | null;
  short_script: string | null;
  video_structure: string | null;
  visual_style: string | null;
  alternative_title: string | null;
  publication_description: string | null;
  hashtags: string | null;
  recommended_platforms: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id, trend_id, platform, title, idea_base, prompt_image, prompt_video, hook, short_script, video_structure, visual_style, alternative_title, publication_description, hashtags, recommended_platforms, created_at, updated_at";

const GenerateSchema = z.object({
  trend_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(500),
  platform: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  keywords: z.string().trim().max(1000).nullable().optional(),
  source: z.string().trim().max(40).nullable().optional(),
  url: z.string().trim().max(2000).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  channel_title: z.string().trim().max(200).nullable().optional(),
  views: z.number().nullable().optional(),
  likes: z.number().nullable().optional(),
  comments: z.number().nullable().optional(),
  shares: z.number().nullable().optional(),
  published_at: z.string().nullable().optional(),
});

export type GenerateTrendRecreationInput = z.input<typeof GenerateSchema>;

type RecreationPayload = {
  idea_base: string;
  prompt_imagen: string;
  prompt_video: string;
  hook: string;
  guion_corto: string;
  estructura_video: string;
  estilo_visual: string;
  titulo_alternativo: string;
  descripcion_publicacion: string;
  hashtags: string;
  plataformas_recomendadas: string;
};

function buildPrompt(input: z.infer<typeof GenerateSchema>): { system: string; user: string } {
  const meta: string[] = [];
  if (input.platform) meta.push(`Plataforma origen: ${input.platform}`);
  if (input.country) meta.push(`País: ${input.country}`);
  if (input.category) meta.push(`Categoría: ${input.category}`);
  if (input.source) meta.push(`Fuente: ${input.source}`);
  if (input.channel_title) meta.push(`Creador: ${input.channel_title}`);
  if (input.url) meta.push(`URL referencia: ${input.url}`);
  if (input.keywords) meta.push(`Keywords: ${input.keywords}`);
  if (typeof input.views === "number") meta.push(`Vistas: ${input.views}`);
  if (typeof input.likes === "number") meta.push(`Likes: ${input.likes}`);
  if (typeof input.comments === "number") meta.push(`Comentarios: ${input.comments}`);
  if (typeof input.shares === "number") meta.push(`Shares: ${input.shares}`);
  if (input.published_at) meta.push(`Publicado: ${input.published_at}`);
  if (input.description) meta.push(`Descripción original: ${input.description.slice(0, 600)}`);

  const system = `Eres un director creativo experto en contenido viral de redes sociales (TikTok, YouTube Shorts, Reels, Facebook). Tu misión es transformar una tendencia detectada en una IDEA ORIGINAL Y SEGURA para que el usuario la recree con IA. NUNCA copias texto, guion, voz, identidad visual ni elementos protegidos del contenido original. Tomas solo el insight, el formato y la emoción para generar una versión inspirada y transformada. Respondes EXCLUSIVAMENTE con JSON válido sin markdown.`;

  const user = `Tendencia detectada:
Título: ${input.title}
${meta.join("\n")}

Genera un paquete de recreación ORIGINAL e INSPIRADO (no una copia literal). Devuelve un objeto JSON con EXACTAMENTE estas claves:
- idea_base: 2-3 frases describiendo la idea transformada y original.
- prompt_imagen: prompt completo en inglés para un modelo de imagen (estilo, sujeto, composición, iluminación, cámara, calidad).
- prompt_video: prompt completo en inglés para Veo/Kling/Sora con sujeto, acción, cámara, duración aproximada y estética.
- hook: gancho inicial de 1-2 frases en español, llamativo.
- guion_corto: guion 6-12 líneas estructurado para vertical 9:16.
- estructura_video: bloques temporales (ej. "0-2s: hook ... 3-8s: ..." ).
- estilo_visual: descripción del look (paleta, mood, edición).
- titulo_alternativo: título original alternativo al de la tendencia, en español.
- descripcion_publicacion: copy listo para publicar, en español.
- hashtags: hashtags separados por espacio (máx 12), empezando con #.
- plataformas_recomendadas: lista separada por comas (ej. "TikTok, Reels, YouTube Shorts").

Restricciones obligatorias:
- No menciones marcas, canales ni creadores reales.
- No copies frases textuales del título original ni del guion original.
- Reformula completamente el ángulo manteniendo el insight viral.
- Devuelve SOLO JSON, sin comentarios ni markdown.`;
  return { system, user };
}

function extractJson(text: string): RecreationPayload | null {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const obj = JSON.parse(trimmed);
    return obj as RecreationPayload;
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as RecreationPayload;
    } catch {
      return null;
    }
  }
}

async function callLovableGateway(apiKey: string, system: string, user: string): Promise<string | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[trend-recreation] lovable gateway", res.status, txt.slice(0, 300));
    return null;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

async function callOpenAi(apiKey: string, system: string, user: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.85,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[trend-recreation] openai", res.status, txt.slice(0, 300));
    return null;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

export const generateTrendRecreationPrompt = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => GenerateSchema.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (!lovableKey && !openaiKey) {
      return { ok: false as const, error: "not_configured", message: "Falta LOVABLE_API_KEY u OPENAI_API_KEY." };
    }

    const { system, user } = buildPrompt(data);

    let raw: string | null = null;
    let usedProvider: "lovable" | "openai" | null = null;
    if (lovableKey) {
      raw = await callLovableGateway(lovableKey, system, user);
      if (raw) usedProvider = "lovable";
    }
    if (!raw && openaiKey) {
      raw = await callOpenAi(openaiKey, system, user);
      if (raw) usedProvider = "openai";
    }
    if (!raw) {
      return { ok: false as const, error: "provider_error", message: "No se pudo generar la recreación." };
    }

    const parsed = extractJson(raw);
    if (!parsed) {
      return { ok: false as const, error: "parse_error", message: "Respuesta IA inválida." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const row = {
      user_id: owner,
      trend_id: data.trend_id ?? null,
      platform: data.platform ?? null,
      title: data.title,
      idea_base: parsed.idea_base ?? null,
      prompt_image: parsed.prompt_imagen ?? null,
      prompt_video: parsed.prompt_video ?? null,
      hook: parsed.hook ?? null,
      short_script: parsed.guion_corto ?? null,
      video_structure: parsed.estructura_video ?? null,
      visual_style: parsed.estilo_visual ?? null,
      alternative_title: parsed.titulo_alternativo ?? null,
      publication_description: parsed.descripcion_publicacion ?? null,
      hashtags: parsed.hashtags ?? null,
      recommended_platforms: parsed.plataformas_recomendadas ?? null,
    };
    const { data: inserted, error } = await supabaseAdmin
      .from("trend_recreation_prompts")
      .insert(row)
      .select(SELECT_COLS)
      .single();
    if (error || !inserted) {
      console.error("[trend-recreation] insert", error);
      return { ok: false as const, error: "db_error", message: error?.message ?? "Error al guardar." };
    }
    return { ok: true as const, provider: usedProvider, item: inserted as TrendRecreation };
  });

const ListSchema = z.object({
  trend_id: z.string().uuid().nullable().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const listTrendRecreations = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<TrendRecreation[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    let q = supabaseAdmin
      .from("trend_recreation_prompts")
      .select(SELECT_COLS)
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 24);
    if (data.trend_id) q = q.eq("trend_id", data.trend_id);
    const { data: rows, error } = await q;
    if (error) {
      console.error("[trend-recreation] list", error);
      throw new Error(error.message);
    }
    return (rows ?? []) as TrendRecreation[];
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const deleteTrendRecreation = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("trend_recreation_prompts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });