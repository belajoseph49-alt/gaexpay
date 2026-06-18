import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await db.card.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ cards });
}

export async function POST(req: Request) {
  const body = await req.json();
  const last4 = Math.floor(1000 + Math.random() * 9000).toString();
  const card = await db.card.create({
    data: {
      userId: DEMO_USER_ID,
      type: body.type ?? "virtual",
      brand: body.brand ?? "visa",
      nickname: body.nickname ?? "GaexPay Card",
      maskedNumber: `**** **** **** ${last4}`,
      fullNumberEnc: "enc_" + last4,
      expiryMonth: String(Math.floor(Math.random() * 12) + 1).padStart(2, "0"),
      expiryYear: String(26 + Math.floor(Math.random() * 4)),
      cvvEnc: "enc_cvv_new",
      holderName: body.holderName ?? "ADAEZE OKONKWO",
      currency: body.currency ?? "NGN",
      balance: 0,
      limit: body.limit ?? 200000,
      spending: 0,
      status: "active",
      color: body.color ?? "emerald",
    },
  });
  return NextResponse.json({ card });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, status, nickname } = body;
  const card = await db.card.update({
    where: { id },
    data: { ...(status && { status }), ...(nickname && { nickname }) },
  });
  return NextResponse.json({ card });
}
