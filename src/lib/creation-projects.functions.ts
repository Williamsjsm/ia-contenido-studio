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
  is_archived: boolean;
  archived_at: string | null;
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
  image_count: number;
  flow_count: number;
  publication_count: number;
  character_name: string | null;
  cover_image_base64: string | null;
};

export const listCreationProjects = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<CreationProjectListItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: projects, error } = await supabaseAdmin
      .from("creation_projects")
      .select("id, title, prompt_id, character_id, cover_image_id, status, is_archived, archived_at, created_at, updated_at")
      .eq("user_id", owner)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("listCreationProjects failed:", error);
      return [];
    }
    const rows = (projects ?? []) as unknown as CreationProject[];
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
      .select("project_id, kind")
      .in(
        "project_id",
        rows.map((r) => r.id),
      );
    const totalMap: Record<string, number> = {};
    const imageMap: Record<string, number> = {};
    const flowMap: Record<string, number> = {};
    const pubMap: Record<string, number> = {};
    for (const c of counts ?? []) {
      totalMap[c.project_id] = (totalMap[c.project_id] ?? 0) + 1;
      if (c.kind === "image") imageMap[c.project_id] = (imageMap[c.project_id] ?? 0) + 1;
      else if (c.kind === "flow_job") flowMap[c.project_id] = (flowMap[c.project_id] ?? 0) + 1;
      else if (c.kind === "publication") pubMap[c.project_id] = (pubMap[c.project_id] ?? 0) + 1;
    }
    // Resolver nombres de personajes
    const charIds = Array.from(new Set(rows.map((r) => r.character_id).filter((x): x is string => !!x)));
    let charNames: Record<string, string> = {};
    if (charIds.length > 0) {
      const { data: chars } = await supabaseAdmin
        .from("virtual_characters")
        .select("id, name")
        .in("id", charIds);
      charNames = Object.fromEntries((chars ?? []).map((c) => [c.id, c.name]));
    }
    return rows.map((r) => ({
      ...r,
      asset_count: totalMap[r.id] ?? 0,
      image_count: imageMap[r.id] ?? 0,
      flow_count: flowMap[r.id] ?? 0,
      publication_count: pubMap[r.id] ?? 0,
      character_name: r.character_id ? (charNames[r.character_id] ?? null) : null,
      cover_image_base64: r.cover_image_id ? (covers[r.cover_image_id] ?? null) : null,
    }));
  });

// ------------------------ CRUD adicional ------------------------

const ProjectIdSchema = z.object({ id: z.string().uuid() });

export const renameProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { error } = await supabaseAdmin
      .from("creation_projects")
      .update({ title: data.title })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const archiveProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const patch = data.archived
      ? { is_archived: true, archived_at: new Date().toISOString() }
      : { is_archived: false, archived_at: null };
    const { error } = await supabaseAdmin
      .from("creation_projects")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ProjectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    // creation_project_assets cae en cascada; flow_jobs.project_id es SET NULL.
    const { error } = await supabaseAdmin
      .from("creation_projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

/**
 * Duplica el proyecto: copia metadatos (título, personaje, prompt) y vuelve a
 * enlazar los mismos assets al nuevo proyecto. NO duplica filas de
 * image_generations / flow_jobs / publication_projects.
 */
export const duplicateProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ProjectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: src, error: srcErr } = await supabaseAdmin
      .from("creation_projects")
      .select("title, prompt_id, character_id, cover_image_id, status")
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (srcErr || !src) return { ok: false as const, message: srcErr?.message ?? "Proyecto no encontrado." };
    const { data: created, error: insErr } = await supabaseAdmin
      .from("creation_projects")
      .insert({
        user_id: owner,
        title: `${src.title} (copia)`,
        prompt_id: src.prompt_id,
        character_id: src.character_id,
        cover_image_id: src.cover_image_id,
        status: src.status,
      })
      .select("id")
      .single();
    if (insErr || !created) return { ok: false as const, message: insErr?.message ?? "No se pudo duplicar." };
    // Re-enlazar mismos assets
    const { data: assets } = await supabaseAdmin
      .from("creation_project_assets")
      .select("kind, ref_id")
      .eq("project_id", data.id);
    if (assets && assets.length > 0) {
      const rows = assets.map((a) => ({ project_id: created.id, kind: a.kind, ref_id: a.ref_id }));
      await supabaseAdmin
        .from("creation_project_assets")
        .upsert(rows, { onConflict: "project_id,kind,ref_id" });
    }
    return { ok: true as const, id: created.id };
  });

