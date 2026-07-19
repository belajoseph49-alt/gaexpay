/**
 * POST /api/auth/reset-password
 *
 * Body: { token, newPassword }
 *
 * Find a user whose `resetToken` matches AND whose `resetTokenExpiry` is in
 * the future. If valid, hash the new password, clear the token, and persist.
 *
 * 400 if the token is invalid or expired.
 * 400 if the new password is too weak.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getClientIdentifier } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // --- Rate limit ---------------------------------------------------------
    const rlId = `reset:${getClientIdentifier(req, null)}`;
    const rl = await rateLimitAuth(rlId);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const token = String(body?.token ?? "").trim();
    const newPassword = String(body?.newPassword ?? "");

    if (!token || token.length < 16) return apiError("Invalid or expired token", 400);
    if (newPassword.length < 8) return apiError("Password must be at least 8 characters", 400);
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return apiError("Password must contain a letter and a number", 400);
    }

    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!user) return apiError("Invalid or expired token", 400);

    const passwordHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
