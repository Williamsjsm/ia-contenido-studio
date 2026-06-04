import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LibraryShell, EmptyState } from "@/components/library-shell";
import { LibraryToolbar, DEFAULT_FILTERS, matchesFilters, type ViewMode, type LibraryFilters } from "@/components/library-toolbar";
import { IMAGES, fmtDate, type ImageItem } from "@/lib/library-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Copy, Heart, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/imagenes")({
  component: ImagesPage,
});

function ImagesPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const items = useMemo(() => IMAGES.filter((i) => matchesFilters(i, filters)), [filters]);

  return (
    <LibraryShell count={IMAGES.length}>
      <LibraryToolbar view={view} onViewChange={setView} filters={filters} onFiltersChange={setFilters} />
      {items.length === 0 ? (
        <EmptyState label="imágenes" />
      ) : view === "grid" ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((i) => <ImageCard key={i.id} i={i} />)}
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {items.map((i) => <ImageRow key={i.id} i={i} />)}
        </div>
      ) : (
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {items.map((i) => <ImageThumb key={i.id} i={i} />)}
        </div>
      )}
    </LibraryShell>
  );
}

function ImageCard({ i }: { i: ImageItem }) {
  const aspect = i.ratio === "16:9" ? "aspect-video" : i.ratio === "9:16" ? "aspect-[9/16]" : i.ratio === "4:5" ? "aspect-[4/5]" : "aspect-square";
  return (
    <div className="group surface-card hover-lift overflow-hidden p-0">
      <div className={cn("relative w-full overflow-hidden", aspect)} style={{ background: i.gradient }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <button className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
          <Heart className={cn("h-3.5 w-3.5", i.favorite && "fill-primary text-primary")} />
        </button>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
          <Badge className="bg-black/50 backdrop-blur-md border-0 text-white text-[10px]">{i.ratio}</Badge>
          <div className="flex gap-1">
            <Button size="icon" variant="secondary" className="h-7 w-7"><Eye className="h-3 w-3" /></Button>
            <Button size="icon" variant="secondary" className="h-7 w-7"><Download className="h-3 w-3" /></Button>
            <Button size="icon" variant="secondary" className="h-7 w-7"><Copy className="h-3 w-3" /></Button>
          </div>
        </div>
        {i.favorite && (
          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/90 backdrop-blur-md">
            <Heart className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-[13px] font-medium">{i.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{i.platform}</span>
          <span className="text-[11px] text-muted-foreground">{fmtDate(i.date)}</span>
        </div>
      </div>
    </div>
  );
}

function ImageRow({ i }: { i: ImageItem }) {
  return (
    <div className="surface-card hover-lift flex items-center gap-4 p-3">
      <div className="h-14 w-20 shrink-0 rounded-md" style={{ background: i.gradient }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[14px] font-semibold">{i.title}</h3>
          {i.favorite && <Heart className="h-3.5 w-3.5 fill-primary text-primary" />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ImageIcon className="h-3 w-3" /> <span>{i.ratio}</span> · <span>{i.platform}</span>
        </div>
      </div>
      <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-normal">{i.category}</Badge>
      <span className="hidden lg:block w-24 text-right text-[11px] text-muted-foreground">{fmtDate(i.date)}</span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function ImageThumb({ i }: { i: ImageItem }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-md border border-border/40 hover-lift" style={{ background: i.gradient }}>
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
      {i.favorite && <Heart className="absolute top-1.5 right-1.5 h-3 w-3 fill-primary text-primary" />}
    </div>
  );
}
