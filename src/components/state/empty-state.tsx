import { Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function EmptyState({
  title = "Sin resultados",
  description,
  icon: Icon = Sparkles,
  action,
  className,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center justify-center gap-2 p-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/60">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-body font-medium">{title}</p>
      {description ? (
        <p className="text-meta text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
