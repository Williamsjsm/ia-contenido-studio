import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FlowStep {
  /** Label shown on the button, e.g. "Crear Prompt" */
  label: string;
  /** Destination route, e.g. "/crear/prompts" */
  to: string;
  icon: LucideIcon;
}

/**
 * Contextual cross-module navigation bar.
 * Connects each module with the logical next step(s) in the creative flow,
 * e.g. Tendencias → Inspiración → Prompts → Flow → Biblioteca → Publicación → Aprendizaje.
 */
export function FlowConnector({
  title,
  description,
  steps,
  className,
}: {
  title: string;
  description?: string;
  steps: FlowStep[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ArrowRight className="h-4 w-4 text-primary" />
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <Button
              key={step.to}
              asChild
              size="sm"
              variant={i === 0 ? "default" : "outline"}
              className="gap-1.5"
            >
              <Link to={step.to}>
                <Icon className="h-3.5 w-3.5" />
                {step.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}