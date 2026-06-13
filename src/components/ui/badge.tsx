import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent text-primary-foreground bg-[image:var(--gradient-primary)] shadow-[0_0_14px_-2px_rgba(168,85,247,0.55)]",
        secondary:
          "border-transparent text-secondary-foreground bg-[linear-gradient(135deg,#1e3a8a,#3b82f6)] shadow-[0_0_12px_-2px_rgba(59,130,246,0.55)]",
        destructive:
          "border-transparent text-destructive-foreground bg-[linear-gradient(135deg,#7f1d1d,#ef4444)] shadow-[0_0_12px_-2px_rgba(239,68,68,0.55)]",
        outline: "text-foreground",
        /* === Design System status variants ===
         * Use these for any status indicator across modules. Do NOT
         * hand-roll classes like "bg-emerald-500/15 text-emerald-400".
         */
        success: "border-success/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(110,231,183,0.10))] text-success shadow-[0_0_10px_-2px_rgba(16,185,129,0.45)]",
        warning: "border-warning/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.20),rgba(252,211,77,0.10))] text-warning shadow-[0_0_10px_-2px_rgba(245,158,11,0.45)]",
        info:    "border-info/30 bg-[linear-gradient(135deg,rgba(6,182,212,0.20),rgba(103,232,249,0.10))] text-info shadow-[0_0_10px_-2px_rgba(6,182,212,0.45)]",
        soft:    "border-border/60 bg-[linear-gradient(165deg,rgba(255,255,255,0.05),rgba(255,255,255,0))] text-muted-foreground",
        brand:   "border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);


export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
