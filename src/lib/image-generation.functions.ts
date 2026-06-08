import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

const ProviderEnum = z.enum(["gemini", "openai"]);

const InputSchema = z.object({
  prompt: z.string().trim().min(1, "Describe la imagen.").max(2000),
  provider: ProviderEnum.default("gemini"),
  resolution: z.enum(["1024x1024", "1792x1024", "1024x1792"]).default("1024x1024"),
});

export type GenerateImageInput = z.input<typeof InputSchema>;

export type GenerateImageResult =
  | {
      ok: true;
      id: string;
      provider: "gemini" | "openai";
      model: string;
      resolution: string;
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
        | "parse_error"
        | "db_error";
      message: string;
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
            : "Proveedor no configurado: falta LOVABLE_API_KEY u OPENAI_API_KEY.",
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

    const body: Record<string, unknown> = {
      model: provider.model,
      prompt: data.prompt,
      size: data.resolution,
      n: 1,
    };
    if (provider.kind === "openai") {
      body.quality = "low";
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
      console.error("Image provider error:", response.status, text.slice(0, 500));
      if (response.status === 401) return { ok: false, error: "invalid_key", message: "API key inválida." };
      if (response.status === 429) return { ok: false, error: "rate_limited", message: "Límite de peticiones superado. Espera unos segundos." };
      if (response.status === 402) return { ok: false, error: "quota", message: "Sin crédito disponible en el proveedor." };
      return { ok: false, error: "provider_error", message: `El proveedor respondió con código ${response.status}.` };
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

    // Persistir en historial
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("image_generations")
      .insert({
        user_id: owner,
        prompt: data.prompt,
        provider: data.provider,
        model: provider.model,
        resolution: data.resolution,
        image_base64: b64,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("image_generations insert error:", insertError);
      // No bloqueamos el resultado al usuario aunque falle el guardado.
    }

    return {
      ok: true,
      id: inserted?.id ?? "",
      provider: data.provider,
      model: provider.model,
      resolution: data.resolution,
      image_base64: b64,
      mime_type: mime,
      prompt: data.prompt,
    };
  });

export const listImageGenerations = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data, error } = await supabaseAdmin
      .from("image_generations")
      .select("id, prompt, provider, model, resolution, image_base64, created_at")
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) {
      console.error("listImageGenerations error:", error);
      return { ok: false as const, items: [] };
    }
    return { ok: true as const, items: data ?? [] };
  });