import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LibraryShell, EmptyState } from "@/components/library-shell";
import { LibraryToolbar, DEFAULT_FILTERS, type ViewMode, type LibraryFilters } from "@/components/library-toolbar";
import { DOWNLOADS, fmtDate, type DownloadItem } from "@/lib/library-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, MoreHorizontal, FileVideo, FileImage, FileText, FolderArchive } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/descargas")({
  component: DownloadsPage,
});

function iconFor(kind: DownloadItem["kind"]) {
  return kind === "Video" ? FileVideo : kind === "Imagen" ? FileImage : kind === "Prompt" ? FileText : FolderArchive;
}

function DownloadsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<LibraryFilters>({ ...DEFAULT_FILTERS, type: "all" });

  const items = useMemo(() => {
    return DOWNLOADS.filter((d) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !d.kind.toLowerCase().includes(q)) return false;
      }
      if (filters.type && filters.type !== "all" && d.kind !== filters.type) return false;
      if (filters.date !== "all") {
        const days = filters.date === "7d" ? 7 : filters.date === "30d" ? 30 : 90;
        if (new Date(d.date).getTime() < Date.now() - days * 86_400_000) return false;
      }
      return true;
    });
  }, [filters]);

  const totalSize = DOWNLOADS.length;

  return (
    <LibraryShell count={totalSize}>
      <LibraryToolbar
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
        showType={{ label: "Formato", options: ["Imagen", "Video", "Prompt", "Proyecto"] }}
      />

      {items.length === 0 ? (
        <EmptyState label="descargas" />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((d) => <DownloadCard key={d.id} d={d} />)}
        </div>
      ) : view === "compact" ? (
        <div className="surface-card divide-y divide-border/50">
          {items.map((d) => {
            const Icon = iconFor(d.kind);
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 truncate font-mono text-[12px]">{d.name}</span>
                <span className="text-[11px] text-muted-foreground">{d.size}</span>
                <span className="text-[11px] text-muted-foreground">{fmtDate(d.date)}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3 w-3" /></Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="surface-card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Archivo</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Formato</th>
                <th className="px-4 py-3 font-medium">Tamaño</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const Icon = iconFor(d.kind);
                return (
                  <tr key={d.id} className="border-b border-border/30 transition-colors hover:bg-accent/30 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-md flex items-center justify-center" style={{ background: d.gradient }}>
                          <Icon className="h-4 w-4 text-white drop-shadow" />
                        </div>
                        <span className="font-mono text-[12.5px]">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="secondary" className="text-[10px] font-normal">{d.kind}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-muted-foreground">{d.format}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{d.size}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-[12px] text-muted-foreground">{fmtDate(d.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </LibraryShell>
  );
}

function DownloadCard({ d }: { d: DownloadItem }) {
  const Icon = iconFor(d.kind);
  return (
    <div className="surface-card hover-lift overflow-hidden p-0">
      <div className="relative aspect-video w-full" style={{ background: d.gradient }}>
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Icon className="h-10 w-10 text-white/95 drop-shadow-lg" />
        </div>
        <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border-0 text-white text-[10px]">{d.kind}</Badge>
      </div>
      <div className="p-4">
        <h3 className="truncate font-mono text-[12.5px]">{d.name}</h3>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{d.format} · {d.size}</span>
          <span>{fmtDate(d.date)}</span>
        </div>
        <Button size="sm" className="mt-3 w-full gap-1.5 h-8">
          <Download className="h-3 w-3" /> Descargar
        </Button>
      </div>
    </div>
  );
}
