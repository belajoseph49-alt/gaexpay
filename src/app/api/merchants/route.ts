import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const merchants = await db.merchant.findMany({ orderBy: { rating: "desc" } });
  return NextResponse.json({ merchants });
}
