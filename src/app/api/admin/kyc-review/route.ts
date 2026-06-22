import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// GET — list pending KYC submissions with documents
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "kyc.view");
    if ("error" in auth) return auth.error;

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") || "pending";

    // Build the where clause for KYC status
    const where: Record<string, unknown> = {};
    if (statusFilter === "all") {
      where.kycStatus = { not: "unverified" };
    } else if (statusFilter === "pending") {
      where.kycStatus = "pending";
    } else if (statusFilter === "verified") {
      where.kycStatus = "verified";
    } else if (statusFilter === "rejected") {
      where.kycStatus = "rejected";
    } else {
      where.kycStatus = statusFilter;
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        city: true,
        address: true,
        dob: true,
        gender: true,
        accountType: true,
        kycStatus: true,
        kycTier: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycRejectionReason: true,
        createdAt: true,
        kycDocuments: {
          orderBy: { createdAt: "desc" },
        },
        businessProfile: {
          select: {
            companyName: true,
            companyType: true,
            registrationNumber: true,
            industry: true,
            legalAddress: true,
            legalCountry: true,
          },
        },
      },
      orderBy: { kycSubmittedAt: "desc" },
      take: 200,
    });

    const formatted = users.map((u) => ({
      ...u,
      documentsCount: u.kycDocuments.length,
      documents: u.kycDocuments,
    }));

    return NextResponse.json({
      submissions: formatted,
      counts: {
        pending: await db.user.count({ where: { kycStatus: "pending" } }),
        verified: await db.user.count({ where: { kycStatus: "verified" } }),
        rejected: await db.user.count({ where: { kycStatus: "rejected" } }),
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — approve / reject / request more info
export async function PATCH(req: Request) {
  try {
    const auth = await requirePermission(req, "kyc.approve");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { action, userId, tier, reason, note } = body as {
      action: "approve" | "reject" | "request_info";
      userId: string;
      tier?: number;
      reason?: string;
      note?: string;
    };

    if (!action || !userId) {
      return NextResponse.json({ error: "action and userId required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, kycStatus: true, kycTier: true, accountType: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "approve") {
      const newTier = typeof tier === "number" ? tier : 2;
      const updated = await db.user.update({
        where: { id: userId },
        data: {
          kycStatus: "verified",
          kycTier: newTier,
          kycVerifiedAt: new Date(),
          kycRejectionReason: null,
        },
      });
      // Approve all pending KYC documents for this user
      await db.kycDocument.updateMany({
        where: { userId, status: "pending" },
        data: { status: "approved", reviewedBy: auth.userId, reviewedAt: new Date(), reviewNote: note ?? null },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "kyc.approve",
          entity: "User",
          entityId: userId,
          severity: "info",
          details: JSON.stringify({ userId, tier: newTier, accountType: user.accountType }),
        },
      });
      return NextResponse.json({ success: true, user: updated });
    }

    if (action === "reject") {
      const updated = await db.user.update({
        where: { id: userId },
        data: {
          kycStatus: "rejected",
          kycRejectionReason: reason || "Rejected by reviewer",
        },
      });
      await db.kycDocument.updateMany({
        where: { userId, status: "pending" },
        data: { status: "rejected", reviewedBy: auth.userId, reviewedAt: new Date(), reviewNote: reason ?? null },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "kyc.reject",
          entity: "User",
          entityId: userId,
          severity: "warning",
          details: JSON.stringify({ userId, reason }),
        },
      });
      return NextResponse.json({ success: true, user: updated });
    }

    if (action === "request_info") {
      const updated = await db.user.update({
        where: { id: userId },
        data: {
          kycRejectionReason: reason || "Additional information required",
        },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "kyc.request_info",
          entity: "User",
          entityId: userId,
          severity: "info",
          details: JSON.stringify({ userId, note, reason }),
        },
      });
      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return apiCatch(e);
  }
}
