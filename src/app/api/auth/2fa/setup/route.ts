/**
 * POST /api/auth/2fa/setup
 *
 * Begin the 2FA enrollment flow. Generates a fresh TOTP secret + 10 recovery
 * codes, stores the secret in `User.mfaPendingSecret` (NOT yet active — that
 * happens only after `/api/auth/2fa/verify` confirms the user can produce a
 * valid TOTP code), and returns:
 *
 *   {
 *     secret,         // base32 string for manual entry
 *     otpauthUrl,     // otpauth:// URL for QR generation
 *     qrDataUrl,      // PNG data URL of the QR code (rendered server-side)
 *     recoveryCodes,  // 10 plain codes — shown ONCE, then never again
 *   }
 *
 * The recovery codes are returned to the client in plaintext AT THIS STEP
 * ONLY. They are NOT yet persisted as "active" — persistence happens on
 * /verify. The server pre-stashes their SHA-256 hashes in
 * `User.mfaRecoveryCodes` so /verify doesn't need to receive them again (and
 * risk being intercepted). If the user abandons setup, /disable or another
 * /setup call will overwrite the stash.
 *
 * Auth required. Rate-limited (sensitive).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import {
  generateTOTPSecret,
  generateTOTPURI,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/totp";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))),
          },
        },
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        status: true,
      },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);
    if (user.mfaEnabled) {
      return apiError(
        "Two-factor authentication is already enabled. Disable it first to re-enroll.",
        409,
      );
    }

    // Generate fresh secret + recovery codes for this enrollment session.
    const secret = generateTOTPSecret();
    const otpauthUrl = generateTOTPURI(user.email, secret);
    const recoveryCodes = generateRecoveryCodes();

    // Render the QR code as a PNG data URL. Server-side render avoids
    // shipping a QR library to the client and gives us full control of the
    // image size + error-correction level.
    let qrDataUrl: string;
    try {
      qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 240,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch {
      // If QR generation fails (very unlikely — qrcode is pure JS), still
      // return the otpauth URL so the user can manually enter the secret.
      qrDataUrl = "";
    }

    // Stash the pending secret + hashed recovery codes on the user row.
    // /verify will promote these to the "live" mfaSecret / mfaRecoveryCodes
    // fields once the user produces a valid TOTP code.
    const recoveryHashes = recoveryCodes.map(hashRecoveryCode);
    await db.user.update({
      where: { id: userId },
      data: {
        mfaPendingSecret: secret,
        // Stash hashes in mfaRecoveryCodes NOW so /verify doesn't need to
        // re-receive them (and risk being intercepted). They become "active"
        // together with mfaEnabled=true at /verify time.
        mfaRecoveryCodes: JSON.stringify(recoveryHashes),
      },
    });

    return NextResponse.json({
      secret,
      otpauthUrl,
      qrDataUrl,
      recoveryCodes,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
