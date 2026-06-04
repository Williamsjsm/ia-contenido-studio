import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
      <div className="space-y-1.5">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground sm:text-[32px] leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] text-muted-foreground max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}