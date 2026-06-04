import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Cargando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "surface-card flex flex-col items-center justify-center gap-3 p-12 text-center",
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-meta text-muted-foreground">{label}</p>
    </div>
  );
}
