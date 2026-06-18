import { NextResponse } from "next/server";
import { DEMO_USER_ID } from "@/lib/gaexpay";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  // ensure demo user exists
  const exists = await db.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!exists) {
    return NextResponse.json({ error: "Run `bun run prisma/seed.ts` first." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, userId: DEMO_USER_ID });
}
