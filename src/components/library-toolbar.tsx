import { Search, SlidersHorizontal, LayoutGrid, List, Rows3, Calendar, Tag, Sparkles, Heart, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORIES, PLATFORMS, type Category, type Platform } from "@/lib/library-data";

export type ViewMode = "grid" | "list" | "compact";

export interface LibraryFilters {
  query: string;
  date: "all" | "7d" | "30d" | "90d";
  category: Category | "all";
  platform: Platform | "all";
  favoritesOnly: boolean;
  type?: string;
}

export const DEFAULT_FILTERS: LibraryFilters = {
  query: "",
  date: "all",
  category: "all",
  platform: "all",
  favoritesOnly: false,
};

interface Props {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  filters: LibraryFilters;
  onFiltersChange: (f: LibraryFilters) => void;
  showType?: { label: string; options: string[] };
}

const dateLabels: Record<LibraryFilters["date"], string> = {
  all: "Cualquier fecha",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
};

export function LibraryToolbar({ view, onViewChange, filters, onFiltersChange, showType }: Props) {
  const set = <K extends keyof LibraryFilters>(k: K, v: LibraryFilters[K]) =>
    onFiltersChange({ ...filters, [k]: v });

  const activeChips: { key: keyof LibraryFilters; label: string }[] = [];
  if (filters.date !== "all") activeChips.push({ key: "date", label: dateLabels[filters.date] });
  if (filters.category !== "all") activeChips.push({ key: "category", label: filters.category });
  if (filters.platform !== "all") activeChips.push({ key: "platform", label: filters.platform });
  if (filters.favoritesOnly) activeChips.push({ key: "favoritesOnly", label: "Favoritos" });
  if (filters.type && filters.type !== "all") activeChips.push({ key: "type", label: filters.type });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Buscar en toda la biblioteca…"
            className="h-10 pl-9 bg-card/60 border-border/60"
          />
        </div>

        {/* Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
              {activeChips.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {activeChips.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3" /> Fecha
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filters.date}
              onValueChange={(v) => set("date", v as LibraryFilters["date"])}
            >
              {(["all", "7d", "30d", "90d"] as const).map((d) => (
                <DropdownMenuRadioItem key={d} value={d}>{dateLabels[d]}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <Tag className="h-3 w-3" /> Categoría
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filters.category}
              onValueChange={(v) => set("category", v as Category | "all")}
            >
              <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
              {CATEGORIES.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>{c}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <Sparkles className="h-3 w-3" /> Plataforma
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filters.platform}
              onValueChange={(v) => set("platform", v as Platform | "all")}
            >
              <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
              {PLATFORMS.map((p) => (
                <DropdownMenuRadioItem key={p} value={p}>{p}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            {showType && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">{showType.label}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.type ?? "all"}
                  onValueChange={(v) => set("type", v)}
                >
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  {showType.options.map((o) => (
                    <DropdownMenuRadioItem key={o} value={o}>{o}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filters.favoritesOnly}
              onCheckedChange={(v) => set("favoritesOnly", !!v)}
            >
              <Heart className="mr-2 h-3.5 w-3.5" /> Solo favoritos
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View switcher */}
        <div className="flex h-10 items-center rounded-lg border border-border/60 bg-card/60 p-1">
          {(
            [
              { v: "grid", icon: LayoutGrid },
              { v: "list", icon: List },
              { v: "compact", icon: Rows3 },
            ] as const
          ).map(({ v, icon: Icon }) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                view === v
                  ? "bg-accent text-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={`Vista ${v}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((c) => (
            <Badge
              key={c.key}
              variant="secondary"
              className="gap-1 rounded-full bg-accent/60 px-2.5 py-1 text-[11px] font-normal"
            >
              {c.label}
              <button
                onClick={() =>
                  set(
                    c.key,
                    (c.key === "favoritesOnly"
                      ? false
                      : c.key === "date"
                      ? "all"
                      : "all") as never
                  )
                }
                className="ml-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={() => onFiltersChange(DEFAULT_FILTERS)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
}

export function matchesFilters(
  item: { date?: string; created_at?: string; category?: string; platform?: string; favorite?: boolean; title?: string; name?: string },
  filters: LibraryFilters
) {
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const hay = `${item.title ?? ""} ${item.name ?? ""} ${item.category ?? ""} ${item.platform ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.category !== "all" && item.category !== filters.category) return false;
  if (filters.platform !== "all" && item.platform !== filters.platform) return false;
  if (filters.favoritesOnly && !item.favorite) return false;
  if (filters.date !== "all") {
    const days = filters.date === "7d" ? 7 : filters.date === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 86_400_000;
    const itemDate = item.date ?? item.created_at;
    if (!itemDate || new Date(itemDate).getTime() < cutoff) return false;
  }
  return true;
}
