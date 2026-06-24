import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/merchants/lookup?id=<merchantId|qrCode|account>
 *
 * Public merchant lookup used by the QR scanner before the user pays.
 * Searches across the `id`, `qrCode`, and `account` columns so a QR
 * payload can be any of: a GaexPay merchant ID, the printed QR code
 * (`GXP-MER-001`), or the merchant's account number.
 *
 * Returns `{ merchant: { id, name, category, rating, account, logo, phone } }`
 * or `{ merchant: null }` so the caller can decide to fall back to manual
 * entry. No auth required — this only exposes the public catalog fields.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawId = url.searchParams.get("id")?.trim();
    if (!rawId) return apiError("Missing merchant id", 400);

    // Strip any whitespace / quotes that can leak in from QR payloads.
    const id = rawId.replace(/["'`]/g, "").trim();

    const merchant = await db.merchant.findFirst({
      where: {
        OR: [
          { id },
          { qrCode: id },
          { account: id },
        ],
        status: { in: ["active", "approved"] },
      },
      select: {
        id: true,
        name: true,
        category: true,
        rating: true,
        account: true,
        logo: true,
        phone: true,
        qrCode: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ merchant: null });
    }

    return NextResponse.json({ merchant });
  } catch (e) {
    return apiCatch(e);
  }
}
