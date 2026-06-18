import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await db.user.findUnique({
    where: { id: DEMO_USER_ID },
    select: { referralCode: true, referralCount: true, referralEarnings: true, rewardPoints: true },
  });
  // simulate referred users
  const referred = await db.user.findMany({
    where: { NOT: { id: DEMO_USER_ID } },
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
}
