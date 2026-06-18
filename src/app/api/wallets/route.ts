import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const wallets = await db.wallet.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const totalNGN = wallets.reduce((sum, w) => {
    // approximate convert to NGN
    const rate: Record<string, number> = { NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12, UGX: 0.42, XOF: 2.5, ZAR: 82 };
    return sum + w.balance * (rate[w.currency] ?? 1);
  }, 0);
  return NextResponse.json({ wallets, totalNGN });
}

export async function POST(req: Request) {
  const body = await req.json();
  const wallet = await db.wallet.create({
    data: {
      userId: DEMO_USER_ID,
      currency: body.currency ?? "NGN",
      label: body.label ?? "New Wallet",
      type: body.type ?? "primary",
      balance: 0,
      ledgerBalance: 0,
    },
  });
  return NextResponse.json({ wallet });
}
