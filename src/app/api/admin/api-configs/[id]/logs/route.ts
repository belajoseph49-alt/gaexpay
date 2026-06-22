import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch, apiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/api-configs/[id]/logs
 * List ApiLog entries for a config. Optional filters:
 *   ?level=info|warn|error
 *   ?days=7                  — last N days
 *   ?limit=100               — max 500
 *
 * Requires permission: api.logs
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "api.logs");
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const config = await db.apiConfig.findUnique({
      where: { id },
      select: { id: true, name: true, service: true },
    });
    if (!config) return apiError("API config not found", 404);

    const url = new URL(req.url);
    const level = url.searchParams.get("level") || undefined;
    const days = parseInt(url.searchParams.get("days") || "30", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10), 500);

    const where: Record<string, unknown> = { apiConfigId: id };
    if (level && ["info", "warn", "error"].includes(level)) {
      where.level = level;
    }
    if (days > 0) {
      const since = new Date(Date.now() - days * 86400000);
      where.createdAt = { gte: since };
    }

    const logs = await db.apiLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ config, logs });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * DELETE /api/admin/api-configs/[id]/logs
 * Clear all logs for a config.
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
    const config = await db.apiConfig.findUnique({ where: { id }, select: { id: true } });
    if (!config) return apiError("API config not found", 404);

    const result = await db.apiLog.deleteMany({ where: { apiConfigId: id } });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (e) {
    return apiCatch(e);
  }
}
