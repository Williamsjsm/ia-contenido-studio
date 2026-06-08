import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccess } from "./access-control.functions";

/**
 * Modo single-owner temporal.
 * TODO(auth): sustituir por requireSupabaseAuth + context.userId cuando se active auth real.
 */
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";
function resolveOwnerId(): string {
  return process.env.OWNER_USER_ID?.trim() || FALLBACK_OWNER_ID;
}

function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = 2_500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

const RecentPromptSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  platform: z.string().nullable(),
  is_favorite: z.boolean(),
  created_at: z.string(),
});

const DashboardStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  favorites: z.number().int().nonnegative(),
  thisWeek: z.number().int().nonnegative(),
  topPlatform: z.object({ name: z.string(), count: z.number().int() }).nullable(),
  topCategory: z.object({ name: z.string(), count: z.number().int() }).nullable(),
  recent: z.array(RecentPromptSchema).max(5),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

function topOf(values: (string | null)[]): { name: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireAccess])
  .handler(async (): Promise<DashboardStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = resolveOwnerId();

    const { data, error } = await withTimeout(
      supabaseAdmin
        .from("prompts")
        .select("id, title, category, platform, is_favorite, created_at")
        .eq("user_id", owner)
        .order("created_at", { ascending: false })
        .limit(1000),
      "getDashboardStats",
    );

    if (error) {
      console.error("getDashboardStats failed:", error);
      throw new Error(error.message);
    }

    const rows = data ?? [];
    const weekAgo = Date.now() - 7 * 86_400_000;

    const stats: DashboardStats = {
      total: rows.length,
      favorites: rows.filter((r) => r.is_favorite).length,
      thisWeek: rows.filter(
        (r) => r.created_at && new Date(r.created_at).getTime() >= weekAgo,
      ).length,
      topPlatform: topOf(rows.map((r) => r.platform)),
      topCategory: topOf(rows.map((r) => r.category)),
      recent: rows.slice(0, 5).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        platform: r.platform,
        is_favorite: r.is_favorite,
        created_at: r.created_at,
      })),
    };

    return DashboardStatsSchema.parse(stats);
  });