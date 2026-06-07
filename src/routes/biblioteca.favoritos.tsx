import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LibraryShell, EmptyState } from "@/components/library-shell";
import { LibraryToolbar, DEFAULT_FILTERS, matchesFilters, type ViewMode, type LibraryFilters } from "@/components/library-toolbar";
import { PROMPTS, IMAGES, VIDEOS, fmtDate } from "@/lib/library-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ImageIcon, Video, Heart, Play, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/favoritos")({
  component: FavoritesPage,
});

type FavType = "all" | "Prompts" | "Imágenes" | "Videos";

function FavoritesPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<LibraryFilters>({ ...DEFAULT_FILTERS, type: "all" });

  const all = useMemo(() => {
    return [
      ...PROMPTS.filter((p) => p.favorite).map((p) => ({ ...p, _kind: "Prompts" as const, _grad: undefined as string | undefined })),
      ...IMAGES.filter((i) => i.favorite).map((i) => ({ ...i, _kind: "Imágenes" as const, _grad: i.gradient })),
      ...VIDEOS.filter((v) => v.favorite).map((v) => ({ ...v, _kind: "Videos" as const, _grad: v.gradient })),
    ];
  }, []);

  const filtered = useMemo(() => {
    const t = (filters.type ?? "all") as FavType;
    return all.filter((it) => {
      if (t !== "all" && it._kind !== t) return false;
      return matchesFilters({ ...it, favorite: true }, { ...filters, favoritesOnly: false });
    });
  }, [all, filters]);

  return (
    <LibraryShell count={all.length}>
      <LibraryToolbar
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
        showType={{ label: "Tipo", options: ["Prompts", "Imágenes", "Videos"] }}
      />
      {filtered.length === 0 ? (
        <EmptyState label="favoritos" />
      ) : (
        <div className={cn(
          view === "grid" && "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          view === "list" && "space-y-2",
          view === "compact" && "surface-card divide-y divide-border/50"
        )}>
          {filtered.map((it) => <FavCard key={`${it._kind}-${it.id}`} item={it} view={view} />)}
        </div>
      )}
    </LibraryShell>
  );
}

function FavCard({ item, view }: { item: any; view: ViewMode }) {
  const Icon = item._kind === "Prompts" ? FileText : item._kind === "Imágenes" ? ImageIcon : Video;

  if (view === "compact") {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 truncate text-[13px]">{item.title}</span>
        <Badge variant="outline" className="text-[10px] font-normal">{item._kind}</Badge>
        <span className="text-[11px] text-muted-foreground">{fmtDate(item.created_at ?? item.date)}</span>
        <Heart className="h-3 w-3 fill-primary text-primary" />
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="surface-card hover-lift flex items-center gap-4 p-3">
        {item._grad ? (
          <div className="h-14 w-20 shrink-0 rounded-md relative overflow-hidden" style={{ background: item._grad }}>
            {item._kind === "Videos" && <Play className="absolute inset-0 m-auto h-4 w-4 fill-white text-white" />}
          </div>
        ) : (
          <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-accent/60">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold">{item.title}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item._kind} · {item.platform}</p>
        </div>
        <Heart className="h-4 w-4 fill-primary text-primary" />
      </div>
    );
  }

  return (
    <div className="surface-card hover-lift overflow-hidden p-0">
      {item._grad ? (
        <div className="relative aspect-video w-full" style={{ background: item._grad }}>
          {item._kind === "Videos" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="h-8 w-8 fill-white text-white" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/90">
            <Heart className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
          </div>
          <Badge className="absolute top-2 right-2 bg-black/50 backdrop-blur-md border-0 text-white text-[10px]">{item._kind}</Badge>
        </div>
      ) : (
        <div className="relative aspect-video w-full bg-accent/40 flex items-center justify-center">
          <Icon className="h-8 w-8 text-primary/70" />
          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/90">
            <Heart className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
          </div>
          <Badge className="absolute top-2 right-2 bg-black/50 backdrop-blur-md border-0 text-white text-[10px]">{item._kind}</Badge>
        </div>
      )}
      <div className="p-4">
        <h3 className="truncate text-[14px] font-semibold">{item.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{item.platform}</span>
          <span className="text-[11px] text-muted-foreground">{fmtDate(item.created_at ?? item.date)}</span>
        </div>
      </div>
    </div>
  );
}
