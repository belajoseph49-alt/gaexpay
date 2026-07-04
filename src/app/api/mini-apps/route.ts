import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/mini-apps — list all enabled mini apps. */
export async function GET() {
  try {
    const apps = await db.miniApp.findMany({
      where: { enabled: true },
      orderBy: [{ featured: "desc" }, { installs: "desc" }],
    });
    const featured = apps.filter((a) => a.featured).slice(0, 6);
    return NextResponse.json({ apps, featured });
  } catch (e) {
    return apiCatch(e);
  }
}
