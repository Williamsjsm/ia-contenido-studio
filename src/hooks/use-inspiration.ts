import { inspirationMock, type InspirationSummary } from "@/lib/mock-inspiration";

export interface UseInspirationResult {
  data: InspirationSummary[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

export function useInspiration(): UseInspirationResult {
  const data = inspirationMock;
  return {
    data,
    isLoading: false,
    error: null,
    isEmpty: data.length === 0,
  };
}
