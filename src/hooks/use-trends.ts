import { useQuery } from "@tanstack/react-query";
import { trendsMock, type TrendSummary } from "@/lib/mock-trends";

export interface UseTrendsResult {
  data: TrendSummary[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

export function useTrends(): UseTrendsResult {
  const q = useQuery({
    queryKey: ["mock", "trends"],
    queryFn: () => trendsMock as TrendSummary[],
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const data = q.data ?? [];
  return { data, isLoading: q.isLoading, error: (q.error as Error | null) ?? null, isEmpty: data.length === 0 };
}
