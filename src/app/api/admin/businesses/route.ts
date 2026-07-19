import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — list all business profiles with their user info
export async function GET(req: Request) {
  const auth = await requirePermission(req, "businesses.view");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const kybStatus = searchParams.get("kybStatus");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { companyName: { contains: q } },
      { registrationNumber: { contains: q } },
      { taxId: { contains: q } },
      { user: { email: { contains: q } } },
    ];
  }
  if (kybStatus && kybStatus !== "all") where.kybStatus = kybStatus;

  const businesses = await db.businessProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          status: true, kycStatus: true, kycTier: true,
        },
      },
    },
  });
  return NextResponse.json({ businesses });
}

// PATCH — verify / reject / suspend KYB
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "verify";

  let perm: string;
  switch (action) {
    case "verify":
      perm = "kyb.approve";
      break;
    case "reject":
      perm = "kyb.reject";
      break;
    case "suspend":
      perm = "businesses.suspend";
      break;
    case "request_info":
      perm = "kyb.approve";
      break;
    default:
      perm = "kyb.approve";
  }

  const auth = await requirePermission(req, perm);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { businessId, reason, tier } = body as { businessId?: string; reason?: string; tier?: number };
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const biz = await db.businessProfile.findUnique({ where: { id: businessId } });
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const audit = (action_name: string, details: Record<string, unknown>) =>
    db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: action_name,
        entity: "BusinessProfile",
        entityId: businessId,
        severity: action_name.includes("reject") || action_name.includes("suspend") ? "warning" : "info",
        details: JSON.stringify(details),
      },
    });

  if (action === "verify") {
    await db.businessProfile.update({
      where: { id: businessId },
      data: {
        kybStatus: "verified",
        kybVerifiedAt: new Date(),
        kybRejectionReason: null,
        kybTier: tier ?? 1,
      },
    });
    await audit("business.kyb_verify", { companyName: biz.companyName });
    return NextResponse.json({ success: true, status: "verified" });
  }

  if (action === "reject") {
    await db.businessProfile.update({
      where: { id: businessId },
      data: {
        kybStatus: "rejected",
        kybRejectionReason: reason || "Documentation insufficient",
      },
    });
    await audit("business.kyb_reject", { companyName: biz.companyName, reason });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  if (action === "suspend") {
    await db.user.update({
      where: { id: biz.userId },
      data: { status: "suspended" },
    });
    await audit("business.suspend", { companyName: biz.companyName });
    return NextResponse.json({ success: true, status: "suspended" });
  }

  if (action === "request_info") {
    await db.notification.create({
      data: {
        userId: biz.userId,
        title: "Additional KYB Information Required",
        message: reason || "Please submit additional documentation to complete business verification.",
        type: "warning",
        channel: "in_app",
      },
    });
    await audit("business.kyb_request_info", { companyName: biz.companyName, reason });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
