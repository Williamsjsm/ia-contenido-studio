import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  categoria: z.string().trim().min(1).max(120),
  plataforma: z.string().trim().min(1).max(40),
  estilo: z.string().trim().min(1).max(40),
  idioma: z.string().trim().min(1).max(20),
  duracion: z.string().trim().min(1).max(20),
  descripcion: z.string().trim().max(800).optional().default(""),
});

export type GeneratePromptInput = z.infer<typeof InputSchema>;

export type GeneratePromptResult = {
  ok: true;
  base: string;
  variants: {
    flow: string;
    youtube: string;
    veo: string;
    kling: string;
  };
} | {
  ok: false;
  error: "missing_key" | "rate_limited" | "quota" | "invalid_key" | "provider_error" | "parse_error";
  message: string;
};

export const hasOpenAIKey = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: Boolean(process.env.OPENAI_API_KEY) };
});

const SYSTEM_PROMPT = `Eres un experto en creación de prompts para herramientas de generación de video con IA.
Devuelves SIEMPRE un objeto JSON con exactamente esta forma:
{
  "base": string,
  "variants": {
    "flow": string,
    "youtube": string,
    "veo": string,
    "kling": string
  }
}
- "base": prompt principal, descriptivo, listo para usar.
- "variants.flow": versión optimizada para Flow (estructura clara de escena, cámara y acción).
- "variants.youtube": versión optimizada para YouTube Creator (incluye hook, idea visual y CTA).
- "variants.veo": versión optimizada para Google Veo (énfasis en plano cinematográfico, lentes, iluminación, ritmo).
- "variants.kling": versión optimizada para Kling (movimiento, transición, estilo visual y duración).
Sin texto fuera del JSON. Sin markdown.`;

export const generatePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratePromptResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "missing_key", message: "OPENAI_API_KEY no está configurada." };
    }

    const userPrompt = [
      `Categoría: ${data.categoria}`,
      `Plataforma destino: ${data.plataforma}`,
      `Estilo visual: ${data.estilo}`,
      `Idioma: ${data.idioma}`,
      `Duración: ${data.duracion}`,
      data.descripcion ? `Notas del creador: ${data.descripcion}` : null,
    ].filter(Boolean).join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.8,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error("OpenAI request failed:", err);
      return { ok: false, error: "provider_error", message: "No se pudo contactar con OpenAI. Intenta de nuevo." };
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.error("OpenAI error:", response.status, bodyText);
      if (response.status === 401) {
        return { ok: false, error: "invalid_key", message: "La API key de OpenAI no es válida." };
      }
      if (response.status === 429) {
        return { ok: false, error: "rate_limited", message: "Has superado el límite de OpenAI. Espera unos segundos." };
      }
      if (response.status === 402) {
        return { ok: false, error: "quota", message: "Tu cuenta de OpenAI no tiene crédito disponible." };
      }
      return { ok: false, error: "provider_error", message: `OpenAI respondió con código ${response.status}.` };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: "parse_error", message: "Respuesta inválida de OpenAI." };
    }

    const content = (payload as { choices?: { message?: { content?: string } }[] })
      ?.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "parse_error", message: "Respuesta vacía de OpenAI." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: "parse_error", message: "OpenAI devolvió un JSON inválido." };
    }

    const ResultSchema = z.object({
      base: z.string().min(1),
      variants: z.object({
        flow: z.string().min(1),
        youtube: z.string().min(1),
        veo: z.string().min(1),
        kling: z.string().min(1),
      }),
    });

    const result = ResultSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: "parse_error", message: "El formato de la respuesta no coincide." };
    }

    return { ok: true, base: result.data.base, variants: result.data.variants };
  });