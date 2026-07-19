/**
 * GET /api/csrf
 *
 * Issue a fresh CSRF token to the calling client. The client must include
 * this token in the `X-CSRF-Token` header on all subsequent mutation
 * requests (POST/PUT/PATCH/DELETE) to non-auth API routes.
 *
 * The token is stateless (HMAC-signed) and tied to no specific session —
 * its sole purpose is to prove that the mutation request originated from
 * code that could read a same-origin resource (i.e. our own frontend).
 *
 * Combined with `SameSite=Lax` cookies (set on `gxp_token`), this defeats
 * classic CSRF attacks:
 *   - The attacker site cannot read this token (CORS-blocked).
 *   - The attacker site cannot send the cookie cross-origin
 *     (SameSite=Lax blocks it for non-GET requests).
 *
 * Auth NOT required — even anonymous clients can fetch a CSRF token (they
 * need one to sign up). Rate-limited (general) to prevent token-flood DoS.
 */

import { NextResponse } from "next/server";
import { generateCSRFToken } from "@/lib/csrf";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = generateCSRFToken();
    return NextResponse.json({ token });
  } catch (e) {
    return apiCatch(e);
  }
}
