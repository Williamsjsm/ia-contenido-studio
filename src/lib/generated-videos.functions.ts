import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * Modo single-owner temporal — coherente con resto del proyecto.
 * TODO(auth): requireSupabaseAuth + RLS auth.uid() cuando se active auth real.
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function ownerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export const GENERATED_VIDEO_STATUSES = [
  "draft",
  "prepared",
  "queued",
  "generating",
  "completed",
  "failed",
] as const;
export type GeneratedVideoStatus = (typeof GENERATED_VIDEO_STATUSES)[number];

export type GeneratedVideo = {
  id: string;
  user_id: string;
  project_id: string | null;
  draft_id: string | null;
  character_id: string | null;
  title: string;
  provider: string | null;
  status: GeneratedVideoStatus;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: string | null;
  is_simulated: boolean;
  error_message: string | null;
  is_favorite: boolean;
  parent_video_id: string | null;
  version: number;
  video_score: number | null;
  video_score_breakdown: VideoScoreBreakdown | null;
  video_score_reason: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id, user_id, project_id, draft_id, character_id, title, provider, status, thumbnail_url, video_url, duration, is_simulated, error_message, is_favorite, parent_video_id, version, video_score, video_score_breakdown, video_score_reason, created_at, updated_at";

export type VideoScoreBreakdown = {
  calidad: number;
  continuidad: number;
  consistencia: number;
  viralidad: number;
  compatibilidad: number;
};

export type GeneratedVideoWithMeta = GeneratedVideo & {
  project_title: string | null;
  character_name: string | null;
};

// ------------------- Queries -------------------

export const listGeneratedVideos = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<GeneratedVideo[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("generated_videos")
      .select(SELECT_COLS)
      .eq("user_id", ownerId())
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listGeneratedVideos failed:", error);
      return [];
    }
    return (data ?? []) as unknown as GeneratedVideo[];
  });

export type ProductionStats = {
  drafts: number;
  prepared: number;
  queued: number;
  generating: number;
  completed: number;
  failed: number;
  total: number;
};

export const getProductionStats = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<ProductionStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();

    const [drafts, videos] = await Promise.all([
      supabaseAdmin
        .from("video_drafts")
        .select("status")
        .eq("user_id", owner)
        .limit(2000),
      supabaseAdmin
        .from("generated_videos")
        .select("status")
        .eq("user_id", owner)
        .limit(2000),
    ]);

    const stats: ProductionStats = {
      drafts: 0,
      prepared: 0,
      queued: 0,
      generating: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const row of (drafts.data ?? []) as { status: string }[]) {
      if (row.status === "draft") stats.drafts += 1;
      else if (row.status === "prepared") stats.prepared += 1;
      else if (row.status === "queued") stats.queued += 1;
      else if (row.status === "generating") stats.generating += 1;
      else if (row.status === "failed") stats.failed += 1;
    }
    for (const row of (videos.data ?? []) as { status: string }[]) {
      stats.total += 1;
      if (row.status === "completed") stats.completed += 1;
      else if (row.status === "failed") stats.failed += 1;
      else if (row.status === "queued") stats.queued += 1;
      else if (row.status === "generating") stats.generating += 1;
      else if (row.status === "prepared") stats.prepared += 1;
    }
    return stats;
  });

// ------------------- Simulación -------------------

const StepSchema = z.object({
  draftId: z.string().uuid(),
  status: z.enum(["prepared", "queued", "generating", "completed", "failed"]),
});

/**
 * Avanza el estado de un borrador. Usado por el simulador para
 * recorrer prepared → queued → generating paso a paso.
 */
export const setDraftProductionStatus = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => StepSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { error } = await supabaseAdmin
      .from("video_drafts")
      .update({ status: data.status })
      .eq("id", data.draftId)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

const SimulateSchema = z.object({ draftId: z.string().uuid() });

/**
 * Marca el borrador como `completed` y crea la fila final en
 * `generated_videos` reutilizando la imagen origen como miniatura.
 * NO llama a ningún proveedor real.
 */
