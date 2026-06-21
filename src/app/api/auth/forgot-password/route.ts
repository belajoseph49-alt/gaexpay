/**
 * POST /api/auth/forgot-password
 *
 * Body: { email }
 *
 * If the email exists, generate a 32-byte hex reset token, store it with a 1h
 * expiry (User.resetToken / User.resetTokenExpiry). In dev, return the token in
 * the response so it can be plumbed into the reset form for testing.
 *
 * ALWAYS returns `{ success: true }` (no email enumeration).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiCatch } from "@/lib/api-error";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getClientIdentifier } from "@/lib/api-auth";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

const ONE_HOUR_MS = 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  try {
    // --- Rate limit ---------------------------------------------------------
    const rlId = `forgot:${getClientIdentifier(req, null)}`;
    const rl = rateLimitAuth(rlId);
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
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) return apiError("Email is required", 400);

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, firstName: true },
    });

    // Always return success — no enumeration. We only mutate if the user exists.
    if (user) {
      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + ONE_HOUR_MS);
      await db.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      // Dev helper: surface the token so it can be tested without an email
      // infrastructure. In production we'd enqueue an email job here.
      if (!isProd) {
        return NextResponse.json({
          success: true,
          message: "If the email exists, a reset link has been sent.",
          // dev-only: lets the test client drive the reset flow end-to-end
          devResetToken: resetToken,
          devUserId: user.id,
        });
      }

      // Prod: enqueue email (not wired in this sandbox).
      // await sendPasswordResetEmail(user.email, resetToken);
    }

    return NextResponse.json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (e) {
    return apiCatch(e);
  }
}
