import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

const InputSchema = z.object({
  idea: z.string().trim().min(1, "Describe tu idea o concepto base.").max(800),
  tipo: z.string().trim().min(1).max(60).default("cinematic"),
  idioma: z.string().trim().min(1).max(20).default("es"),
  duracion: z.string().trim().min(1).max(20).default("8"),
  plataforma: z.string().trim().min(1).max(40).default("youtube"),
});

export type GeneratePromptInput = z.input<typeof InputSchema>;

export type GeneratePromptVariants = {
  original_prompt: string;
  flow_prompt: string;
  youtube_prompt: string;
  veo_prompt: string;
  kling_prompt: string;
};

export type GeneratePromptResult =
  | ({ ok: true } & GeneratePromptVariants)
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

const SYSTEM_PROMPT = `Eres un experto en prompts para generación de video con IA.
Devuelve SIEMPRE un único objeto JSON con esta forma exacta y nada más:
{
  "original_prompt": string,
  "flow_prompt": string,
  "youtube_prompt": string,
  "veo_prompt": string,
  "kling_prompt": string
}
Reglas obligatorias:
- Cada campo DEBE ser distinto, escrito desde cero y optimizado para su plataforma. Nunca repitas el mismo texto en dos campos.
- "original_prompt": prompt base limpio y descriptivo, listo para reutilizar.
- "flow_prompt": estructurado para Flow. Incluye escena, sujeto, acción, cámara, iluminación y atmósfera en bloques cortos.
- "youtube_prompt": pensado para YouTube Creator. Empieza con un hook, describe la idea visual y termina con un CTA.
- "veo_prompt": optimizado para Google Veo. Énfasis en plano cinematográfico, lente, movimiento de cámara, iluminación y ritmo.
- "kling_prompt": optimizado para Kling. Énfasis en movimiento, transición, estilo visual y duración.
- Sin markdown, sin comentarios, sin texto fuera del JSON.`;

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

export const hasGeneratorConfigured = createServerFn({ method: "GET" }).handler(
  async () => ({ configured: Boolean(resolveProvider()) }),
);

export const generatePrompt = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratePromptResult> => {
    const provider = resolveProvider();
    if (!provider) {
      return {
        ok: false,
        error: "not_configured",
        message:
          "La generación IA no está configurada. Añade LOVABLE_API_KEY u OPENAI_API_KEY en Integraciones.",
      };
    }

    const userPrompt = [
      `Idea / prompt base del usuario: ${data.idea}`,
      `Tipo de prompt: ${data.tipo}`,
      `Idioma de salida: ${data.idioma}`,
      `Duración objetivo: ${data.duracion} segundos`,
      `Plataforma objetivo principal: ${data.plataforma}`,
      "",
      "Genera las 5 variantes en JSON estricto, cada una claramente diferenciada.",
    ].join("\n");

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
      console.error("generatePrompt request failed:", err);
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
      if (response.status === 401) {
        return { ok: false, error: "invalid_key", message: "La API key configurada no es válida." };
      }
      if (response.status === 429) {
        return {
          ok: false,
          error: "rate_limited",
          message: "Has superado el límite de peticiones. Espera unos segundos e inténtalo de nuevo.",
        };
      }
      if (response.status === 402) {
        return {
          ok: false,
          error: "quota",
          message: "Sin crédito disponible en el proveedor de IA. Revisa tu plan o créditos.",
        };
      }
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
      original_prompt: z.string().min(1),
      flow_prompt: z.string().min(1),
      youtube_prompt: z.string().min(1),
      veo_prompt: z.string().min(1),
      kling_prompt: z.string().min(1),
    });

    const result = ResultSchema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error: "parse_error",
        message: "El formato de la respuesta no coincide con el esperado.",
      };
    }

    const v = result.data;
    const values = [v.original_prompt, v.flow_prompt, v.youtube_prompt, v.veo_prompt, v.kling_prompt];
    const unique = new Set(values.map((s) => s.trim()));
    if (unique.size < values.length) {
      return {
        ok: false,
        error: "parse_error",
        message: "La IA devolvió variantes duplicadas. Vuelve a intentarlo.",
      };
    }

    return { ok: true, ...v };
  });