export const completeSimulatedGeneration = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => SimulateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();

    const draftRead = (await supabaseAdmin
      .from("video_drafts")
      .select(
        "id, user_id, project_id, character_id, source_image_id, source_image_url, title, prompt, provider, duration",
      )
      .eq("id", data.draftId)
      .eq("user_id", owner)
      .maybeSingle()) as unknown as { data: unknown; error: { message?: string; code?: string } | null };
    let draft = draftRead.data as {
      id: string;
      project_id: string | null;
      character_id: string | null;
      source_image_id: string | null;
      source_image_url?: string | null;
      title: string | null;
      provider: string | null;
      duration: string | null;
    } | null;
    let draftErr = draftRead.error;
    if (draftErr?.code === "PGRST204" || draftErr?.message?.includes("source_image_url")) {
      const fallbackRead = await supabaseAdmin
        .from("video_drafts")
        .select("id, user_id, project_id, character_id, source_image_id, title, prompt, provider, duration")
        .eq("id", data.draftId)
        .eq("user_id", owner)
        .maybeSingle();
      draft = fallbackRead.data as typeof draft;
      draftErr = fallbackRead.error;
    }
    if (draftErr || !draft) {
      return { ok: false as const, message: draftErr?.message ?? "Borrador no encontrado." };
    }

    // Miniatura: data: URL desde imagen origen (si existe).
    let thumbnail: string | null = null;
    if (draft.source_image_id) {
      const { data: img } = await supabaseAdmin
        .from("image_generations")
        .select("image_base64")
        .eq("id", draft.source_image_id)
        .maybeSingle();
      if (img?.image_base64) thumbnail = `data:image/png;base64,${img.image_base64}`;
    }
    if (!thumbnail && (draft as { source_image_url?: string | null }).source_image_url) {
      thumbnail = (draft as { source_image_url?: string | null }).source_image_url ?? null;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("generated_videos")
      .insert({
        user_id: owner,
        project_id: draft.project_id,
        draft_id: draft.id,
        character_id: draft.character_id,
        title: draft.title || "Video simulado",
        provider: draft.provider,
        status: "completed",
        thumbnail_url: thumbnail,
        video_url: null,
        duration: draft.duration,
        is_simulated: true,
      })
      .select(SELECT_COLS)
      .single();
    if (error || !inserted) {
      return { ok: false as const, message: error?.message ?? "No se pudo crear el video." };
    }

    await supabaseAdmin
      .from("video_drafts")
      .update({ status: "completed" })
      .eq("id", draft.id)
      .eq("user_id", owner);

    return { ok: true as const, video: inserted as unknown as GeneratedVideo };
  });

// ------------------- Galería + acciones -------------------

const SELECT_WITH_META =
  SELECT_COLS +
  ", creation_projects:project_id(title), virtual_characters:character_id(name)";

function flattenMeta(row: Record<string, unknown>): GeneratedVideoWithMeta {
  const proj = row.creation_projects as { title: string | null } | null | undefined;
  const char = row.virtual_characters as { name: string | null } | null | undefined;
  const { creation_projects: _p, virtual_characters: _c, ...rest } = row as Record<string, unknown>;
  void _p;
  void _c;
  return {
    ...(rest as unknown as GeneratedVideo),
    project_title: proj?.title ?? null,
    character_name: char?.name ?? null,
  };
}

export const listVideosWithMeta = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<GeneratedVideoWithMeta[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("generated_videos")
      .select(SELECT_WITH_META)
      .eq("user_id", ownerId())
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("listVideosWithMeta failed:", error);
      return [];
    }
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(flattenMeta);
  });

export const listRecentVideos = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<GeneratedVideoWithMeta[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("generated_videos")
      .select(SELECT_WITH_META)
      .eq("user_id", ownerId())
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) return [];
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(flattenMeta);
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const getVideoById = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratedVideoWithMeta | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("generated_videos")
      .select(SELECT_WITH_META)
      .eq("id", data.id)
      .eq("user_id", ownerId())
      .maybeSingle();
    if (error || !row) return null;
    return flattenMeta(row as unknown as Record<string, unknown>);
  });

/**
 * Lista todas las versiones que comparten la misma raíz (parent o el propio video).
 */
export const listVideoVersions = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratedVideoWithMeta[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: self } = await supabaseAdmin
      .from("generated_videos")
      .select("id, parent_video_id")
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (!self) return [];
    const rootId = (self.parent_video_id as string | null) ?? self.id;
    const { data: rows, error } = await supabaseAdmin
      .from("generated_videos")
      .select(SELECT_WITH_META)
      .eq("user_id", owner)
      .or(`id.eq.${rootId},parent_video_id.eq.${rootId}`)
      .order("version", { ascending: true });
    if (error || !rows) return [];
    return (rows as unknown as Record<string, unknown>[]).map(flattenMeta);
  });

export const toggleVideoFavorite = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), value: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("generated_videos")
      .update({ is_favorite: data.value })
      .eq("id", data.id)
      .eq("user_id", ownerId());
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("generated_videos")
      .delete()
      .eq("id", data.id)
      .eq("user_id", ownerId());
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

async function loadVideoRow(id: string, owner: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("generated_videos")
    .select(SELECT_COLS)
    .eq("id", id)
    .eq("user_id", owner)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as GeneratedVideo;
}

/**
 * Duplica un video como nueva fila independiente (no versión).
 */
export const duplicateVideo = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const src = await loadVideoRow(data.id, owner);
    if (!src) return { ok: false as const, message: "Video no encontrado." };
    const { data: inserted, error } = await supabaseAdmin
      .from("generated_videos")
      .insert({
        user_id: owner,
        project_id: src.project_id,
        draft_id: src.draft_id,
        character_id: src.character_id,
        title: `${src.title} (copia)`,
        provider: src.provider,
        status: src.status,
        thumbnail_url: src.thumbnail_url,
        video_url: src.video_url,
        duration: src.duration,
        is_simulated: src.is_simulated,
      })
      .select(SELECT_COLS)
      .single();
    if (error || !inserted) return { ok: false as const, message: error?.message ?? "Error al duplicar." };
    return { ok: true as const, video: inserted as unknown as GeneratedVideo };
  });

