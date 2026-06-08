import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * TODO(auth): mientras no exista auth real usamos OWNER_USER_ID
 * + supabaseAdmin (mismo patrón que flow-jobs).
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

export const VIRAL_PLATFORMS = ["TikTok", "YouTube", "Facebook", "Instagram"] as const;
export const VIRAL_COUNTRIES = [
  "Estados Unidos",
  "Alemania",
  "Francia",
  "Brasil",
  "España",
  "México",
  "Global",
] as const;
export const VIRAL_CATEGORIES = [
  "Animales",
  "IA",
  "Curiosidades",
  "Historia",
  "Tecnología",
  "Música",
  "Terror",
  "Construcción",
  "Salud",
  "Viral General",
] as const;

export type ViralPlatform = (typeof VIRAL_PLATFORMS)[number];
export type ViralCountry = (typeof VIRAL_COUNTRIES)[number];
export type ViralCategory = (typeof VIRAL_CATEGORIES)[number];

export type ViralTrend = {
  id: string;
  title: string;
  platform: string;
  country: string;
  category: string;
  viral_score: number;
  keywords: string | null;
  source: string | null;
  favorite: boolean;
  saved: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  url?: string | null;
  video_id?: string | null;
  embed_url?: string | null;
  channel_title?: string | null;
  views?: number | null;
  likes?: number | null;
  published_at?: string | null;
  external_id?: string | null;
  source_type?: string | null;
  creator_name?: string | null;
  comment_count?: number | null;
  share_count?: number | null;
};

const SELECT_COLS =
  "id, title, platform, country, category, viral_score, keywords, source, favorite, saved, thumbnail_url, created_at, updated_at, url, video_id, embed_url, channel_title, views, likes, published_at, external_id, source_type, creator_name, comment_count, share_count";

const ListSchema = z.object({
  platform: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  savedOnly: z.boolean().optional(),
  favoritesOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listViralTrends = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<ViralTrend[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    let q = supabaseAdmin
      .from("viral_trends")
      .select(SELECT_COLS)
      .eq("user_id", owner)
      .order("viral_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 60);
    if (data.platform) q = q.eq("platform", data.platform);
    if (data.country) q = q.eq("country", data.country);
    if (data.category) q = q.eq("category", data.category);
    if (data.savedOnly) q = q.eq("saved", true);
    if (data.favoritesOnly) q = q.eq("favorite", true);
    const { data: rows, error } = await q;
    if (error) {
      console.error("listViralTrends failed:", error);
      throw new Error(error.message);
    }
    return (rows ?? []) as ViralTrend[];
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const toggleFavoriteTrend = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: row, error: readErr } = await supabaseAdmin
      .from("viral_trends")
      .select("favorite")
      .eq("id", data.id)
      .eq("user_id", owner)
      .single();
    if (readErr || !row) return { ok: false as const, message: readErr?.message ?? "No encontrada" };
    const next = !row.favorite;
    const { error } = await supabaseAdmin
      .from("viral_trends")
      .update({ favorite: next })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, favorite: next };
  });

export const toggleSavedTrend = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data: row, error: readErr } = await supabaseAdmin
      .from("viral_trends")
      .select("saved")
      .eq("id", data.id)
      .eq("user_id", owner)
      .single();
    if (readErr || !row) return { ok: false as const, message: readErr?.message ?? "No encontrada" };
    const next = !row.saved;
    const { error } = await supabaseAdmin
      .from("viral_trends")
      .update({ saved: next })
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, saved: next };
  });

export const deleteViralTrend = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { error } = await supabaseAdmin
      .from("viral_trends")
      .delete()
      .eq("id", data.id)
      .eq("user_id", owner);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

