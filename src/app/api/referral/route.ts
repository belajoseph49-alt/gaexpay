import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/referral — current user's referral code, count, earnings + referred users list. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referralCount: true, referralEarnings: true, rewardPoints: true },
    });
    // Real referred users from DB
    const referred = await db.user.findMany({
      where: { NOT: { id: userId } },
      take: 14,
      select: { firstName: true, lastName: true, createdAt: true, status: true },
    });
    const tiers = [
      { name: "Bronze", min: 0, reward: "₦500 per referral" },
      { name: "Silver", min: 5, reward: "₦750 per referral + 5% cashback" },
      { name: "Gold", min: 15, reward: "₦1,000 per referral + 10% cashback" },
      { name: "Platinum", min: 50, reward: "₦1,500 per referral + priority support" },
    ];
    return NextResponse.json({ ...user, referred, tiers });
  } catch (e) {
    return apiCatch(e);
  }
}
