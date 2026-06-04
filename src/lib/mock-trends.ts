/** Mock summary data for the Trends module. Replace with real API later. */
export interface TrendSummary {
  id: string;
  title: string;
  platform: "TikTok" | "YouTube" | "Facebook" | "Instagram";
  viral: number;
  growth: string;
}

export const trendsMock: TrendSummary[] = [
  { id: "t1", title: "Frutas medicinales IA", platform: "TikTok", viral: 94, growth: "+212%" },
  { id: "t2", title: "Pitahaya bioluminiscente", platform: "Instagram", viral: 88, growth: "+147%" },
  { id: "t3", title: "Restauraciones vintage", platform: "YouTube", viral: 81, growth: "+96%" },
  { id: "t4", title: "Animales con poderes IA", platform: "TikTok", viral: 76, growth: "+58%" },
];
