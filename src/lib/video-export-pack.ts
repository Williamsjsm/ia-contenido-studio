import type { VideoDraftDetail } from "@/lib/video-drafts.functions";

export type ProviderId = "flow" | "veo" | "kling" | "runway";

export type ProviderPack = {
  provider: ProviderId;
  label: string;
  config: {
    duration: string;
    aspect: string;
    camera: string;
    style: string;
  };
  prompts: {
    initial: string;
    continuation: string;
    extension: string;
    fixedCamera: string;
  };
  reference: {
    imageId: string | null;
    imagePrompt: string | null;
    character: string | null;
    project: string | null;
  };
};

const PROVIDER_LABEL: Record<ProviderId, string> = {
  flow: "Flow",
  veo: "Google Veo",
  kling: "Kling",
  runway: "Runway",
};

// Provider-specific style headers tuned to each engine's strengths.
const PROVIDER_HEADER: Record<ProviderId, string> = {
  flow: "[FLOW] Cinematic continuity, photoreal motion, frame-accurate.",
  veo: "[VEO] Hyperreal cinematic motion, natural physics, subtle camera.",
  kling: "[KLING] Smooth motion, high temporal coherence, fluid transitions.",
  runway: "[RUNWAY] Stylized motion, expressive cinematography, color-graded.",
};

function presetDirective(preset: string | null): string {
  switch (preset) {
    case "animal-ia":
      return [
        "Strict continuity: exact same angle, zoom, color grading and lighting as the reference image.",
        "Natural, biologically accurate animal movement.",
        "Authentic ambient sound of the animal and its environment.",
      ].join(" ");
    case "influencer-ia":
      return [
        "Strict facial and body consistency with the reference character.",
        "Same identity, wardrobe, hair, skin tone and visual style.",
        "Same lighting setup and color grading as the reference image.",
      ].join(" ");
    case "cinematico":
      return "Cinematic look: anamorphic lens, film grain, controlled depth of field.";
    case "tiktok":
      return "Vertical, vibrant, fast-paced. Trend-ready first second.";
    case "reels-lifestyle":
      return "Warm lifestyle tone, soft natural light, lifestyle pacing.";
    case "producto":
      return "Studio hero shot, clean background, product as the only subject.";
    case "historia":
      return "Narrative beat with emotional arc, clear subject focus.";
    default:
      return "";
  }
}

function baseContext(d: VideoDraftDetail): string {
  const parts: string[] = [];
  if (d.character_name) parts.push(`Character: ${d.character_name}.`);
  if (d.project_title) parts.push(`Project: ${d.project_title}.`);
  if (d.source_image_prompt) parts.push(`Reference image prompt: ${d.source_image_prompt}.`);
  return parts.join(" ");
}

function configFor(d: VideoDraftDetail) {
  return {
    duration: d.duration ?? "8",
    aspect: d.aspect_ratio ?? "9:16",
    camera: d.camera_motion ?? "static",
    style: d.preset ?? "default",
  };
}

export function buildProviderPack(provider: ProviderId, d: VideoDraftDetail): ProviderPack {
  const header = PROVIDER_HEADER[provider];
  const directive = presetDirective(d.preset);
  const ctx = baseContext(d);
  const userPrompt = (d.prompt ?? "").trim();
  const cfg = configFor(d);

  const initial = [
    header,
    ctx,
    userPrompt,
    directive,
    `Duration: ${cfg.duration}s. Aspect: ${cfg.aspect}. Camera: ${cfg.camera}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const continuation = [
    header,
    "CONTINUATION SHOT — preserve subject identity, framing, lens, color grade and lighting from the previous clip.",
    ctx,
    userPrompt,
    directive,
    `Continue the same action seamlessly. Duration: ${cfg.duration}s.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const extension = [
    header,
    "EXTENSION — extend the last frame forward in time, no scene cut, identical subject and motion vector.",
    ctx,
    userPrompt,
    directive,
    `Extension length: ${cfg.duration}s. Aspect: ${cfg.aspect}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const fixedCamera = [
    header,
    "FIXED CAMERA — locked tripod, no pan, no zoom, no parallax. Subject moves within frame.",
    ctx,
    userPrompt,
    directive,
    `Duration: ${cfg.duration}s. Aspect: ${cfg.aspect}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    provider,
    label: PROVIDER_LABEL[provider],
    config: cfg,
    prompts: { initial, continuation, extension, fixedCamera },
    reference: {
      imageId: d.source_image_id,
      imagePrompt: d.source_image_prompt,
      character: d.character_name,
      project: d.project_title,
    },
  };
}

export function packToTxt(pack: ProviderPack): string {
  return [
    `# ${pack.label} Export Pack`,
    `Duration: ${pack.config.duration}s · Aspect: ${pack.config.aspect} · Camera: ${pack.config.camera} · Style: ${pack.config.style}`,
    pack.reference.character ? `Character: ${pack.reference.character}` : "",
    pack.reference.project ? `Project: ${pack.reference.project}` : "",
    pack.reference.imageId ? `Reference image id: ${pack.reference.imageId}` : "",
    "",
    "## Prompt Inicial",
    pack.prompts.initial,
    "",
    "## Prompt Continuación",
    pack.prompts.continuation,
    "",
    "## Prompt Extensión",
    pack.prompts.extension,
    "",
    "## Prompt Cámara Fija",
    pack.prompts.fixedCamera,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function packToJson(pack: ProviderPack): string {
  return JSON.stringify(pack, null, 2);
}

export function downloadBlob(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PROVIDERS: ProviderId[] = ["flow", "veo", "kling", "runway"];
export { PROVIDER_LABEL };