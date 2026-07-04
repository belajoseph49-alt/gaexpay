/**
 * src/lib/csrf-client.ts
 *
 * Client-side CSRF token manager + global fetch patcher.
 *
 * WHY THIS EXISTS
 * ---------------
 * The server middleware (src/middleware.ts) rejects every POST/PUT/PATCH/
 * DELETE to /api/* (except /api/auth/* and /api/csrf) that does not include
 * a valid `X-CSRF-Token` header. To avoid having to update every existing
 * `fetch()` call site in the SPA, this module installs a transparent
 * wrapper around `window.fetch` that:
 *
 *   1. Lazily fetches a CSRF token from `GET /api/csrf` on the first
 *      mutation request (and caches it for the page lifetime).
 *   2. Attaches `X-CSRF-Token: <token>` to every mutation request whose
 *      URL starts with `/api/` and is NOT under `/api/auth/`.
 *   3. On 403 with a CSRF-related error message, refreshes the token and
 *      retries the request exactly once.
 *
 * The patcher is idempotent — calling `installCSRFetch()` multiple times
 * is safe (subsequent calls are no-ops). It only runs in the browser
 * (guarded by `typeof window !== "undefined"`).
 *
 * Server components / API routes never import this file — it's purely a
 * client convenience.
 */

"use client";

let cachedToken: string | null = null;
let pendingFetch: Promise<string> | null = null;
let installed = false;

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isMutation(method: string): boolean {
  return MUTATION_METHODS.has((method || "GET").toUpperCase());
}

function isApiPath(url: string): boolean {
  // Relative URLs like "/api/foo" or absolute same-origin "http://host/api/foo".
  if (url.startsWith("/api/")) return true;
  return false;
}

function isAuthOrCsrfPath(url: string): boolean {
  // Only the path part — strip query/hash first.
  const pathOnly = url.split("?")[0]!.split("#")[0];
  if (pathOnly.startsWith("/api/auth/")) return true;
  if (pathOnly === "/api/csrf" || pathOnly.startsWith("/api/csrf/")) return true;
  return false;
}

async function fetchFreshToken(): Promise<string> {
  // Dedupe concurrent calls — if two components POST at the same time on
  // first load, only one /api/csrf request fires.
  if (pendingFetch) return pendingFetch;
  pendingFetch = (async () => {
    try {
      const res = await originalFetch("/api/csrf", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`CSRF fetch failed: ${res.status}`);
      const data = (await res.json()) as { token?: string };
      if (!data.token || typeof data.token !== "string") {
        throw new Error("CSRF response missing token");
      }
      cachedToken = data.token;
      return data.token;
    } finally {
      pendingFetch = null;
    }
  })();
  return pendingFetch;
}

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  return fetchFreshToken();
}

// Capture the original fetch before we patch it. We MUST use the original
// for the /api/csrf call itself, otherwise we'd recurse infinitely.
declare global {
  interface Window {
    __originalFetch?: typeof fetch;
  }
}

let originalFetch: typeof fetch;

/**
 * Install the CSRF-aware fetch wrapper. Idempotent — safe to call from
 * multiple components or after a hot reload. No-op on the server.
 */
export function installCSRFetch(): void {
  if (typeof window === "undefined") return;
  if (installed) return;
  if (typeof window.fetch !== "function") return;

  // Save the original fetch (could be native, could be wrapped by a
  // previous initializer — either way, we wrap once).
  originalFetch = window.__originalFetch ?? window.fetch.bind(window);
  if (!window.__originalFetch) {
    window.__originalFetch = originalFetch;
  }

  const patchedFetch: typeof fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET")) || "GET";

    const needsCsrf =
      isMutation(method) && isApiPath(url) && !isAuthOrCsrfPath(url);

    if (!needsCsrf) {
      return originalFetch(input, init);
    }

    // Attach the CSRF token. If we don't have one yet, fetch it first.
    let token = cachedToken;
    if (!token) {
      try {
        token = await getToken();
      } catch {
        // If we can't get a token, just send the request anyway — the
        // server will reject it with 403 and the user will see a clear
        // error. Better than hanging.
        return originalFetch(input, init);
      }
    }

    const mergedInit: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        "X-CSRF-Token": token,
      },
    };

    const res = await originalFetch(input, mergedInit);

    // If the server says the token is invalid/expired, refresh + retry once.
    if (res.status === 403) {
      try {
        const cloned = res.clone();
        const data = (await cloned.json().catch(() => ({}))) as { error?: string };
        if (data?.error && /CSRF/i.test(data.error)) {
          cachedToken = null;
          const freshToken = await fetchFreshToken();
          const retryInit: RequestInit = {
            ...init,
            headers: {
              ...(init?.headers ?? {}),
              "X-CSRF-Token": freshToken,
            },
          };
          return originalFetch(input, retryInit);
        }
      } catch {
        // fall through — return the original 403 response
      }
    }

    return res;
  };

  window.fetch = patchedFetch;
  installed = true;
}

/**
 * Manual accessor — useful for tests or for components that want to attach
 * the header themselves (e.g. axios-style wrappers).
 */
export async function getCSRFToken(): Promise<string> {
  return getToken();
}

/**
 * Reset the cached token. Useful after logout.
 */
export function resetCSRFToken(): void {
  cachedToken = null;
  pendingFetch = null;
}
