import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Save, Pencil, Heart, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Film } from "lucide-react";
import { FlowConnector } from "@/components/flow-connector";

export const Route = createFileRoute("/crear/prompts")({
  head: () => ({ meta: [{ title: "Generador de Prompts — AI Content Studio" }] }),
  component: PromptsGenerator,
});

const templates = [
  { id: "frutas", label: "Animales de Frutas" },
  { id: "influencer", label: "Influencer IA" },
  { id: "curiosidades", label: "Curiosidades de Frutas" },
  { id: "restauraciones", label: "Restauraciones" },
  { id: "historias", label: "Historias" },
];

function PromptsGenerator() {
  const [result, setResult] = useState("");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Generador de Prompts"
        subtitle="Crea prompts optimizados por categoría, plataforma y estilo."
      />

      <Tabs defaultValue="frutas" className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-card p-1">
          {templates.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {templates.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60 bg-card">
                <CardHeader>
                  <CardTitle className="text-base">{t.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Categoría">
                    <Input placeholder="Ej. Pitahaya tropical" />
                  </Field>
                  <Field label="Plataforma">
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Selecciona plataforma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Estilo">
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Cinemático, realista..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">Cinemático</SelectItem>
                        <SelectItem value="realistic">Realista</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="anime">Anime</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Idioma">
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Español" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">Inglés</SelectItem>
                          <SelectItem value="pt">Portugués</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Duración">
                      <Select>
                        <SelectTrigger><SelectValue placeholder="8s" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 segundos</SelectItem>
                          <SelectItem value="8">8 segundos</SelectItem>
                          <SelectItem value="15">15 segundos</SelectItem>
                          <SelectItem value="30">30 segundos</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Button
                    className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
                    onClick={() =>
                      setResult(
                        `[${t.label}] Prompt generado:\nUn video cinemático en estilo realista, en español, de 8 segundos, mostrando ${t.label.toLowerCase()} con iluminación dramática y enfoque macro.`,
                      )
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Generar prompt
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Resultado</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copiado"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost"><Save className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost"><Heart className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="Aquí aparecerá tu prompt generado..."
                    className="min-h-[280px] resize-none bg-background/40 font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <FlowConnector
        title="Tu prompt está listo"
        description="Envíalo al Flow Center para generar tu video o guárdalo en la biblioteca."
        steps={[
          { label: "Enviar a Flow", to: "/crear/flow", icon: Film },
          { label: "Guardar en Biblioteca", to: "/biblioteca/prompts", icon: Save },
        ]}
      />
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