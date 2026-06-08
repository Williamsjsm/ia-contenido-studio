import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Hardening mínimo single-owner. El password compartido (APP_SHARED_SECRET)
 * vive solo en el servidor. El cliente recibe una cookie httpOnly firmada (HMAC)
 * tras introducirlo en /acceso. Middleware `requireAccess` valida la cookie en
 * cada serverFn sensible.
 *
 * TODO(auth): sustituir por Supabase Auth real (login con email/google) cuando
 * se active el módulo de usuarios.
 */

/** Middleware: exige cookie de sesión válida. Falla con 401 si no la hay. */
export const requireAccess = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { verifySessionToken, SESSION_COOKIE_NAME } = await import(
      "./access-control.server"
    );
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!verifySessionToken(token)) {
      throw new Response("Unauthorized", { status: 401 });
    }
    return next();
  },
);

const LoginSchema = z.object({
  password: z.string().min(1).max(512),
});

export const loginWithSecret = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LoginSchema.parse(input))
  .handler(async ({ data }) => {
    const {
      verifySharedSecret,
      signSessionToken,
      SESSION_COOKIE_NAME,
      SESSION_TTL_SECONDS,
    } = await import("./access-control.server");
    if (!verifySharedSecret(data.password)) {
      // Pequeño delay para mitigar fuerza bruta básica.
      await new Promise((r) => setTimeout(r, 600));
      return { ok: false as const, message: "Acceso incorrecto." };
    }
    const token = signSessionToken();
    setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return { ok: true as const };
  });

export const logoutSession = createServerFn({ method: "POST" }).handler(async () => {
  const { SESSION_COOKIE_NAME } = await import("./access-control.server");
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  return { ok: true as const };
});

export const getAccessStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { verifySessionToken, SESSION_COOKIE_NAME } = await import(
    "./access-control.server"
  );
  const token = getCookie(SESSION_COOKIE_NAME);
  return { authenticated: verifySessionToken(token) };
});