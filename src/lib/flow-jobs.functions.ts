import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * TODO(auth): mientras no exista autenticación real usamos `OWNER_USER_ID`
 * (env) + supabaseAdmin para operar como único propietario.
 * Cuando se active auth: cambiar a `requireSupabaseAuth` y `context.supabase`.
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export const FLOW_STATUSES = ["draft", "pending", "completed", "error"] as const;
export type FlowStatus = (typeof FLOW_STATUSES)[number];

const StatusSchema = z.enum(FLOW_STATUSES);

const SaveSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  prompt: z.string().trim().min(1, "El prompt es obligatorio.").max(20_000),
  source_variant: z.string().trim().max(40).nullable().optional(),
  platform: z.string().trim().max(40).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  duration: z.string().trim().max(20).nullable().optional(),
  resolution: z.string().trim().max(20).nullable().optional(),
  aspect_ratio: z.string().trim().max(20).nullable().optional(),
  model: z.string().trim().max(40).nullable().optional(),
  status: StatusSchema.optional().default("draft"),
  flow_points_estimate: z.number().int().min(0).max(10_000).nullable().optional(),
  flow_mode: z.string().trim().max(20).nullable().optional(),
  flow_media_type: z.string().trim().max(20).nullable().optional(),
  flow_generation_mode: z.string().trim().max(40).nullable().optional(),
  variations: z.number().int().min(1).max(8).nullable().optional(),
});

export type SaveFlowJobInput = z.input<typeof SaveSchema>;

export type FlowJob = {
  id: string;
  title: string;
  prompt: string;
  source_variant: string | null;
  platform: string | null;
  category: string | null;
  duration: string | null;
  resolution: string | null;
  aspect_ratio: string | null;
  model: string | null;
  status: FlowStatus;
  created_at: string;
  updated_at: string;
  flow_points_estimate: number | null;
  flow_mode: string | null;
  flow_media_type: string | null;
  flow_generation_mode: string | null;
  variations: number | null;
};

const SELECT_COLS =
  "id, title, prompt, source_variant, platform, category, duration, resolution, aspect_ratio, model, status, created_at, updated_at, flow_points_estimate, flow_mode, flow_media_type, flow_generation_mode, variations";

export const saveFlowJob = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: inserted, error } = await supabaseAdmin
      .from("flow_jobs")
      .insert({
        user_id: owner,
        title: data.title,
        prompt: data.prompt,
        source_variant: data.source_variant ?? null,
        platform: data.platform ?? null,
        category: data.category ?? null,
        duration: data.duration ?? null,
        resolution: data.resolution ?? null,
        aspect_ratio: data.aspect_ratio ?? null,
        model: data.model ?? null,
        status: data.status ?? "draft",
        flow_points_estimate: data.flow_points_estimate ?? null,
        flow_mode: data.flow_mode ?? null,
        flow_media_type: data.flow_media_type ?? null,
        flow_generation_mode: data.flow_generation_mode ?? null,
        variations: data.variations ?? null,
      })
      .select(SELECT_COLS)
      .single();
    if (error || !inserted) {
      console.error("saveFlowJob failed:", error);
      return { ok: false as const, message: error?.message ?? "No se pudo guardar." };
    }
    return { ok: true as const, job: inserted as FlowJob };
  });

export const listFlowJobs = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<FlowJob[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data, error } = await supabaseAdmin
      .from("flow_jobs")
      .select(SELECT_COLS)
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listFlowJobs failed:", error);
      throw new Error(error.message);
    }
    return (data ?? []) as FlowJob[];
  });

const IdSchema = z.object({ id: z.string().uuid() });

const UpdateSchema = SaveSchema.partial().extend({ id: z.string().uuid() });

export const updateFlowJob = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) patch[k] = v;
    }
    const { error } = await supabaseAdmin
      .from("flow_jobs")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", id)
      .eq("user_id", owner);
    if (error) {
      console.error("updateFlowJob failed:", error);
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

export const deleteFlowJob = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("flow_jobs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) {
      console.error("deleteFlowJob failed:", error);
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

export const duplicateFlowJob = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: src, error: readError } = await supabaseAdmin
      .from("flow_jobs")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .eq("user_id", owner)
      .single();
    if (readError || !src) {
      return { ok: false as const, message: readError?.message ?? "No encontrado" };
    }
    const { id: _omit, created_at: _c, updated_at: _u, ...rest } = src as FlowJob;
    const { data: inserted, error } = await supabaseAdmin
      .from("flow_jobs")
      .insert({ ...rest, user_id: owner, title: `${rest.title} (copia)`, status: "draft" })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false as const, message: error?.message ?? "No se pudo duplicar" };
    }
    return { ok: true as const, id: inserted.id };
  });