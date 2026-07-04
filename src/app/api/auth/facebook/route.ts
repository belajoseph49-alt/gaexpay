/**
 * GET /api/auth/facebook
 *
 * Initiate Facebook OAuth 2.0 login.
 *
 * Reads `facebook_app_id` from the SystemSetting table and 302-redirects
 * the browser to Facebook's OAuth consent dialog. The redirect URI is
 * `${origin}/api/auth/facebook/callback`.
 *
 * Scope: `email` — required to look up / create the account.
 *
 * A short-lived `gxp_oauth_state` cookie is set to mitigate login CSRF.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiCatch } from "@/lib/api-error";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) return `${xfProto}://${url.host}`;
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  try {
    const origin = getOrigin(req);
    const redirectUri = `${origin}/api/auth/facebook/callback`;

    const setting = await db.systemSetting.findUnique({
      where: { key: "facebook_app_id" },
    });
    const appId = setting?.value?.trim() ?? "";

    if (!appId) {
      const url = new URL("/", origin);
      url.searchParams.set("oauth_error", "facebook_not_configured");
      url.searchParams.set(
        "oauth_message",
        "Facebook OAuth is not configured. An admin must set the Facebook App ID in the API & Integrations admin section.",
      );
      return NextResponse.redirect(url);
    }

    const state = randomBytes(16).toString("hex");
    const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "email");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("auth_type", "rerequest");

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
