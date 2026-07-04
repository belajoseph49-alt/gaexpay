import { NextResponse } from "next/server";
import { apiError, apiCatch } from "@/lib/api-error";
import { getAuthUserId } from "@/lib/api-auth";
import { getGaexPriceHistory } from "@/lib/gaex-token";

export const dynamic = "force-dynamic";

/** GET /api/gaex-token/price-history — 90-day deterministic price history. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const history = await getGaexPriceHistory();
    return NextResponse.json({ history });
  } catch (e) {
    return apiCatch(e);
  }
}
