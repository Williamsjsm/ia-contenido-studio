import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, FileJson, Package } from "lucide-react";
import type { VideoDraftDetail } from "@/lib/video-drafts.functions";
import {
  PROVIDERS,
  PROVIDER_LABEL,
  buildProviderPack,
  packToJson,
  packToTxt,
  downloadBlob,
  type ProviderId,
  type ProviderPack,
} from "@/lib/video-export-pack";

async function copy(text: string, label = "Copiado") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("No se pudo copiar.");
  }
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "video";
}

export function VideoExportPack({ draft }: { draft: VideoDraftDetail }) {
  const [provider, setProvider] = useState<ProviderId>("flow");

  const pack: ProviderPack = useMemo(() => buildProviderPack(provider, draft), [provider, draft]);
  const base = `${slug(draft.title)}-${pack.provider}`;

  const promptBlocks: Array<{ id: string; label: string; value: string }> = [
    { id: "initial", label: "Prompt Inicial", value: pack.prompts.initial },
    { id: "continuation", label: "Prompt Continuación", value: pack.prompts.continuation },
    { id: "extension", label: "Prompt Extensión", value: pack.prompts.extension },
    { id: "fixedCamera", label: "Prompt Cámara Fija", value: pack.prompts.fixedCamera },
  ];

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4" /> Exportar Video
          <span className="ml-auto text-[10px] text-muted-foreground">
            Paquete listo para usar — sin conectar API.
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <Tabs value={provider} onValueChange={(v) => setProvider(v as ProviderId)}>
          <TabsList className="grid w-full grid-cols-4">
            {PROVIDERS.map((p) => (
              <TabsTrigger key={p} value={p}>
                {PROVIDER_LABEL[p]}
              </TabsTrigger>
            ))}
          </TabsList>

          {PROVIDERS.map((p) => (
            <TabsContent key={p} value={p} className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  Duración {pack.config.duration}s
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Aspecto {pack.config.aspect}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Cámara {pack.config.camera}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Estilo {pack.config.style}
                </Badge>
                {pack.reference.character && (
                  <Badge variant="outline" className="text-[10px]">
                    Personaje: {pack.reference.character}
                  </Badge>
                )}
                {pack.reference.project && (
                  <Badge variant="outline" className="text-[10px]">
                    Proyecto: {pack.reference.project}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {promptBlocks.map((b) => (
                  <div key={b.id} className="rounded-md border border-border/40 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium">{b.label}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copy(b.value, `${b.label} copiado.`)}
                      >
                        <Copy className="mr-1.5 h-3 w-3" /> Copiar
                      </Button>
                    </div>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
                      {b.value}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(packToTxt(pack), "Pack completo copiado.")}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar todo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    downloadBlob(`${base}.txt`, packToTxt(pack), "text/plain");
                    toast.success("TXT descargado.");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Descargar TXT
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    downloadBlob(`${base}.json`, packToJson(pack), "application/json");
                    toast.success("JSON descargado.");
                  }}
                >
                  <FileJson className="mr-1.5 h-3.5 w-3.5" /> Descargar JSON
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Optimizado para {PROVIDER_LABEL[p]}. No conecta API — copia o descarga y úsalo manualmente.
              </p>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}