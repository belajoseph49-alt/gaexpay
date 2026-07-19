import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import { CRYPTOCURRENCIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

const CRYPTO_CODES = new Set(CRYPTOCURRENCIES.map((c) => c.code));
const CRYPTO_META: Record<string, { network: string; name: string; icon: string }> = Object.fromEntries(
  CRYPTOCURRENCIES.map((c) => [c.code, { network: c.network, name: c.name, icon: c.icon }]),
);

// Crypto settings stored as AdminMetric entries under category="crypto_settings".
const SETTING_KEYS = ["min_trade_amount", "max_trade_amount", "swap_fee_override"] as const;

async function getCryptoSettings() {
  const rows = await db.adminMetric.findMany({
    where: { category: "crypto_settings" },
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    min_trade_amount: map.min_trade_amount ?? 10,
    max_trade_amount: map.max_trade_amount ?? 50_000,
    swap_fee_override: map.swap_fee_override ?? 0.3, // percent
  };
}

/**
 * GET /api/admin/crypto?tab=wallets|trades|swaps
 */
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "crypto.view");
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "wallets";
    const q = searchParams.get("q") || "";

    if (tab === "wallets") {
      // Crypto wallets — Wallet records whose currency is a known crypto code.
      const where: Record<string, unknown> = {
        currency: { in: Array.from(CRYPTO_CODES) },
      };
      if (q) {
        where.OR = [
          {
            user: {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
              ],
            },
          },
        ];
      }
      const wallets = await db.wallet.findMany({
        where,
        orderBy: { balance: "desc" },
        take: 300,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      const result = wallets.map((w) => ({
        id: w.id,
        balance: w.balance,
        currency: w.currency,
        status: w.status,
        type: w.type,
        network: CRYPTO_META[w.currency]?.network ?? "—",
        coinName: CRYPTO_META[w.currency]?.name ?? w.currency,
        icon: CRYPTO_META[w.currency]?.icon ?? "🪙",
        createdAt: w.createdAt,
        user: w.user,
      }));
      return NextResponse.json({ wallets: result });
    }

    if (tab === "trades") {
      const where: Record<string, unknown> = { provider: "gaexpay-trade" };
      if (q) {
        where.OR = [
          { reference: { contains: q } },
          { description: { contains: q } },
          {
            user: {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
              ],
            },
          },
        ];
      }
      const trades = await db.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      const result = trades.map((t) => {
        let meta: any = {};
        try { meta = JSON.parse(t.metadata || "{}"); } catch {}
        return {
          id: t.id,
          reference: t.reference,
          userId: t.userId,
          user: t.user,
          action: meta.action ?? (t.direction === "credit" ? "buy" : "sell"),
          crypto: meta.crypto ?? t.currency,
          cryptoName: meta.cryptoName ?? t.currency,
          fiatCurrency: meta.fiatCurrency ?? "NGN",
          amount: t.amount,
          fiatAmount: meta.fiatAmount ?? 0,
          marketRate: meta.marketRate ?? 0,
          fee: t.fee,
          status: t.status,
          createdAt: t.createdAt,
        };
      });
      return NextResponse.json({ trades: result });
    }

    if (tab === "swaps") {
      const where: Record<string, unknown> = { provider: "gaexpay-swap" };
      if (q) {
        where.OR = [
          { reference: { contains: q } },
          { description: { contains: q } },
          {
            user: {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
              ],
            },
          },
        ];
      }
      const swaps = await db.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      const result = swaps.map((s) => {
        let meta: any = {};
        try { meta = JSON.parse(s.metadata || "{}"); } catch {}
        return {
          id: s.id,
          reference: s.reference,
          user: s.user,
          from: meta.from ?? s.currency,
          to: meta.to ?? "—",
          fromName: meta.fromName ?? meta.from,
          toName: meta.toName ?? meta.to,
          amount: s.amount,
          rate: meta.rate ?? 0,
          convertedAmount: meta.convertedAmount ?? 0,
          fee: s.fee,
          status: s.status,
          createdAt: s.createdAt,
        };
      });
      return NextResponse.json({ swaps: result });
    }

    if (tab === "settings") {
      const settings = await getCryptoSettings();
      // supported coins toggle: read from currency-enabled AdminMetric rows
      const enabledRows = await db.adminMetric.findMany({
        where: { category: "currency" },
      });
      const enabledMap: Record<string, boolean> = {};
      for (const r of enabledRows) enabledMap[r.key] = r.value === 1;
      const coins = CRYPTOCURRENCIES.map((c) => ({
        code: c.code,
        name: c.name,
        network: c.network,
        icon: c.icon,
        enabled: enabledMap[c.code] ?? true,
      }));
      return NextResponse.json({ settings, coins });
    }

    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/admin/crypto?action=adjust_limits|toggle_coin|settings
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "settings";

    const auth = await requirePermission(req, "crypto.settings");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));

    if (action === "toggle_coin") {
      const { code, enabled } = body as { code?: string; enabled?: boolean };
      if (!code || typeof enabled !== "boolean") {
        return NextResponse.json({ error: "code and enabled required" }, { status: 400 });
      }
      await db.adminMetric.upsert({
        where: { key: code },
        update: { value: enabled ? 1 : 0, category: "currency", label: code },
        create: { key: code, value: enabled ? 1 : 0, category: "currency", label: code },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "crypto.toggle_coin",
          entity: "CryptoCoin",
          entityId: code,
          severity: "info",
          details: JSON.stringify({ by: auth.userId, code, enabled }),
        },
      });
      return NextResponse.json({ success: true, code, enabled });
    }

    // settings (adjust min/max trade + swap fee override)
    const { min_trade_amount, max_trade_amount, swap_fee_override } = body as {
      min_trade_amount?: number;
      max_trade_amount?: number;
      swap_fee_override?: number;
    };
    const updates: { key: string; value: number; label: string }[] = [];
    if (typeof min_trade_amount === "number" && min_trade_amount >= 0) {
      updates.push({ key: "min_trade_amount", value: min_trade_amount, label: "Min Trade Amount" });
    }
    if (typeof max_trade_amount === "number" && max_trade_amount >= 0) {
      updates.push({ key: "max_trade_amount", value: max_trade_amount, label: "Max Trade Amount" });
    }
    if (typeof swap_fee_override === "number" && swap_fee_override >= 0 && swap_fee_override <= 100) {
      updates.push({ key: "swap_fee_override", value: swap_fee_override, label: "Swap Fee Override (%)" });
    }
    for (const u of updates) {
      await db.adminMetric.upsert({
        where: { key: u.key },
        update: { value: u.value, category: "crypto_settings", label: u.label },
        create: { key: u.key, value: u.value, category: "crypto_settings", label: u.label },
      });
    }
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "crypto.settings_update",
        entity: "CryptoSettings",
        entityId: "global",
        severity: "info",
        details: JSON.stringify({ by: auth.userId, updates }),
      },
    });
    return NextResponse.json({ success: true, updated: updates });
  } catch (e) {
    return apiCatch(e);
  }
}
