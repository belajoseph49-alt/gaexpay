import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePermission(req, "tickets.view");
  if ("error" in auth) return auth.error;

  const tickets = await db.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  return NextResponse.json({ tickets });
}