/**
 * Crea una nueva versión del video. La raíz se identifica por parent_video_id
 * (o el propio id si es el original). El número de versión es el máximo + 1.
 */
export const createVideoVersion = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const src = await loadVideoRow(data.id, owner);
    if (!src) return { ok: false as const, message: "Video no encontrado." };

    const rootId = src.parent_video_id ?? src.id;
    const { data: siblings } = await supabaseAdmin
      .from("generated_videos")
      .select("version")
      .eq("user_id", owner)
      .or(`id.eq.${rootId},parent_video_id.eq.${rootId}`);
    const maxVersion = (siblings ?? []).reduce(
      (m, r) => Math.max(m, (r as { version: number }).version ?? 1),
      1,
    );

    const { data: inserted, error } = await supabaseAdmin
      .from("generated_videos")
      .insert({
        user_id: owner,
        project_id: src.project_id,
        draft_id: src.draft_id,
        character_id: src.character_id,
        title: src.title,
        provider: src.provider,
        status: "draft",
        thumbnail_url: src.thumbnail_url,
        video_url: null,
        duration: src.duration,
        is_simulated: src.is_simulated,
        parent_video_id: rootId,
        version: maxVersion + 1,
      })
      .select(SELECT_COLS)
      .single();
    if (error || !inserted) return { ok: false as const, message: error?.message ?? "Error al versionar." };
    return { ok: true as const, video: inserted as unknown as GeneratedVideo };
  });

// ------------------- Score IA -------------------

const SCORE_SYSTEM_PROMPT = `Eres un evaluador experto de video generado por IA.
Devuelves SIEMPRE un objeto JSON con esta forma EXACTA:
{
  "score": number (0-100, entero),
  "breakdown": {
    "calidad": number (0-100),
    "continuidad": number (0-100),
    "consistencia": number (0-100),
    "viralidad": number (0-100),
    "compatibilidad": number (0-100)
  },
  "reason": string (máx 240 caracteres, en español)
}
Sin texto fuera del JSON. Sin markdown.`;

function heuristicScore(v: GeneratedVideo): {
  score: number;
  breakdown: VideoScoreBreakdown;
  reason: string;
} {
  const base = v.status === "completed" ? 70 : v.status === "failed" ? 30 : 55;
  const provBonus = v.provider ? 5 : 0;
  const dur = v.duration ? 5 : 0;
  const thumb = v.thumbnail_url ? 5 : 0;
  const score = Math.min(100, base + provBonus + dur + thumb);
  return {
    score,
    breakdown: {
      calidad: score,
      continuidad: score - 5,
      consistencia: score - 3,
      viralidad: score - 8,
      compatibilidad: score + 2 > 100 ? 100 : score + 2,
    },
    reason: "Estimación heurística sin IA (LOVABLE_API_KEY no configurada).",
  };
}

export const scoreVideo = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const src = await loadVideoRow(data.id, owner);
    if (!src) return { ok: false as const, message: "Video no encontrado." };

    const ctx = [
      `Título: ${src.title}`,
      `Proveedor: ${src.provider ?? "—"}`,
      `Duración: ${src.duration ?? "—"}`,
      `Estado: ${src.status}`,
      `Versión: ${src.version}`,
      `Simulado: ${src.is_simulated ? "Sí" : "No"}`,
    ].join("\n");

    const key = process.env.LOVABLE_API_KEY;
    let result = heuristicScore(src);

    if (key) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.4,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SCORE_SYSTEM_PROMPT },
              { role: "user", content: ctx },
            ],
          }),
        });
        clearTimeout(timeout);
        if (response.ok) {
          const payload = (await response.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = payload?.choices?.[0]?.message?.content;
          if (content) {
            try {
              const parsed = JSON.parse(content);
              const Parsed = z.object({
                score: z.number().min(0).max(100),
                breakdown: z.object({
                  calidad: z.number(),
                  continuidad: z.number(),
                  consistencia: z.number(),
                  viralidad: z.number(),
                  compatibilidad: z.number(),
                }),
                reason: z.string().max(400),
              });
              const ok = Parsed.safeParse(parsed);
              if (ok.success) {
                result = {
                  score: Math.round(ok.data.score),
                  breakdown: ok.data.breakdown,
                  reason: ok.data.reason,
                };
              }
            } catch {
              /* keep heuristic */
            }
          }
        } else if (response.status === 429) {
          return { ok: false as const, message: "Límite de IA alcanzado. Espera unos segundos." };
        } else if (response.status === 402) {
          return { ok: false as const, message: "Sin crédito IA disponible." };
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error("scoreVideo gateway error:", err);
      }
    }

    const { error } = await supabaseAdmin
      .from("generated_videos")
      .update({
        video_score: result.score,
        video_score_breakdown: result.breakdown,
        video_score_reason: result.reason,
      })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, ...result };
  });