export const setProjectCover = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), imageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    // Asegurar que la imagen está enlazada al proyecto.
    await supabaseAdmin
      .from("creation_project_assets")
      .upsert(
        { project_id: data.projectId, kind: "image", ref_id: data.imageId },
        { onConflict: "project_id,kind,ref_id" },
      );
    const { error } = await supabaseAdmin
      .from("creation_projects")
      .update({ cover_image_id: data.imageId })
      .eq("id", data.projectId)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export type ProjectImageAsset = {
  id: string;
  prompt: string;
  provider: string;
  image_base64: string | null;
  created_at: string;
  character_name: string | null;
  is_favorite: boolean;
};

export type ProjectDetail = {
  project: CreationProject & {
    character_name: string | null;
    prompt_text: string | null;
    cover_image_base64: string | null;
  };
  images: ProjectImageAsset[];
  flow_jobs: { id: string; title: string | null; status: string; created_at: string }[];
  publications: { id: string; title: string | null; status: string | null; created_at: string }[];
};

export const getProjectDetail = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ProjectIdSchema.parse(input))
  .handler(async ({ data }): Promise<ProjectDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: proj } = await supabaseAdmin
      .from("creation_projects")
      .select("id, title, prompt_id, character_id, cover_image_id, status, is_archived, archived_at, created_at, updated_at")
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (!proj) return null;
    const project = proj as unknown as CreationProject;

    // Personaje
    let characterName: string | null = null;
    if (project.character_id) {
      const { data: ch } = await supabaseAdmin
        .from("virtual_characters")
        .select("name")
        .eq("id", project.character_id)
        .maybeSingle();
      characterName = ch?.name ?? null;
    }
    // Prompt origen
    let promptText: string | null = null;
    if (project.prompt_id) {
      const { data: pr } = await supabaseAdmin
        .from("prompts")
        .select("content")
        .eq("id", project.prompt_id)
        .maybeSingle();
      promptText = (pr as { content?: string } | null)?.content ?? null;
    }
    // Portada
    let coverB64: string | null = null;
    if (project.cover_image_id) {
      const { data: cov } = await supabaseAdmin
        .from("image_generations")
        .select("image_base64")
        .eq("id", project.cover_image_id)
        .maybeSingle();
      coverB64 = cov?.image_base64 ?? null;
    }

    // Assets agrupados por tipo
    const { data: assets } = await supabaseAdmin
      .from("creation_project_assets")
      .select("kind, ref_id, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });
    const imageIds = (assets ?? []).filter((a) => a.kind === "image").map((a) => a.ref_id);
    const flowIds = (assets ?? []).filter((a) => a.kind === "flow_job").map((a) => a.ref_id);
    const pubIds = (assets ?? []).filter((a) => a.kind === "publication").map((a) => a.ref_id);

    let images: ProjectImageAsset[] = [];
    if (imageIds.length > 0) {
      const { data: imgs } = await supabaseAdmin
        .from("image_generations")
        .select("id, prompt, provider, image_base64, created_at, character_name, is_favorite")
        .in("id", imageIds)
        .order("created_at", { ascending: false });
      images = (imgs ?? []) as unknown as ProjectImageAsset[];
    }
    let flow_jobs: ProjectDetail["flow_jobs"] = [];
    if (flowIds.length > 0) {
      const { data: fj } = await supabaseAdmin
        .from("flow_jobs")
        .select("id, title, status, created_at")
        .in("id", flowIds);
      flow_jobs = (fj ?? []) as ProjectDetail["flow_jobs"];
    }
    let publications: ProjectDetail["publications"] = [];
    if (pubIds.length > 0) {
      const { data: pub } = await supabaseAdmin
        .from("publication_projects")
        .select("id, title, status, created_at")
        .in("id", pubIds);
      publications = (pub ?? []) as ProjectDetail["publications"];
    }

    return {
      project: {
        ...project,
        character_name: characterName,
        prompt_text: promptText,
        cover_image_base64: coverB64,
      },
      images,
      flow_jobs,
      publications,
    };
  });

