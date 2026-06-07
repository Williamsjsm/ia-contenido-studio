import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/publicar")({
  head: () => ({
    meta: [
      { title: "Centro de Publicación — AI Content Studio" },
      {
        name: "description",
        content:
          "Gestiona, programa y analiza la publicación de tu contenido en TikTok, Instagram, Facebook y YouTube.",
      },
    ],
  }),
  component: () => <Navigate to="/publicacion" />,
});
