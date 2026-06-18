import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const billers = await db.biller.findMany({ orderBy: { category: "asc" } });
  return NextResponse.json({ billers });
}
