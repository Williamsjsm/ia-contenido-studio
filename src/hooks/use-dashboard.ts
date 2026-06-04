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
  const data = dashboardMock;
  return {
    data,
    isLoading: false,
    error: null,
    isEmpty: !data,
  };
}
