import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/seed — create a few realistic demo notifications
 * for the authenticated user. Idempotent: if the user already has 6 or more
 * notifications, it returns the existing count instead of duplicating.
 *
 * Used by the notifications view's "Load sample notifications" button (and
 * auto-fired on first open when the list is empty) so the demo user has
 * something to look at before they trigger any transactions.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Idempotency: don't pile on duplicates if the user already has plenty.
    const existing = await db.notification.count({ where: { userId } });
    if (existing >= 6) {
      return NextResponse.json({
        success: true,
        seeded: 0,
        total: existing,
        message: "Notifications already populated",
      });
    }

    const now = new Date();
    const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);

    // Six realistic notifications covering the main types.
    await db.notification.createMany({
      data: [
        {
          userId,
          title: "Welcome to GaexPay 🎉",
          message:
            "Your account is ready. Send money, pay bills, trade crypto, and earn rewards — all in one place.",
          type: "promo",
          channel: "push",
          actionUrl: "/dashboard",
          createdAt: minsAgo(120),
        },
        {
          userId,
          title: "Account secured with 2FA",
          message:
            "Two-factor authentication is enabled. Your account is protected against unauthorized access.",
          type: "security",
          channel: "push",
          actionUrl: "/security",
          createdAt: minsAgo(95),
        },
        {
          userId,
          title: "You received ₦50,000.00",
          message: "John Doe sent you ₦50,000.00. Tap to view transaction details.",
          type: "transaction",
          channel: "push",
          actionUrl: "/transactions",
          createdAt: minsAgo(60),
        },
        {
          userId,
          title: "Bill payment completed",
          message: "DSTV Premium subscription of ₦5,000.00 was paid successfully. Reference GXP-DSTV-7K2.",
          type: "bill",
          channel: "push",
          actionUrl: "/pay",
          createdAt: minsAgo(40),
        },
        {
          userId,
          title: "KYC Tier 1 verified ✅",
          message:
            "Your identity has been verified. You can now send up to ₦200,000 per day. Upgrade to Tier 2 for higher limits.",
          type: "kyc",
          channel: "push",
          actionUrl: "/kyc",
          createdAt: minsAgo(20),
        },
        {
          userId,
          title: "New login from Lagos, Nigeria",
          message:
            "A new login to your account was detected from Lagos, Nigeria on Chrome (Windows). If this wasn't you, please secure your account immediately.",
          type: "security",
          channel: "push",
          actionUrl: "/security",
          createdAt: minsAgo(8),
        },
      ],
    });

    const total = await db.notification.count({ where: { userId } });

    return NextResponse.json({
      success: true,
      seeded: 6,
      total,
      message: "Sample notifications created",
    });
  } catch (e) {
    return apiCatch(e);
  }
}
