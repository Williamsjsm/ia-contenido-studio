import { publishingMock, type PublishSummary } from "@/lib/mock-publishing";

export interface UsePublishingResult {
  data: PublishSummary[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

export function usePublishing(): UsePublishingResult {
  const data = publishingMock;
  return {
    data,
    isLoading: false,
    error: null,
    isEmpty: data.length === 0,
  };
}
