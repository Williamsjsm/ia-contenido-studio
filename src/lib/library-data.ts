// Simulated data for the "Biblioteca Inteligente" module.
// No real APIs — purely visual data for premium UI demos.

export type Platform = "ChatGPT" | "Midjourney" | "Veo" | "Runway" | "Flow" | "Gemini" | "Pika";
export type Category =
  | "Marketing"
  | "Cinemático"
  | "Producto"
  | "Lifestyle"
  | "Educativo"
  | "Branding"
  | "Social";

export interface PromptItem {
  id: string;
  title: string;
  category: Category;
  platform: Platform;
  created_at: string;
  excerpt: string;
  favorite: boolean;
}

export interface ImageItem {
  id: string;
  title: string;
  category: Category;
  platform: Platform;
  date: string;
  gradient: string;
  ratio: "1:1" | "16:9" | "9:16" | "4:5";
  favorite: boolean;
}

export interface VideoItem {
  id: string;
  title: string;
  category: Category;
  platform: Platform;
  date: string;
  gradient: string;
  duration: string;
  favorite: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  cover: string;
  items: number;
  updated: string;
  collaborators: number;
}

export interface DownloadItem {
  id: string;
  name: string;
  kind: "Imagen" | "Video" | "Prompt" | "Proyecto";
  size: string;
  format: string;
  date: string;
  gradient: string;
}

const g = (a: string, b: string, c?: string) =>
  c
    ? `linear-gradient(135deg, ${a}, ${b} 55%, ${c})`
    : `linear-gradient(135deg, ${a}, ${b})`;

export const PROMPTS: PromptItem[] = [
  { id: "p1", title: "Tigre cinemático en niebla volumétrica", category: "Cinemático", platform: "Midjourney", created_at: "2026-05-28", excerpt: "Hyperreal close-up of a bengal tiger, golden hour, volumetric fog…", favorite: true },
  { id: "p2", title: "Influencer IA estilo editorial Vogue", category: "Branding", platform: "ChatGPT", created_at: "2026-05-26", excerpt: "Editorial portrait of an AI persona, soft beauty light, Hasselblad…", favorite: false },
  { id: "p3", title: "Animales hechos de frutas — serie surreal", category: "Lifestyle", platform: "Midjourney", created_at: "2026-05-25", excerpt: "Surreal fruit-sculpted creatures, studio backdrop, dramatic rim light…", favorite: true },
  { id: "p4", title: "Restauración 4K de foto antigua 1920", category: "Producto", platform: "Gemini", created_at: "2026-05-23", excerpt: "Restore vintage photograph, repair scratches, enhance dynamic range…", favorite: false },
  { id: "p5", title: "Campaña verano — colores cálidos", category: "Marketing", platform: "ChatGPT", created_at: "2026-05-20", excerpt: "Summer campaign hero shots, terracotta + sand palette…", favorite: false },
  { id: "p6", title: "Curiosidad científica — átomo macro", category: "Educativo", platform: "Veo", created_at: "2026-05-18", excerpt: "Macro shot of atom-like particles, scientific accuracy, glassy bokeh…", favorite: false },
  { id: "p7", title: "Reel viral TikTok — POV cocina", category: "Social", platform: "Pika", created_at: "2026-05-15", excerpt: "POV cooking reel, fast cuts, warm tungsten, ASMR vibe…", favorite: true },
  { id: "p8", title: "Logo brutalist con tipografía mono", category: "Branding", platform: "ChatGPT", created_at: "2026-05-12", excerpt: "Brutalist logo concept, monospace type, high contrast geometry…", favorite: false },
];

export const IMAGES: ImageItem[] = [
  { id: "i1", title: "Tigre dorado niebla", category: "Cinemático", platform: "Midjourney", date: "2026-05-29", gradient: g("#f59e0b", "#7c2d12", "#1c1917"), ratio: "16:9", favorite: true },
  { id: "i2", title: "Manzana-pingüino surreal", category: "Lifestyle", platform: "Midjourney", date: "2026-05-28", gradient: g("#ef4444", "#fb923c"), ratio: "1:1", favorite: true },
  { id: "i3", title: "Retrato editorial AI", category: "Branding", platform: "Gemini", date: "2026-05-26", gradient: g("#a78bfa", "#ec4899", "#1e1b4b"), ratio: "4:5", favorite: false },
  { id: "i4", title: "Skyline Tokyo neón", category: "Cinemático", platform: "Midjourney", date: "2026-05-24", gradient: g("#0ea5e9", "#a855f7", "#0f172a"), ratio: "16:9", favorite: false },
  { id: "i5", title: "Producto cosmético", category: "Producto", platform: "ChatGPT", date: "2026-05-22", gradient: g("#fde68a", "#f59e0b"), ratio: "1:1", favorite: false },
  { id: "i6", title: "Café estilo flatlay", category: "Marketing", platform: "ChatGPT", date: "2026-05-21", gradient: g("#78350f", "#fbbf24"), ratio: "1:1", favorite: true },
  { id: "i7", title: "Restauración 1920", category: "Producto", platform: "Gemini", date: "2026-05-20", gradient: g("#57534e", "#e7e5e4"), ratio: "4:5", favorite: false },
  { id: "i8", title: "Bosque encantado", category: "Cinemático", platform: "Midjourney", date: "2026-05-19", gradient: g("#064e3b", "#22d3ee", "#022c22"), ratio: "16:9", favorite: false },
  { id: "i9", title: "Naranja-tucán", category: "Lifestyle", platform: "Midjourney", date: "2026-05-18", gradient: g("#fb923c", "#1e293b"), ratio: "1:1", favorite: true },
  { id: "i10", title: "Branding agencia", category: "Branding", platform: "ChatGPT", date: "2026-05-16", gradient: g("#fafaf9", "#a8a29e", "#1c1917"), ratio: "1:1", favorite: false },
  { id: "i11", title: "POV cocina", category: "Social", platform: "Gemini", date: "2026-05-14", gradient: g("#dc2626", "#f97316"), ratio: "9:16", favorite: false },
  { id: "i12", title: "Aurora boreal sintética", category: "Cinemático", platform: "Midjourney", date: "2026-05-12", gradient: g("#10b981", "#6366f1", "#020617"), ratio: "16:9", favorite: true },
];

