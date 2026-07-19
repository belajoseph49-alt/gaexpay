import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { CARRIERS, bundlesByNetwork, DATA_BUNDLES } from "@/lib/carriers";

export const dynamic = "force-dynamic";

/**
 * GET /api/data/bundles
 *
 * Returns every available data bundle grouped by carrier id, plus the
 * flat carrier list. The shape is intentionally the same as the
 * `bundles` field returned by `GET /api/data` so a client can call
 * either endpoint and consume the response with the same code.
 *
 * Response:
 *   {
 *     bundles: { mtn: [...], airtel: [...], glo: [...], "9mobile": [...] },
 *     carriers: Carrier[],
 *     bundleList: DataBundle[]
 *   }
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    return NextResponse.json({
      bundles: bundlesByNetwork(),
      carriers: CARRIERS,
      bundleList: DATA_BUNDLES,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
