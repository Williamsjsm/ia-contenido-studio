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
  sourceTypes: z.array(z.string().min(1).max(40)).max(10).optional(),
  keyword: z.string().trim().max(120).nullable().optional(),
  orderBy: z.enum(["viral_score", "views", "likes", "published_at", "created_at"]).optional(),
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
      .eq("user_id", owner);
    const orderCol = data.orderBy ?? "viral_score";
    q = q.order(orderCol, { ascending: false, nullsFirst: false });
    if (orderCol !== "created_at") q = q.order("created_at", { ascending: false });
    q = q.limit(data.limit ?? 60);
    if (data.platform) q = q.eq("platform", data.platform);
    if (data.country) q = q.eq("country", data.country);
    if (data.category) q = q.eq("category", data.category);
    if (data.savedOnly) q = q.eq("saved", true);
    if (data.favoritesOnly) q = q.eq("favorite", true);
    if (data.sourceTypes && data.sourceTypes.length > 0) {
      q = q.in("source_type", data.sourceTypes);
    }
    if (data.keyword && data.keyword.trim().length > 0) {
      // Strip any PostgREST structural chars; keep alphanumerics, spaces, hyphen, #, @, _
      const term = data.keyword.trim().replace(/[^\w\s\-#@]/g, "").slice(0, 80);
      if (term.length > 0) {
      q = q.or(
        `title.ilike.%${term}%,keywords.ilike.%${term}%,channel_title.ilike.%${term}%`,
      );
      }
    }
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
  const score = Math.round(Math.log10(views) * 16);
  return Math.max(0, Math.min(100, score));
}

/** Score compuesto: views + ratio likes/views + recencia. */
function viralScoreYouTube(opts: {
  views: number;
  likes: number;
  publishedAt?: string | null;
}): number {
  const v = opts.views || 0;
  const l = opts.likes || 0;
  if (v <= 0) return 0;
  const base = Math.log10(v) * 14; // 1k→42, 1M→84, 100M→112(cap)
  const ratio = v > 0 ? l / v : 0;
  // Buen engagement YT ~ 3-5% → bonus hasta 12
  const ratioBonus = Math.min(12, ratio * 240);
  let recencyBonus = 0;
  if (opts.publishedAt) {
    const hours = (Date.now() - new Date(opts.publishedAt).getTime()) / 36e5;
    if (hours <= 24) recencyBonus = 10;
    else if (hours <= 72) recencyBonus = 7;
    else if (hours <= 168) recencyBonus = 4;
    else if (hours <= 720) recencyBonus = 2;
  }
  return Math.max(0, Math.min(100, Math.round(base + ratioBonus + recencyBonus)));
}

const FetchYouTubeSchema = z.object({
  countries: z.array(z.string().min(2).max(40)).max(10).optional(),
  categories: z.array(z.string().min(1).max(60)).max(10).optional(),
  perRequest: z.number().int().min(1).max(25).optional(),
});

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

function apiCooldownMs(): number {
  const minutes = envInt("VIRAL_API_COOLDOWN_MINUTES", 360, 0, 24 * 60);
  return minutes * 60_000;
}

function clampApiLimit(requested: number | undefined, fallback: number, envName: string, max: number): number {
  const envMax = envInt(envName, fallback, 1, max);
  return Math.min(requested ?? fallback, envMax, max);
}

async function countFreshTrends(opts: {
  owner: string;
  sourceType: string;
  country?: string | null;
  category?: string | null;
  keyword?: string | null;
}): Promise<number> {
  const cooldown = apiCooldownMs();
  if (cooldown <= 0) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin
    .from("viral_trends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", opts.owner)
    .eq("source_type", opts.sourceType)
    .gte("updated_at", new Date(Date.now() - cooldown).toISOString());
  if (opts.country) q = q.eq("country", opts.country);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.keyword) {
    const term = opts.keyword.trim().replace(/[^\w\s\-#@]/g, "").slice(0, 80);
    if (term) q = q.or(`title.ilike.%${term}%,keywords.ilike.%${term}%`);
  }
  const { count } = await q;
  return count ?? 0;
}

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
      : ["Estados Unidos"]) as string[];
    const categories = data.categories ?? ["Viral General"];
    const perRequest = clampApiLimit(data.perRequest, 5, "VIRAL_YOUTUBE_PER_REQUEST_MAX", 25);
    const maxCombos = envInt("VIRAL_YOUTUBE_MAX_COMBOS", 4, 1, 30);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    let scannedCombos = 0;

    for (const countryName of countries) {
      const regionCode = COUNTRY_TO_REGION[countryName];
      if (!regionCode) continue;
      for (const categoryName of categories) {
        if (scannedCombos >= maxCombos) {
          skipped++;
          continue;
        }
        scannedCombos++;
        const fresh = await countFreshTrends({
          owner,
          sourceType: "youtube_api",
          country: countryName,
          category: categoryName === "Viral General" ? null : categoryName,
        });
        if (fresh > 0) {
          skipped++;
          continue;
        }
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
              viral_score: viralScoreYouTube({ views, likes, publishedAt: sn.publishedAt }),
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
      skipped,
      errors: errors.slice(0, 5),
    };
  });

