import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Sparkles } from "lucide-react";

export const Route = createFileRoute("/crear/imagen")({
  head: () => ({ meta: [{ title: "Imagen IA — AI Content Studio" }] }),
  component: ImagenIA,
});

function ImagenIA() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 lg:p-10">
      <PageHeader title="Imagen IA" subtitle="Genera imágenes con modelos de IA." />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="border-border/60 bg-card">
          <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prompt</Label>
              <Textarea rows={5} placeholder="Describe la imagen que quieres generar..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Modelo</Label>
              <Select><SelectTrigger><SelectValue placeholder="Gemini Imagen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini Imagen</SelectItem>
                  <SelectItem value="flux">Flux</SelectItem>
                  <SelectItem value="sdxl">SDXL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Resolución</Label>
              <Select><SelectTrigger><SelectValue placeholder="1024×1024" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024">1024×1024</SelectItem>
                  <SelectItem value="1920">1920×1080</SelectItem>
                  <SelectItem value="1080">1080×1920</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
              onClick={() =>
                toast("Función preparada para integración futura", {
                  description: "La generación de imagen estará disponible al conectar la API.",
                })
              }
            >
              <Sparkles className="mr-2 h-4 w-4" /> Generar imagen
            </Button>
          </CardContent>
        </Card>
        <Card className="flex min-h-[480px] items-center justify-center border-dashed border-border/60 bg-card">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <p className="text-sm">Tu imagen aparecerá aquí</p>
          </div>
        </Card>
      </div>
    </div>
  );
}