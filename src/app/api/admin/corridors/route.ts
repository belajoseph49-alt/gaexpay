import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import {
  getSetting,
  setSetting,
  ensureSetting,
  DEFAULT_CORRIDORS,
} from "@/lib/system-settings";
import { COUNTRIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// GET — list all transfer corridors
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "corridors.view");
    if ("error" in auth) return auth.error;

    const corridors = await ensureSetting("corridors", DEFAULT_CORRIDORS, "corridors");

    const enriched = (corridors as any[]).map((c) => ({
      ...c,
      fromCountryName: countryName(c.fromCountry),
      toCountryName: countryName(c.toCountry),
      fromFlag: countryFlag(c.fromCountry),
      toFlag: countryFlag(c.toCountry),
    }));

    const stats = {
      total: enriched.length,
      active: enriched.filter((c) => c.enabled).length,
      totalVolume30d: enriched.reduce((s, c) => s + (c.volume30d ?? 0), 0),
    };

    return NextResponse.json({ corridors: enriched, stats });
  } catch (e) {
    return apiCatch(e);
  }
}

// POST — add a new corridor
export async function POST(req: Request) {
  try {
    const auth = await requirePermission(req, "corridors.create");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { fromCountry, toCountry, fromCurrency, toCurrency, minAmount, maxAmount, feePercent, fixedFee, etaHours, partnerBank } = body as {
      fromCountry: string;
      toCountry: string;
      fromCurrency: string;
      toCurrency: string;
      minAmount: number;
      maxAmount: number;
      feePercent: number;
      fixedFee: number;
      etaHours: number;
      partnerBank: string;
    };

    if (!fromCountry || !toCountry || !fromCurrency || !toCurrency) {
      return NextResponse.json({ error: "Missing required corridor fields" }, { status: 400 });
    }

    const list = (await getSetting<any[]>("corridors")) ?? [];
    const newCorridor = {
      id: `corr_${fromCountry.toLowerCase()}_${toCountry.toLowerCase()}_${Date.now()}`,
      fromCountry,
      toCountry,
      fromCurrency,
      toCurrency,
      minAmount: minAmount ?? 0,
      maxAmount: maxAmount ?? 0,
      feePercent: feePercent ?? 1.5,
      fixedFee: fixedFee ?? 0,
      etaHours: etaHours ?? 24,
      partnerBank: partnerBank ?? "",
      enabled: true,
      volume30d: 0,
    };
    const next = [...list, newCorridor];
    await setSetting("corridors", next, "corridors");

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "corridor.create",
        entity: "SystemSetting",
        entityId: newCorridor.id,
        severity: "info",
        details: JSON.stringify(newCorridor),
      },
    });

    return NextResponse.json({ success: true, corridor: newCorridor });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — update limits/fees or toggle enable/disable
export async function PATCH(req: Request) {
  try {
    const auth = await requirePermission(req, "corridors.edit");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { id, updates, enabled } = body as {
      id: string;
      updates?: Record<string, unknown>;
      enabled?: boolean;
    };

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const list = (await getSetting<any[]>("corridors")) ?? [];
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return NextResponse.json({ error: "Corridor not found" }, { status: 404 });

    const before = { ...list[idx] };
    if (typeof enabled === "boolean") list[idx].enabled = enabled;
    if (updates) list[idx] = { ...list[idx], ...updates, id: list[idx].id };
    await setSetting("corridors", list, "corridors");

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "corridor.update",
        entity: "SystemSetting",
        entityId: id,
        severity: "info",
        details: JSON.stringify({ id, before, after: list[idx] }),
      },
    });

    return NextResponse.json({ success: true, corridor: list[idx] });
  } catch (e) {
    return apiCatch(e);
  }
}

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
function countryFlag(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.flag ?? "🌍";
}