// =========================================================
// Instagram Graph API · Hashtag Search
// Requiere META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID.
// =========================================================

function viralScoreFromEngagement(likes: number, comments: number): number {
  const total = likes + comments * 2;
  if (total <= 0) return 0;
  const score = Math.round(Math.log10(Math.max(1, total)) * 18);
  return Math.max(0, Math.min(100, score));
}

type SocialTrendRow = {
  user_id: string;
  source_type: string;
  external_id: string;
  [k: string]: unknown;
};

async function upsertSocialTrend(
  row: SocialTrendRow,
): Promise<"inserted" | "updated" | "error"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("viral_trends")
    .select("id")
    .eq("user_id", row.user_id)
    .eq("source_type", row.source_type)
    .eq("external_id", row.external_id)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("viral_trends")
      .update(row as never)
      .eq("id", existing.id);
    return error ? "error" : "updated";
  }
  const { error } = await supabaseAdmin.from("viral_trends").insert(row as never);
  return error ? "error" : "inserted";
}

const FetchInstagramSchema = z.object({
  hashtag: z.string().trim().min(1).max(80),
  country: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

type IGMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  username?: string;
};

export const fetchInstagramHashtagTrends = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => FetchInstagramSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const token = process.env.META_ACCESS_TOKEN?.trim();
    const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
    if (!token || !igUserId) {
      return {
        ok: false as const,
        configured: false as const,
        message: "Instagram API no configurada",
      };
    }
    const owner = resolveOwnerId();
    const limit = clampApiLimit(data.limit, 10, "VIRAL_SOCIAL_FETCH_LIMIT_MAX", 50);
    try {
      const tag = data.hashtag.replace(/^#/, "");
      const fresh = await countFreshTrends({
        owner,
        sourceType: "instagram_hashtag",
        country: data.country ?? "Global",
        category: data.category ?? "Viral General",
        keyword: `#${tag}`,
      });
      if (fresh > 0) {
        return { ok: true as const, configured: true as const, inserted: 0, updated: 0, errors: 0, skipped: fresh };
      }
      // 1. Resolve hashtag id
      const tagRes = await fetch(
        `https://graph.facebook.com/v19.0/ig_hashtag_search?user_id=${encodeURIComponent(igUserId)}&q=${encodeURIComponent(tag)}&access_token=${encodeURIComponent(token)}`,
      );
      if (!tagRes.ok) {
        const txt = await tagRes.text();
        return { ok: false as const, configured: true as const, message: `IG hashtag_search ${tagRes.status}: ${txt.slice(0, 120)}` };
      }
      const tagJson = (await tagRes.json()) as { data?: Array<{ id: string }> };
      const hashtagId = tagJson.data?.[0]?.id;
      if (!hashtagId) {
        return { ok: false as const, configured: true as const, message: "Hashtag no encontrado" };
      }
      // 2. Top media
      const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";
      const mediaRes = await fetch(
        `https://graph.facebook.com/v19.0/${hashtagId}/top_media?user_id=${encodeURIComponent(igUserId)}&fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`,
      );
      if (!mediaRes.ok) {
        const txt = await mediaRes.text();
        return { ok: false as const, configured: true as const, message: `IG top_media ${mediaRes.status}: ${txt.slice(0, 120)}` };
      }
      const mediaJson = (await mediaRes.json()) as { data?: IGMediaItem[] };
      const items = mediaJson.data ?? [];
      let inserted = 0;
      let updated = 0;
      let errors = 0;
      for (const it of items) {
        const likes = it.like_count ?? 0;
        const comments = it.comments_count ?? 0;
        const thumb = it.thumbnail_url || (it.media_type === "IMAGE" ? it.media_url ?? null : null);
        const title = (it.caption ?? `Instagram #${tag}`).slice(0, 280);
        const row = {
          user_id: owner,
          title,
          platform: "Instagram",
          country: data.country ?? "Global",
          category: data.category ?? "Viral General",
          viral_score: viralScoreFromEngagement(likes, comments),
          keywords: `#${tag}`,
          source: "instagram_hashtag",
          source_type: "instagram_hashtag",
          thumbnail_url: thumb,
          url: it.permalink ?? null,
          views: null,
          likes,
          comment_count: comments,
          published_at: it.timestamp ?? null,
          external_id: it.id,
          creator_name: it.username ?? null,
          raw_payload: it as unknown as Record<string, unknown>,
        };
        const r = await upsertSocialTrend(row);
        if (r === "inserted") inserted++;
        else if (r === "updated") updated++;
        else errors++;
      }
      return { ok: true as const, configured: true as const, inserted, updated, errors };
    } catch (err) {
      console.error("[instagram] failed", err);
      return { ok: false as const, configured: true as const, message: (err as Error).message };
    }
  });

