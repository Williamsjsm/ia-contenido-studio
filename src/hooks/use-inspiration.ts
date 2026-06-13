import { useQuery } from "@tanstack/react-query";
import { inspirationMock, type InspirationSummary } from "@/lib/mock-inspiration";

export interface UseInspirationResult {
  data: InspirationSummary[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

export function useInspiration(): UseInspirationResult {
  const q = useQuery({
    queryKey: ["mock", "inspiration"],
    queryFn: () => inspirationMock as InspirationSummary[],
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const data = q.data ?? [];
  return { data, isLoading: q.isLoading, error: (q.error as Error | null) ?? null, isEmpty: data.length === 0 };
}
