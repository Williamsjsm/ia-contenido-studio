/** Mock data for the Dashboard module. Replace with real API later. */
export interface DashboardData {
  activeProject: {
    name: string;
    status: string;
    lastActivity: string;
    lastVideo: string;
    lastPrompt: string;
    version: string;
  };
  trend: { category: string; viral: number };
  idea: { idea: string; reason: string };
  production: { project: string; status: string };
  nextPublish: { platform: string; date: string; status: string };
  insight: string;
}

export const dashboardMock: DashboardData = {
  activeProject: {
    name: "Frutas IA — Pitahaya",
    status: "En progreso",
    lastActivity: "hace 2 horas",
    lastVideo: "Pitahaya bioluminiscente · 0:08",
    lastPrompt: "Macro cinematográfico de pitahaya cortada, interior glow azul…",
    version: "v0.12",
  },
  trend: { category: "Frutas medicinales IA", viral: 94 },
  idea: {
    idea: "Serie de 8s: 'Pitahaya que cura'",
    reason: "El nicho crece +212% esta semana en TikTok.",
  },
  production: { project: "Restauraciones vintage", status: "Renderizando 70%" },
  nextPublish: { platform: "TikTok", date: "Hoy · 19:30", status: "Programada" },
  insight: "Los videos de Pitahaya superan al resto del catálogo.",
};