// =========================================================
// Facebook Graph API · Page Posts
// Requiere META_ACCESS_TOKEN (Page access token con permisos).
// =========================================================

const FetchFacebookSchema = z.object({
  page_id: z.string().trim().min(1).max(120),
  country: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

type FBPostItem = {
  id: string;
  message?: string;
  permalink_url?: string;
  created_time?: string;
  full_picture?: string;
  from?: { name?: string };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
};

export const fetchFacebookPageTrends = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => FetchFacebookSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const token = process.env.META_ACCESS_TOKEN?.trim();
    if (!token) {
      return {
        ok: false as const,
        configured: false as const,
        message: "Facebook API no configurada",
      };
    }
    const owner = resolveOwnerId();
    const limit = clampApiLimit(data.limit, 10, "VIRAL_SOCIAL_FETCH_LIMIT_MAX", 50);
    try {
      const fresh = await countFreshTrends({
        owner,
        sourceType: "facebook_page",
        country: data.country ?? "Global",
        category: data.category ?? "Viral General",
        keyword: data.page_id,
      });
      if (fresh > 0) {
        return { ok: true as const, configured: true as const, inserted: 0, updated: 0, errors: 0, skipped: fresh };
      }
      const fields =
        "id,message,permalink_url,created_time,full_picture,from,reactions.summary(true),comments.summary(true),shares";
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(data.page_id)}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(token)}`,
      );
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false as const, configured: true as const, message: `FB ${res.status}: ${txt.slice(0, 120)}` };
      }
      const json = (await res.json()) as { data?: FBPostItem[] };
      const items = json.data ?? [];
      let inserted = 0;
      let updated = 0;
      let errors = 0;
      for (const it of items) {
        const likes = it.reactions?.summary?.total_count ?? 0;
        const comments = it.comments?.summary?.total_count ?? 0;
        const shares = it.shares?.count ?? 0;
        const title = (it.message ?? `Post de ${it.from?.name ?? data.page_id}`).slice(0, 280);
        const row = {
          user_id: owner,
          title,
          platform: "Facebook",
          country: data.country ?? "Global",
          category: data.category ?? "Viral General",
          viral_score: viralScoreFromEngagement(likes + shares * 3, comments),
          keywords: null,
          source: "facebook_page",
          source_type: "facebook_page",
          thumbnail_url: it.full_picture ?? null,
          url: it.permalink_url ?? null,
          views: null,
          likes,
          keywords: data.page_id,
          comment_count: comments,
          share_count: shares,
          published_at: it.created_time ?? null,
          external_id: it.id,
          creator_name: it.from?.name ?? data.page_id,
          raw_payload: it as unknown as Record<string, unknown>,
        };
        const r = await upsertSocialTrend(row);
        if (r === "inserted") inserted++;
        else if (r === "updated") updated++;
        else errors++;
      }
      return { ok: true as const, configured: true as const, inserted, updated, errors };
    } catch (err) {
      console.error("[facebook] failed", err);
      return { ok: false as const, configured: true as const, message: (err as Error).message };
    }
  });

// =========================================================
// TikTok · modo preparado (Research API requiere aprobación).
// =========================================================

const FetchTikTokSchema = z.object({
  keyword: z.string().trim().max(80).optional(),
  country: z.string().trim().max(60).nullable().optional(),
});

export const fetchTikTokTrends = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => FetchTikTokSchema.parse(input ?? {}))
  .handler(async () => {
    const token = process.env.TIKTOK_RESEARCH_TOKEN?.trim();
    if (!token) {
      return {
        ok: false as const,
        configured: false as const,
        message: "TikTok API requiere aprobación o proveedor externo",
      };
    }
    // Placeholder: Research API call goes here once approval is granted.
    return {
      ok: false as const,
      configured: true as const,
      message: "TikTok Research API aún no implementada — usa importar URL manual",
    };
  });

// =========================================================
// Importar tendencia manual (TikTok URL u otra fuente externa).
// =========================================================

const ImportManualSchema = z.object({
  url: z.string().trim().url().max(600),
  title: z.string().trim().min(1).max(280),
  platform: z.enum(["TikTok", "Instagram", "Facebook", "YouTube"]),
  category: z.string().trim().min(1).max(60).optional(),
  country: z.string().trim().min(1).max(60).optional(),
  keywords: z.string().trim().max(280).optional(),
  thumbnail_url: z.string().trim().url().max(600).optional(),
  creator_name: z.string().trim().max(120).optional(),
});

function tiktokIdFromUrl(url: string): string | null {
  const m = url.match(/\/video\/(\d+)/);
  return m?.[1] ?? null;
}

export const importManualTrend = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => ImportManualSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const owner = resolveOwnerId();
    const external = data.platform === "TikTok" ? tiktokIdFromUrl(data.url) ?? data.url : data.url;
    const row = {
      user_id: owner,
      title: data.title,
      platform: data.platform,
      country: data.country ?? "Global",
      category: data.category ?? "Viral General",
      viral_score: 50,
      keywords: data.keywords ?? null,
      source: "manual_url",
      source_type: "manual_url",
      thumbnail_url: data.thumbnail_url ?? null,
      url: data.url,
      external_id: external,
      creator_name: data.creator_name ?? null,
    };
    const result = await upsertSocialTrend(row);
    if (result === "error") return { ok: false as const, message: "No se pudo guardar" };
    return { ok: true as const, status: result };
  });

// =========================================================
// YouTube · búsqueda por keyword (Search API + Videos API).
// =========================================================

const SearchYouTubeSchema = z.object({
  keyword: z.string().trim().min(1).max(120),
  country: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  duration: z.enum(["any", "short", "medium", "long"]).optional(),
  order: z.enum(["relevance", "viewCount", "date", "rating"]).optional(),
  limit: z.number().int().min(1).max(25).optional(),
});

export const searchYouTubeTrends = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => SearchYouTubeSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false as const, configured: false as const, message: "YouTube API no configurada" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();
    const limit = clampApiLimit(data.limit, 6, "VIRAL_YOUTUBE_SEARCH_LIMIT_MAX", 25);
    const regionCode = data.country ? COUNTRY_TO_REGION[data.country] : undefined;
    const fresh = await countFreshTrends({
      owner,
      sourceType: "youtube_search",
      country: regionCode ? REGION_TO_COUNTRY[regionCode] ?? data.country ?? "Global" : data.country ?? "Global",
      category: data.category ?? null,
      keyword: data.keyword,
    });
    if (fresh > 0) {
      return { ok: true as const, configured: true as const, inserted: 0, updated: 0, errors: 0, skipped: fresh };
    }

    const searchParams = new URLSearchParams({
      part: "snippet",
      q: data.keyword,
      type: "video",
      maxResults: String(limit),
      order: data.order ?? "viewCount",
      key: apiKey,
    });
    if (regionCode) searchParams.set("regionCode", regionCode);
    if (data.duration && data.duration !== "any") searchParams.set("videoDuration", data.duration);

    try {
      const sres = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`);
      if (!sres.ok) {
        const txt = await sres.text();
        return { ok: false as const, configured: true as const, message: `search ${sres.status}: ${txt.slice(0, 160)}` };
      }
      const sjson = (await sres.json()) as { items?: Array<{ id?: { videoId?: string } }> };
      const ids = (sjson.items ?? []).map((it) => it.id?.videoId).filter(Boolean) as string[];
      if (ids.length === 0) {
        return { ok: true as const, configured: true as const, inserted: 0, updated: 0, errors: 0 };
      }
      const vparams = new URLSearchParams({
        part: "snippet,statistics",
        id: ids.join(","),
        key: apiKey,
      });
      const vres = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vparams.toString()}`);
      if (!vres.ok) {
        const txt = await vres.text();
        return { ok: false as const, configured: true as const, message: `videos ${vres.status}: ${txt.slice(0, 160)}` };
      }
      const vjson = (await vres.json()) as { items?: YouTubeVideoItem[] };
      const items = vjson.items ?? [];
      let inserted = 0;
      let updated = 0;
      let errors = 0;
      for (const it of items) {
        const videoId = it.id;
        if (!videoId) continue;
        const sn = it.snippet ?? {};
        const st = it.statistics ?? {};
        const views = Number(st.viewCount ?? 0) || 0;
        const likes = Number(st.likeCount ?? 0) || 0;
        const inferredCategory = YT_ID_TO_CATEGORY[sn.categoryId ?? ""] ?? data.category ?? "Viral General";
        const thumb = sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || null;
        const row = {
          user_id: owner,
          title: sn.title?.slice(0, 280) ?? "(sin título)",
          platform: "YouTube",
          country: regionCode ? REGION_TO_COUNTRY[regionCode] ?? data.country ?? "Global" : data.country ?? "Global",
          category: data.category ?? inferredCategory,
          viral_score: viralScoreYouTube({ views, likes, publishedAt: sn.publishedAt }),
          keywords: (sn.tags ?? []).slice(0, 8).join(", ") || data.keyword,
          source: "youtube_search",
          source_type: "youtube_search",
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
        const r = await upsertSocialTrend(row as SocialTrendRow);
        if (r === "inserted") inserted++;
        else if (r === "updated") updated++;
        else errors++;
      }
      return { ok: true as const, configured: true as const, inserted, updated, errors };
    } catch (err) {
      console.error("[youtube search] failed", err);
      return { ok: false as const, configured: true as const, message: (err as Error).message };
    }
  });

// =========================================================
// Analizar tendencia con IA (Lovable AI Gateway).
// =========================================================

const AnalyzeSchema = z.object({
  title: z.string().trim().min(1).max(300),
  platform: z.string().trim().max(40).optional(),
  country: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  channel_title: z.string().trim().max(120).optional(),
  views: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().optional(),
  published_at: z.string().trim().max(60).optional(),
  keywords: z.string().trim().max(280).optional(),
  url: z.string().trim().max(600).optional(),
});

export type TrendAnalysis = {
  why_working: string;
  hook: string;
  target_audience: string;
  format: string;
  recreation_opportunity: string;
  copy_risk: string;
  original_recommendation: string;
};

export const analyzeTrend = createServerFn({ method: "POST" })
  .middleware([requireAccess])
  .inputValidator((input: unknown) => AnalyzeSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY?.trim();
    if (!key) return { ok: false as const, message: "LOVABLE_API_KEY no configurada" };

    const sys = `Eres analista senior de tendencias virales en redes sociales. Devuelves SIEMPRE JSON puro con las claves exactas: why_working, hook, target_audience, format, recreation_opportunity, copy_risk, original_recommendation. Cada valor es texto en español, conciso (2-4 frases), accionable, sin markdown ni listas con asteriscos.`;
    const user = `Analiza esta tendencia y responde SOLO con el JSON pedido.