/**
 * Mueve un conjunto de imágenes a un proyecto (re-enlaza assets).
 * No duplica filas de image_generations.
 */
export const moveImagesToProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        imageIds: z.array(z.string().uuid()).min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    // Verificar ownership del proyecto.
    const { data: proj } = await supabaseAdmin
      .from("creation_projects")
      .select("id, cover_image_id")
      .eq("id", data.projectId)
      .eq("user_id", owner)
      .maybeSingle();
    if (!proj) return { ok: false as const, message: "Proyecto no encontrado." };
    const rows = data.imageIds.map((id) => ({ project_id: data.projectId, kind: "image", ref_id: id }));
    const { error } = await supabaseAdmin
      .from("creation_project_assets")
      .upsert(rows, { onConflict: "project_id,kind,ref_id" });
    if (error) return { ok: false as const, message: error.message };
    if (!proj.cover_image_id) {
      await supabaseAdmin
        .from("creation_projects")
        .update({ cover_image_id: data.imageIds[0], status: "image_ready" })
        .eq("id", data.projectId)
        .eq("user_id", owner);
    }
    return { ok: true as const, count: data.imageIds.length };
  });

// ------------------------ v1.2.1 Intelligence ------------------------

/**
 * Estado de ciclo de vida del proyecto, ortogonal a `is_archived`.
 * Mapea cualquier estado legacy (draft/image_ready/video_queued/published) a "active".
 */
export type LifecycleStatus = "active" | "paused" | "completed" | "archived";

export function deriveLifecycleStatus(p: { status: string; is_archived: boolean }): LifecycleStatus {
  if (p.is_archived) return "archived";
  if (p.status === "paused") return "paused";
  if (p.status === "completed") return "completed";
  return "active";
}

export const setProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["active", "paused", "completed"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    // "active" guarda "draft" como valor canónico para no pisar estados legacy.
    const dbValue = data.status === "active" ? "draft" : data.status;
    const { error } = await supabaseAdmin
      .from("creation_projects")
      .update({ status: dbValue, is_archived: false, archived_at: null })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export type TimelineEvent = {
  id: string;
  kind: "project" | "prompt" | "character" | "image" | "flow" | "publication";
  title: string;
  at: string;
  href?: string;
};

export const getProjectTimeline = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<TimelineEvent[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: proj } = await supabaseAdmin
      .from("creation_projects")
      .select("id, title, prompt_id, character_id, created_at")
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (!proj) return [];

    const events: TimelineEvent[] = [
      { id: `p-${proj.id}`, kind: "project", title: `Proyecto creado: ${proj.title}`, at: proj.created_at },
    ];

    if (proj.prompt_id) {
      const { data: pr } = await supabaseAdmin
        .from("prompts")
        .select("id, title, created_at")
        .eq("id", proj.prompt_id)
        .maybeSingle();
      if (pr) events.push({ id: `pr-${pr.id}`, kind: "prompt", title: `Prompt creado: ${pr.title}`, at: pr.created_at });
    }
    if (proj.character_id) {
      const { data: ch } = await supabaseAdmin
        .from("virtual_characters")
        .select("id, name, created_at")
        .eq("id", proj.character_id)
        .maybeSingle();
      if (ch) events.push({ id: `c-${ch.id}`, kind: "character", title: `Personaje utilizado: ${ch.name}`, at: ch.created_at });
    }

    const { data: assets } = await supabaseAdmin
      .from("creation_project_assets")
      .select("kind, ref_id, created_at")
      .eq("project_id", proj.id);

    const imageIds = (assets ?? []).filter((a) => a.kind === "image").map((a) => a.ref_id);
    const flowIds = (assets ?? []).filter((a) => a.kind === "flow_job").map((a) => a.ref_id);
    const pubIds = (assets ?? []).filter((a) => a.kind === "publication").map((a) => a.ref_id);
    const assetMap = new Map<string, string>();
    for (const a of assets ?? []) assetMap.set(`${a.kind}-${a.ref_id}`, a.created_at as string);

    if (imageIds.length) {
      const { data: imgs } = await supabaseAdmin
        .from("image_generations")
        .select("id, prompt, created_at")
        .in("id", imageIds);
      for (const im of imgs ?? []) {
        events.push({
          id: `i-${im.id}`,
          kind: "image",
          title: `Imagen generada: ${String(im.prompt).slice(0, 80)}`,
          at: (assetMap.get(`image-${im.id}`) as string) ?? (im.created_at as string),
        });
      }
    }
    if (flowIds.length) {
      const { data: fjs } = await supabaseAdmin
        .from("flow_jobs")
        .select("id, title, created_at")
        .in("id", flowIds);
      for (const f of fjs ?? []) {
        events.push({
          id: `f-${f.id}`,
          kind: "flow",
          title: `Flow job creado: ${f.title ?? "Sin título"}`,
          at: (assetMap.get(`flow_job-${f.id}`) as string) ?? (f.created_at as string),
        });
      }
    }
    if (pubIds.length) {
      const { data: pubs } = await supabaseAdmin
        .from("publication_projects")
        .select("id, title, created_at")
        .in("id", pubIds);
      for (const p of pubs ?? []) {
        events.push({
          id: `pub-${p.id}`,
          kind: "publication",
          title: `Publicación: ${p.title ?? "Sin título"}`,
          at: (assetMap.get(`publication-${p.id}`) as string) ?? (p.created_at as string),
        });
      }
    }

    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  });