export const VIDEOS: VideoItem[] = [
  { id: "v1", title: "Tigre caminando — extended cut", category: "Cinemático", platform: "Veo", date: "2026-05-29", gradient: g("#f59e0b", "#7c2d12"), duration: "0:24", favorite: true },
  { id: "v2", title: "Reel campaña verano", category: "Marketing", platform: "Runway", date: "2026-05-27", gradient: g("#fb923c", "#dc2626"), duration: "0:15", favorite: false },
  { id: "v3", title: "Influencer IA presenta producto", category: "Branding", platform: "Pika", date: "2026-05-25", gradient: g("#a78bfa", "#ec4899"), duration: "0:32", favorite: true },
  { id: "v4", title: "POV cocina viral", category: "Social", platform: "Flow", date: "2026-05-23", gradient: g("#dc2626", "#fb923c"), duration: "0:18", favorite: false },
  { id: "v5", title: "Curiosidad — universo macro", category: "Educativo", platform: "Veo", date: "2026-05-21", gradient: g("#1e3a8a", "#a855f7", "#020617"), duration: "0:42", favorite: false },
  { id: "v6", title: "Restauración video familia", category: "Producto", platform: "Runway", date: "2026-05-19", gradient: g("#57534e", "#fafaf9"), duration: "1:08", favorite: false },
  { id: "v7", title: "Aurora cinematográfica", category: "Cinemático", platform: "Veo", date: "2026-05-17", gradient: g("#10b981", "#6366f1"), duration: "0:28", favorite: true },
  { id: "v8", title: "Naranja-tucán animado", category: "Lifestyle", platform: "Pika", date: "2026-05-15", gradient: g("#fb923c", "#1e293b"), duration: "0:12", favorite: false },
];

export const PROJECTS: ProjectItem[] = [
  { id: "pr1", name: "Animales de Frutas", cover: g("#fb923c", "#dc2626", "#1c1917"), items: 24, updated: "Hace 2 h", collaborators: 3 },
  { id: "pr2", name: "Influencers IA", cover: g("#a78bfa", "#ec4899", "#0f172a"), items: 18, updated: "Ayer", collaborators: 2 },
  { id: "pr3", name: "Curiosidades", cover: g("#22d3ee", "#6366f1", "#020617"), items: 41, updated: "Hace 3 días", collaborators: 1 },
  { id: "pr4", name: "Restauraciones", cover: g("#a8a29e", "#1c1917"), items: 12, updated: "Hace 5 días", collaborators: 4 },
  { id: "pr5", name: "Campañas Verano 26", cover: g("#fde68a", "#f59e0b", "#7c2d12"), items: 33, updated: "Hace 1 semana", collaborators: 5 },
  { id: "pr6", name: "Lanzamiento Producto Q3", cover: g("#10b981", "#0ea5e9"), items: 27, updated: "Hace 1 semana", collaborators: 6 },
];

export const DOWNLOADS: DownloadItem[] = [
  { id: "d1", name: "tigre_cinematic_4k.mp4", kind: "Video", size: "184 MB", format: "MP4 · 4K", date: "2026-05-29", gradient: g("#f59e0b", "#7c2d12") },
  { id: "d2", name: "manzana_pinguino.png", kind: "Imagen", size: "12.4 MB", format: "PNG · 4096", date: "2026-05-28", gradient: g("#ef4444", "#fb923c") },
  { id: "d3", name: "prompts_campaña_verano.json", kind: "Prompt", size: "48 KB", format: "JSON", date: "2026-05-26", gradient: g("#fde68a", "#f59e0b") },
  { id: "d4", name: "proyecto_influencers_ia.zip", kind: "Proyecto", size: "1.2 GB", format: "ZIP", date: "2026-05-24", gradient: g("#a78bfa", "#ec4899") },
  { id: "d5", name: "aurora_extended.mp4", kind: "Video", size: "96 MB", format: "MP4 · 1080", date: "2026-05-22", gradient: g("#10b981", "#6366f1") },
  { id: "d6", name: "restauracion_1920.tiff", kind: "Imagen", size: "78 MB", format: "TIFF", date: "2026-05-20", gradient: g("#57534e", "#e7e5e4") },
];

export const PLATFORMS: Platform[] = ["ChatGPT", "Midjourney", "Veo", "Runway", "Flow", "Gemini", "Pika"];
export const CATEGORIES: Category[] = ["Marketing", "Cinemático", "Producto", "Lifestyle", "Educativo", "Branding", "Social"];

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "Sin fecha";
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
