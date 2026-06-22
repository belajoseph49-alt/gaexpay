import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// GET — list all merchants (with optional filters)
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "merchants.view");
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { ownerName: { contains: q } },
        { email: { contains: q } },
        { account: { contains: q } },
      ];
    }
    if (status !== "all") {
      // normalize: legacy "active" maps to "approved"
      if (status === "approved") {
        where.OR = [{ status: "approved" }, { status: "active" }];
      } else {
        where.status = status;
      }
    }
    if (category !== "all") where.category = category;

    const merchants = await db.merchant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    // Aggregate stats
    const allMerchants = await db.merchant.findMany();
    const stats = {
      total: allMerchants.length,
      pending: allMerchants.filter((m) => m.status === "pending").length,
      approved: allMerchants.filter((m) => m.status === "approved" || m.status === "active").length,
      suspended: allMerchants.filter((m) => m.status === "suspended").length,
      rejected: allMerchants.filter((m) => m.status === "rejected").length,
      totalQrCodes: allMerchants.reduce((s, m) => s + (m.qrCount || 1), 0),
      totalVolume: allMerchants.reduce((s, m) => s + (m.volume || 0), 0),
      avgRating: allMerchants.length
        ? allMerchants.reduce((s, m) => s + (m.rating || 0), 0) / allMerchants.length
        : 0,
    };

    return NextResponse.json({ merchants, stats });
  } catch (e) {
    return apiCatch(e);
  }
}

function generateQrCode(): string {
  return `gxp_mqr_${randomBytes(12).toString("hex")}`;
}

// POST — create a new merchant
export async function POST(req: Request) {
  try {
    const auth = await requirePermission(req, "merchants.create");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const {
      name, category, ownerName, account, phone, email, logo,
      rating, volume, qrCount,
    } = body as {
      name?: string;
      category?: string;
      ownerName?: string;
      account?: string;
      phone?: string;
      email?: string;
      logo?: string;
      rating?: number;
      volume?: number;
      qrCount?: number;
    };

    if (!name) return apiError("Business name is required", 400);
    if (!account) return apiError("Account/settlement account is required", 400);

    // Ensure unique QR code (retry on collision)
    let qrCode = generateQrCode();
    for (let i = 0; i < 3; i++) {
      const exists = await db.merchant.findUnique({ where: { qrCode } });
      if (!exists) break;
      qrCode = generateQrCode();
    }

    const merchant = await db.merchant.create({
      data: {
        name,
        category: category || "retail",
        ownerName: ownerName || null,
        account,
        phone: phone || null,
        email: email || null,
        logo: logo || null,
        qrCode,
        status: "pending",
        rating: typeof rating === "number" ? rating : 4.5,
        volume: typeof volume === "number" ? volume : 0,
        qrCount: typeof qrCount === "number" ? qrCount : 1,
      },
    });

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "merchant.create",
        entity: "Merchant",
        entityId: merchant.id,
        severity: "info",
        details: JSON.stringify({ name, category, ownerName }),
      },
    });

    return NextResponse.json({ success: true, merchant }, { status: 201 });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — approve / reject / suspend / generate QR / unsuspend
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "approve";

    let perm: string;
    switch (action) {
      case "approve":
        perm = "merchants.approve";
        break;
      case "reject":
        perm = "merchants.reject";
        break;
      case "suspend":
        perm = "merchants.suspend";
        break;
      case "unsuspend":
        perm = "merchants.suspend";
        break;
      case "qrcode":
        perm = "merchants.qrcode";
        break;
      default:
        return apiError("Unknown action", 400);
    }

    const auth = await requirePermission(req, perm);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { merchantId, reason } = body as { merchantId?: string; reason?: string };
    if (!merchantId) return apiError("merchantId is required", 400);

    const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) return apiError("Merchant not found", 404);

    const audit = (action_name: string, severity: string, details: Record<string, unknown>) =>
      db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: action_name,
          entity: "Merchant",
          entityId: merchant.id,
          severity,
          details: JSON.stringify(details),
        },
      });

    if (action === "approve") {
      const updated = await db.merchant.update({
        where: { id: merchant.id },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: auth.userId,
          rejectionReason: null,
        },
      });
      await audit("merchant.approve", "info", { name: merchant.name });
      return NextResponse.json({ success: true, merchant: updated });
    }

    if (action === "reject") {
      const updated = await db.merchant.update({
        where: { id: merchant.id },
        data: {
          status: "rejected",
          rejectionReason: reason || "Documentation insufficient",
        },
      });
      await audit("merchant.reject", "warning", { name: merchant.name, reason });
      return NextResponse.json({ success: true, merchant: updated });
    }

    if (action === "suspend") {
      const updated = await db.merchant.update({
        where: { id: merchant.id },
        data: { status: "suspended" },
      });
      await audit("merchant.suspend", "warning", { name: merchant.name });
      return NextResponse.json({ success: true, merchant: updated });
    }

    if (action === "unsuspend") {
      const updated = await db.merchant.update({
        where: { id: merchant.id },
        data: { status: "approved" },
      });
      await audit("merchant.unsuspend", "info", { name: merchant.name });
      return NextResponse.json({ success: true, merchant: updated });
    }

    if (action === "qrcode") {
      // Generate a new QR code string + increment qrCount
      let qrCode = generateQrCode();
      for (let i = 0; i < 3; i++) {
        const exists = await db.merchant.findUnique({ where: { qrCode } });
        if (!exists) break;
        qrCode = generateQrCode();
      }
      const updated = await db.merchant.update({
        where: { id: merchant.id },
        data: {
          qrCode,
          qrCount: { increment: 1 },
        },
      });
      await audit("merchant.qrcode_generate", "info", { name: merchant.name, qrCode });
      return NextResponse.json({ success: true, merchant: updated, qrCode });
    }

    return apiError("Unknown action", 400);
  } catch (e) {
    return apiCatch(e);
  }
}
