import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only after the component has mounted on the client.
 * Useful to avoid SSR/CSR hydration mismatches in components that render
 * differently on the server vs. the client (e.g. Radix Select's hidden
 * native bubble input).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * Skeleton matching the visual height of <SelectTrigger /> so layout does
 * not shift between SSR and the post-mount client render.
 */
export function SelectTriggerSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground opacity-50"
    >
      <span className="line-clamp-1">&nbsp;</span>
    </div>
  );
}