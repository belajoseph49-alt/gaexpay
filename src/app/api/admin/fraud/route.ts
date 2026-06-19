import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// ADMIN-ONLY ROUTE — PRODUCTION HARDENING TODO:
//   1. Verify the caller has role === "admin" via requireAuth + role check.
//   2. Gate the route behind an admin rate-limit policy (separate from the
//      user-facing SENSITIVE_LIMIT) so a compromised user token can't
//      enumerate platform-wide metrics.
//   3. Wrap the handler in try/catch + apiCatch to avoid leaking Prisma
//      errors to the client.
//   The DEMO_USER_ID-less impl below is acceptable in the dev/demo build
//   but MUST be hardened before any production deploy.
// ---------------------------------------------------------------------------

export async function GET() {
  const flagged = await db.transaction.findMany({
    where: { OR: [{ fraudFlag: true }, { status: "flagged" }, { riskScore: { gte: 0.6 } }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return NextResponse.json({ flagged });
}
