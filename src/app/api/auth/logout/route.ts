/**
 * POST /api/auth/logout
 *
 * Clear the `gxp_token` cookie. Sessions are stateless JWTs, so the actual
 * token remains technically valid until it expires; the cleared cookie is the
 * signal the client uses to drop session state.
 *
 * Returns `{ success: true }`.
 */

import { NextResponse } from "next/server";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.set("gxp_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e) {
    return apiCatch(e);
  }
}
