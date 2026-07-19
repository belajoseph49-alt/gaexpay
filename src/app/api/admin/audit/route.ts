import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — full audit log with filters
export async function GET(req: Request) {
  const auth = await requirePermission(req, "security.audit");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const severity = searchParams.get("severity");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Number(searchParams.get("limit") ?? 200);

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (action && action !== "all") where.action = { contains: action };
  if (severity && severity !== "all") where.severity = severity;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const td = new Date(to);
      td.setHours(23, 59, 59, 999);
      range.lte = td;
    }
    where.createdAt = range;
  }

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 1000),
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return NextResponse.json({ logs });
}
