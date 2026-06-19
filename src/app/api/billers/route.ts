import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/billers — list billers (airtime, electricity, water, internet, TV, betting). */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const billers = await db.biller.findMany({ orderBy: { category: "asc" } });
    return NextResponse.json({ billers });
  } catch (e) {
    return apiCatch(e);
  }
}
