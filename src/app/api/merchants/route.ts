import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/merchants — public merchant catalog (auth required to limit scraping). */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const merchants = await db.merchant.findMany({ orderBy: { rating: "desc" } });
    return NextResponse.json({ merchants });
  } catch (e) {
    return apiCatch(e);
  }
}
