import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import QRCode from "qrcode";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/merchant-qr — generate a scannable QR for the linked merchant account. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Use the first merchant as "our" merchant
    const merchant = await db.merchant.findFirst();
    if (!merchant) {
      return apiError("No merchant found", 404);
    }

    // Generate QR payload
    const qrPayload = JSON.stringify({
      type: "gaexpay_merchant_payment",
      merchantId: merchant.id,
      merchantName: merchant.name,
      account: merchant.account,
      qrCode: merchant.qrCode,
      timestamp: Date.now(),
    });

    // Generate real scannable QR code as base64 data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });

    // Also generate SVG version for crisp rendering
    const qrSvg = await QRCode.toString(qrPayload, {
      type: "svg",
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });

    return NextResponse.json({
      merchant,
      qrPayload,
      qrDataUrl,
      qrSvg,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