TÍTULO: ${data.title}
PLATAFORMA: ${data.platform ?? "n/d"}
PAÍS: ${data.country ?? "n/d"}
CATEGORÍA: ${data.category ?? "n/d"}
CANAL/CREADOR: ${data.channel_title ?? "n/d"}
VISTAS: ${data.views ?? "n/d"}
LIKES: ${data.likes ?? "n/d"}
PUBLICADO: ${data.published_at ?? "n/d"}
KEYWORDS: ${data.keywords ?? "n/d"}
URL: ${data.url ?? "n/d"}

Claves esperadas:
- why_working: por qué está funcionando ahora.
- hook: gancho concreto usado en los primeros segundos.
- target_audience: público objetivo (edad, intereses, ubicación).
- format: formato, duración, estructura visual.
- recreation_opportunity: cómo recrearlo manteniendo originalidad.
- copy_risk: riesgo de copiar demasiado (legal/reputacional/algoritmo).
- original_recommendation: idea concreta y original inspirada en la tendencia.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "raw-fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 402) return { ok: false as const, message: "Sin créditos en AI Gateway" };
        if (res.status === 429) return { ok: false as const, message: "Demasiadas solicitudes, espera unos segundos" };
        return { ok: false as const, message: `AI ${res.status}: ${txt.slice(0, 200)}` };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content?.trim() ?? "";
      let parsed: Partial<TrendAnalysis>;
      try {
        parsed = JSON.parse(content) as Partial<TrendAnalysis>;
      } catch {
        // intentar recortar bloque JSON
        const m = content.match(/\{[\s\S]*\}/);
        parsed = m ? (JSON.parse(m[0]) as Partial<TrendAnalysis>) : {};
      }
      const analysis: TrendAnalysis = {
        why_working: parsed.why_working ?? "",
        hook: parsed.hook ?? "",
        target_audience: parsed.target_audience ?? "",
        format: parsed.format ?? "",
        recreation_opportunity: parsed.recreation_opportunity ?? "",
        copy_risk: parsed.copy_risk ?? "",
        original_recommendation: parsed.original_recommendation ?? "",
      };
      return { ok: true as const, analysis };
    } catch (err) {
      console.error("[analyzeTrend] failed", err);
      return { ok: false as const, message: (err as Error).message };
    }
  });
