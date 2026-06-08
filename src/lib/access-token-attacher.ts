import { createMiddleware } from "@tanstack/react-start";

const STORAGE_KEY = "app_session_token";

export function storeAccessSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearAccessSessionToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export const attachAccessSessionToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token =
      typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    return next({
      headers: token ? { "x-app-session": token } : {},
    });
  },
);