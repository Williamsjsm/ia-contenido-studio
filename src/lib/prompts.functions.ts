import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * Modo single-owner temporal.
 *
 * Mientras el módulo de autenticación no esté activo todas las operaciones
 * de la biblioteca se ejecutan en nombre de un único usuario "propietario"
 * cuyo UUID se inyecta vía `OWNER_USER_ID` (env). Esto permite usar el cliente
 * admin de Supabase (`supabaseAdmin`) saltándose RLS de forma controlada.
 *
 * TODO(auth): cuando se active la autenticación real:
 *  1. Quitar `OWNER_USER_ID` y `resolveOwnerId()`.
 *  2. Cambiar a `requireSupabaseAuth` middleware y leer `context.userId`.
 *  3. Sustituir `supabaseAdmin` por `context.supabase` (RLS aplica como auth.uid()).
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";

function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

const SavePromptSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  category: z.string().trim().max(80).optional().nullable(),
  platform: z.string().trim().max(40).optional().nullable(),
  style: z.string().trim().max(40).optional().nullable(),
  language: z.string().trim().max(20).optional().nullable(),
  duration: z.string().trim().max(20).optional().nullable(),
  original_prompt: z.string().trim().min(1).max(20_000),
  flow_prompt: z.string().trim().max(20_000).optional().default(""),
  youtube_prompt: z.string().trim().max(20_000).optional().default(""),
  veo_prompt: z.string().trim().max(20_000).optional().default(""),
  kling_prompt: z.string().trim().max(20_000).optional().default(""),
});

export type SavePromptInput = z.input<typeof SavePromptSchema>;

export type SavePromptResult =
  | { ok: true; id: string; duplicate: false }
  | { ok: true; id: string; duplicate: true }
  | { ok: false; error: "validation" | "db_error"; message: string };

export const savePrompt = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => SavePromptSchema.parse(input))
  .handler(async ({ data }): Promise<SavePromptResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();

    // Chequeo lógico de duplicado antes de insertar.
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("prompts")
      .select("id, original_prompt")
      .eq("user_id", owner)
      .eq("title", data.title)
      .order("created_at", { ascending: false })
      .limit(5);

    if (lookupError) {
      console.error("savePrompt lookup failed:", lookupError);
      return { ok: false, error: "db_error", message: lookupError.message };
    }

    const match = existing?.find(
      (row) => (row.original_prompt ?? "").trim() === data.original_prompt.trim(),
    );
    if (match) {
      return { ok: true, id: match.id, duplicate: true };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("prompts")
      .insert({
        user_id: owner,
        title: data.title,
        category: data.category ?? null,
        platform: data.platform ?? null,
        style: data.style ?? null,
        language: data.language ?? null,
        duration: data.duration ?? null,
        content: data.original_prompt,
        original_prompt: data.original_prompt,
        flow_prompt: data.flow_prompt || null,
        youtube_prompt: data.youtube_prompt || null,
        veo_prompt: data.veo_prompt || null,
        kling_prompt: data.kling_prompt || null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      // Manejar caída del índice único (carrera entre lookup e insert).
      if (error?.code === "23505") {
        const { data: dupe } = await supabaseAdmin
          .from("prompts")
          .select("id")
          .eq("user_id", owner)
          .eq("title", data.title)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dupe) return { ok: true, id: dupe.id, duplicate: true };
      }
      console.error("savePrompt insert failed:", error);
      return {
        ok: false,
        error: "db_error",
        message: error?.message ?? "No se pudo guardar el prompt.",
      };
    }

    return { ok: true, id: inserted.id, duplicate: false };
  });

export type StoredPrompt = {
  id: string;
  title: string;
  category: string | null;
  platform: string | null;
  style: string | null;
  language: string | null;
  duration: string | null;
  is_favorite: boolean;
  created_at: string;
  original_prompt: string | null;
  flow_prompt: string | null;
  youtube_prompt: string | null;
  veo_prompt: string | null;
  kling_prompt: string | null;
};

export const listPrompts = createServerFn({ method: "GET" }).handler(
  // placeholder
  async (): Promise<StoredPrompt[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();

    const { data, error } = await supabaseAdmin
      .from("prompts")
      .select(
        "id, title, category, platform, style, language, duration, is_favorite, created_at, original_prompt, flow_prompt, youtube_prompt, veo_prompt, kling_prompt",
      )
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("listPrompts failed:", error);
      throw new Error(error.message);
    }
    return (data ?? []) as StoredPrompt[];
  },
);

const IdSchema = z.object({ id: z.string().uuid() });

export const deletePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("prompts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) {
      console.error("deletePrompt failed:", error);
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

export const toggleFavoritePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_favorite: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("prompts")
      .update({ is_favorite: data.is_favorite })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) {
      console.error("toggleFavoritePrompt failed:", error);
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80).nullable().optional(),
  platform: z.string().trim().max(40).nullable().optional(),
});

export const updatePromptMeta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("prompts")
      .update({
        title: data.title,
        category: data.category ?? null,
        platform: data.platform ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) {
      console.error("updatePromptMeta failed:", error);
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

export const duplicatePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: src, error: readError } = await supabaseAdmin
      .from("prompts")
      .select(
        "title, category, platform, style, language, duration, content, original_prompt, flow_prompt, youtube_prompt, veo_prompt, kling_prompt",
      )
      .eq("id", data.id)
      .eq("user_id", owner)
      .single();
    if (readError || !src) {
      return { ok: false as const, message: readError?.message ?? "No encontrado" };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("prompts")
      .insert({ ...src, user_id: owner, title: `${src.title} (copia)`, is_favorite: false })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false as const, message: error?.message ?? "No se pudo duplicar" };
    }
    return { ok: true as const, id: inserted.id };
  });