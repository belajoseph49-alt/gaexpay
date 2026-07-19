/**
 * src/middleware.ts
 *
 * Security-headers middleware for GaexPay + next-intl routing.
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
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Content-Security-Policy:
 *  - default-src 'self'                    — deny everything by default
 *  - script-src 'unsafe-inline' 'unsafe-eval' — Next.js dev + inline scripts
 *  - style-src  'unsafe-inline'            — Tailwind + Emotion CSS-in-JS
 *  - img-src    'self' data: https:        — avatar URLs + chart data URIs
 *  - font-src   'self' data:               — self-hosted fonts
 *  - connect-src 'self' https://api.coingecko.com — backend + live crypto prices
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
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self), interest-cohort=()",
};

export function middleware(req: NextRequest) {
  // 1. Run the i18n middleware to handle locale detection and redirection
  const res = intlMiddleware(req) || NextResponse.next();

  // 2. Add security headers to the response
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }

  return res;
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    
    // Set a cookie to remember the previous locale for all requests that have a locale prefix
    '/(en|fr|ru|zh|ar|es|de|ew|ff|sw|ln|ha|ja|pcm|dua)/:path*',
    
    // Run on everything except Next.js internals that we don't want to slow
    // down (static asset fingerprinting + image optimizer).
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png|favicon-32.png|manifest.json|browserconfig.xml|robots.txt|screenshot-).*)'
  ]
};
