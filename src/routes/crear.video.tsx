import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Sparkles } from "lucide-react";

export const Route = createFileRoute("/crear/video")({
  head: () => ({ meta: [{ title: "Video IA — AI Content Studio" }] }),
  component: VideoIA,
});

function VideoIA() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 lg:p-10">
      <PageHeader title="Video IA" subtitle="Genera videos cortos con IA generativa." />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="border-border/60 bg-card">
          <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prompt</Label>
              <Textarea rows={5} placeholder="Describe el video..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modelo">
                <Select><SelectTrigger><SelectValue placeholder="Veo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veo">Veo</SelectItem>
                    <SelectItem value="sora">Sora</SelectItem>
                    <SelectItem value="runway">Runway</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duración">
                <Select><SelectTrigger><SelectValue placeholder="8s" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5s</SelectItem>
                    <SelectItem value="8">8s</SelectItem>
                    <SelectItem value="15">15s</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Resolución">
                <Select><SelectTrigger><SelectValue placeholder="1080p" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720">720p</SelectItem>
                    <SelectItem value="1080">1080p</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Aspecto">
                <Select><SelectTrigger><SelectValue placeholder="9:16" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Button
              className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
              onClick={() =>
                toast("Función preparada para integración futura", {
                  description: "La generación de video estará disponible al conectar la API.",
                })
              }
            >
              <Sparkles className="mr-2 h-4 w-4" /> Generar video
            </Button>
          </CardContent>
        </Card>
        <Card className="flex min-h-[480px] items-center justify-center border-dashed border-border/60 bg-card">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Video className="h-10 w-10" />
            <p className="text-sm">Vista previa del video</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}