/**
 * src/lib/auth-client.ts
 *
 * Client-side auth state helpers. The actual auth source of truth is the
 * `gxp_token` httpOnly cookie (which JavaScript cannot read directly). This
 * localStorage flag is a *cached hint* that lets the SPA decide whether to
 * render `<AppShell>` immediately or fetch `/api/auth/me` to confirm.
 *
 * Never trust this flag alone for any sensitive action — server-side checks
 * via `getAuthUserId` / `verifyToken` are authoritative.
 */

"use client";

const KEY = "gxp_auth";

/** Mark the SPA as "logged in" locally. Called after a successful login/signup. */
export function setAuthed(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* localStorage may be disabled (private mode) — fail silently. */
    }
  }
}

/** Clear the local "logged in" flag. Called on logout. */
export function clearAuthed(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Read the cached auth flag. Returns false during SSR or before hydration.
 * Use this only as a fast-path hint; always confirm via /api/auth/me on
 * initial mount.
 */
export function isAuthedLocal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
