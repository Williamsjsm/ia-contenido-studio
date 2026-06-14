import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * TODO(auth): single-owner pattern; cuando exista auth real usar
 * requireSupabaseAuth + context.supabase + RLS por auth.uid().
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function ownerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export const VIDEO_STATUSES = [
  "draft",
  "prepared",
  "queued",
  "generating",
  "completed",
  "failed",
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const VIDEO_PRESETS = [
  "cinematico",
  "tiktok",
  "reels-lifestyle",
  "producto",
  "historia",
  "animal-ia",
  "influencer-ia",
] as const;
export type VideoPreset = (typeof VIDEO_PRESETS)[number];

export type VideoDraft = {
  id: string;
  user_id: string;
  project_id: string | null;
  character_id: string | null;
  source_image_id: string | null;
  parent_draft_id: string | null;
  title: string;
  prompt: string;
  preset: string | null;
  status: VideoStatus;
  provider: string | null;
  duration: string | null;
  aspect_ratio: string | null;
  camera_motion: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id, user_id, project_id, character_id, source_image_id, parent_draft_id, title, prompt, preset, status, provider, duration, aspect_ratio, camera_motion, version, created_at, updated_at";

/**
 * Detecta errores transitorios de PostgREST / schema cache para reintentar.
 * Ej: "Could not query the database for the schema cache", PGRST002, 503, etc.
 */
function isTransientPgError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: string; code?: string; status?: number };
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("could not query the database") ||
    msg.includes("timed out") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("too many connections") ||
    e.code === "PGRST002" ||
    e.status === 503 ||
    e.status === 504
  );
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientPgError(err) || i === attempts - 1) break;
      const delay = 400 * Math.pow(2, i);
      console.warn(`[video-drafts] ${label} transient error, retry in ${delay}ms`, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Ejecuta una consulta opcional y degrada a null si falla (no bloquea el flujo). */
async function safeOptional<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[video-drafts] optional lookup '${label}' failed, continuing`, err);
    return null;
  }
}

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  prompt: z.string().trim().max(20_000).optional().default(""),
  projectId: z.string().uuid().nullable().optional(),
  characterId: z.string().uuid().nullable().optional(),
  sourceImageId: z.string().uuid().nullable().optional(),
  parentDraftId: z.string().uuid().nullable().optional(),
  preset: z.string().max(40).nullable().optional(),
  provider: z.string().max(40).nullable().optional(),
  duration: z.string().max(20).nullable().optional(),
  aspectRatio: z.string().max(20).nullable().optional(),
  cameraMotion: z.string().max(40).nullable().optional(),
});

export const createVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => CreateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();

    // Auto-prompt: si no se pasó prompt, intentar derivarlo de la imagen origen
    let prompt = data.prompt?.trim() ?? "";
    let inferredTitle = data.title?.trim();
    let characterId = data.characterId ?? null;
    let projectId = data.projectId ?? null;

    if (data.sourceImageId) {
      const img = await safeOptional("image_generations lookup", async () => {
        const { data: row, error } = await supabaseAdmin
          .from("image_generations")
          .select("prompt, character_id, character_name")
          .eq("id", data.sourceImageId!)
          .maybeSingle();
        if (error) throw error;
        return row;
      });
      if (img) {
        if (!prompt && img.prompt) prompt = img.prompt;
        if (!characterId && (img as { character_id?: string }).character_id) {
          characterId = (img as { character_id?: string }).character_id ?? null;
        }
        if (!inferredTitle) inferredTitle = (img.prompt ?? "").slice(0, 60);
      }
    }

    if (characterId && !prompt) {
      const ch = await safeOptional("virtual_characters lookup", async () => {
        const { data: row, error } = await supabaseAdmin
          .from("virtual_characters")
          .select("name, master_prompt, description")
          .eq("id", characterId!)
          .maybeSingle();
        if (error) throw error;
        return row;
      });
      if (ch) {
        prompt = [ch.master_prompt, ch.description].filter(Boolean).join("\n");
        if (!inferredTitle) inferredTitle = `Video de ${ch.name}`;
      }
    }

    // Calcular versión si hay parent
    let version = 1;
    if (data.parentDraftId) {
      const siblings = await safeOptional("video_drafts siblings", async () => {
        const { data: rows, error } = await supabaseAdmin
          .from("video_drafts")
          .select("version")
          .eq("parent_draft_id", data.parentDraftId!);
        if (error) throw error;
        return rows;
      });
      version = Math.max(1, ...(siblings ?? []).map((s) => s.version ?? 1)) + 1;
    }

    try {
      const inserted = await withRetry("insert video_draft", async () => {
        const { data: row, error } = await supabaseAdmin
          .from("video_drafts")
          .insert({
            user_id: owner,
            project_id: projectId,
            character_id: characterId,
            source_image_id: data.sourceImageId ?? null,
            parent_draft_id: data.parentDraftId ?? null,
            title: inferredTitle || "Video sin título",
            prompt,
            preset: data.preset ?? null,
            provider: data.provider ?? null,
            duration: data.duration ?? null,
            aspect_ratio: data.aspectRatio ?? null,
            camera_motion: data.cameraMotion ?? null,
            status: "draft",
            version,
          })
          .select(SELECT_COLS)
          .single();
        if (error) throw error;
        return row;
      });
      return { ok: true as const, draft: inserted as unknown as VideoDraft };
    } catch (err) {
      const e = err as { message?: string; code?: string; hint?: string; details?: string };
      console.error("createVideoDraft failed:", {
        fn: "createVideoDraft",
        table: "video_drafts",
        message: e?.message,
        code: e?.code,
        hint: e?.hint,
        details: e?.details,
      });
      const friendly = isTransientPgError(err)
        ? "El backend está saturado. Espera unos segundos y reintenta."
        : e?.message ?? "No se pudo crear el borrador.";
      return { ok: false as const, message: friendly };
    }
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(200).optional(),
  prompt: z.string().max(20_000).optional(),
  preset: z.string().max(40).nullable().optional(),
  provider: z.string().max(40).nullable().optional(),
  duration: z.string().max(20).nullable().optional(),
  aspectRatio: z.string().max(20).nullable().optional(),
  cameraMotion: z.string().max(40).nullable().optional(),
  status: z.enum(VIDEO_STATUSES).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const updateVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.prompt !== undefined) patch.prompt = data.prompt;
    if (data.preset !== undefined) patch.preset = data.preset;
    if (data.provider !== undefined) patch.provider = data.provider;
    if (data.duration !== undefined) patch.duration = data.duration;
    if (data.aspectRatio !== undefined) patch.aspect_ratio = data.aspectRatio;
    if (data.cameraMotion !== undefined) patch.camera_motion = data.cameraMotion;
    if (data.status !== undefined) patch.status = data.status;
    if (data.projectId !== undefined) patch.project_id = data.projectId;
    const { error } = await supabaseAdmin
      .from("video_drafts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const deleteVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { error } = await supabaseAdmin
      .from("video_drafts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const duplicateVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: src } = await supabaseAdmin
      .from("video_drafts")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (!src) return { ok: false as const, message: "Borrador no encontrado." };
    const s = src as unknown as VideoDraft;
    const { data: siblings } = await supabaseAdmin
      .from("video_drafts")
      .select("version")
      .eq("parent_draft_id", s.parent_draft_id ?? s.id);
    const nextVersion = Math.max(s.version, ...(siblings ?? []).map((x) => x.version ?? 1)) + 1;
    const { data: inserted, error } = await supabaseAdmin
      .from("video_drafts")
      .insert({
        user_id: owner,
        project_id: s.project_id,
        character_id: s.character_id,
        source_image_id: s.source_image_id,
        parent_draft_id: s.parent_draft_id ?? s.id,
        title: `${s.title} v${nextVersion}`,
        prompt: s.prompt,
        preset: s.preset,
        provider: s.provider,
        duration: s.duration,
        aspect_ratio: s.aspect_ratio,
        camera_motion: s.camera_motion,
        status: "draft",
        version: nextVersion,
      })
      .select("id")
      .single();
    if (error || !inserted) return { ok: false as const, message: error?.message ?? "No se pudo duplicar." };
    return { ok: true as const, id: inserted.id };
  });

export type VideoDraftDetail = VideoDraft & {
  source_image_base64: string | null;
  source_image_prompt: string | null;
  character_name: string | null;
  project_title: string | null;
  versions: Array<Pick<VideoDraft, "id" | "title" | "version" | "status" | "created_at">>;
};

export const getVideoDraftDetail = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }): Promise<VideoDraftDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: row } = await supabaseAdmin
      .from("video_drafts")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (!row) return null;
    const draft = row as unknown as VideoDraft;

    let img_b64: string | null = null;
    let img_prompt: string | null = null;
    if (draft.source_image_id) {
      const { data: img } = await supabaseAdmin
        .from("image_generations")
        .select("image_base64, prompt")
        .eq("id", draft.source_image_id)
        .maybeSingle();
      img_b64 = img?.image_base64 ?? null;
      img_prompt = img?.prompt ?? null;
    }
    let charName: string | null = null;
    if (draft.character_id) {
      const { data: ch } = await supabaseAdmin
        .from("virtual_characters")
        .select("name")
        .eq("id", draft.character_id)
        .maybeSingle();
      charName = ch?.name ?? null;
    }
    let projTitle: string | null = null;
    if (draft.project_id) {
      const { data: pr } = await supabaseAdmin
        .from("creation_projects")
        .select("title")
        .eq("id", draft.project_id)
        .maybeSingle();
      projTitle = pr?.title ?? null;
    }

    // Versions: siblings + parent + self under same parent_draft_id (or self id)
    const rootId = draft.parent_draft_id ?? draft.id;
    const { data: vers } = await supabaseAdmin
      .from("video_drafts")
      .select("id, title, version, status, created_at")
      .or(`id.eq.${rootId},parent_draft_id.eq.${rootId}`)
      .eq("user_id", owner)
      .order("version", { ascending: true });
    return {
      ...draft,
      source_image_base64: img_b64,
      source_image_prompt: img_prompt,
      character_name: charName,
      project_title: projTitle,
      versions: (vers ?? []) as VideoDraftDetail["versions"],
    };
  });

export const listVideoDrafts = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<VideoDraft[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data, error } = await supabaseAdmin
      .from("video_drafts")
      .select(SELECT_COLS)
      .eq("user_id", owner)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listVideoDrafts failed:", error);
      return [];
    }
    return (data ?? []) as unknown as VideoDraft[];
  });

const ByProjectSchema = z.object({ projectId: z.string().uuid() });

export const listVideoDraftsByProject = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ByProjectSchema.parse(input))
  .handler(async ({ data }): Promise<VideoDraft[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: rows, error } = await supabaseAdmin
      .from("video_drafts")
      .select(SELECT_COLS)
      .eq("user_id", owner)
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listVideoDraftsByProject failed:", error);
      return [];
    }
    return (rows ?? []) as unknown as VideoDraft[];
  });