import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import { getCryptoRates, FIAT_USD_RATE } from "@/lib/coingecko";
import { CURRENCIES, CRYPTOCURRENCIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/exchange-rates
 * List all exchange rates (USD-base + cross pairs), with source (auto / manual).
 */
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "exchange_rates.view");
    if ("error" in auth) return auth.error;

    const rates = await db.exchangeRate.findMany({
      orderBy: [{ base: "asc" }, { quote: "asc" }],
      take: 500,
    });

    // Pull live CoinGecko prices to mark which manual entries are stale vs. live.
    let liveCrypto: Record<string, number> = {};
    try {
      const { priceMap } = await getCryptoRates();
      liveCrypto = priceMap;
    } catch {
      // ignore — offline mode
    }

    const enriched = rates.map((r) => {
      const isAuto = r.source !== "admin";
      let liveRate: number | null = null;
      if (r.base === "USD") {
        if (liveCrypto[r.quote]) liveRate = liveCrypto[r.quote];
        else if (FIAT_USD_RATE[r.quote]) liveRate = FIAT_USD_RATE[r.quote];
      }
      return {
        id: r.id,
        base: r.base,
        quote: r.quote,
        rate: r.rate,
        buy: r.buy,
        sell: r.sell,
        source: r.source === "admin" ? "manual" : "auto",
        liveRate,
        deviationPct:
          liveRate && liveRate > 0
            ? ((r.rate - liveRate) / liveRate) * 100
            : null,
        updatedAt: r.updatedAt,
      };
    });

    return NextResponse.json({ rates: enriched });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/admin/exchange-rates?action=update|toggle_auto|refresh
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "update";

    if (action === "refresh") {
      const auth = await requirePermission(req, "exchange_rates.refresh");
      if ("error" in auth) return auth.error;

      // Re-fetch CoinGecko prices (this also refreshes the cache) and write
      // USD-base rates for every supported crypto + fiat.
      const { priceMap } = await getCryptoRates();
      const upserts: Promise<unknown>[] = [];
      for (const c of CRYPTOCURRENCIES) {
        const usd = priceMap[c.code];
        if (!usd || usd <= 0) continue;
        upserts.push(
          db.exchangeRate.upsert({
            where: { base_quote: { base: "USD", quote: c.code } },
            update: { rate: usd, buy: usd * 0.995, sell: usd * 1.005, source: "coingecko" },
            create: { base: "USD", quote: c.code, rate: usd, buy: usd * 0.995, sell: usd * 1.005, source: "coingecko" },
          }),
        );
      }
      for (const [code, usd] of Object.entries(FIAT_USD_RATE)) {
        if (!usd || usd <= 0) continue;
        upserts.push(
          db.exchangeRate.upsert({
            where: { base_quote: { base: "USD", quote: code } },
            update: { rate: usd, buy: usd * 0.995, sell: usd * 1.005, source: "coingecko" },
            create: { base: "USD", quote: code, rate: usd, buy: usd * 0.995, sell: usd * 1.005, source: "coingecko" },
          }),
        );
      }
      await Promise.all(upserts);

      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "exchange_rates.refresh",
          entity: "ExchangeRate",
          entityId: "global",
          severity: "info",
          details: JSON.stringify({ by: auth.userId, pairsUpdated: upserts.length }),
        },
      });
      return NextResponse.json({ success: true, pairsUpdated: upserts.length });
    }

    if (action === "update") {
      const auth = await requirePermission(req, "exchange_rates.edit");
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
        return NextResponse.json({ error: "base, quote, rate required" }, { status: 400 });
      }
      const updated = await db.exchangeRate.upsert({
        where: { base_quote: { base, quote } },
        update: {
          rate,
          buy: buy ?? rate * 0.995,
          sell: sell ?? rate * 1.005,
          source: "admin",
        },
        create: {
          base, quote, rate,
          buy: buy ?? rate * 0.995,
          sell: sell ?? rate * 1.005,
          source: "admin",
        },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "exchange_rates.update",
          entity: "ExchangeRate",
          entityId: updated.id,
          severity: "warning",
          details: JSON.stringify({ by: auth.userId, base, quote, rate }),
        },
      });
      return NextResponse.json({ success: true, rate: updated });
    }

    if (action === "toggle_auto") {
      const auth = await requirePermission(req, "exchange_rates.edit");
      if ("error" in auth) return auth.error;

      const body = await req.json().catch(() => ({}));
      const { base, quote, auto } = body as { base?: string; quote?: string; auto?: boolean };
      if (!base || !quote || typeof auto !== "boolean") {
        return NextResponse.json({ error: "base, quote, auto required" }, { status: 400 });
      }
      const source = auto ? "coingecko" : "admin";
      const existing = await db.exchangeRate.findUnique({
        where: { base_quote: { base, quote } },
      });
      if (!existing) return NextResponse.json({ error: "Rate not found" }, { status: 404 });
      const updated = await db.exchangeRate.update({
        where: { base_quote: { base, quote } },
        data: { source },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "exchange_rates.toggle_auto",
          entity: "ExchangeRate",
          entityId: updated.id,
          severity: "info",
          details: JSON.stringify({ by: auth.userId, base, quote, auto }),
        },
      });
      return NextResponse.json({ success: true, source: updated.source });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return apiCatch(e);
  }
}
