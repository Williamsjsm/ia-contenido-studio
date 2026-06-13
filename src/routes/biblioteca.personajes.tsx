import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Copy,
  Pencil,
  Users,
  Loader2,
  Upload,
  ImagePlus,
  X,
  Wand2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { LibraryShell, EmptyState } from "@/components/library-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { LoadingState } from "@/components/state/loading-state";
import { ErrorState } from "@/components/state/error-state";
import { supabase } from "@/integrations/supabase/client";
import { maybeCompressImage } from "@/lib/image-compress";
import {
  listVirtualCharacters,
  createVirtualCharacter,
  updateVirtualCharacter,
  deleteVirtualCharacter,
  duplicateVirtualCharacter,
  createVisualUploadTarget,
  signVisualImage,
  type VirtualCharacter,
} from "@/lib/visual-library.functions";
import { ImportCharacterDialog } from "@/components/import-character-dialog";

export const Route = createFileRoute("/biblioteca/personajes")({
  head: () => ({ meta: [{ title: "Personajes Virtuales — AI Content Studio" }] }),
  component: PersonajesPage,
});

type FormState = {
  id?: string;
  name: string;
  description: string;
  master_prompt: string;
  tagsText: string;
  reference_image_path: string | null;
  reference_image_url: string | null;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  master_prompt: "",
  tagsText: "",
  reference_image_path: null,
  reference_image_url: null,
};

function PersonajesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listVirtualCharacters);
  const createFn = useServerFn(createVirtualCharacter);
  const updateFn = useServerFn(updateVirtualCharacter);
  const deleteFn = useServerFn(deleteVirtualCharacter);
  const duplicateFn = useServerFn(duplicateVirtualCharacter);
  const createUploadTargetFn = useServerFn(createVisualUploadTarget);
  const signImageFn = useServerFn(signVisualImage);

  const query = useQuery({ queryKey: ["library", "characters"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<VirtualCharacter | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(c: VirtualCharacter) {
    setForm({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      master_prompt: c.master_prompt ?? "",
      tagsText: (c.tags ?? []).join(", "),
      reference_image_path: c.reference_image_path,
      reference_image_url: c.reference_image_url,
    });
    setOpen(true);
  }

  async function handleFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Máx. 15 MB");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, reference_image_url: previewUrl }));
    setUploading(true);
    try {
      const c = await maybeCompressImage(file);
      const working = c.file;
      const contentType = (working.type || "image/png") as "image/png" | "image/jpeg" | "image/jpg" | "image/webp" | "image/gif";
      const target = await createUploadTargetFn({
        data: { filename: working.name, contentType, scope: "character" },
      });
      if (!target.ok) {
        toast.error("No se pudo preparar la subida", { description: target.message });
        return;
      }
      const uploaded = await supabase.storage
        .from(target.bucket)
        .uploadToSignedUrl(target.path, target.token, working, {
          contentType,
          cacheControl: "31536000",
        });
      if (uploaded.error) {
        toast.error("No se pudo subir la imagen", { description: uploaded.error.message });
        return;
      }
      setForm((f) => ({ ...f, reference_image_path: target.path }));
      signImageFn({ data: { image_path: target.path } })
        .then((r) => {
          if (r.ok && r.url) setForm((f) => ({ ...f, reference_image_url: r.url }));
        })
        .catch(() => {});
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Error de red";
      toast.error("Error recuperable al subir", { description: message });
    } finally {
      setUploading(false);
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const tags = form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        master_prompt: form.master_prompt,
        tags,
        reference_image_path: form.reference_image_path ?? null,
      };
      if (form.id) {
        const r = await updateFn({ data: { id: form.id, ...payload } });
        if (!r.ok) throw new Error(r.message);
      } else {
        const r = await createFn({ data: payload });
        if (!r.ok) throw new Error(r.message);
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Personaje actualizado" : "Personaje creado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["library", "characters"] });
    },
    onError: (e: Error) => toast.error("No se pudo guardar", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await deleteFn({ data: { id } });
      if (!r.ok) throw new Error(r.message);
    },
    onSuccess: () => {
      toast.success("Personaje eliminado");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["library", "characters"] });
    },
    onError: (e: Error) => toast.error("No se pudo eliminar", { description: e.message }),
  });

  const dupMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await duplicateFn({ data: { id } });
      if (!r.ok) throw new Error(r.message);
    },
    onSuccess: () => {
      toast.success("Duplicado");
      qc.invalidateQueries({ queryKey: ["library", "characters"] });
    },
    onError: (e: Error) => toast.error("No se pudo duplicar", { description: e.message }),
  });

  const characters = query.data ?? [];

  return (
    <LibraryShell count={characters.length}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Personajes Virtuales</h2>
          <p className="text-sm text-muted-foreground">
            Mantén consistencia visual reutilizando identidades en todos tus prompts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" /> Importar desde imagen
          </Button>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Crear personaje
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={(query.error as Error)?.message ?? "Error"} />
      ) : characters.length === 0 ? (
        <EmptyState label="personajes" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {characters.map((c) => (
            <div
              key={c.id}
              className="surface-card group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card"
            >
              <div className="relative aspect-square w-full bg-muted/40">
                {c.reference_image_url ? (
                  <img
                    src={c.reference_image_url}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Users className="h-10 w-10 opacity-40" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight">{c.name}</p>
                </div>
                {c.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                )}
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <Button
                    size="sm"
                    className="h-7 gap-1 px-2"
                    onClick={() =>
                      navigate({ to: "/crear/prompts", search: { personajeId: c.id } })
                    }
                  >
                    <Wand2 className="h-3 w-3" /> Generador
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1 px-2"
                    onClick={() =>
                      navigate({ to: "/crear/imagen", search: { personajeId: c.id } })
                    }
                  >
                    <ImageIcon className="h-3 w-3" /> Imagen IA
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={() => openEdit(c)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2"
                    onClick={() => dupMut.mutate(c.id)}
                    disabled={dupMut.isPending}
                  >
                    <Copy className="h-3 w-3" /> Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(c)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar personaje" : "Crear personaje"}</DialogTitle>
            <DialogDescription>
              Define identidad visual, rasgos físicos y estilo. Se inyectará en tus prompts automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[160px,1fr]">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Imagen de referencia
              </Label>
              <div className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/30">
                {form.reference_image_url ? (
                  <>
                    <img
                      src={form.reference_image_url}
                      alt="ref"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, reference_image_path: null, reference_image_url: null }))
                      }
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                    <span>{uploading ? "Subiendo..." : "Subir imagen"}</span>
                  </button>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full gap-1"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-3.5 w-3.5" /> {form.reference_image_url ? "Cambiar" : "Subir"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Luna, influencer tropical"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Rasgos, tono, contexto..."
                  className="min-h-[60px] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Master prompt (identidad visual)
                </Label>
                <Textarea
                  value={form.master_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, master_prompt: e.target.value }))}
                  placeholder="Mujer 25 años, ojos verdes, pelo castaño ondulado, piel bronceada, estilo fotográfico cinematográfico, iluminación cálida..."
                  className="min-h-[120px] resize-none font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Tags (separados por coma)
                </Label>
                <Input
                  value={form.tagsText}
                  onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
                  placeholder="influencer, tropical, lifestyle"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.name.trim()}
            >
              {saveMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {form.id ? "Guardar cambios" : "Crear personaje"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar personaje</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar “{confirmDelete?.name}”? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && delMut.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportCharacterDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="save"
      />
    </LibraryShell>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}