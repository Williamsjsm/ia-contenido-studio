import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground bg-[image:var(--gradient-primary)] shadow-[0_0_22px_-4px_rgba(168,85,247,0.55),0_0_50px_-14px_rgba(124,58,237,0.45)] hover:brightness-110 transition-[filter,box-shadow,transform]",
        destructive:
            "text-destructive-foreground bg-[linear-gradient(135deg,#7f1d1d,#ef4444)] shadow-[0_0_20px_-4px_rgba(239,68,68,0.55)] hover:brightness-110",
        outline:
          "border border-input bg-[linear-gradient(165deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/40",
        secondary:
          "text-secondary-foreground bg-[linear-gradient(135deg,#1e3a8a,#3b82f6)] shadow-[0_0_18px_-4px_rgba(59,130,246,0.55)] hover:brightness-110",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
