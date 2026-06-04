/** Mock summary data for the Inspiration module. Replace with real API later. */
export interface InspirationSummary {
  id: string;
  title: string;
  category: string;
  viral: number;
  saved: boolean;
}

export const inspirationMock: InspirationSummary[] = [
  { id: "i1", title: "Tigre dorado bajo niebla volumétrica", category: "Cinemático", viral: 97, saved: true },
  { id: "i2", title: "POV cocina ASMR — tungsteno cálido", category: "Social", viral: 92, saved: false },
  { id: "i3", title: "Skyline Tokyo neón cinemático", category: "Cinemático", viral: 88, saved: true },
  { id: "i4", title: "Aurora boreal sintética", category: "Naturaleza", viral: 84, saved: false },
];
