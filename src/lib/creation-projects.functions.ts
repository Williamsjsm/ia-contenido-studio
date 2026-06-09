import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * Single-owner temporal mode.
 * TODO(auth): cuando exista auth real, sustituir OWNER_USER_ID + supabaseAdmin
 * por requireSupabaseAuth + context.supabase, y restaurar FK a auth.users.
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function ownerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export type CreationProject = {
  id: string;
  title: string;
  prompt_id: string | null;
  character_id: string | null;
  cover_image_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const EnsureSchema = z.object({
  promptId: z.string().uuid().optional().nullable(),
  characterId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200).optional().nullable(),
});

/**
 * Devuelve un proyecto existente que coincida con promptId+characterId, o
 * crea uno nuevo en estado `draft`. Idempotente para el mismo par.
 */
export const ensureCreationProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => EnsureSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();

    // Buscar proyecto existente para este prompt/personaje
    if (data.promptId || data.characterId) {
      let q = supabaseAdmin
        .from("creation_projects")
        .select("id, title, prompt_id, character_id, cover_image_id, status, created_at, updated_at")
        .eq("user_id", owner)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data.promptId) q = q.eq("prompt_id", data.promptId);
      else q = q.is("prompt_id", null);
      if (data.characterId) q = q.eq("character_id", data.characterId);
      else q = q.is("character_id", null);
      const { data: existing } = await q.maybeSingle();
      if (existing) return { ok: true as const, project: existing as CreationProject, created: false };
    }

    const title = data.title?.trim() || "Proyecto sin título";
    const { data: inserted, error } = await supabaseAdmin
      .from("creation_projects")
      .insert({
        user_id: owner,
        title,
        prompt_id: data.promptId ?? null,
        character_id: data.characterId ?? null,
      })
      .select("id, title, prompt_id, character_id, cover_image_id, status, created_at, updated_at")
      .single();
    if (error || !inserted) {
      console.error("ensureCreationProject insert failed:", error);
      return { ok: false as const, message: error?.message ?? "No se pudo crear el proyecto." };
    }
    return { ok: true as const, project: inserted as CreationProject, created: true };
  });

const AttachSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["image", "flow_job", "publication"]),
  refId: z.string().uuid(),
  setCover: z.boolean().optional().default(false),
});

export const attachAssetToProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => AttachSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    // Asegurar ownership del proyecto
    const { data: proj } = await supabaseAdmin
      .from("creation_projects")
      .select("id, cover_image_id, status")
      .eq("id", data.projectId)
      .eq("user_id", owner)
      .maybeSingle();
    if (!proj) return { ok: false as const, message: "Proyecto no encontrado." };

    const { error } = await supabaseAdmin
      .from("creation_project_assets")
      .upsert(
        { project_id: data.projectId, kind: data.kind, ref_id: data.refId },
        { onConflict: "project_id,kind,ref_id" },
      );
    if (error) {
      console.error("attachAssetToProject failed:", error);
      return { ok: false as const, message: error.message };
    }

    const patch: {
      cover_image_id?: string;
      status?: string;
    } = {};
    if (data.kind === "image" && (data.setCover || !proj.cover_image_id)) {
      patch.cover_image_id = data.refId;
      patch.status = "image_ready";
    } else if (data.kind === "flow_job") {
      patch.status = "video_queued";
    } else if (data.kind === "publication") {
      patch.status = "published";
    }
    if (Object.keys(patch).length > 0) {
      await supabaseAdmin
        .from("creation_projects")
        .update(patch)
        .eq("id", data.projectId)
        .eq("user_id", owner);
    }
    return { ok: true as const };
  });

export type CreationProjectListItem = CreationProject & {
  asset_count: number;
  cover_image_base64: string | null;
};

export const listCreationProjects = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<CreationProjectListItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: projects, error } = await supabaseAdmin
      .from("creation_projects")
      .select("id, title, prompt_id, character_id, cover_image_id, status, created_at, updated_at")
      .eq("user_id", owner)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("listCreationProjects failed:", error);
      return [];
    }
    const rows = (projects ?? []) as CreationProject[];
    if (rows.length === 0) return [];
    const coverIds = rows.map((r) => r.cover_image_id).filter((id): id is string => !!id);
    let covers: Record<string, string> = {};
    if (coverIds.length > 0) {
      const { data: imgs } = await supabaseAdmin
        .from("image_generations")
        .select("id, image_base64")
        .in("id", coverIds);
      covers = Object.fromEntries((imgs ?? []).map((i) => [i.id, i.image_base64 ?? ""]));
    }
    const { data: counts } = await supabaseAdmin
      .from("creation_project_assets")
      .select("project_id")
      .in(
        "project_id",
        rows.map((r) => r.id),
      );
    const countMap: Record<string, number> = {};
    for (const c of counts ?? []) {
      countMap[c.project_id] = (countMap[c.project_id] ?? 0) + 1;
    }
    return rows.map((r) => ({
      ...r,
      asset_count: countMap[r.id] ?? 0,
      cover_image_base64: r.cover_image_id ? (covers[r.cover_image_id] ?? null) : null,
    }));
  });