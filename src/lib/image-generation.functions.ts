import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

const ProviderEnum = z.enum(["gemini", "openai"]);
const UpscaleEnum = z.enum(["none", "2k", "4k", "8k", "12k"]);
const FinalResEnum = z.enum(["1024", "2048", "3840", "7680", "12288"]);

const InputSchema = z.object({
  prompt: z.string().trim().min(1, "Describe la imagen.").max(2000),
  provider: ProviderEnum.default("gemini"),
  resolution: z.enum(["1024x1024", "1792x1024", "1024x1792", "1536x1024", "1024x1536"]).default("1024x1024"),
  finalResolution: FinalResEnum.default("1024"),
  upscaleLevel: UpscaleEnum.default("none"),
  characterId: z.string().uuid().optional().nullable(),
  characterName: z.string().trim().max(120).optional().nullable(),
  characterPromptInjection: z.string().trim().max(20_000).optional().nullable(),
  promptId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

export type GenerateImageInput = z.input<typeof InputSchema>;

export type GenerateImageResult =
  | {
      ok: true;
      id: string;
      provider: "gemini" | "openai";
      model: string;
      resolution: string;
      generated_resolution: string;
      final_resolution: string;
      upscale_level: "none" | "2k" | "4k" | "8k" | "12k";
      image_base64: string;
      mime_type: string;
      prompt: string;
    }
  | {
      ok: false;
      error:
        | "not_configured"
        | "rate_limited"
        | "quota"
        | "invalid_key"
        | "provider_error"
        | "invalid_param"
        | "content_policy"
        | "model_unavailable"
        | "parse_error"
        | "db_error";
      message: string;
      details?: {
        status?: number;
        type?: string;
        code?: string;
        request_id?: string;
        hint?: string;
      };
    };

type ProviderResolved =
  | { kind: "gemini"; apiKey: string; model: string }
  | { kind: "openai"; apiKey: string; model: string };

function resolveProvider(requested: "gemini" | "openai"): ProviderResolved | null {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (requested === "gemini") {
    if (lovableKey) {
      return { kind: "gemini", apiKey: lovableKey, model: "google/gemini-2.5-flash-image" };
    }
    return null;
  }
  // openai
  if (lovableKey) {
    return { kind: "openai", apiKey: lovableKey, model: "openai/gpt-image-2" };
  }
  if (process.env.ENABLE_OPENAI_DIRECT_FALLBACK !== "true") {
    return null;
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return { kind: "openai", apiKey: openaiKey, model: "gpt-image-1" };
  }
  return null;
}

export const generateImage = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GenerateImageResult> => {
    const provider = resolveProvider(data.provider);
    if (!provider) {
      return {
        ok: false,
        error: "not_configured",
        message:
          data.provider === "gemini"
            ? "Proveedor no configurado: falta LOVABLE_API_KEY para Gemini Imagen."
            : "Proveedor no configurado: falta LOVABLE_API_KEY. OpenAI directo solo se usa si habilitas ENABLE_OPENAI_DIRECT_FALLBACK=true.",
      };
    }

    const useLovableGateway = provider.apiKey === process.env.LOVABLE_API_KEY;
    const url = useLovableGateway
      ? "https://ai.gateway.lovable.dev/v1/images/generations"
      : "https://api.openai.com/v1/images/generations";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useLovableGateway) {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const effectivePrompt = data.characterPromptInjection
      ? `${data.prompt}\n\n[Identidad visual a mantener — ${data.characterName ?? "personaje"}]:\n${data.characterPromptInjection}`
      : data.prompt;

    // ---- Pre-call validation tailored to each provider ----
    const MAX_PROMPT = 3800; // safety cap below provider limits
    if (effectivePrompt.length > MAX_PROMPT) {
      return {
        ok: false,
        error: "invalid_param",
        message: `El prompt final tiene ${effectivePrompt.length} caracteres (máx. ${MAX_PROMPT}). Acórtalo o reduce los detalles del personaje.`,
        details: { code: "prompt_too_long" },
      };
    }
    const OPENAI_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);
    const GEMINI_SIZES = new Set(["1024x1024", "1792x1024", "1024x1792"]);
    let effectiveResolution = data.resolution;
    if (provider.kind === "openai" && !OPENAI_SIZES.has(effectiveResolution)) {
      return {
        ok: false,
        error: "invalid_param",
        message: `OpenAI no soporta la resolución ${effectiveResolution}. Usa 1024×1024, 1536×1024 o 1024×1536.`,
        details: { code: "invalid_size", hint: "Cambia la resolución o usa Gemini." },
      };
    }
    if (provider.kind === "gemini" && !GEMINI_SIZES.has(effectiveResolution)) {
      // Gemini ignores size anyway; coerce to square.
      effectiveResolution = "1024x1024";
    }

    let body: Record<string, unknown>;
    if (provider.kind === "gemini") {
      // Lovable Gateway requires chat-completions image shape for Gemini image models.
      body = {
        model: provider.model,
        messages: [{ role: "user", content: effectivePrompt }],
        modalities: ["image", "text"],
      };
    } else {
      body = {
        model: provider.model,
        prompt: effectivePrompt,
        size: effectiveResolution,
        n: 1,
        quality: "low",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(body),
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error("generateImage request failed:", err);
      return {
        ok: false,
        error: "provider_error",
        message: "No se pudo contactar con el proveedor. Intenta de nuevo.",
      };
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const requestId =
        response.headers.get("x-request-id") ??
        response.headers.get("x-lovable-aig-run-id") ??
        undefined;
      let parsed: { error?: { type?: string; code?: string; message?: string; param?: string }; message?: string } = {};
      try { parsed = JSON.parse(text); } catch { /* keep text */ }
      const errType = parsed.error?.type;
      const errCode = parsed.error?.code;
      const errMsg = parsed.error?.message ?? parsed.message ?? text.slice(0, 300);
      // Safe log — never include API key.
      console.error("[image-gen] provider error", {
        provider: data.provider,
        status: response.status,
        type: errType,
        code: errCode,
        message: errMsg?.slice(0, 400),
        request_id: requestId,
        body_size: effectivePrompt.length,
        size: effectiveResolution,
      });
      const details = { status: response.status, type: errType, code: errCode, request_id: requestId };
      if (response.status === 401) return { ok: false, error: "invalid_key", message: "API key inválida o no autorizada.", details };
      if (response.status === 429) return { ok: false, error: "rate_limited", message: "Has superado el límite de peticiones. Espera unos segundos y reintenta.", details };
      if (response.status === 402) return { ok: false, error: "quota", message: "Sin crédito disponible en el proveedor. Recarga saldo y reintenta.", details };
      if (response.status === 400) {
        const lower = `${errType ?? ""} ${errCode ?? ""} ${errMsg ?? ""}`.toLowerCase();
        if (lower.includes("content_policy") || lower.includes("moderation") || lower.includes("safety")) {
          return {
            ok: false,
            error: "content_policy",
            message: "El prompt fue rechazado por las políticas de contenido del proveedor. Reformúlalo evitando marcas, personajes con IP o contenido sensible.",
            details: { ...details, hint: "Prueba con descripciones genéricas o cambia a Gemini." },
          };
        }
        if (lower.includes("model") && (lower.includes("not") || lower.includes("unavailable") || lower.includes("does not exist"))) {
          return { ok: false, error: "model_unavailable", message: `Modelo no disponible para este proveedor (${provider.model}).`, details };
        }
        return {
          ok: false,
          error: "invalid_param",
          message: `Parámetro inválido para ${data.provider}: ${errMsg || "revisa modelo, resolución y prompt."}`,
          details: { ...details, hint: "Verifica resolución compatible y largo del prompt." },
        };
      }
      return {
        ok: false,
        error: "provider_error",
        message: `El proveedor respondió con código ${response.status}${errMsg ? `: ${errMsg.slice(0, 160)}` : "."}`,
        details,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: "parse_error", message: "Respuesta inválida del proveedor." };
    }

    const b64 = (payload as { data?: { b64_json?: string; url?: string }[] })?.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, error: "parse_error", message: "El proveedor no devolvió la imagen en base64." };
    }
    const mime = "image/png";

    // Compute final resolution metadata. The provider returns the generated
    // size as requested (data.resolution). Upscaling, if any, is applied
    // client-side; we only record the chosen targets here.
    const generatedResolution = effectiveResolution;
    const [genW, genH] = generatedResolution.split("x").map((n) => parseInt(n, 10));
    const aspect = genW / genH;
    const finalLong = parseInt(data.finalResolution, 10);
    // Pick final size: scale longest side to finalLong, keep aspect.
    let finalW: number;
    let finalH: number;
    if (genW >= genH) {
      finalW = Math.max(genW, finalLong);
      finalH = Math.round(finalW / aspect);
    } else {
      finalH = Math.max(genH, finalLong);
      finalW = Math.round(finalH * aspect);
    }
    // Upscale level can further override final size.
    const upscaleMap: Record<string, number> = { none: 0, "2k": 2048, "4k": 3840, "8k": 7680, "12k": 12288 };
    const upscaleLong = upscaleMap[data.upscaleLevel] ?? 0;
    if (upscaleLong > Math.max(finalW, finalH)) {
      if (genW >= genH) {
        finalW = upscaleLong;
        finalH = Math.round(finalW / aspect);
      } else {
        finalH = upscaleLong;
        finalW = Math.round(finalH * aspect);
      }
    }
    const finalResolution = `${finalW}x${finalH}`;

    // Persistir en historial
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("image_generations")
      .insert({
        user_id: owner,
        prompt: effectivePrompt,
        provider: data.provider,
        model: provider.model,
        resolution: data.resolution,
        image_base64: b64,
        generated_resolution: generatedResolution,
        final_resolution: finalResolution,
        upscale_level: data.upscaleLevel,
        character_id: data.characterId ?? null,
        character_name: data.characterName ?? null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("image_generations insert error:", insertError);
      // No bloqueamos el resultado al usuario aunque falle el guardado.
    }

    // Vincular automáticamente con un proyecto de creación.
    if (inserted?.id) {
      try {
        const owner2 = resolveOwnerId();
        let projectId = data.projectId ?? null;
        if (!projectId && (data.promptId || data.characterId)) {
          // Reutiliza o crea proyecto para el par (prompt, personaje).
          let q = supabaseAdmin
            .from("creation_projects")
            .select("id, cover_image_id")
            .eq("user_id", owner2)
            .order("created_at", { ascending: false })
            .limit(1);
          if (data.promptId) q = q.eq("prompt_id", data.promptId);
          else q = q.is("prompt_id", null);
          if (data.characterId) q = q.eq("character_id", data.characterId);
          else q = q.is("character_id", null);
          const { data: existing } = await q.maybeSingle();
          if (existing) {
            projectId = existing.id;
          } else {
            const { data: newProj } = await supabaseAdmin
              .from("creation_projects")
              .insert({
                user_id: owner2,
                title: data.characterName
                  ? `${data.characterName} — ${effectivePrompt.slice(0, 40)}`
                  : effectivePrompt.slice(0, 60),
                prompt_id: data.promptId ?? null,
                character_id: data.characterId ?? null,
              })
              .select("id")
              .single();
            projectId = newProj?.id ?? null;
          }
        }
        if (projectId) {
          await supabaseAdmin
            .from("creation_project_assets")
            .upsert(
              { project_id: projectId, kind: "image", ref_id: inserted.id },
              { onConflict: "project_id,kind,ref_id" },
            );
          await supabaseAdmin
            .from("creation_projects")
            .update({ cover_image_id: inserted.id, status: "image_ready" })
            .eq("id", projectId)
            .eq("user_id", owner2);
        }
      } catch (e) {
        console.warn("creation_project link failed:", e);
      }
    }

    return {
      ok: true,
      id: inserted?.id ?? "",
      provider: data.provider,
      model: provider.model,
      resolution: data.resolution,
      generated_resolution: generatedResolution,
      final_resolution: finalResolution,
      upscale_level: data.upscaleLevel,
      image_base64: b64,
      mime_type: mime,
      prompt: effectivePrompt,
    };
  });

