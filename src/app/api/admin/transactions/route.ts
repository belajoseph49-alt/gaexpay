import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 100);
  const status = searchParams.get("status");
  const where: any = {};
  if (status && status !== "all") where.status = status;
  const transactions = await db.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return NextResponse.json({ transactions });
}