/** Catálogo curado (fallback hasta que se conecte una fuente real). */
const CURATED: Array<Omit<ViralTrend, "id" | "created_at" | "updated_at">> = [
  { title: "Animales hiperrealistas hechos con frutas exóticas", platform: "TikTok", country: "Estados Unidos", category: "Animales", viral_score: 96, keywords: "animales, frutas, IA, surrealismo", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Recreaciones históricas con IA generativa 4K", platform: "YouTube", country: "Alemania", category: "Historia", viral_score: 91, keywords: "historia, IA, recreación", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Mini documentales de IA explicada en 60s", platform: "Instagram", country: "España", category: "IA", viral_score: 88, keywords: "ia, explainer, shorts", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Curiosidades del cerebro humano · serie diaria", platform: "Facebook", country: "México", category: "Curiosidades", viral_score: 82, keywords: "cerebro, curiosidades, ciencia", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Construcciones imposibles renderizadas con IA", platform: "YouTube", country: "Francia", category: "Construcción", viral_score: 87, keywords: "construcción, arquitectura, ia", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Música ambiental generada con prompts virales", platform: "TikTok", country: "Brasil", category: "Música", viral_score: 84, keywords: "música, ambient, ia, prompts", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Historias de terror cortas estilo creepypasta IA", platform: "TikTok", country: "México", category: "Terror", viral_score: 90, keywords: "terror, creepypasta, ia", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Datos de salud sorprendentes con visual editorial", platform: "Instagram", country: "Estados Unidos", category: "Salud", viral_score: 79, keywords: "salud, datos, editorial", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Tendencia viral general: transformaciones 30 días", platform: "TikTok", country: "Global", category: "Viral General", viral_score: 93, keywords: "transformación, antes después", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Gadgets IA explicados en 45 segundos", platform: "YouTube", country: "Estados Unidos", category: "Tecnología", viral_score: 86, keywords: "gadgets, tech, ia", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Tutoriales de construcción rural en timelapse", platform: "Facebook", country: "Brasil", category: "Construcción", viral_score: 76, keywords: "construcción, timelapse, rural", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Animales rescatados, narrativa emocional", platform: "Instagram", country: "España", category: "Animales", viral_score: 81, keywords: "animales, rescate, emocional", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Curiosidades del espacio en formato vertical", platform: "TikTok", country: "Alemania", category: "Curiosidades", viral_score: 83, keywords: "espacio, ciencia, vertical", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Historia militar contada con voz IA realista", platform: "YouTube", country: "Francia", category: "Historia", viral_score: 78, keywords: "historia, voz ia, militar", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Música lo-fi infinita generada en stream", platform: "YouTube", country: "Global", category: "Música", viral_score: 88, keywords: "lofi, stream, ia", source: "curated", favorite: false, saved: false, thumbnail_url: null },
  { title: "Casas de terror abandonadas en POV vertical", platform: "TikTok", country: "Estados Unidos", category: "Terror", viral_score: 92, keywords: "terror, pov, abandonadas", source: "curated", favorite: false, saved: false, thumbnail_url: null },
];

export const seedViralTrends = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const owner = resolveOwnerId();
  const { count } = await supabaseAdmin
    .from("viral_trends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", owner);
  if ((count ?? 0) > 0) return { ok: true as const, inserted: 0, skipped: count ?? 0 };
  const rows = CURATED.map((c) => ({ ...c, user_id: owner, source_type: "curated" }));
  const { error } = await supabaseAdmin.from("viral_trends").insert(rows);
  if (error) {
    console.error("seedViralTrends failed:", error);
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const, inserted: rows.length, skipped: 0 };
});

export type RadarStats = {
  detected: number;
  saved: number;
  favorites: number;
  topCountry: { name: string; count: number } | null;
  topPlatform: { name: string; count: number } | null;
};

function topOf(values: (string | null | undefined)[]): { name: string; count: number } | null {
  const m = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of m) if (!best || count > best.count) best = { name, count };
  return best;
}

export const getRadarStats = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<RadarStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const { data, error } = await supabaseAdmin
      .from("viral_trends")
      .select("platform, country, favorite, saved")
      .eq("user_id", owner)
      .limit(2000);
    if (error) {
      console.error("getRadarStats failed:", error);
      throw new Error(error.message);
    }
    const rows = data ?? [];
    return {
      detected: rows.length,
      saved: rows.filter((r) => r.saved).length,
      favorites: rows.filter((r) => r.favorite).length,
      topCountry: topOf(rows.map((r) => r.country)),
      topPlatform: topOf(rows.map((r) => r.platform)),
    };
  });

// =========================================================
// YouTube Data API integration — datos reales por país.
// =========================================================

const COUNTRY_TO_REGION: Record<string, string> = {
  "Estados Unidos": "US",
  "Alemania": "DE",
  "Francia": "FR",
  "Brasil": "BR",
  "España": "ES",
  "México": "MX",
};

const REGION_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_REGION).map(([k, v]) => [v, k]),
);

/** Mapea categoría interna -> videoCategoryId de YouTube. */
const CATEGORY_TO_YT_ID: Record<string, string | undefined> = {
  Animales: "15",
  IA: "28",
  Tecnología: "28",
  Curiosidades: "28",
  Música: "10",
  Historia: "27",
  Terror: "24",
  Construcción: "26",
  Salud: "26",
  "Viral General": undefined,
};

/** Mapea categoryId real de YouTube -> categoría interna como fallback. */
const YT_ID_TO_CATEGORY: Record<string, string> = {
  "15": "Animales",
  "28": "Tecnología",
  "10": "Música",
  "27": "Historia",
  "24": "Viral General",
  "26": "Salud",
  "20": "Viral General",
  "22": "Viral General",
  "23": "Viral General",
  "25": "Curiosidades",
};

function viralScoreFromViews(views: number): number {
  if (!views || views <= 0) return 0;
  // 1k → ~30, 100k → ~50, 1M → ~70, 10M → ~85, 100M → ~98
  const score = Math.round(Math.log10(views) * 16);
  return Math.max(0, Math.min(100, score));
}

