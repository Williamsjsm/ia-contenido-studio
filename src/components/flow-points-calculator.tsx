import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Sparkles, Info } from "lucide-react";

export type FlowMode = "imagen" | "video";
export type FlowMediaType = "fotogramas" | "ingredientes";
export type FlowAspect = "9:16" | "16:9";
export type FlowVariations = 1 | 2 | 3 | 4;
export type FlowDuration = 4 | 6 | 8 | 10;
export type FlowModel = "omni-flash";

export interface FlowPointsState {
  mode: FlowMode;
  mediaType: FlowMediaType;
  aspect: FlowAspect;
  variations: FlowVariations;
  duration: FlowDuration;
  model: FlowModel;
}

export const FLOW_POINTS_PRESETS: Array<{
  id: string;
  label: string;
  hint: string;
  patch: Partial<FlowPointsState>;
}> = [
  { id: "eco", label: "Económico", hint: "4s · x1", patch: { duration: 4, variations: 1 } },
  { id: "balanced", label: "Balanceado", hint: "8s · x1", patch: { duration: 8, variations: 1 } },
  { id: "max", label: "Máximo alcance", hint: "10s · x2", patch: { duration: 10, variations: 2 } },
  { id: "explore", label: "Exploración", hint: "6s · x4", patch: { duration: 6, variations: 4 } },
];

/** Omni Flash base cost = 1.5 puntos por segundo de video. Imagen = 1 punto / variación. */
export function calculateFlowPoints(s: FlowPointsState): number {
  if (s.mode === "imagen") return 1 * s.variations;
  const base = Math.round(s.duration * 1.5); // 4→6, 6→9, 8→12, 10→15
  return base * s.variations;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/80",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-eyebrow">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function FlowPointsCalculator({
  state,
  onChange,
}: {
  state: FlowPointsState;
  onChange: (s: FlowPointsState) => void;
}) {
  const points = calculateFlowPoints(state);
  const set = <K extends keyof FlowPointsState>(k: K, v: FlowPointsState[K]) =>
    onChange({ ...state, [k]: v });

  return (
    <Card className="surface-card border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="h-4 w-4 text-primary" />
          Control de puntos Flow
          <Badge variant="outline" className="ml-auto border-border/60 bg-background/60 text-[10px] font-normal text-muted-foreground">
            estimación
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {FLOW_POINTS_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ ...state, ...p.patch })}
              className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              title={p.hint}
            >
              {p.label}
              <span className="ml-1.5 text-[10px] opacity-70">· {p.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Row label="Tipo">
            <Pill active={state.mode === "imagen"} onClick={() => set("mode", "imagen")}>Imagen</Pill>
            <Pill active={state.mode === "video"} onClick={() => set("mode", "video")}>Video</Pill>
          </Row>
          <Row label="Modo">
            <Pill active={state.mediaType === "fotogramas"} onClick={() => set("mediaType", "fotogramas")}>Fotogramas</Pill>
            <Pill active={state.mediaType === "ingredientes"} onClick={() => set("mediaType", "ingredientes")}>Ingredientes</Pill>
          </Row>
          <Row label="Relación de aspecto">
            <Pill active={state.aspect === "9:16"} onClick={() => set("aspect", "9:16")}>9:16</Pill>
            <Pill active={state.aspect === "16:9"} onClick={() => set("aspect", "16:9")}>16:9</Pill>
          </Row>
          <Row label="Variaciones">
            {([1, 2, 3, 4] as const).map((v) => (
              <Pill key={v} active={state.variations === v} onClick={() => set("variations", v)}>
                x{v}
              </Pill>
            ))}
          </Row>
          <Row label="Modelo">
            <Pill active={state.model === "omni-flash"} onClick={() => set("model", "omni-flash")}>Omni Flash</Pill>
          </Row>
          <Row label="Duración">
            {([4, 6, 8, 10] as const).map((d) => (
              <Pill key={d} active={state.duration === d} onClick={() => set("duration", d)}>
                {d}s
              </Pill>
            ))}
          </Row>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-[image:var(--gradient-primary)]/10 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimación</p>
            <p className="text-sm font-semibold text-foreground">
              La generación consumirá{" "}
              <span className="font-mono tabular-nums text-primary">{points}</span> puntos
            </p>
          </div>
          <Badge className="border-0 bg-primary/15 text-primary">{state.mode}</Badge>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Estimación basada en la configuración visible de Flow. El consumo real puede variar.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}