import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LibraryShell, EmptyState } from "@/components/library-shell";
import { LibraryToolbar, DEFAULT_FILTERS, type ViewMode, type LibraryFilters } from "@/components/library-toolbar";
import { PROJECTS, type ProjectItem } from "@/lib/library-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Plus, Users, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/proyectos")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);

  const items = useMemo(() => {
    if (!filters.query) return PROJECTS;
    const q = filters.query.toLowerCase();
    return PROJECTS.filter((p) => p.name.toLowerCase().includes(q));
  }, [filters.query]);

  return (
    <LibraryShell count={PROJECTS.length}>
      <LibraryToolbar view={view} onViewChange={setView} filters={filters} onFiltersChange={setFilters} />

      {items.length === 0 ? (
        <EmptyState label="proyectos" />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <NewProjectCard />
          {items.map((p) => <ProjectCard key={p.id} p={p} />)}
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {items.map((p) => <ProjectRow key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="surface-card divide-y divide-border/50">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors">
              <div className="h-6 w-6 rounded-md" style={{ background: p.cover }} />
              <span className="flex-1 truncate text-[13px] font-medium">{p.name}</span>
              <span className="text-[11px] text-muted-foreground">{p.items} items</span>
              <span className="text-[11px] text-muted-foreground">{p.updated}</span>
            </div>
          ))}
        </div>
      )}
    </LibraryShell>
  );
}

function NewProjectCard() {
  return (
    <button className="surface-card hover-lift flex aspect-[5/3] flex-col items-center justify-center gap-2 border-dashed text-muted-foreground hover:text-foreground">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/60">
        <Plus className="h-4 w-4" />
      </div>
      <span className="text-[13px] font-medium">Nuevo proyecto</span>
      <span className="text-[11px] text-muted-foreground">Crea una carpeta</span>
    </button>
  );
}

function ProjectCard({ p }: { p: ProjectItem }) {
  return (
    <div className="group surface-card hover-lift overflow-hidden p-0">
      <div className="relative aspect-[5/3] w-full overflow-hidden" style={{ background: p.cover }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 backdrop-blur-md">
          <FolderKanban className="h-4 w-4 text-white" />
        </div>
        <Badge className="absolute top-3 right-3 bg-black/50 backdrop-blur-md border-0 text-white text-[10px]">
          {p.items} items
        </Badge>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-[16px] font-semibold text-white drop-shadow">{p.name}</h3>
          <p className="mt-0.5 text-[11px] text-white/70">{p.updated}</p>
        </div>
      </div>
      <div className="flex items-center justify-between p-3">
        <div className="flex -space-x-1.5">
          {Array.from({ length: Math.min(p.collaborators, 3) }).map((_, i) => (
            <div
              key={i}
              className="h-6 w-6 rounded-full border-2 border-card"
              style={{
                background: `linear-gradient(135deg, oklch(0.7 0.15 ${i * 80 + 50}), oklch(0.5 0.18 ${i * 80 + 150}))`,
              }}
            />
          ))}
          {p.collaborators > 3 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-medium">
              +{p.collaborators - 3}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ProjectRow({ p }: { p: ProjectItem }) {
  return (
    <div className="surface-card hover-lift flex items-center gap-4 p-3">
      <div className="h-14 w-20 shrink-0 rounded-md" style={{ background: p.cover }} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[14px] font-semibold">{p.name}</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{p.items} items · actualizado {p.updated}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
        <Users className="h-3 w-3" /> {p.collaborators}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
    </div>
  );
}
