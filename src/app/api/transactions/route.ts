import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/transactions — filtered transaction list for the authenticated user. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const days = Number(searchParams.get("days") ?? 0);

    const where: { userId: string; type?: string; status?: string; createdAt?: { gte: Date } } = { userId };
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
  } catch (e) {
    return apiCatch(e);
  }
}