export const listImageGenerations = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data, error } = await supabaseAdmin
      .from("image_generations")
      .select("id, prompt, provider, model, resolution, image_base64, created_at, generated_resolution, final_resolution, upscale_level, character_id, character_name, is_favorite")
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listImageGenerations error:", error);
      return { ok: false as const, items: [] };
    }
    return { ok: true as const, items: data ?? [] };
  });

// ------------------------ Delete / Cleanup ------------------------

const VISUAL_BUCKET = "visual-references";

/**
 * Best-effort storage cleanup. Currently image_generations stores image_base64
 * in the DB row, so there is usually no orphan file. If a row references an
 * image_url that points to an owned storage path inside the visual-references
 * bucket, we remove it as well.
 */
async function bestEffortRemoveStorage(rows: Array<{ image_url: string | null }>, owner: string) {
  const paths = rows
    .map((r) => r.image_url ?? "")
    .map((u) => {
      if (!u) return "";
      // Accept either a raw path or a storage URL containing the bucket.
      const m = u.match(new RegExp(`${VISUAL_BUCKET}/(.+?)(?:\\?|$)`));
      const p = m?.[1] ?? (u.startsWith(`${owner}/`) ? u : "");
      return p;
    })
    .filter((p) => p && p.startsWith(`${owner}/`));
  if (paths.length === 0) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(VISUAL_BUCKET).remove(paths);
  } catch (e) {
    console.warn("bestEffortRemoveStorage failed", e);
  }
}

