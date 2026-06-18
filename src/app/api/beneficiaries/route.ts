import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const beneficiaries = await db.beneficiary.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ beneficiaries });
}

export async function POST(req: Request) {
  const body = await req.json();
  const b = await db.beneficiary.create({
    data: { userId: DEMO_USER_ID, ...body },
  });
  return NextResponse.json({ beneficiary: b });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.beneficiary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
