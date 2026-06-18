import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const docs = await db.kycDocument.findMany({ where: { userId: DEMO_USER_ID } });
  const user = await db.user.findUnique({ where: { id: DEMO_USER_ID }, select: { kycStatus: true, kycTier: true, kycSubmittedAt: true, kycVerifiedAt: true, kycRejectionReason: true } });
  return NextResponse.json({ documents: docs, ...user });
}

export async function POST(req: Request) {
  const body = await req.json();
  const doc = await db.kycDocument.create({
    data: { userId: DEMO_USER_ID, ...body, status: "pending" },
  });
  await db.user.update({
    where: { id: DEMO_USER_ID },
    data: { kycStatus: "pending", kycSubmittedAt: new Date() },
  });
  return NextResponse.json({ document: doc });
}
