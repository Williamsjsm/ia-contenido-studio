import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LibraryShell, EmptyState } from "@/components/library-shell";
import { LibraryToolbar, DEFAULT_FILTERS, matchesFilters, type ViewMode, type LibraryFilters } from "@/components/library-toolbar";
import { VIDEOS, fmtDate, type VideoItem } from "@/lib/library-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Copy, Heart, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/videos")({
  component: VideosPage,
});

function VideosPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const items = useMemo(() => VIDEOS.filter((v) => matchesFilters(v, filters)), [filters]);

  return (
    <LibraryShell count={VIDEOS.length}>
      <LibraryToolbar view={view} onViewChange={setView} filters={filters} onFiltersChange={setFilters} />
      {items.length === 0 ? (
        <EmptyState label="videos" />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((v) => <VideoCard key={v.id} v={v} />)}
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {items.map((v) => <VideoRow key={v.id} v={v} />)}
        </div>
      ) : (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {items.map((v) => <VideoThumb key={v.id} v={v} />)}
        </div>
      )}
    </LibraryShell>
  );
}

function VideoCard({ v }: { v: VideoItem }) {
  return (
    <div className="group surface-card hover-lift overflow-hidden p-0">
      <div className="relative aspect-video w-full overflow-hidden" style={{ background: v.gradient }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-black shadow-2xl scale-90 opacity-90 transition-all group-hover:scale-100 group-hover:opacity-100">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </button>
        </div>
        <Badge className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md border-0 text-white text-[10px] font-mono">
          {v.duration}
        </Badge>
        {v.favorite && (
          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/90">
            <Heart className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
          </div>
        )}
        <Badge className="absolute top-2 right-2 bg-black/50 backdrop-blur-md border-0 text-white text-[10px]">{v.platform}</Badge>
      </div>
      <div className="p-4">
        <h3 className="truncate text-[14px] font-semibold">{v.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{v.category} · {fmtDate(v.date)}</span>
        </div>
        <div className="mt-3 flex items-center gap-1">
          <Button size="sm" variant="secondary" className="h-7 gap-1 text-[11px]"><Play className="h-3 w-3" /> Reproducir</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7"><Copy className="h-3 w-3" /></Button>
          <Link to="/crear/flow" className="ml-auto">
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Abrir en Flow Center">
              <Workflow className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function VideoRow({ v }: { v: VideoItem }) {
  return (
    <div className="surface-card hover-lift flex items-center gap-4 p-3">
      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md" style={{ background: v.gradient }}>
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="h-4 w-4 fill-white text-white" />
        </div>
        <Badge className="absolute bottom-0.5 right-0.5 bg-black/70 border-0 text-white text-[9px] font-mono px-1 py-0">
          {v.duration}
        </Badge>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[14px] font-semibold">{v.title}</h3>
          {v.favorite && <Heart className="h-3.5 w-3.5 fill-primary text-primary" />}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{v.category} · {v.platform}</p>
      </div>
      <span className="hidden lg:block w-24 text-right text-[11px] text-muted-foreground">{fmtDate(v.date)}</span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8"><Play className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
        <Link to="/crear/flow"><Button size="icon" variant="ghost" className="h-8 w-8"><Workflow className="h-3.5 w-3.5" /></Button></Link>
      </div>
    </div>
  );
}

function VideoThumb({ v }: { v: VideoItem }) {
  return (
    <div className="group relative aspect-video overflow-hidden rounded-lg border border-border/40 hover-lift" style={{ background: v.gradient }}>
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/50">
        <Play className="h-5 w-5 fill-white text-white" />
      </div>
      <Badge className="absolute bottom-1.5 right-1.5 bg-black/70 border-0 text-white text-[9px] font-mono">{v.duration}</Badge>
      <p className="absolute bottom-1.5 left-1.5 right-12 truncate text-[10px] text-white drop-shadow">{v.title}</p>
    </div>
  );
}
