import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Wand2, Image as ImageIcon, Video, Users, ArrowRight, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPrompts } from "@/lib/prompts.functions";
import { listImageGenerations } from "@/lib/image-generation.functions";
import { listVirtualCharacters } from "@/lib/visual-library.functions";
import { listCreationProjects } from "@/lib/creation-projects.functions";

export const Route = createFileRoute("/crear/")({
  head: () => ({ meta: [{ title: "Crear — AI Content Studio" }] }),
  component: CrearHome,
});

type Tile = {
  to: "/crear/prompts" | "/crear/imagen" | "/crear/video" | "/biblioteca/personajes";
  title: string;
  desc: string;
  icon: typeof Wand2;
  accent: string;
  badge?: string;
};

const TILES: Tile[] = [
  {
    to: "/crear/prompts",
    title: "Prompt IA",
    desc: "Genera prompts optimizados por plataforma, estilo y duración.",
    icon: Wand2,
    accent: "from-violet-500/30 to-fuchsia-500/10",
  },
  {
    to: "/crear/imagen",
    title: "Imagen IA",
    desc: "Crea imágenes con Gemini u OpenAI, con o sin personaje.",
    icon: ImageIcon,
    accent: "from-sky-500/30 to-cyan-500/10",
  },
  {
    to: "/crear/video",
    title: "Video IA",
    desc: "Prepara el video desde una imagen — generación próximamente.",
    icon: Video,
    accent: "from-rose-500/30 to-orange-500/10",
    badge: "Próximamente",
  },
  {
    to: "/biblioteca/personajes",
    title: "Personajes",
    desc: "Crea y administra personajes virtuales con varias referencias.",
    icon: Users,
    accent: "from-emerald-500/30 to-teal-500/10",
  },
];

function CrearHome() {
  const promptsFn = useServerFn(listPrompts);
  const imagesFn = useServerFn(listImageGenerations);
  const charsFn = useServerFn(listVirtualCharacters);
  const projectsFn = useServerFn(listCreationProjects);

  const prompts = useQuery({ queryKey: ["library", "prompts"], queryFn: () => promptsFn(), retry: false });
  const images = useQuery({ queryKey: ["image-generations"], queryFn: () => imagesFn(), retry: false });
  const characters = useQuery({ queryKey: ["library", "characters"], queryFn: () => charsFn(), retry: false });
  const projects = useQuery({ queryKey: ["creation-projects"], queryFn: () => projectsFn(), retry: false });

  const promptCount = prompts.data?.length ?? 0;
  const imageCount = images.data?.ok ? images.data.items.length : 0;
  const characterCount = characters.data?.length ?? 0;
  const projectCount = projects.data?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-8 p-6 lg:p-10">
      <PageHeader
        title="Crear"
        subtitle="Un único flujo: Idea → Prompt → Imagen → Proyecto. Elige por dónde empezar."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prompts" value={promptCount} />
        <Stat label="Imágenes" value={imageCount} />
        <Stat label="Personajes" value={characterCount} />
        <Stat label="Proyectos" value={projectCount} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to}>
              <Card className="group relative h-full overflow-hidden border-border/60 bg-card transition hover:border-primary/60 hover:shadow-lg">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${t.accent} opacity-60 transition-opacity group-hover:opacity-90`}
                  aria-hidden
                />
                <CardContent className="relative flex h-full flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/70 backdrop-blur">
                      <Icon className="h-6 w-6 text-foreground" />
                    </div>
                    {t.badge && (
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {t.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-xs text-primary opacity-80 group-hover:opacity-100">
                    Abrir <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Proyectos recientes
          </h2>
        </div>
        {projects.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando proyectos…</p>
        ) : projectCount === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/40">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Aún no hay proyectos. Genera una imagen y se creará uno automáticamente.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(projects.data ?? []).slice(0, 8).map((p) => (
              <Card key={p.id} className="overflow-hidden border-border/60 bg-card">
                <div className="aspect-video w-full bg-muted/40">
                  {p.cover_image_base64 ? (
                    <img
                      src={`data:image/png;base64,${p.cover_image_base64}`}
                      alt={p.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <CardContent className="space-y-1 p-3">
                  <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{p.status}</span>
                    <span>{p.asset_count} activos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}