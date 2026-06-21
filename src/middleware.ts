/**
 * src/middleware.ts
 *
 * Security-headers middleware for GaexPay.
 *
 * Runs on EVERY response (page, API, static) and attaches the standard
 * browser-security headers. We do NOT do auth here — auth is enforced inside
 * each API route via `requireAuth` so we can return proper 401 JSON. The
 * middleware layer is reserved for transport-level hardening.
 *
 * The matcher excludes `_next/static` and `_next/image` to keep hot-reload
 * fast; everything else (HTML, API JSON, RSC payloads) gets the headers.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Content-Security-Policy:
 *  - default-src 'self'                    — deny everything by default
 *  - script-src 'unsafe-inline' 'unsafe-eval' — Next.js dev + inline scripts
 *  - style-src  'unsafe-inline'            — Tailwind + Emotion CSS-in-JS
 *  - img-src    'self' data: https:        — avatar URLs + chart data URIs
 *  - font-src   'self' data:               — self-hosted fonts
 *  - connect-src 'self' https://api.coingecko.com — backend + live crypto prices
 *
 * Note: 'unsafe-inline'/'unsafe-eval' for scripts are needed because Next.js
 * 16 inlines hydration data and (in dev) uses eval for HMR. For a hardened
 * production deploy you'd ship nonces; that's outside this hardening sprint's
 * scope.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.coingecko.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  // Allow camera + geolocation on self-origin so the KYC selfie capture and
  // the GPS address auto-detect features work in-browser. Mic stays disabled
  // (we have no voice features). interest-cohort stays disabled (no FLoC).
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self), interest-cohort=()",
};

export function middleware(_req: NextRequest) {
  // Forward to the route handler / static file as normal.
  const res = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  // Run on everything except Next.js internals that we don't want to slow
  // down (static asset fingerprinting + image optimizer).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png|favicon-32.png|manifest.json|browserconfig.xml|robots.txt|screenshot-).*)",
  ],
};
