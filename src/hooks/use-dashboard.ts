import { useQuery } from "@tanstack/react-query";
import { dashboardMock, type DashboardData } from "@/lib/mock-dashboard";

export interface UseDashboardResult {
  data: DashboardData | null;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

/**
 * Simulated dashboard hook. Returns mock data synchronously.
 * Replace internals with a real query (TanStack Query + server fn) later;
 * the public shape stays the same so consumers do not break.
 */
export function useDashboard(): UseDashboardResult {
  const q = useQuery({
    queryKey: ["mock", "dashboard"],
    queryFn: () => dashboardMock as DashboardData,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  return {
    data: q.data ?? null,
    isLoading: q.isLoading,
    error: (q.error as Error | null) ?? null,
    isEmpty: !q.data,
  };
}
