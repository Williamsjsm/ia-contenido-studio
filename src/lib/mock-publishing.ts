/** Mock summary data for the Publishing module. Replace with real API later. */
export type PublishStatus = "published" | "scheduled" | "failed" | "draft";

export interface PublishSummary {
  id: string;
  title: string;
  platform: "tiktok" | "instagram" | "facebook" | "youtube";
  date: string;
  status: PublishStatus;
}

export const publishingMock: PublishSummary[] = [
  { id: "p1", title: "Pitahaya + Jaguar (8s)", platform: "tiktok", date: "Hoy · 19:30", status: "scheduled" },
  { id: "p2", title: "Influencer IA — Lookbook", platform: "instagram", date: "5 jun · 12:30", status: "scheduled" },
  { id: "p3", title: "Tutorial Frutas Medicinales", platform: "youtube", date: "9 jun · 20:00", status: "scheduled" },
  { id: "p4", title: "Reto viral 8s", platform: "tiktok", date: "Ayer · 17:15", status: "published" },
];
