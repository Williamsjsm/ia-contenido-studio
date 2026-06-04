import { Link, useRouterState } from "@tanstack/react-router";
import { ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarClock, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowConnector } from "@/components/flow-connector";
import { libraryTabs } from "@/lib/navigation";
import { EmptyState as GlobalEmptyState } from "@/components/state/empty-state";

export function LibraryShell({ children, count }: { children: ReactNode; count?: number }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Biblioteca Inteligente"
        subtitle="Todos tus recursos creados en AI Content Studio, centralizados y buscables."
        actions={
          <>
            {typeof count === "number" && (
              <div className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <span className="font-medium text-foreground">{count.toLocaleString("es")}</span>
                <span>recursos</span>
              </div>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() =>
                toast("Función preparada para integración futura", {
                  description: "Podrás crear recursos cuando conectemos la API real.",
                })
              }
            >
              <Sparkles className="h-3.5 w-3.5" /> Nuevo recurso
            </Button>
          </>
        }
      />

      <div className="-mx-1 overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
          {libraryTabs.map((t) => {
            const active = path === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                  active
                    ? "bg-accent text-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <t.icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "")} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}

      <FlowConnector
        title="Continúa el flujo desde tu biblioteca"
        description="Programa tu contenido para publicación o analiza su rendimiento."
        steps={[
          { label: "Programar Publicación", to: "/publicar", icon: CalendarClock },
          { label: "Ver Rendimiento", to: "/investigar/aprendizaje", icon: BarChart3 },
        ]}
      />
    </div>
  );
}

/** Backwards-compatible wrapper used by /biblioteca/* routes. */
export function EmptyState({ label }: { label: string }) {
  return (
    <GlobalEmptyState
      title="Sin resultados"
      description={`No se encontraron ${label} con los filtros actuales.`}
    />
  );
}
