import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LifecycleStatus } from "@/lib/creation-projects.functions";

const LABELS: Record<LifecycleStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  archived: "Archivado",
};

const STYLES: Record<LifecycleStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  completed: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  className,
}: {
  status: LifecycleStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] uppercase tracking-wider", STYLES[status], className)}
    >
      {LABELS[status]}
    </Badge>
  );
}