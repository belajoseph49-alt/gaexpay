import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — list all fee configs
export async function GET(req: Request) {
  const auth = await requirePermission(req, "fees.view");
  if ("error" in auth) return auth.error;

  const fees = await db.feeConfig.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ fees });
}

// POST — create new fee config
export async function POST(req: Request) {
  const auth = await requirePermission(req, "fees.create");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { name, description, feeType, feeValue, fixedFee, currency, minFee, maxFee, minAmount, maxAmount, transactionType, accountType, enabled } = body;

  if (!name || typeof feeValue !== "number") {
    return NextResponse.json({ error: "name and feeValue required" }, { status: 400 });
  }

  const existing = await db.feeConfig.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "Fee config with this name already exists" }, { status: 409 });

  const created = await db.feeConfig.create({
    data: {
      name,
      description,
      feeType: feeType || "percentage",
      feeValue,
      fixedFee: fixedFee ?? 0,
      currency: currency || "NGN",
      minFee: minFee ?? 0,
      maxFee: maxFee ?? null,
      minAmount: minAmount ?? null,
      maxAmount: maxAmount ?? null,
      transactionType: transactionType ?? null,
      accountType: accountType || "all",
      enabled: enabled ?? true,
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "fee.create",
      entity: "FeeConfig",
      entityId: created.id,
      severity: "info",
      details: JSON.stringify({ name }),
    },
  });

  return NextResponse.json({ success: true, fee: created });
}

// PATCH — edit existing fee config or toggle
export async function PATCH(req: Request) {
  const auth = await requirePermission(req, "fees.edit");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { id, enabled, feeType, feeValue, fixedFee, minFee, maxFee, minAmount, maxAmount, description, accountType } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.feeConfig.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Fee config not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (typeof enabled === "boolean") updates.enabled = enabled;
  if (feeType) updates.feeType = feeType;
  if (typeof feeValue === "number") updates.feeValue = feeValue;
  if (typeof fixedFee === "number") updates.fixedFee = fixedFee;
  if (typeof minFee === "number") updates.minFee = minFee;
  if (typeof maxFee === "number") updates.maxFee = maxFee;
  if (typeof minAmount === "number") updates.minAmount = minAmount;
  if (typeof maxAmount === "number") updates.maxAmount = maxAmount;
  if (typeof description === "string") updates.description = description;
  if (accountType) updates.accountType = accountType;

  const updated = await db.feeConfig.update({ where: { id }, data: updates });

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "fee.edit",
      entity: "FeeConfig",
      entityId: id,
      severity: "info",
      details: JSON.stringify({ name: existing.name, fields: Object.keys(updates) }),
    },
  });

  return NextResponse.json({ success: true, fee: updated });
}
