# Conectar OpenAI al Generador de Prompts

Integración aislada: solo afecta a `crear/prompts`. El resto de módulos sigue con datos simulados.

## Arquitectura segura

- **Secret** `OPENAI_API_KEY` añadido vía la herramienta de secretos (queda en el backend de Cloud, nunca en el bundle del cliente).
- **Server function** `generatePrompt` en `src/lib/openai.functions.ts` usando `createServerFn` (TanStack Start). El handler lee `process.env.OPENAI_API_KEY` y llama a `https://api.openai.com/v1/chat/completions` con `gpt-4o-mini`.
- Nada de fetch directo a OpenAI desde React. La key nunca sale del worker.
- Estructura preparada para añadir más providers: un solo módulo `openai.functions.ts` con helper interno reusable.

> Nota: se usará la API de OpenAI directa con la key del usuario, tal y como pide el brief. (Lovable AI Gateway también expone GPT-5 sin key del usuario, pero el requisito explícito es "API Key de OpenAI en Integraciones"; aviso por si más adelante quieres cambiar.)

## Contrato de `generatePrompt`

Input (validado con Zod):
```
{ categoria, plataforma, estilo, idioma, duracion, descripcion? }
```

Output:
```
{
  base: string,
  variants: {
    flow: string,
    youtube: string,
    veo: string,
    kling: string,
  }
}
```

Una sola llamada a OpenAI con system prompt que pide JSON con las 5 variantes (base + 4 optimizadas). Si la respuesta no parsea, se devuelve error controlado.

Errores tipados que el front distingue:
- `missing_key` → secret no configurado
- `rate_limited` → 429
- `quota` → 402
- `provider_error` → otros

## UI: `src/routes/crear.prompts.tsx`

Reescritura del componente manteniendo diseño, tipografía, gradientes y `FlowConnector` actuales. Cambios:

- Form controlado (categoría, plataforma, estilo, idioma, duración, descripción opcional).
- Estado: `idle | loading | success | error` + flag `keyMissing`.
- Al cargar la ruta, server fn ligera `hasOpenAIKey()` para saber si la key está configurada. Si no, banner permanente:
  > "Configura tu API Key de OpenAI en Integraciones para activar esta función."
  con botón → `/integraciones`. El botón "Generar prompt" queda deshabilitado.
- Estados visuales:
  - **Empty**: mensaje placeholder ya existente.
  - **Loading**: skeleton + spinner en el botón, inputs bloqueados.
  - **Error**: tarjeta de error con mensaje y botón "Reintentar".
  - **Success**: 5 tabs internas (Base / Flow / YouTube / Veo / Kling) cada una con su textarea editable.
- Botones por variante: **Copiar**, **Guardar** (toast informativo — la persistencia real llegará con auth), **Enviar a Flow Center** (navega a `/crear/flow` con el prompt en `sessionStorage`), **Guardar en Biblioteca** (toast informativo + navega a `/biblioteca/prompts`).
- "Guardar" no escribe en BD todavía: las tablas exigen `auth.uid()` y aún no hay login. Se deja toast "Disponible cuando inicies sesión" para no romper RLS.

## Página de Integraciones

`src/routes/integraciones.tsx` muestra una tarjeta destacada "OpenAI" con:
- Estado de conexión (consulta `hasOpenAIKey()`).
- Botón **"Configurar API Key"** que abre el flujo de secretos (instrucción al usuario para pegar la key cuando lo solicitemos en chat).
- El resto de integraciones siguen como mocks ("Próximamente").

## Otros módulos

Sin cambios. Google AI Studio, Flow, redes sociales, biblioteca, analítica, etc. conservan su data simulada.

## Pasos de implementación

1. Pedir al usuario la `OPENAI_API_KEY` con la herramienta de secretos.
2. Crear `src/lib/openai.functions.ts` con `generatePrompt` + `hasOpenAIKey`.
3. Reescribir `src/routes/crear.prompts.tsx` con form, estados, tabs de variantes y botones.
4. Ajustar `src/routes/integraciones.tsx` para destacar OpenAI y enlazar al flujo de secret.
5. Verificar build + probar `generatePrompt` con `invoke-server-function`.

## Notas técnicas

- Modelo por defecto: `gpt-4o-mini` (rápido y barato). Fácil de subir a `gpt-4o` si lo pides.
- `response_format: { type: "json_object" }` + system prompt explícito para garantizar parseo.
- Timeout de 30 s y manejo de 401/429/402 con mensajes útiles.
- No se modifica `src/integrations/supabase/*`, `start.ts`, ni los archivos auto-generados.
