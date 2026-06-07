import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LibraryShell } from "@/components/library-shell";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { LibraryToolbar, DEFAULT_FILTERS, type ViewMode, type LibraryFilters } from "@/components/library-toolbar";
import { fmtDate, CATEGORIES, PLATFORMS } from "@/lib/library-data";
import {
  listPrompts,
  deletePrompt,
  toggleFavoritePrompt,
  updatePromptMeta,
  duplicatePrompt,
  type StoredPrompt,
} from "@/lib/prompts.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Edit3,
  Heart,
  MoreHorizontal,
  Trash2,
  FileText,
  Eye,
  Download,
  Check,
  CopyPlus,
  Film,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientOnly, SelectTriggerSkeleton } from "@/components/ui/client-only";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/prompts")({
  component: PromptsPage,
});

type SortKey = "recent" | "oldest" | "title";

const VARIANTS: { key: keyof Pick<StoredPrompt,
  "original_prompt" | "flow_prompt" | "youtube_prompt" | "veo_prompt" | "kling_prompt">;
  label: string;
}[] = [
  { key: "original_prompt", label: "Base" },
  { key: "flow_prompt", label: "Flow" },
  { key: "youtube_prompt", label: "YouTube" },
  { key: "veo_prompt", label: "Veo" },
  { key: "kling_prompt", label: "Kling" },
];

function variantContentsForSearch(p: StoredPrompt) {
  return VARIANTS.map((v) => p[v.key] ?? "").join(" \n ");
}

function matches(p: StoredPrompt, f: LibraryFilters) {
  if (f.favoritesOnly && !p.is_favorite) return false;
  if (f.category !== "all" && p.category !== f.category) return false;
  if (f.platform !== "all" && p.platform !== f.platform) return false;
  if (f.date !== "all") {
    const days = f.date === "7d" ? 7 : f.date === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 86_400_000;
    if (!p.created_at || new Date(p.created_at).getTime() < cutoff) return false;
  }
  if (f.query.trim()) {
    const q = f.query.toLowerCase();
    const hay = [
      p.title,
      p.category ?? "",
      p.platform ?? "",
      variantContentsForSearch(p),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function PromptsPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StoredPrompt | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPrompts = useServerFn(listPrompts);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["library", "prompts"],
    queryFn: () => fetchPrompts(),
  });

  const all = useMemo(() => data ?? [], [data]);
  const items = useMemo(() => {
    const filtered = all.filter((p) => matches(p, filters));
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sort === "recent" ? tb - ta : ta - tb;
    });
    return sorted;
  }, [all, filters, sort]);

  const selected = useMemo(
    () => all.find((p) => p.id === selectedId) ?? null,
    [all, selectedId],
  );

  const hasNoneSaved = !isLoading && !error && all.length === 0;
  const hasNoMatches = !isLoading && !error && all.length > 0 && items.length === 0;

  return (
    <LibraryShell count={all.length}>
      <div className="space-y-3">
        <LibraryToolbar view={view} onViewChange={setView} filters={filters} onFiltersChange={setFilters} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Ordenar:</span>
            <ClientOnly fallback={<SelectTriggerSkeleton />}>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Más recientes</SelectItem>
                  <SelectItem value="oldest">Más antiguos</SelectItem>
                  <SelectItem value="title">Título A–Z</SelectItem>
                </SelectContent>
              </Select>
            </ClientOnly>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => exportPrompts(items, "json")}>
              <Download className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => exportPrompts(items, "txt")}>
              <Download className="h-3.5 w-3.5" /> TXT
            </Button>
          </div>
        </div>
      </div>

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
          {items.map((p) => (
            <PromptCard
              key={p.id}
              p={p}
              onOpen={() => setSelectedId(p.id)}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeletingId(p.id)}
            />
          ))}
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {items.map((p) => (
            <PromptRow
              key={p.id}
              p={p}
              onOpen={() => setSelectedId(p.id)}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeletingId(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card divide-y divide-border/50">
          {items.map((p) => (
            <PromptCompact
              key={p.id}
              p={p}
              onOpen={() => setSelectedId(p.id)}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeletingId(p.id)}
            />
          ))}
        </div>
      )}

      <PromptDetailSheet
        prompt={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        onEdit={() => selected && setEditing(selected)}
        onDelete={() => selected && setDeletingId(selected.id)}
      />
      <PromptEditDialog
        prompt={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <PromptDeleteDialog
        id={deletingId}
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      />
    </LibraryShell>
  );
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["library", "prompts"] });
    qc.invalidateQueries({ queryKey: ["library", "counts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

interface ActionProps {
  p: StoredPrompt;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  size?: "sm" | "xs";
}

function PromptActions({ p, onOpen, onEdit, onDelete, size = "sm" }: ActionProps) {
  const invalidate = useInvalidate();
  const dup = useServerFn(duplicatePrompt);
  const dupMut = useMutation({
    mutationFn: () => dup({ data: { id: p.id } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Prompt duplicado");
        invalidate();
      } else toast.error(res.message);
    },
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(size === "xs" ? "h-7 w-7" : "h-8 w-8")}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onOpen}>
          <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => dupMut.mutate()}>
          <CopyPlus className="mr-2 h-3.5 w-3.5" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Edit3 className="mr-2 h-3.5 w-3.5" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FavoriteButton({ p }: { p: StoredPrompt }) {
  const invalidate = useInvalidate();
  const tog = useServerFn(toggleFavoritePrompt);
  const mut = useMutation({
    mutationFn: () => tog({ data: { id: p.id, is_favorite: !p.is_favorite } }),
    onSuccess: (res) => {
      if (res.ok) invalidate();
      else toast.error(res.message);
    },
  });
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        mut.mutate();
      }}
      className="text-muted-foreground hover:text-primary"
      aria-label={p.is_favorite ? "Quitar de favoritos" : "Marcar favorito"}
    >
      <Heart className={cn("h-4 w-4", p.is_favorite && "fill-primary text-primary")} />
    </button>
  );
}

