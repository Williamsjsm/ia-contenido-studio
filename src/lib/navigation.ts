/**
 * Central navigation registry.
 * Consumed by sidebar, top-bar (command palette) and library shell tabs.
 * Add or remove routes here ONLY — do not duplicate route lists elsewhere.
 */
import {
  LayoutDashboard,
  Wand2,
  Image as ImageIcon,
  Video,
  Workflow,
  TrendingUp,
  Lightbulb,
  Brain,
  Library,
  Send,
  Plug,
  Settings,
  FileText,
  Heart,
  FolderKanban,
  Download,
  type LucideIcon,
} from "lucide-react";

export type NavGroupId = "General" | "Crear" | "Investigar" | "Biblioteca" | "Sistema";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  group: NavGroupId;
}

/**
 * Primary routes shown in the sidebar.
 * `Biblioteca` is a single entry pointing to the default sub-route;
 * its internal tabs live in `libraryTabs` below.
 */
export const primaryRoutes: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, group: "General" },

  { title: "Generador de Prompts", url: "/crear/prompts", icon: Wand2, group: "Crear" },
  { title: "Imagen IA", url: "/crear/imagen", icon: ImageIcon, group: "Crear" },
  { title: "Video IA", url: "/crear/video", icon: Video, group: "Crear" },
  { title: "Flow Center", url: "/crear/flow", icon: Workflow, group: "Crear" },

  { title: "Tendencias", url: "/investigar/tendencias", icon: TrendingUp, group: "Investigar" },
  { title: "Inspiración IA", url: "/investigar/inspiracion", icon: Lightbulb, group: "Investigar" },
  { title: "Aprendizaje Inteligente", url: "/investigar/aprendizaje", icon: Brain, group: "Investigar" },

  { title: "Biblioteca", url: "/biblioteca/prompts", icon: Library, group: "Biblioteca" },
  { title: "Centro de Publicación", url: "/publicacion", icon: Send, group: "Biblioteca" },

  { title: "Integraciones", url: "/integraciones", icon: Plug, group: "Sistema" },
  { title: "Configuración", url: "/configuracion", icon: Settings, group: "Sistema" },
];

/** Grouped view for the sidebar. */
export const navGroups: { label: NavGroupId; items: NavItem[] }[] = (
  ["General", "Crear", "Investigar", "Biblioteca", "Sistema"] as NavGroupId[]
).map((label) => ({
  label,
  items: primaryRoutes.filter((r) => r.group === label),
}));

/** Internal tabs of the unified Library module. */
export const libraryTabs = [
  { to: "/biblioteca/prompts", label: "Prompts", icon: FileText },
  { to: "/biblioteca/imagenes", label: "Imágenes", icon: ImageIcon },
  { to: "/biblioteca/videos", label: "Videos", icon: Video },
  { to: "/biblioteca/favoritos", label: "Favoritos", icon: Heart },
  { to: "/biblioteca/proyectos", label: "Proyectos", icon: FolderKanban },
  { to: "/biblioteca/descargas", label: "Descargas", icon: Download },
] as const;
