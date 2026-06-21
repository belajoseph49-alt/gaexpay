import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — list all feature flags
export async function GET(req: Request) {
  const auth = await requirePermission(req, "features.view");
  if ("error" in auth) return auth.error;

  const features = await db.featureFlag.findMany({
    orderBy: { category: "asc" },
  });
  return NextResponse.json({ features });
}

// PATCH — toggle feature flag on/off, or edit visibility
export async function PATCH(req: Request) {
  const auth = await requirePermission(req, "features.toggle");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { id, key, enabled, accountTypes, roles, name, description, category } = body as {
    id?: string;
    key?: string;
    enabled?: boolean;
    accountTypes?: string[];
    roles?: string[];
    name?: string;
    description?: string;
    category?: string;
  };

  // Find by id OR key
  let feature;
  if (id) {
    feature = await db.featureFlag.findUnique({ where: { id } });
  } else if (key) {
    feature = await db.featureFlag.findUnique({ where: { key } });
  }
  if (!feature) return NextResponse.json({ error: "Feature flag not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (typeof enabled === "boolean") updates.enabled = enabled;
  if (Array.isArray(accountTypes)) updates.accountTypes = JSON.stringify(accountTypes);
  if (Array.isArray(roles)) updates.roles = JSON.stringify(roles);
  if (name) updates.name = name;
  if (description) updates.description = description;
  if (category) updates.category = category;

  const updated = await db.featureFlag.update({ where: { id: feature.id }, data: updates });

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "feature.toggle",
      entity: "FeatureFlag",
      entityId: feature.id,
      severity: typeof enabled === "boolean" ? "warning" : "info",
      details: JSON.stringify({ key: feature.key, ...updates }),
    },
  });

  return NextResponse.json({ success: true, feature: updated });
}
