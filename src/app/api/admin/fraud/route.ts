import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const flagged = await db.transaction.findMany({
    where: { OR: [{ fraudFlag: true }, { status: "flagged" }, { riskScore: { gte: 0.6 } }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return NextResponse.json({ flagged });
}