function PromptCard({ p, onOpen, onEdit, onDelete }: ActionProps) {
  const excerpt = (p.original_prompt ?? "").slice(0, 160);
  return (
    <div
      className="surface-card hover-lift group flex cursor-pointer flex-col p-5"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/60">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <FavoriteButton p={p} />
      </div>
      <h3 className="mt-4 line-clamp-2 text-[14px] font-semibold leading-snug">{p.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted-foreground">{excerpt}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {p.category && <Badge variant="secondary" className="text-[10px] font-normal">{p.category}</Badge>}
        {p.platform && <Badge variant="outline" className="text-[10px] font-normal">{p.platform}</Badge>}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>
        <PromptActions p={p} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

function PromptRow({ p, onOpen, onEdit, onDelete }: ActionProps) {
  const excerpt = (p.original_prompt ?? "").slice(0, 160);
  return (
    <div className="surface-card hover-lift flex cursor-pointer items-center gap-4 p-4" onClick={onOpen}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/60">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[14px] font-semibold">{p.title}</h3>
          {p.is_favorite && <Heart className="h-3.5 w-3.5 fill-primary text-primary" />}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{excerpt}</p>
      </div>
      {p.category && <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-normal">{p.category}</Badge>}
      {p.platform && <Badge variant="outline" className="hidden md:inline-flex text-[10px] font-normal">{p.platform}</Badge>}
      <span className="hidden lg:block w-24 text-right text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>
      <PromptActions p={p} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function PromptCompact({ p, onOpen, onEdit, onDelete }: ActionProps) {
  return (
    <div
      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
      onClick={onOpen}
    >
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate text-[13px]">{p.title}</span>
      <span className="hidden md:block text-[11px] text-muted-foreground">{p.category}</span>
      <span className="hidden lg:block text-[11px] text-muted-foreground">{p.platform}</span>
      <span className="text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>
      {p.is_favorite && <Heart className="h-3 w-3 fill-primary text-primary" />}
      <PromptActions p={p} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} size="xs" />
    </div>
  );
}

// --------------------------------------------------------------------------
// Detail Sheet — shows all 5 variants with copy actions
// --------------------------------------------------------------------------
function PromptDetailSheet({
  prompt,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  prompt: StoredPrompt | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [active, setActive] = useState<string>("original_prompt");
  useEffect(() => {
    if (open) setActive("original_prompt");
  }, [open, prompt?.id]);

  if (!prompt) return null;

  const copyAll = async () => {
    const txt = VARIANTS.map(
      (v) => `=== ${v.label} ===\n${(prompt[v.key] ?? "").trim()}`,
    ).join("\n\n");
    await navigator.clipboard.writeText(txt);
    toast.success("Todas las variantes copiadas");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/50 p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="line-clamp-2 text-base">{prompt.title}</SheetTitle>
              <SheetDescription className="mt-1 text-xs">
                {fmtDate(prompt.created_at)}
                {prompt.category ? ` · ${prompt.category}` : ""}
                {prompt.platform ? ` · ${prompt.platform}` : ""}
              </SheetDescription>
            </div>
            <FavoriteButton p={prompt} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={copyAll}>
              <Copy className="h-3.5 w-3.5" /> Copiar todo
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onEdit}>
              <Edit3 className="h-3.5 w-3.5" /> Editar
            </Button>
            <SendToFlowButton prompt={prompt} />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => exportPrompts([prompt], "txt")}
            >
              <Download className="h-3.5 w-3.5" /> TXT
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => exportPrompts([prompt], "json")}
            >
              <Download className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={active} onValueChange={setActive} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 grid grid-cols-5">
            {VARIANTS.map((v) => (
              <TabsTrigger key={v.key} value={v.key} className="text-xs">
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {VARIANTS.map((v) => (
            <TabsContent key={v.key} value={v.key} className="min-h-0 flex-1 px-6 pb-6">
              <VariantPane content={prompt[v.key] ?? ""} label={v.label} />
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function VariantPane({ content, label }: { content: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const empty = !content.trim();
  const copy = async () => {
    if (empty) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-3 flex h-full flex-col gap-2">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={copy} disabled={empty}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <ScrollArea className="h-[55vh] rounded-lg border border-border/50 bg-card/40 p-4">
        {empty ? (
          <p className="text-sm text-muted-foreground">Esta variante está vacía.</p>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground">
            {content}
          </pre>
        )}
      </ScrollArea>
    </div>
  );
}

// --------------------------------------------------------------------------
// Edit Dialog
// --------------------------------------------------------------------------
function PromptEditDialog({
  prompt,
  open,
  onOpenChange,
}: {
  prompt: StoredPrompt | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const invalidate = useInvalidate();
  const update = useServerFn(updatePromptMeta);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("__none");
  const [platform, setPlatform] = useState<string>("__none");

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setCategory(prompt.category ?? "__none");
      setPlatform(prompt.platform ?? "__none");
    }
  }, [prompt?.id, open]);

  const mut = useMutation({
    mutationFn: () =>
      update({
        data: {
          id: prompt!.id,
          title: title.trim(),
          category: category === "__none" ? null : category,
          platform: platform === "__none" ? null : platform,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Prompt actualizado");
        invalidate();
        onOpenChange(false);
      } else toast.error(res.message);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar"),
  });

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar prompt</DialogTitle>
          <DialogDescription>Actualiza título, categoría y plataforma.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <ClientOnly fallback={<SelectTriggerSkeleton />}>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin categoría</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ClientOnly>
            </div>
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <ClientOnly fallback={<SelectTriggerSkeleton />}>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin plataforma</SelectItem>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ClientOnly>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !title.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------------
// Delete Dialog
// --------------------------------------------------------------------------
function PromptDeleteDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const invalidate = useInvalidate();
  const del = useServerFn(deletePrompt);
  const mut = useMutation({
    mutationFn: () => del({ data: { id: id! } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Prompt eliminado");
        invalidate();
        onOpenChange(false);
      } else toast.error(res.message);
    },
  });
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este prompt?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El prompt y sus 5 variantes se eliminarán permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --------------------------------------------------------------------------
// Export helpers
// --------------------------------------------------------------------------
function exportPrompts(items: StoredPrompt[], format: "json" | "txt") {
  if (items.length === 0) {
    toast.info("No hay prompts para exportar.");
    return;
  }
  let blob: Blob;
  let filename: string;
  if (format === "json") {
    blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    filename = `prompts-${new Date().toISOString().slice(0, 10)}.json`;
  } else {
    const txt = items
      .map((p) =>
        [
          `# ${p.title}`,
          `Fecha: ${fmtDate(p.created_at)}`,
          p.category ? `Categoría: ${p.category}` : "",
          p.platform ? `Plataforma: ${p.platform}` : "",
          "",
          ...VARIANTS.map((v) => `=== ${v.label} ===\n${(p[v.key] ?? "").trim()}`),
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n----------------------------------------\n\n");
    blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    filename = `prompts-${new Date().toISOString().slice(0, 10)}.txt`;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast.success(`Exportado ${items.length} prompt${items.length === 1 ? "" : "s"} (${format.toUpperCase()})`);
}
