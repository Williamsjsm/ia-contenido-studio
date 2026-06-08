import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * TODO(auth): modo single-owner temporal con supabaseAdmin + OWNER_USER_ID.
 * Cuando se active auth real, cambiar a requireSupabaseAuth + context.supabase
 * y eliminar el fallback.
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = 2_500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export const PUBLICATION_STATUSES = ["draft", "ready", "published"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_PLATFORMS = [
  "tiktok",
  "youtube_shorts",
  "facebook",
  "instagram_reels",
] as const;
export type PublicationPlatform = (typeof PUBLICATION_PLATFORMS)[number];

const StatusSchema = z.enum(PUBLICATION_STATUSES);

const SaveSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(300),
  description: z.string().trim().max(8_000).nullable().optional(),
  hashtags: z.string().trim().max(2_000).nullable().optional(),
  platform: z.string().trim().max(40).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  source_prompt_id: z.string().uuid().nullable().optional(),
  source_flow_job_id: z.string().uuid().nullable().optional(),
  status: StatusSchema.optional().default("draft"),
});

export type SavePublicationInput = z.input<typeof SaveSchema>;

export type PublicationProject = {
  id: string;
  title: string;
  description: string | null;
  hashtags: string | null;
  platform: string | null;
  category: string | null;
  source_prompt_id: string | null;
  source_flow_job_id: string | null;
  status: PublicationStatus;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id, title, description, hashtags, platform, category, source_prompt_id, source_flow_job_id, status, created_at, updated_at";

export const savePublicationProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: inserted, error } = await supabaseAdmin
      .from("publication_projects")
      .insert({
        user_id: owner,
        title: data.title,
        description: data.description ?? null,
        hashtags: data.hashtags ?? null,
        platform: data.platform ?? null,
        category: data.category ?? null,
        source_prompt_id: data.source_prompt_id ?? null,
        source_flow_job_id: data.source_flow_job_id ?? null,
        status: data.status ?? "draft",
      })
      .select(SELECT_COLS)
      .single();
    if (error || !inserted) {
      console.error("savePublicationProject failed:", error);
      return { ok: false as const, message: error?.message ?? "No se pudo guardar." };
    }
    return { ok: true as const, project: inserted as PublicationProject };
  });

export const listPublicationProjects = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<PublicationProject[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data, error } = await supabaseAdmin
      .from("publication_projects")
      .select(SELECT_COLS)
      .eq("user_id", owner)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listPublicationProjects failed:", error);
      throw new Error(error.message);
    }
    return (data ?? []) as PublicationProject[];
  });

const IdSchema = z.object({ id: z.string().uuid() });
const UpdateSchema = SaveSchema.partial().extend({ id: z.string().uuid() });

export const updatePublicationProject = createServerFn({ method: "POST" })
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
      .from("publication_projects")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", id)
      .eq("user_id", owner);
    if (error) {
      console.error("updatePublicationProject failed:", error);
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

export const deletePublicationProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("publication_projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) {
      console.error("deletePublicationProject failed:", error);
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });

export const duplicatePublicationProject = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: src, error: readError } = await supabaseAdmin
      .from("publication_projects")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .eq("user_id", owner)
      .single();
    if (readError || !src) {
      return { ok: false as const, message: readError?.message ?? "No encontrado" };
    }
    const { id: _omit, created_at: _c, updated_at: _u, ...rest } = src as PublicationProject;
    const { data: inserted, error } = await supabaseAdmin
      .from("publication_projects")
      .insert({ ...rest, user_id: owner, title: `${rest.title} (copia)`, status: "draft" })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false as const, message: error?.message ?? "No se pudo duplicar" };
    }
    return { ok: true as const, id: inserted.id };
  });

// ─────────────────────────────────────────────────────────────
// AI: generar paquete (título + descripción + hashtags) por plataforma
// ─────────────────────────────────────────────────────────────

type ProviderConfig =
  | { kind: "lovable"; apiKey: string; url: string; model: string }
  | { kind: "openai"; apiKey: string; url: string; model: string };

function resolveProvider(): ProviderConfig | null {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    return {
      kind: "lovable",
      apiKey: lovableKey,
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-2.5-flash",
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      kind: "openai",
      apiKey: openaiKey,
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    };
  }
  return null;
}

const PLATFORM_RULES: Record<string, string> = {
  tiktok:
    "Plataforma TikTok. Título corto y viral (máx ~60 chars). Descripción breve y conversacional (1-2 frases, máx 200 chars). 8-15 hashtags muy populares y nicho mezclados, separados por espacios y empezando con #.",
  youtube_shorts:
    "Plataforma YouTube Shorts. Título con hook fuerte y palabra clave (máx ~80 chars). Descripción 2-4 frases optimizada para SEO con palabra clave principal (máx 400 chars). 4-8 hashtags al final, separados por espacios.",
  facebook:
    "Plataforma Facebook. Título descriptivo (máx ~100 chars). Descripción 2-3 frases cercanas y emocionales, llamada a la conversación (máx 500 chars). 3-6 hashtags al final.",
  instagram_reels:
    "Plataforma Instagram Reels. Título corto y atractivo (máx ~70 chars). Descripción con storytelling breve, emojis sutiles, 2-3 frases (máx 300 chars). 10-20 hashtags mezclando nicho y trending, separados por espacios.",
};

const GenInputSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt requerido.").max(8_000),
  platform: z.enum(PUBLICATION_PLATFORMS),
  category: z.string().trim().max(80).nullable().optional(),
  baseTitle: z.string().trim().max(300).nullable().optional(),
  language: z.string().trim().max(20).default("es"),
});

export type GeneratePackageInput = z.input<typeof GenInputSchema>;

export type GeneratePackageResult =
  | { ok: true; title: string; description: string; hashtags: string }
  | {
      ok: false;
      error:
        | "not_configured"
        | "rate_limited"
        | "quota"
        | "invalid_key"
        | "provider_error"
        | "parse_error";
      message: string;
    };

const SYSTEM_PROMPT = `Eres un experto en marketing de contenido viral para redes sociales.
Devuelve SIEMPRE un único objeto JSON con esta forma exacta y nada más:
{
  "title": string,
  "description": string,
  "hashtags": string
}
Reglas:
- "title": título viral optimizado para la plataforma indicada.
- "description": descripción optimizada para la plataforma indicada.
- "hashtags": string con hashtags separados por espacios, cada uno empezando por #.
- Adapta longitud, tono y formato a las reglas de la plataforma.
- Sin markdown, sin comentarios, sin texto fuera del JSON.`;

export const generatePublicationPackage = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => GenInputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratePackageResult> => {
    const provider = resolveProvider();
    if (!provider) {
      return {
        ok: false,
        error: "not_configured",
        message:
          "La generación IA no está configurada. Añade LOVABLE_API_KEY u OPENAI_API_KEY en Integraciones.",
      };
    }

    const rules = PLATFORM_RULES[data.platform] ?? "";
    const userPrompt = [
      `Plataforma objetivo: ${data.platform}`,
      `Reglas de plataforma: ${rules}`,
      `Idioma de salida: ${data.language}`,
      data.category ? `Categoría: ${data.category}` : null,
      data.baseTitle ? `Título base sugerido: ${data.baseTitle}` : null,
      "",
      `Idea / prompt base del contenido:`,
      data.prompt,
      "",
      "Genera el paquete JSON estricto: title, description, hashtags.",
    ]
      .filter(Boolean)
      .join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (provider.kind === "lovable") {
        headers["Lovable-API-Key"] = provider.apiKey;
        headers["X-Lovable-AIG-SDK"] = "fetch";
      } else {
        headers["Authorization"] = `Bearer ${provider.apiKey}`;
      }

      response = await fetch(provider.url, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: provider.model,
          temperature: 0.85,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error("generatePublicationPackage request failed:", err);
      return {
        ok: false,
        error: "provider_error",
        message: "No se pudo contactar con el proveedor de IA. Intenta de nuevo en unos segundos.",
      };
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.error("AI provider error:", response.status, bodyText);
      if (response.status === 401)
        return { ok: false, error: "invalid_key", message: "La API key configurada no es válida." };
      if (response.status === 429)
        return {
          ok: false,
          error: "rate_limited",
          message: "Has superado el límite de peticiones. Espera unos segundos.",
        };
      if (response.status === 402)
        return {
          ok: false,
          error: "quota",
          message: "Sin crédito disponible en el proveedor de IA.",
        };
      return {
        ok: false,
        error: "provider_error",
        message: `El proveedor de IA respondió con código ${response.status}.`,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: "parse_error", message: "Respuesta inválida del proveedor de IA." };
    }

    const content = (payload as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
      ?.message?.content;
    if (!content) {
      return { ok: false, error: "parse_error", message: "Respuesta vacía del proveedor de IA." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: "parse_error", message: "La IA devolvió un JSON inválido." };
    }

    const ResultSchema = z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      hashtags: z.string().min(1),
    });
    const result = ResultSchema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error: "parse_error",
        message: "El formato de la respuesta no coincide con el esperado.",
      };
    }
    return { ok: true, ...result.data };
  });

// ─────────────────────────────────────────────────────────────
// Dashboard stats: publications
// ─────────────────────────────────────────────────────────────
export type PublicationStats = {
  total: number;
  ready: number;
  published: number;
  draft: number;
  byPlatform: { name: string; count: number }[];
};

export const getPublicationStats = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<PublicationStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from("publication_projects")
        .select("status, platform")
        .eq("user_id", owner)
        .limit(1000),
      "getPublicationStats",
    );
    if (error) {
      console.error("getPublicationStats failed:", error);
      throw new Error(error.message);
    }
    const rows = (data ?? []) as { status: string | null; platform: string | null }[];
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.platform) continue;
      counts.set(r.platform, (counts.get(r.platform) ?? 0) + 1);
    }
    return {
      total: rows.length,
      ready: rows.filter((r) => r.status === "ready").length,
      published: rows.filter((r) => r.status === "published").length,
      draft: rows.filter((r) => r.status === "draft" || !r.status).length,
      byPlatform: Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  });