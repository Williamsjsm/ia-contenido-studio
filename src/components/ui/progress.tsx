"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.08))] border border-white/5",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 transition-all"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
        backgroundImage: "var(--gradient-primary)",
        boxShadow: "0 0 12px rgba(168,85,247,0.55), 0 0 24px -4px rgba(124,58,237,0.4)",
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
