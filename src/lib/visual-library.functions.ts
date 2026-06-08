import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function ownerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

const BUCKET = "visual-references";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 días

/**
 * Defensa en profundidad: garantiza que cualquier path recibido del cliente
 * pertenece al owner actual. Bloquea IDOR aunque el cliente envíe paths
 * arbitrarios a createSignedUrl / remove / update.
 */
function assertOwnedPath(path: string | null | undefined, owner: string): void {
  if (!path) return;
  const normalized = path.replace(/^\/+/, "");
  if (normalized.includes("..") || !normalized.startsWith(`${owner}/`)) {
    throw new Error("Forbidden: path no pertenece al usuario");
  }
}

async function sign(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ------------------------ Upload ------------------------

const UploadSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]),
  // base64 (sin prefijo data:)
  base64: z.string().min(1).max(15_000_000),
  scope: z.enum(["reference", "character"]).default("reference"),
});

export const uploadVisualImage = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => UploadSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const ext = (data.filename.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${owner}/${data.scope}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(data.base64, "base64");
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) {
      console.error("uploadVisualImage failed:", error);
      return { ok: false as const, message: error.message };
    }
    const url = await sign(path);
    return { ok: true as const, path, url };
  });

// ------------------------ Visual References ------------------------

export type VisualReference = {
  id: string;
  name: string;
  image_url: string | null;
  image_path: string | null;
  type: string;
  description: string | null;
  created_at: string;
};

const CreateRefSchema = z.object({
  name: z.string().trim().min(1).max(120),
  image_path: z.string().min(1).max(500),
  type: z.string().trim().max(40).default("reference"),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const createVisualReference = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => CreateRefSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; ref: VisualReference } | { ok: false; message: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    assertOwnedPath(data.image_path, owner);
    const signedUrl = (await sign(data.image_path)) ?? "";
    const { data: row, error } = await supabaseAdmin
      .from("visual_references")
      .insert({
        user_id: owner,
        name: data.name,
        image_path: data.image_path,
        image_url: signedUrl,
        type: data.type,
        description: data.description ?? null,
      })
      .select("id, name, image_url, image_path, type, description, created_at")
      .single();
    if (error || !row) return { ok: false, message: error?.message ?? "Error" };
    return { ok: true, ref: { ...row, image_url: await sign(row.image_path) } as VisualReference };
  });

export const listVisualReferences = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<VisualReference[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data, error } = await supabaseAdmin
      .from("visual_references")
      .select("id, name, image_url, image_path, type, description, created_at")
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const signed = await Promise.all(
      rows.map(async (r) => ({ ...r, image_url: (await sign(r.image_path)) ?? r.image_url })),
    );
    return signed as VisualReference[];
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const deleteVisualReference = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: row } = await supabaseAdmin
      .from("visual_references")
      .select("image_path")
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (row?.image_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([row.image_path]).catch(() => {});
    }
    const { error } = await supabaseAdmin
      .from("visual_references")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

// ------------------------ Virtual Characters ------------------------

export type VirtualCharacter = {
  id: string;
  name: string;
  description: string | null;
  reference_image_url: string | null;
  reference_image_path: string | null;
  master_prompt: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

const CharacterPayload = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  reference_image_path: z.string().max(500).optional().nullable(),
  master_prompt: z.string().max(20_000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const createVirtualCharacter = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => CharacterPayload.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    assertOwnedPath(data.reference_image_path, owner);
    const signedUrl = data.reference_image_path ? await sign(data.reference_image_path) : null;
    const { data: row, error } = await supabaseAdmin
      .from("virtual_characters")
      .insert({
        user_id: owner,
        name: data.name,
        description: data.description ?? null,
        reference_image_path: data.reference_image_path ?? null,
        reference_image_url: signedUrl ?? null,
        master_prompt: data.master_prompt,
        tags: data.tags,
      })
      .select("*")
      .single();
    if (error || !row) return { ok: false as const, message: error?.message ?? "Error" };
    return { ok: true as const, character: { ...row, reference_image_url: signedUrl } as VirtualCharacter };
  });

const UpdateCharacterSchema = CharacterPayload.extend({ id: z.string().uuid() });

export const updateVirtualCharacter = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => UpdateCharacterSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    assertOwnedPath(data.reference_image_path, owner);
    const signedUrl = data.reference_image_path ? await sign(data.reference_image_path) : null;
    const { error } = await supabaseAdmin
      .from("virtual_characters")
      .update({
        name: data.name,
        description: data.description ?? null,
        reference_image_path: data.reference_image_path ?? null,
        reference_image_url: signedUrl ?? null,
        master_prompt: data.master_prompt,
        tags: data.tags,
      })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const listVirtualCharacters = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<VirtualCharacter[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data, error } = await supabaseAdmin
      .from("virtual_characters")
      .select("*")
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const signed = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        reference_image_url: r.reference_image_path
          ? ((await sign(r.reference_image_path)) ?? r.reference_image_url)
          : r.reference_image_url,
      })),
    );
    return signed as VirtualCharacter[];
  });

export const deleteVirtualCharacter = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { error } = await supabaseAdmin
      .from("virtual_characters")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const duplicateVirtualCharacter = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { data: src, error: readError } = await supabaseAdmin
      .from("virtual_characters")
      .select("name, description, reference_image_url, reference_image_path, master_prompt, tags")
      .eq("id", data.id)
      .eq("user_id", owner)
      .single();
    if (readError || !src) return { ok: false as const, message: readError?.message ?? "No encontrado" };
    const { data: inserted, error } = await supabaseAdmin
      .from("virtual_characters")
      .insert({ ...src, user_id: owner, name: `${src.name} (copia)` })
      .select("id")
      .single();
    if (error || !inserted) return { ok: false as const, message: error?.message ?? "No se pudo duplicar" };
    return { ok: true as const, id: inserted.id };
  });