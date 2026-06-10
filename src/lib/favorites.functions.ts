import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * Favoritos globales: imágenes, prompts, tendencias y personajes.
 * Cada lista retorna un DTO plano para SSR.
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function ownerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export type FavoriteImage = {
  id: string;
  prompt: string;
  provider: string;
  image_base64: string | null;
  created_at: string;
  character_name: string | null;
};
export type FavoritePrompt = {
  id: string;
  title: string;
  category: string | null;
  platform: string | null;
  created_at: string;
};
export type FavoriteTrend = {
  id: string;
  title: string;
  platform: string;
  category: string;
  thumbnail_url: string | null;
  viral_score: number;
  created_at: string;
};
export type FavoriteCharacter = {
  id: string;
  name: string;
  description: string | null;
  reference_image_url: string | null;
  created_at: string;
};

export type FavoritesPayload = {
  images: FavoriteImage[];
  prompts: FavoritePrompt[];
  trends: FavoriteTrend[];
  characters: FavoriteCharacter[];
};

export const listAllFavorites = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<FavoritesPayload> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();

    const [imgsRes, promptsRes, trendsRes, charsRes] = await Promise.all([
      supabaseAdmin
        .from("image_generations")
        .select("id, prompt, provider, image_base64, created_at, character_name")
        .eq("user_id", owner)
        .eq("is_favorite", true)
        .order("created_at", { ascending: false })
        .limit(120),
      supabaseAdmin
        .from("prompts")
        .select("id, title, category, platform, created_at")
        .eq("user_id", owner)
        .eq("is_favorite", true)
        .order("created_at", { ascending: false })
        .limit(120),
      supabaseAdmin
        .from("viral_trends")
        .select("id, title, platform, category, thumbnail_url, viral_score, created_at")
        .eq("user_id", owner)
        .eq("favorite", true)
        .order("created_at", { ascending: false })
        .limit(120),
      supabaseAdmin
        .from("virtual_characters")
        .select("id, name, description, reference_image_url, created_at")
        .eq("user_id", owner)
        .eq("is_favorite", true)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    return {
      images: (imgsRes.data ?? []) as FavoriteImage[],
      prompts: (promptsRes.data ?? []) as FavoritePrompt[],
      trends: (trendsRes.data ?? []) as FavoriteTrend[],
      characters: (charsRes.data ?? []) as FavoriteCharacter[],
    };
  });

export const toggleFavoriteCharacter = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_favorite: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = ownerId();
    const { error } = await supabaseAdmin
      .from("virtual_characters")
      .update({ is_favorite: data.is_favorite })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });