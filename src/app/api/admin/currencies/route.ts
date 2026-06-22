import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { CURRENCIES, CRYPTOCURRENCIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// GET — list all currencies (static list + DB-enabled flag) + exchange rates
export async function GET(req: Request) {
  const auth = await requirePermission(req, "currencies.view");
  if ("error" in auth) return auth.error;

  const rates = await db.exchangeRate.findMany({
    where: { base: "USD" },
    take: 100,
  });

  // Combine the static list with stored enabled state.
  // We use AdminMetric entries with category="currency" to track enabled state.
  const enabled = await db.adminMetric.findMany({
    where: { category: "currency" },
  });
  const enabledMap: Record<string, boolean> = {};
  for (const e of enabled) enabledMap[e.key] = e.value === 1;

  const fiat = CURRENCIES.map((c) => ({
    ...c,
    enabled: enabledMap[c.code] ?? true,
    rateUSD: rates.find((r) => r.quote === c.code)?.rate ?? null,
  }));
  const crypto = CRYPTOCURRENCIES.map((c) => ({
    ...c,
    enabled: enabledMap[c.code] ?? true,
    rateUSD: rates.find((r) => r.quote === c.code)?.rate ?? null,
  }));

  return NextResponse.json({
    fiat,
    crypto,
    rates: rates.map((r) => ({ base: r.base, quote: r.quote, rate: r.rate, buy: r.buy, sell: r.sell, updatedAt: r.updatedAt })),
  });
}

// POST — add a new currency exchange rate (or update existing)
export async function POST(req: Request) {
  const auth = await requirePermission(req, "currencies.add");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { base, quote, rate, buy, sell } = body as {
    base?: string;
    quote?: string;
    rate?: number;
    buy?: number;
    sell?: number;
  };

  if (!base || !quote || typeof rate !== "number") {
    return NextResponse.json({ error: "base, quote, rate are required" }, { status: 400 });
  }

  const created = await db.exchangeRate.upsert({
    where: { base_quote: { base, quote } },
    update: { rate, buy: buy ?? rate * 0.99, sell: sell ?? rate * 1.01, source: "admin" },
    create: { base, quote, rate, buy: buy ?? rate * 0.99, sell: sell ?? rate * 1.01, source: "admin" },
  });

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "currency.rate_add",
      entity: "ExchangeRate",
      entityId: created.id,
      severity: "info",
      details: JSON.stringify({ base, quote, rate }),
    },
  });

  return NextResponse.json({ success: true, rate: created });
}

// PATCH — toggle currency enabled/disabled or edit rate
export async function PATCH(req: Request) {
  const auth = await requirePermission(req, "currencies.toggle");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { code, enabled, base, quote, rate, buy, sell } = body as {
    code?: string;
    enabled?: boolean;
    base?: string;
    quote?: string;
    rate?: number;
    buy?: number;
    sell?: number;
  };

  if (typeof enabled === "boolean" && code) {
    // Toggle currency enabled/disabled via AdminMetric
    await db.adminMetric.upsert({
      where: { key: code },
      update: { value: enabled ? 1 : 0, category: "currency", label: code },
      create: { key: code, value: enabled ? 1 : 0, category: "currency", label: code },
    });
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: enabled ? "currency.enable" : "currency.disable",
        entity: "Currency",
        entityId: code,
        severity: "info",
        details: JSON.stringify({ code, enabled }),
      },
    });
    return NextResponse.json({ success: true, code, enabled });
  }

  if (base && quote && typeof rate === "number") {
    const updated = await db.exchangeRate.update({
      where: { base_quote: { base, quote } },
      data: { rate, buy, sell, source: "admin" },
    });
    return NextResponse.json({ success: true, rate: updated });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
