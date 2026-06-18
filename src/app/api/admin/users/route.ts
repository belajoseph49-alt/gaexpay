import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit") ?? 50);

  const where: any = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q } }, { lastName: { contains: q } },
      { email: { contains: q } }, { phone: { contains: q } }, { username: { contains: q } },
    ];
  }
  if (status && status !== "all") where.status = status;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      country: true, kycStatus: true, kycTier: true, status: true, role: true,
      createdAt: true, lastLoginAt: true, referralCount: true, rewardPoints: true,
    },
  });
  return NextResponse.json({ users });
}
