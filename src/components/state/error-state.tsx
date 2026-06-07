import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ErrorState({
  title = "Ocurrió un error",
  description = "No pudimos cargar la información. Intenta nuevamente.",
  detail,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div
      role="alert"
      className={cn(
        "surface-destructive flex flex-col items-center justify-center gap-2 p-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <p className="text-body font-medium">{title}</p>
      <p className="text-meta text-muted-foreground">{description}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
        {detail ? (
          <Button size="sm" variant="ghost" onClick={() => setShowDetail((v) => !v)}>
            {showDetail ? "Ocultar detalles" : "Ver detalles técnicos"}
          </Button>
        ) : null}
      </div>
      {detail && showDetail ? (
        <pre className="mt-2 max-w-full overflow-auto whitespace-pre-wrap rounded-md bg-background/40 p-3 text-left text-[11px] text-muted-foreground">
          {detail}
        </pre>
      ) : null}
    </div>
  );
}