const IdSchema = z.object({ id: z.string().uuid() });
const IdsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

const FavoriteSchema = z.object({ id: z.string().uuid(), is_favorite: z.boolean() });

export const toggleImageFavorite = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => FavoriteSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("image_generations")
      .update({ is_favorite: data.is_favorite })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const deleteImageGeneration = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: row } = await supabaseAdmin
      .from("image_generations")
      .select("image_url")
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (row) await bestEffortRemoveStorage([row], owner);
    const { error } = await supabaseAdmin
      .from("image_generations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const deleteImageGenerations = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdsSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: rows } = await supabaseAdmin
      .from("image_generations")
      .select("image_url")
      .in("id", data.ids)
      .eq("user_id", owner);
    if (rows && rows.length) await bestEffortRemoveStorage(rows, owner);
    const { error } = await supabaseAdmin
      .from("image_generations")
      .delete()
      .in("id", data.ids)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, count: rows?.length ?? 0 };
  });

export const clearImageGenerations = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: rows } = await supabaseAdmin
      .from("image_generations")
      .select("image_url")
      .eq("user_id", owner);
    if (rows && rows.length) await bestEffortRemoveStorage(rows, owner);
    const { error } = await supabaseAdmin
      .from("image_generations")
      .delete()
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, count: rows?.length ?? 0 };
  });

/**
 * Sube la imagen base64 de una generación al bucket `visual-references`
 * (scope=character) y devuelve el path. Útil para convertir una imagen del
 * historial en personaje permanente sin volver a generar.
 */
export const promoteGenerationToReference = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: row, error } = await supabaseAdmin
      .from("image_generations")
      .select("image_base64, prompt")
      .eq("id", data.id)
      .eq("user_id", owner)
      .maybeSingle();
    if (error || !row?.image_base64) {
      return { ok: false as const, message: error?.message ?? "Imagen no encontrada" };
    }
    const path = `${owner}/character/${crypto.randomUUID()}.png`;
    const bytes = Buffer.from(row.image_base64, "base64");
    const up = await supabaseAdmin.storage
      .from(VISUAL_BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (up.error) return { ok: false as const, message: up.error.message };
    const signed = await supabaseAdmin.storage
      .from(VISUAL_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    return {
      ok: true as const,
      path,
      url: signed.data?.signedUrl ?? null,
      prompt: row.prompt,
    };
  });
