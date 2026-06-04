import { trendsMock, type TrendSummary } from "@/lib/mock-trends";

export interface UseTrendsResult {
  data: TrendSummary[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

export function useTrends(): UseTrendsResult {
  const data = trendsMock;
  return {
    data,
    isLoading: false,
    error: null,
    isEmpty: data.length === 0,
  };
}
