import { useQuery } from "@tanstack/react-query";
import { publishingMock, type PublishSummary } from "@/lib/mock-publishing";

export interface UsePublishingResult {
  data: PublishSummary[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

export function usePublishing(): UsePublishingResult {
  const q = useQuery({
    queryKey: ["mock", "publishing"],
    queryFn: () => publishingMock as PublishSummary[],
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const data = q.data ?? [];
  return { data, isLoading: q.isLoading, error: (q.error as Error | null) ?? null, isEmpty: data.length === 0 };
}
