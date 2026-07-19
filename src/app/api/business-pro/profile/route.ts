import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, businessProfile: true },
    });

    if (!user || user.role !== "business") {
      return apiError("Forbidden: User is not a business", 403);
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return apiError("Invalid payload", 400);
    }

    const allowedFields = ["companyName", "industry", "website", "companyType", "registrationNumber", "taxId", "commercialRegistry", "legalAddress", "legalCity", "legalCountry"];
    const data: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return apiError("No valid fields to update", 400);
    }

    // Upsert business profile (if they are a business but don't have one yet)
    const updated = await db.businessProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
        companyName: data.companyName || user.businessProfile?.companyName || "Unnamed Business",
      },
      update: data,
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "business.profile_updated",
        entity: "businessProfile",
        entityId: updated.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify(data),
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, businessProfile: updated });
  } catch (e) {
    return apiCatch(e);
  }
}
