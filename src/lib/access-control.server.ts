import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC-firmado token de acceso para modo single-owner.
 * Formato: `<expires_ms>.<base64url(hmac-sha256(secret, expires_ms))>`.
 * El secreto NUNCA sale del servidor.
 */
const COOKIE_NAME = "app_session";
const PREVIEW_COOKIE_NAME = "app_session_preview";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function getSecret(): string {
  const s = process.env.APP_SHARED_SECRET?.trim();
  if (!s || s.length < 8) {
    throw new Error("APP_SHARED_SECRET no está configurado en el servidor.");
  }
  return s;
}

function logSecretDiagnostics(secret: string | undefined, input: string | undefined | null): void {
  console.info("APP_SHARED_SECRET exists:", Boolean(secret));
  console.info("APP_SHARED_SECRET length:", secret?.length ?? 0);
  console.info("Access input length:", input?.length ?? 0);
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function hmac(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

export function signSessionToken(ttlMs: number = DEFAULT_TTL_MS): string {
  const secret = getSecret();
  const exp = String(Date.now() + ttlMs);
  return `${exp}.${hmac(exp, secret)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }
  const expected = hmac(exp, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifySharedSecret(input: string | undefined | null): boolean {
  const trimmedInput = typeof input === "string" ? input.trim() : input;
  const rawSecret = process.env.APP_SHARED_SECRET;
  const trimmedSecret = rawSecret?.trim();
  logSecretDiagnostics(trimmedSecret, trimmedInput);
  if (!trimmedInput || typeof trimmedInput !== "string") return false;
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }
  const a = Buffer.from(trimmedInput);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const PREVIEW_SESSION_COOKIE_NAME = PREVIEW_COOKIE_NAME;
export const SESSION_TTL_SECONDS = Math.floor(DEFAULT_TTL_MS / 1000);

export function isPreviewSandboxHost(host: string | undefined | null): boolean {
  if (typeof host !== "string") return false;
  const normalizedHost = host.toLowerCase();
  return (
    normalizedHost.includes("lovableproject.com") ||
    normalizedHost.startsWith("id-preview--") ||
    normalizedHost.includes("-dev.lovable.app")
  );
}