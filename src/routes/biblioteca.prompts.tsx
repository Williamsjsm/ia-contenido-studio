import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LibraryShell } from "@/components/library-shell";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { LibraryToolbar, DEFAULT_FILTERS, matchesFilters, type ViewMode, type LibraryFilters } from "@/components/library-toolbar";
import { fmtDate, type PromptItem } from "@/lib/library-data";
import { listPrompts, type StoredPrompt } from "@/lib/prompts.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Edit3, Heart, MoreHorizontal, Trash2, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/prompts")({
  component: PromptsPage,
});

function adapt(row: StoredPrompt): PromptItem {
  return {
    id: row.id,
    title: row.title,
    excerpt: (row.original_prompt ?? "").slice(0, 160),
    category: row.category ?? "—",
    platform: row.platform ?? "—",
    favorite: row.is_favorite,
    created_at: row.created_at,
  };
}

function PromptsPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const fetchPrompts = useServerFn(listPrompts);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["library", "prompts"],
    queryFn: () => fetchPrompts(),
  });

  const all = useMemo(() => (data ?? []).map(adapt), [data]);
  const items = useMemo(() => all.filter((p) => matchesFilters(p, filters)), [all, filters]);

  const hasNoneSaved = !isLoading && !error && all.length === 0;
  const hasNoMatches = !isLoading && !error && all.length > 0 && items.length === 0;

  return (
    <LibraryShell count={all.length}>
      <LibraryToolbar view={view} onViewChange={setView} filters={filters} onFiltersChange={setFilters} />
      {isLoading ? (
        <LoadingState label="Cargando tus prompts…" />
      ) : error ? (
        <ErrorState
          title="No pudimos cargar tus prompts"
          description="Reintenta en unos segundos."
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => refetch()}
        />
      ) : hasNoneSaved ? (
        <EmptyState
          title="Aún no has guardado prompts"
          description="Genera tu primer prompt y guárdalo desde Crear › Prompts."
        />
      ) : hasNoMatches ? (
        <EmptyState
          title="No hay prompts que coincidan con estos filtros"
          description="Ajusta los filtros para ver más resultados."
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => <PromptCard key={p.id} p={p} />)}
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {items.map((p) => <PromptRow key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="surface-card divide-y divide-border/50">
          {items.map((p) => <PromptCompact key={p.id} p={p} />)}
        </div>
      )}
    </LibraryShell>
  );
}

function PromptActions({ size = "sm" }: { size?: "sm" | "xs" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(size === "xs" ? "h-7 w-7" : "h-8 w-8")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem><ExternalLink className="mr-2 h-3.5 w-3.5" /> Abrir</DropdownMenuItem>
        <DropdownMenuItem><Copy className="mr-2 h-3.5 w-3.5" /> Duplicar</DropdownMenuItem>
        <DropdownMenuItem><Edit3 className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PromptCard({ p }: { p: PromptItem }) {
  return (
    <div className="surface-card hover-lift group flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/60">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <button className="text-muted-foreground hover:text-primary">
          <Heart className={cn("h-4 w-4", p.favorite && "fill-primary text-primary")} />
        </button>
      </div>
      <h3 className="mt-4 line-clamp-2 text-[14px] font-semibold leading-snug">{p.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted-foreground">{p.excerpt}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px] font-normal">{p.category}</Badge>
        <Badge variant="outline" className="text-[10px] font-normal">{p.platform}</Badge>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>
        <PromptActions />
      </div>
    </div>
  );
}

function PromptRow({ p }: { p: PromptItem }) {
  return (
    <div className="surface-card hover-lift flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/60">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[14px] font-semibold">{p.title}</h3>
          {p.favorite && <Heart className="h-3.5 w-3.5 fill-primary text-primary" />}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{p.excerpt}</p>
      </div>
      <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-normal">{p.category}</Badge>
      <Badge variant="outline" className="hidden md:inline-flex text-[10px] font-normal">{p.platform}</Badge>
      <span className="hidden lg:block w-24 text-right text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>
      <PromptActions />
    </div>
  );
}

function PromptCompact({ p }: { p: PromptItem }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors">
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate text-[13px]">{p.title}</span>
      <span className="hidden md:block text-[11px] text-muted-foreground">{p.category}</span>
      <span className="hidden lg:block text-[11px] text-muted-foreground">{p.platform}</span>
      <span className="text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>
      {p.favorite && <Heart className="h-3 w-3 fill-primary text-primary" />}
      <PromptActions size="xs" />
    </div>
  );
}
