// Dev-only lightweight perf logger. No-op in production.
const enabled = typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV;

export function mark(label: string) {
  if (!enabled || typeof performance === "undefined") return () => {};
  const start = performance.now();
  return () => {
    const ms = Math.round(performance.now() - start);
    // eslint-disable-next-line no-console
    console.debug(`[perf] ${label}: ${ms}ms`);
  };
}

export async function measure<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const end = mark(label);
  try {
    return await fn();
  } finally {
    end();
  }
}

// In-memory signed URL cache with TTL.
type Entry = { url: string; expiresAt: number };
const signedCache = new Map<string, Entry>();

export function getCachedSignedUrl(key: string): string | null {
  const e = signedCache.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    signedCache.delete(key);
    return null;
  }
  return e.url;
}

export function setCachedSignedUrl(key: string, url: string, ttlSec = 50 * 60) {
  signedCache.set(key, { url, expiresAt: Date.now() + ttlSec * 1000 });
}