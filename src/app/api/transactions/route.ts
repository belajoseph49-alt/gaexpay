import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 50);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const days = Number(searchParams.get("days") ?? 0);

  const where: any = { userId: DEMO_USER_ID };
  if (type && type !== "all") where.type = type;
  if (status && status !== "all") where.status = status;
  if (days > 0) {
    where.createdAt = { gte: new Date(Date.now() - days * 86400000) };
  }

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ transactions });
}
