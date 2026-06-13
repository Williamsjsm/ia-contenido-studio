import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function ownerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

const BUCKET = "visual-references";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 días
const SIGN_CACHE_TTL_MS = 60 * 60 * 24 * 6 * 1000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
let uploadPrepBackoffUntil = 0;
const STORAGE_BUSY_BACKOFF_MS = 60_000;

function isStorageBusy(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /too many connections|database|connection|timeout|timed out/i.test(message);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label}: timeout`)), ms);
  });
  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

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
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (cached) signedUrlCache.delete(path);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL),
      5_000,
      "createSignedUrl",
    );
    if (error || !data?.signedUrl) return null;
    signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGN_CACHE_TTL_MS });
    return data.signedUrl;
  } catch (error) {
    console.warn("sign visual image failed:", error);
    return null;
  }
}

// ------------------------ Upload ------------------------

const UploadSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]),
  // base64 (sin prefijo data:)
  base64: z.string().min(1).max(15_000_000),
  scope: z.enum(["reference", "character"]).default("reference"),
});

const UploadTargetSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]),
  scope: z.enum(["reference", "character"]).default("reference"),
});

export const createVisualUploadTarget = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => UploadTargetSchema.parse(input))
  .handler(async ({ data }) => {
    if (uploadPrepBackoffUntil > Date.now()) {
      return {
        ok: false as const,
        message: "El backend está saturado preparando subidas. Usando ruta alternativa.",
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const ext = (data.filename.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${owner}/${data.scope}/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await withTimeout(
      supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false }),
      4_000,
      "createSignedUploadUrl",
    ).catch((error) => ({ data: null, error: error as Error }));
    if (error || !signed?.token) {
      console.error("createVisualUploadTarget failed:", error);
      if (isStorageBusy(error)) {
        uploadPrepBackoffUntil = Date.now() + STORAGE_BUSY_BACKOFF_MS;
        return {
          ok: false as const,
          message: "El backend está saturado preparando subidas. Espera unos segundos y reintenta; la vista previa no se pierde.",
        };
      }
      return { ok: false as const, message: error?.message ?? "No se pudo preparar la subida" };
    }
    return { ok: true as const, path, token: signed.token, bucket: BUCKET, contentType: data.contentType };
  });

export const signVisualImage = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => z.object({ image_path: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data }) => {
    const owner = ownerId();
    assertOwnedPath(data.image_path, owner);
    return { ok: true as const, url: await sign(data.image_path) };
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
    const { error } = await withTimeout(
      supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: data.contentType, upsert: false }),
      12_000,
      "uploadVisualImage",
    ).catch((error) => ({ data: null, error: error as Error }));
    if (error) {
      console.error("uploadVisualImage failed:", error);
      return { ok: false as const, message: error.message };
    }
    const url = await sign(path);
    return { ok: true as const, path, url };
  });

export const uploadVisualImageForm = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("FormData inválido");
    return input;
  })
  .handler(async ({ data }) => {
    const file = data.get("file");
    const scopeRaw = data.get("scope");
    if (uploadPrepBackoffUntil > Date.now()) {
      return { ok: false as const, message: "El backend está saturado. La vista previa local no se pierde." };
    }
    if (!(file instanceof File)) return { ok: false as const, message: "Archivo inválido" };
    const parsed = UploadTargetSchema.parse({
      filename: file.name || "reference.png",
      contentType: file.type || "image/png",
      scope: scopeRaw === "reference" || scopeRaw === "character" ? scopeRaw : "reference",
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const ext = (parsed.filename.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${owner}/${parsed.scope}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await withTimeout(
      supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: parsed.contentType, upsert: false }),
      10_000,
      "uploadVisualImageForm",
    ).catch((error) => ({ data: null, error: error as Error }));
    if (error) {
      console.error("uploadVisualImageForm failed:", error);
      if (isStorageBusy(error)) uploadPrepBackoffUntil = Date.now() + STORAGE_BUSY_BACKOFF_MS;
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const, path, url: await sign(path) };
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
    return (data ?? []) as VisualReference[];
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
  secondary_reference_paths: z.array(z.string().min(1).max(500)).max(10).optional().default([]),
});

export const createVirtualCharacter = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => CharacterPayload.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    assertOwnedPath(data.reference_image_path, owner);
    for (const p of data.secondary_reference_paths ?? []) assertOwnedPath(p, owner);
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

    // Insertar referencias adicionales (galería del personaje).
    const refRows: Array<{
      character_id: string;
      storage_path: string;
      is_primary: boolean;
      sort_order: number;
    }> = [];
    if (data.reference_image_path) {
      refRows.push({
        character_id: row.id,
        storage_path: data.reference_image_path,
        is_primary: true,
        sort_order: 0,
      });
    }
    (data.secondary_reference_paths ?? []).forEach((p, idx) => {
      refRows.push({
        character_id: row.id,
        storage_path: p,
        is_primary: false,
        sort_order: idx + 1,
      });
    });
    if (refRows.length > 0) {
      const { error: refErr } = await supabaseAdmin
        .from("character_reference_images")
        .insert(refRows);
      if (refErr) console.warn("character_reference_images insert failed:", refErr);
    }

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
    return (data ?? []) as VirtualCharacter[];
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

// ------------------------ Analyze Image -> Character ------------------------

export type CharacterReferenceImage = {
  id: string;
  character_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  url: string | null;
};

export const listCharacterReferenceImages = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z.object({ character_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<CharacterReferenceImage[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    // Ownership: el personaje debe pertenecer al owner.
    const { data: charRow } = await supabaseAdmin
      .from("virtual_characters")
      .select("id")
      .eq("id", data.character_id)
      .eq("user_id", owner)
      .maybeSingle();
    if (!charRow) return [];
    const { data: rows } = await supabaseAdmin
      .from("character_reference_images")
      .select("id, character_id, storage_path, is_primary, sort_order")
      .eq("character_id", data.character_id)
      .order("sort_order", { ascending: true });
    if (!rows) return [];
    const signed = await mapLimit(rows, 4, async (r) => ({
      ...r,
      url: await sign(r.storage_path),
    }));
    return signed as CharacterReferenceImage[];
  });

const AnalyzeSchema = z.object({
  image_path: z.string().min(1).max(500),
});

const AnalyzeDataSchema = z.object({
  contentType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]),
  base64: z.string().min(1).max(25_000_000),
});

export type AnalyzeCharacterResult =
  | {
      ok: true;
      name: string;
      description: string;
      master_prompt: string;
      tags: string[];
      attributes: Record<string, string>;
    }
  | { ok: false; message: string };

async function analyzeCharacterDataUrl(dataUrl: string): Promise<AnalyzeCharacterResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, message: "LOVABLE_API_KEY no configurado" };

  const system = `Eres un analista visual experto. Examina la imagen de una persona o personaje y devuelve SOLO un JSON válido (sin texto adicional, sin markdown) con esta forma exacta:
{
  "name": "nombre sugerido (max 40 caracteres, en español)",
  "description": "1-2 frases descriptivas en español",
  "master_prompt": "prompt maestro detallado en inglés para reutilizar la identidad visual: rasgos físicos, ropa, accesorios, iluminación y estilo fotográfico",
  "tags": ["3-8 tags cortos en español"],
  "attributes": {
    "hair_color": "...",
    "hair_length": "...",
    "eye_color": "...",
    "skin_tone": "...",
    "approx_age": "...",
    "build": "...",
    "clothing_style": "...",
    "accessories": "...",
    "photo_style": "..."
  }
}`;

  let resp: Response;
  try {
    resp = await withTimeout(
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                { type: "text", text: "Analiza esta imagen y devuelve el JSON descrito." },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      }),
      18_000,
      "analyzeCharacterDataUrl",
    );
  } catch (e) {
    console.error("analyzeCharacterDataUrl fetch error", e);
    return { ok: false, message: "No se pudo contactar al servicio de IA" };
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    if (resp.status === 429) return { ok: false, message: "Límite de uso alcanzado. Inténtalo más tarde." };
    if (resp.status === 402) return { ok: false, message: "Créditos de IA agotados. Añade créditos en Lovable AI." };
    return { ok: false, message: `Gateway ${resp.status}: ${txt.slice(0, 200)}` };
  }

  const j = (await resp.json().catch(() => null)) as { choices?: Array<{ message?: { content?: string } }> } | null;
  const content = j?.choices?.[0]?.message?.content;
  if (!content) return { ok: false, message: "Respuesta vacía de la IA" };

  let parsed: {
    name?: unknown;
    description?: unknown;
    master_prompt?: unknown;
    tags?: unknown;
    attributes?: unknown;
  };
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : (content as never);
  } catch {
    return { ok: false, message: "La IA no devolvió JSON válido" };
  }

  const toStr = (v: unknown, max: number) => (typeof v === "string" ? v : "").slice(0, max);
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter(Boolean)
        .slice(0, 20)
        .map((t) => t.slice(0, 40))
    : [];
  const attrsRaw =
    parsed.attributes && typeof parsed.attributes === "object"
      ? (parsed.attributes as Record<string, unknown>)
      : {};
  const attributes: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrsRaw)) {
    if (typeof v === "string") attributes[k] = v.slice(0, 200);
  }

  return {
    ok: true,
    name: toStr(parsed.name, 120),
    description: toStr(parsed.description, 2000),
    master_prompt: toStr(parsed.master_prompt, 20_000),
    tags,
    attributes,
  };
}

export const analyzeCharacterFromImageData = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => AnalyzeDataSchema.parse(input))
  .handler(async ({ data }): Promise<AnalyzeCharacterResult> => {
    return analyzeCharacterDataUrl(`data:${data.contentType};base64,${data.base64}`);
  });

export const analyzeCharacterFromImage = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => AnalyzeSchema.parse(input))
  .handler(async ({ data }): Promise<AnalyzeCharacterResult> => {
    const owner = ownerId();
    assertOwnedPath(data.image_path, owner);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(data.image_path);
    if (dlErr || !blob) {
      return { ok: false, message: dlErr?.message ?? "No se pudo leer la imagen" };
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    const mime = blob.type || "image/png";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    return analyzeCharacterDataUrl(dataUrl);
  });