export type ActiveProjectItem = {
  id: string;
  title: string;
  status: string;
  is_archived: boolean;
  updated_at: string;
  cover_image_base64: string | null;
  progress: number;
  image_count: number;
  flow_count: number;
  publication_count: number;
};

export const listActiveProjects = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<ActiveProjectItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: rows } = await supabaseAdmin
      .from("creation_projects")
      .select("id, title, status, is_archived, updated_at, cover_image_id")
      .eq("user_id", owner)
      .eq("is_archived", false)
      .neq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(6);
    const list = rows ?? [];
    if (list.length === 0) return [];
    const coverIds = list.map((r) => r.cover_image_id).filter((x): x is string => !!x);
    let covers: Record<string, string> = {};
    if (coverIds.length) {
      const { data: imgs } = await supabaseAdmin
        .from("image_generations")
        .select("id, image_base64")
        .in("id", coverIds);
      covers = Object.fromEntries((imgs ?? []).map((i) => [i.id, i.image_base64 ?? ""]));
    }
    const { data: counts } = await supabaseAdmin
      .from("creation_project_assets")
      .select("project_id, kind")
      .in("project_id", list.map((r) => r.id));
    const ic: Record<string, number> = {};
    const fc: Record<string, number> = {};
    const pc: Record<string, number> = {};
    for (const c of counts ?? []) {
      if (c.kind === "image") ic[c.project_id] = (ic[c.project_id] ?? 0) + 1;
      else if (c.kind === "flow_job") fc[c.project_id] = (fc[c.project_id] ?? 0) + 1;
      else if (c.kind === "publication") pc[c.project_id] = (pc[c.project_id] ?? 0) + 1;
    }
    return list.map((r) => {
      const hasImage = (ic[r.id] ?? 0) > 0;
      const hasFlow = (fc[r.id] ?? 0) > 0;
      const hasPub = (pc[r.id] ?? 0) > 0;
      const progress = Math.round(((Number(hasImage) + Number(hasFlow) + Number(hasPub)) / 3) * 100);
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        is_archived: r.is_archived,
        updated_at: r.updated_at,
        cover_image_base64: r.cover_image_id ? (covers[r.cover_image_id] ?? null) : null,
        progress,
        image_count: ic[r.id] ?? 0,
        flow_count: fc[r.id] ?? 0,
        publication_count: pc[r.id] ?? 0,
      };
    });
  });