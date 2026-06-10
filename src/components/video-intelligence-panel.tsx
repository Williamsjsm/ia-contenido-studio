import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Star,
  Copy as CopyIcon,
  BookmarkPlus,
  Trash2,
  Brain,
  Trophy,
  GitCompareArrows,
} from "lucide-react";
import type { VideoDraftDetail } from "@/lib/video-drafts.functions";
import {
  analyzeVideoDraft,
  saveWinningPrompt,
  listWinningPrompts,
  deleteWinningPrompt,
  type AnalysisResult,
  type PromptVariant,
} from "@/lib/video-intelligence.functions";
import { cn } from "@/lib/utils";

function stars(score: number) {
  const n = Math.round((score / 100) * 5);
  return "⭐".repeat(Math.max(1, n)) + "☆".repeat(Math.max(0, 5 - n));
}

async function clip(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    toast.success("Copiado.");
  } catch {
    toast.error("No se pudo copiar.");
  }
}

export function VideoIntelligencePanel({ draft }: { draft: VideoDraftDetail }) {
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzeVideoDraft);
  const saveFn = useServerFn(saveWinningPrompt);
  const listFn = useServerFn(listWinningPrompts);
  const delFn = useServerFn(deleteWinningPrompt);

  const analysis = useQuery({
    queryKey: ["video-analysis", draft.id, draft.prompt, draft.preset],
    queryFn: async () => {
      const r = await analyzeFn({
        data: {
          draftId: draft.id,
          prompt: draft.prompt,
          characterName: draft.character_name,
          projectTitle: draft.project_title,
          imagePrompt: draft.source_image_prompt,
          preset: draft.preset,
        },
      });
      if (!r.ok) throw new Error(r.message);
      return r.analysis as AnalysisResult;
    },
    staleTime: 60_000,
  });

  const winners = useQuery({
    queryKey: ["winning-prompts", draft.project_id ?? "all"],
    queryFn: () => listFn({ data: { projectId: draft.project_id ?? null, limit: 50 } }),
  });

  const saveMut = useMutation({
    mutationFn: (v: PromptVariant) =>
      saveFn({
        data: {
          draftId: draft.id,
          projectId: draft.project_id,
          subjectType: analysis.data?.subject_type ?? null,
          provider: draft.provider,
          variant: v.id,
          prompt: v.prompt,
          score: Math.round(v.score),
          notes: v.label,
        },
      }),
    onSuccess: () => {
      toast.success("Prompt guardado en la biblioteca.");
      qc.invalidateQueries({ queryKey: ["winning-prompts"] });
    },
    onError: () => toast.error("No se pudo guardar."),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["winning-prompts"] }),
  });

  const [selected, setSelected] = useState<string[]>([]);
  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? [prev[1], prev[2], id] : [...prev, id],
    );
  }

  const variants = analysis.data?.variants ?? [];
  const compareSet = useMemo(() => variants.filter((v) => selected.includes(v.id)), [variants, selected]);

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" /> Inteligencia de Video
          <span className="ml-auto text-[10px] text-muted-foreground">
            Análisis IA, scoring y biblioteca de prompts ganadores.
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <Tabs defaultValue="analysis">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">Análisis</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="compare">
              <GitCompareArrows className="mr-1 h-3 w-3" /> Comparar
            </TabsTrigger>
            <TabsTrigger value="library">
              <Trophy className="mr-1 h-3 w-3" /> Ganadores
            </TabsTrigger>
          </TabsList>

          {/* ANALYSIS */}
          <TabsContent value="analysis" className="mt-4 space-y-3">
            {analysis.isLoading ? (
              <p className="text-xs text-muted-foreground">Analizando contexto…</p>
            ) : analysis.isError ? (
              <p className="text-xs text-destructive">Error: {(analysis.error as Error).message}</p>
            ) : analysis.data ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/15 text-primary">
                    Tipo detectado: {analysis.data.subject_type}
                  </Badge>
                  <Badge variant="outline">Confianza: {Math.round(analysis.data.confidence)}%</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => qc.invalidateQueries({ queryKey: ["video-analysis", draft.id] })}
                  >
                    <Sparkles className="mr-1 h-3 w-3" /> Reanalizar
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{analysis.data.rationale}</p>
                <div className="rounded-md border border-border/40 bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-medium">Recomendado</p>
                  <ul className="grid gap-1 text-[11px] sm:grid-cols-2">
                    <li>🎥 Cámara: <b>{analysis.data.recommendation.camera}</b></li>
                    <li>⏱ Duración: <b>{analysis.data.recommendation.duration}s</b></li>
                    <li>📐 Aspecto: <b>{analysis.data.recommendation.aspect}</b></li>
                    <li>🎵 Ritmo: <b>{analysis.data.recommendation.rhythm}</b></li>
                    <li>🧩 Complejidad: <b>{analysis.data.recommendation.complexity}</b></li>
                    <li>🎨 Estilo: <b>{analysis.data.recommendation.visual_style}</b></li>
                  </ul>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* PROMPTS */}
          <TabsContent value="prompts" className="mt-4 space-y-2">
            {analysis.isLoading ? (
              <p className="text-xs text-muted-foreground">Generando prompts…</p>
            ) : variants.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin variantes todavía.</p>
            ) : (
              variants.map((v) => (
                <div key={v.id} className="rounded-md border border-border/40 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{v.label}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        Score {Math.round(v.score)}
                      </Badge>
                      <span className="text-[11px]">{stars(v.score)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleSelect(v.id)}>
                        <GitCompareArrows className="mr-1 h-3 w-3" />
                        {selected.includes(v.id) ? "Quitar" : "Comparar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => clip(v.prompt)}>
                        <CopyIcon className="mr-1 h-3 w-3" /> Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveMut.mutate(v)}
                        disabled={saveMut.isPending}
                      >
                        <BookmarkPlus className="mr-1 h-3 w-3" /> Guardar
                      </Button>
                    </div>
                  </div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
                    {v.prompt}
                  </pre>
                  <div className="mt-2 grid grid-cols-5 gap-1 text-[10px] text-muted-foreground">
                    <span>Cont {v.scoring.continuidad}</span>
                    <span>Real {v.scoring.realismo}</span>
                    <span>Viral {v.scoring.viralidad}</span>
                    <span>Estab {v.scoring.estabilidad}</span>
                    <span>Compat {v.scoring.compatibilidad}</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* COMPARE */}
          <TabsContent value="compare" className="mt-4">
            {compareSet.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Selecciona hasta 3 prompts desde la pestaña «Prompts» para compararlos aquí.
              </p>
            ) : (
              <div className={cn("grid gap-3", compareSet.length === 1 ? "grid-cols-1" : compareSet.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
                {compareSet.map((v, i) => (
                  <div key={v.id} className="rounded-md border border-border/40 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium">
                        Versión {String.fromCharCode(65 + i)} · {v.label}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">{Math.round(v.score)}</Badge>
                    </div>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
                      {v.prompt}
                    </pre>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => clip(v.prompt)}>
                        <CopyIcon className="mr-1 h-3 w-3" /> Copiar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => saveMut.mutate(v)}>
                        <Star className="mr-1 h-3 w-3" /> Marcar como mejor
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* LIBRARY */}
          <TabsContent value="library" className="mt-4 space-y-2">
            {winners.isLoading ? (
              <p className="text-xs text-muted-foreground">Cargando biblioteca…</p>
            ) : (winners.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin prompts guardados. Guarda los mejores desde la pestaña «Prompts».
              </p>
            ) : (
              (winners.data ?? []).map((w) => (
                <div key={w.id} className="rounded-md border border-border/40 bg-muted/20 p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Score {w.score}</Badge>
                    <span className="text-[11px]">{stars(w.score)}</span>
                    {w.variant && <Badge variant="outline" className="text-[10px]">{w.variant}</Badge>}
                    {w.provider && <Badge variant="outline" className="text-[10px]">{w.provider}</Badge>}
                    {w.subject_type && <Badge variant="outline" className="text-[10px]">{w.subject_type}</Badge>}
                    <span className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => clip(w.prompt)}>
                        <CopyIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => delMut.mutate(w.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </span>
                  </div>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
                    {w.prompt}
                  </pre>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}