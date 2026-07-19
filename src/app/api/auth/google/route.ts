/**
 * GET /api/auth/google
 *
 * Initiate Google OAuth 2.0 login.
 *
 * Reads `google_client_id` from the SystemSetting table and 302-redirects
 * the browser to Google's consent screen. The redirect URI is
 * `${origin}/api/auth/google/callback`.
 *
 * Scopes: `openid email profile` — we need email to match existing accounts
 * and the profile claims (given_name, family_name) to pre-fill the signup
 * form when a new account is created in the callback handler.
 *
 * A short-lived `gxp_oauth_state` cookie is set to mitigate login CSRF.
 * The callback handler verifies that the `state` query param matches the
 * cookie value before exchanging the authorization code.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiCatch } from "@/lib/api-error";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

function getOrigin(req: Request): string {
  const url = new URL(req.url);
  // Trust X-Forwarded-Proto when present (set by Caddy).
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) return `${xfProto}://${url.host}`;
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  try {
    const origin = getOrigin(req);
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Read Google client id from system settings. The admin must fill this in
    // via the API & Integrations admin section before OAuth will work.
    const setting = await db.systemSetting.findUnique({
      where: { key: "google_client_id" },
    });
    const clientId = setting?.value?.trim() ?? "";

    if (!clientId) {
      const url = new URL("/", origin);
      url.searchParams.set("oauth_error", "google_not_configured");
      url.searchParams.set(
        "oauth_message",
        "Google OAuth is not configured. An admin must set the Google Client ID in the API & Integrations admin section.",
      );
      return NextResponse.redirect(url);
    }

    // Generate + set a state cookie to prevent login CSRF. We use a 16-byte
    // random hex string with a 10-minute TTL.
    const state = randomBytes(16).toString("hex");
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    const res = NextResponse.redirect(authUrl);
    res.cookies.set("gxp_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
    });
    return res;
  } catch (e) {
    return apiCatch(e);
  }
}
