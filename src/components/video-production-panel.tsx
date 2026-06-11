import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoDraftDetail } from "@/lib/video-drafts.functions";
import {
  completeSimulatedGeneration,
  listGeneratedVideos,
  setDraftProductionStatus,
  type GeneratedVideoStatus,
} from "@/lib/generated-videos.functions";

const FLOW: GeneratedVideoStatus[] = ["prepared", "queued", "generating", "completed"];
const LABELS: Record<GeneratedVideoStatus, string> = {
  draft: "Draft",
  prepared: "Preparado",
  queued: "En cola",
  generating: "Generando",
  completed: "Completado",
  failed: "Fallido",
};

const COLORS: Record<GeneratedVideoStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  prepared: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  queued: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  generating: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function ProductionStatusBadge({ status }: { status: GeneratedVideoStatus }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", COLORS[status])}>
      {LABELS[status]}
    </Badge>
  );
}

export function VideoProductionPanel({ draft }: { draft: VideoDraftDetail }) {
  const qc = useQueryClient();
  const setStatusFn = useServerFn(setDraftProductionStatus);
  const completeFn = useServerFn(completeSimulatedGeneration);
  const [simulating, setSimulating] = useState(false);
  const currentStatus = (draft.status ?? "draft") as GeneratedVideoStatus;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["video-drafts"] });
    qc.invalidateQueries({ queryKey: ["video-draft", draft.id] });
    qc.invalidateQueries({ queryKey: ["generated-videos"] });
    qc.invalidateQueries({ queryKey: ["production-stats"] });
  }

  async function simulate() {
    if (simulating) return;
    setSimulating(true);
    try {
      for (const step of FLOW.slice(0, -1)) {
        const r = await setStatusFn({ data: { draftId: draft.id, status: step } });
        if (!r.ok) {
          toast.error(r.message);
          return;
        }
        invalidate();
        await new Promise((res) => setTimeout(res, 900));
      }
      const final = await completeFn({ data: { draftId: draft.id } });
      if (!final.ok) {
        toast.error(final.message);
        return;
      }
      toast.success("Generación simulada completada.");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error en la simulación.");
    } finally {
      setSimulating(false);
    }
  }

  const currentIdx = FLOW.indexOf(currentStatus);

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" /> Producción
          <span className="ml-auto"><ProductionStatusBadge status={currentStatus} /></span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4 text-xs">
          <Meta label="Proveedor" value={draft.provider ?? "—"} />
          <Meta label="Duración" value={draft.duration ? `${draft.duration}s` : "—"} />
          <Meta label="Aspecto" value={draft.aspect_ratio ?? "—"} />
          <Meta label="Actualizado" value={fmtDate(draft.updated_at)} />
        </div>

        <div className="flex items-center gap-1.5">
          {FLOW.map((step, i) => {
            const reached = currentIdx >= i || currentStatus === "completed";
            const active = currentStatus === step;
            return (
              <div key={step} className="flex flex-1 items-center gap-1.5">
                <div
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition",
                    reached ? "bg-primary" : "bg-muted",
                    active && "animate-pulse",
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] uppercase tracking-wider",
                    reached ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={simulate}
            disabled={simulating || currentStatus === "completed"}
            className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
          >
            {simulating ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-3.5 w-3.5" />
            )}
            {simulating ? "Simulando…" : "Simular generación"}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Crea un registro en <span className="font-mono">generated_videos</span>. No llama a ningún proveedor.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate text-xs">{value}</p>
    </div>
  );
}

export function ProductionQueueTab() {
  const listFn = useServerFn(listGeneratedVideos);
  const videos = useQuery({ queryKey: ["generated-videos"], queryFn: () => listFn() });

  const rows = videos.data ?? [];
  const drafts = rows.filter((v) => v.status === "draft" || v.status === "prepared");
  const inFlight = rows.filter((v) => v.status === "queued" || v.status === "generating");
  const completed = rows.filter((v) => v.status === "completed");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<Clock className="h-4 w-4" />} label="Drafts" value={drafts.length} />
        <StatCard icon={<Loader2 className="h-4 w-4" />} label="En cola / Generando" value={inFlight.length} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completados" value={completed.length} />
        <StatCard icon={<XCircle className="h-4 w-4" />} label="Fallidos" value={rows.filter((v) => v.status === "failed").length} />
      </div>

      <div className="overflow-hidden rounded-md border border-border/40">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Proveedor</th>
              <th className="px-3 py-2 text-left">Duración</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Aún no hay registros de producción. Lanza una simulación desde un borrador.
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id} className="border-t border-border/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {v.thumbnail_url ? (
                        <img
                          src={v.thumbnail_url}
                          alt=""
                          className="h-8 w-12 rounded object-cover bg-black/20"
                        />
                      ) : (
                        <div className="h-8 w-12 rounded bg-muted" />
                      )}
                      <span className="line-clamp-1">{v.title}</span>
                      {v.is_simulated && (
                        <Badge variant="outline" className="text-[9px]">
                          <Sparkles className="mr-1 h-2.5 w-2.5" /> sim
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{v.provider ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{v.duration ? `${v.duration}s` : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDate(v.created_at)}</td>
                  <td className="px-3 py-2">
                    <ProductionStatusBadge status={v.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}