const FetchYouTubeSchema = z.object({
  countries: z.array(z.string().min(2).max(40)).max(10).optional(),
  categories: z.array(z.string().min(1).max(60)).max(10).optional(),
  perRequest: z.number().int().min(1).max(25).optional(),
});

type YouTubeVideoItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    categoryId?: string;
    channelTitle?: string;
    tags?: string[];
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
  };
  statistics?: { viewCount?: string; likeCount?: string };
};

export const fetchYouTubeTrends = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => FetchYouTubeSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false as const, configured: false as const, message: "YouTube API no configurada" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();

    const countries = (data.countries && data.countries.length > 0
      ? data.countries
      : Object.keys(COUNTRY_TO_REGION)) as string[];
    const categories = data.categories ?? ["Viral General", "Animales", "Tecnología", "Música"];
    const perRequest = data.perRequest ?? 10;

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const countryName of countries) {
      const regionCode = COUNTRY_TO_REGION[countryName];
      if (!regionCode) continue;
      for (const categoryName of categories) {
        const ytCategoryId = CATEGORY_TO_YT_ID[categoryName];
        const params = new URLSearchParams({
          part: "snippet,statistics",
          chart: "mostPopular",
          regionCode,
          maxResults: String(perRequest),
          key: apiKey,
        });
        if (ytCategoryId) params.set("videoCategoryId", ytCategoryId);
        try {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
          if (!res.ok) {
            const txt = await res.text();
            console.error("[youtube] fetch failed", regionCode, categoryName, res.status, txt.slice(0, 200));
            errors.push(`${regionCode}/${categoryName}: ${res.status}`);
            continue;
          }
          const json = (await res.json()) as { items?: YouTubeVideoItem[] };
          const items = json.items ?? [];
          for (const it of items) {
            const videoId = it.id;
            if (!videoId) continue;
            const sn = it.snippet ?? {};
            const st = it.statistics ?? {};
            const views = Number(st.viewCount ?? 0) || 0;
            const likes = Number(st.likeCount ?? 0) || 0;
            const inferredCategory = ytCategoryId
              ? categoryName
              : YT_ID_TO_CATEGORY[sn.categoryId ?? ""] ?? "Viral General";
            const thumb =
              sn.thumbnails?.high?.url ||
              sn.thumbnails?.medium?.url ||
              sn.thumbnails?.default?.url ||
              null;
            const row = {
              user_id: owner,
              title: sn.title?.slice(0, 280) ?? "(sin título)",
              platform: "YouTube",
              country: REGION_TO_COUNTRY[regionCode] ?? countryName,
              category: inferredCategory,
              viral_score: viralScoreFromViews(views),
              keywords: (sn.tags ?? []).slice(0, 8).join(", ") || null,
              source: "youtube_api",
              source_type: "youtube_api",
              thumbnail_url: thumb,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              views,
              likes,
              published_at: sn.publishedAt ?? null,
              external_id: videoId,
              video_id: videoId,
              embed_url: `https://www.youtube.com/embed/${videoId}`,
              channel_title: (sn as { channelTitle?: string }).channelTitle ?? null,
              creator_name: (sn as { channelTitle?: string }).channelTitle ?? null,
            };
            // upsert por (user_id, source, external_id) — manual: intentar update, si 0 filas insertar.
            const { data: existing } = await supabaseAdmin
              .from("viral_trends")
              .select("id")
              .eq("user_id", owner)
              .eq("source", "youtube_api")
              .eq("external_id", videoId)
              .maybeSingle();
            if (existing?.id) {
              const { error: upErr } = await supabaseAdmin
                .from("viral_trends")
                .update({
                  title: row.title,
                  viral_score: row.viral_score,
                  keywords: row.keywords,
                  thumbnail_url: row.thumbnail_url,
                  url: row.url,
                  views: row.views,
                  likes: row.likes,
                  published_at: row.published_at,
                  category: row.category,
                  country: row.country,
                  video_id: row.video_id,
                  embed_url: row.embed_url,
                  channel_title: row.channel_title,
                })
                .eq("id", existing.id);
              if (upErr) {
                console.error("[youtube] update failed", upErr);
                errors.push(`update ${videoId}: ${upErr.message}`);
              } else {
                updated++;
              }
            } else {
              const { error: insErr } = await supabaseAdmin.from("viral_trends").insert(row);
              if (insErr) {
                console.error("[youtube] insert failed", insErr);
                errors.push(`insert ${videoId}: ${insErr.message}`);
              } else {
                inserted++;
              }
            }
          }
        } catch (err) {
          console.error("[youtube] unexpected", err);
          errors.push(`${regionCode}/${categoryName}: ${(err as Error).message}`);
        }
      }
    }

    return {
      ok: true as const,
      configured: true as const,
      inserted,
      updated,
      errors: errors.slice(0, 5),
    };
  });