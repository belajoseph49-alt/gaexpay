import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Use the first merchant as "our" merchant
  const merchant = await db.merchant.findFirst();
  if (!merchant) {
    return NextResponse.json({ error: "No merchant found" }, { status: 404 });
  }

  // Generate QR payload (in production this would be a signed payment token)
  const qrPayload = JSON.stringify({
    type: "gaexpay_merchant_payment",
    merchantId: merchant.id,
    merchantName: merchant.name,
    account: merchant.account,
    qrCode: merchant.qrCode,
    timestamp: Date.now(),
  });

  return NextResponse.json({
    merchant,
    qrPayload,
    // Simple QR matrix pattern for visual display (21x21 grid)
    qrMatrix: generateQRMatrix(merchant.qrCode),
  });
}

// Simple deterministic pattern generator for visual QR display
function generateQRMatrix(seed: string): number[][] {
  const size = 25;
  const matrix: number[][] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  let rng = Math.abs(hash) || 1;
  const next = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      // Corner finder patterns (7x7 squares in 3 corners)
      const inFinder = (cx: number, cy: number) =>
        x >= cx && x < cx + 7 && y >= cy && y < cy + 7 &&
        (x === cx || x === cx + 6 || y === cy || y === cy + 6 ||
         (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4));
      if (inFinder(0, 0) || inFinder(size - 7, 0) || inFinder(0, size - 7)) {
        row.push(1);
      } else if (
        (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8)
      ) {
        row.push(0); // finder pattern border
      } else {
        row.push(next() > 0.5 ? 1 : 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}
