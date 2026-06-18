import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const devices = await db.device.findMany({ where: { userId: DEMO_USER_ID }, orderBy: { lastActive: "desc" } });
  return NextResponse.json({ devices });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) await db.device.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
