import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch, apiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/api-configs/[id]
 * Single ApiConfig detail (includes credentials).
 * Requires permission: api.view
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "api.view");
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const config = await db.apiConfig.findUnique({ where: { id } });
    if (!config) return apiError("API config not found", 404);

    return NextResponse.json({ config });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/admin/api-configs/[id]
 * Update a single ApiConfig.
 * Requires permission: api.edit
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "api.edit");
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const existing = await db.apiConfig.findUnique({ where: { id } });
    if (!existing) return apiError("API config not found", 404);

    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid JSON body", 400);

    const updateData: Record<string, unknown> = {};

    if (typeof body.service === "string") {
      const validServices = [
        "payment", "blockchain", "kyc", "kyb", "sms", "email",
        "push", "geolocation", "ai", "exchange_rate", "cloud_storage", "auth", "other",
      ];
      if (!validServices.includes(body.service)) {
        return apiError(`service must be one of: ${validServices.join(", ")}`, 400);
      }
      updateData.service = body.service;
    }
    if (typeof body.name === "string" && body.name) updateData.name = body.name;
    if (body.provider !== undefined) updateData.provider = body.provider || null;
    if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl || null;
    if (body.webhookUrl !== undefined) updateData.webhookUrl = body.webhookUrl || null;
    if (typeof body.environment === "string") {
      updateData.environment = body.environment === "production" ? "production" : "sandbox";
    }
    if (typeof body.enabled === "boolean") updateData.enabled = body.enabled;
    if (typeof body.isDefault === "boolean") {
      updateData.isDefault = body.isDefault;
      if (body.isDefault) {
        // Clear other defaults for this service (except this one)
        await db.apiConfig.updateMany({
          where: { service: existing.service, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
    }
    if (body.rateLimitPerMin !== undefined) {
      updateData.rateLimitPerMin = typeof body.rateLimitPerMin === "number" ? body.rateLimitPerMin : null;
    }
    if (body.rateLimitPerDay !== undefined) {
      updateData.rateLimitPerDay = typeof body.rateLimitPerDay === "number" ? body.rateLimitPerDay : null;
    }
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.icon !== undefined) updateData.icon = body.icon || null;

    if (body.credentials !== undefined) {
      if (typeof body.credentials === "string") {
        try {
          updateData.credentials = JSON.stringify(JSON.parse(body.credentials));
        } catch {
          return apiError("credentials must be valid JSON", 400);
        }
      } else if (typeof body.credentials === "object" && body.credentials !== null && !Array.isArray(body.credentials)) {
        updateData.credentials = JSON.stringify(body.credentials);
      } else {
        return apiError("credentials must be a JSON object", 400);
      }
    }

    const updated = await db.apiConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ config: updated });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * DELETE /api/admin/api-configs/[id]
 * Delete an ApiConfig (cascade-deletes its logs).
 * Requires permission: api.delete
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "api.delete");
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const existing = await db.apiConfig.findUnique({ where: { id } });
    if (!existing) return apiError("API config not found", 404);

    await db.apiConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
