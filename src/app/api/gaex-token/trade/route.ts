import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { getCryptoPriceMap, FIAT_USD_RATE } from "@/lib/coingecko";
import { GAEX_BASE_PRICE_USD } from "@/lib/gaex-token";

export const dynamic = "force-dynamic";

/**
 * POST /api/gaex-token/trade — buy or sell GAEX against another wallet currency.
 *
 * Body:
 *   { side: "buy" | "sell", currency: "NGN" | "USD" | "USDT" | ..., amount: number }
 *
 * - BUY: deduct `currency` wallet, credit GAEX wallet.
 * - SELL: deduct GAEX wallet, credit `currency` wallet.
 *
 * Price is GAEX_BASE_PRICE_USD for now (pre-listing). The pair currency's USD
 * rate comes from the CoinGecko price map (if crypto) or FIAT_USD_RATE.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      side?: "buy" | "sell";
      currency?: string;
      amount?: number | string;
    };
    if (!b.side || !b.currency || !b.amount) {
      return apiError("side, currency, and amount are required", 400);
    }
    if (b.side !== "buy" && b.side !== "sell") {
      return apiError("side must be 'buy' or 'sell'", 400);
    }
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError("amount must be a positive number", 400);
    }
    const currency = b.currency.toUpperCase();
    if (currency === "GAEX") return apiError("Cannot trade GAEX for GAEX", 400);

    const priceMap = await getCryptoPriceMap().catch(() => ({} as Record<string, number>));
    const gaexPrice = GAEX_BASE_PRICE_USD;
    const pairUsd =
      currency in priceMap
        ? priceMap[currency]
        : (FIAT_USD_RATE[currency] ? 1 / FIAT_USD_RATE[currency] : 0);
    if (!pairUsd || pairUsd <= 0) {
      return apiError(`Unsupported currency: ${currency}`, 400);
    }
    // Rate: how many GAEX per 1 unit of `currency`.
    const rate = pairUsd / gaexPrice; // 1 currency = rate GAEX

    if (b.side === "buy") {
      // BUY: user spends `amount` units of `currency` to receive GAEX.
      const gaexReceived = amount * rate;
      const feeGaex = gaexReceived * 0.001; // 0.1% platform fee
      const netGaex = gaexReceived - feeGaex;

      // Find/create both wallets.
      let pairWallet = await db.wallet.findFirst({
        where: { userId, currency },
      });
      if (!pairWallet) {
        return apiError(`You don't have a ${currency} wallet yet. Add one first.`, 400);
      }
      if (pairWallet.balance < amount) {
        return apiError(`Insufficient ${currency} balance. You have ${pairWallet.balance}, need ${amount}.`, 400);
      }

      let gaexWallet = await db.wallet.findFirst({
        where: { userId, currency: "GAEX", type: "crypto" },
      });
      if (!gaexWallet) {
        gaexWallet = await db.wallet.create({
          data: {
            userId,
            currency: "GAEX",
            type: "crypto",
            balance: 0,
            label: "GAEX Wallet",
          },
        });
      }

      const [updatedPair, updatedGaex] = await db.$transaction([
        db.wallet.update({
          where: { id: pairWallet.id },
          data: { balance: { decrement: amount } },
        }),
        db.wallet.update({
          where: { id: gaexWallet.id },
          data: { balance: { increment: netGaex } },
        }),
      ]);

      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "gaex.buy",
          entity: "wallet",
          entityId: gaexWallet.id,
          details: JSON.stringify({
            spent: amount, currency, received: netGaex, fee: feeGaex, rate,
          }),
          severity: "info",
        },
      });

      await db.notification.create({
        data: {
          userId,
          title: "GAEX purchased",
          message: `Bought ${netGaex.toFixed(4)} GAEX with ${amount} ${currency}.`,
          type: "success",
          channel: "in_app",
          actionUrl: "gaex-token",
        },
      });

      return NextResponse.json({
        success: true,
        side: "buy",
        rate,
        spent: amount,
        spentCurrency: currency,
        received: netGaex,
        fee: feeGaex,
        gaexBalanceAfter: updatedGaex.balance,
        pairBalanceAfter: updatedPair.balance,
      });
    } else {
      // SELL: user spends `amount` GAEX to receive `currency`.
      const gaexSpent = amount;
      const currencyReceived = gaexSpent / rate; // = gaexSpent * gaexPrice / pairUsd
      const feeCurrency = currencyReceived * 0.001;
      const netCurrency = currencyReceived - feeCurrency;

      let gaexWallet = await db.wallet.findFirst({
        where: { userId, currency: "GAEX", type: "crypto" },
      });
      if (!gaexWallet) {
        return apiError("You don't have a GAEX wallet yet.", 400);
      }
      if (gaexWallet.balance < gaexSpent) {
        return apiError(`Insufficient GAEX balance. You have ${gaexWallet.balance}, need ${gaexSpent}.`, 400);
      }

      let pairWallet = await db.wallet.findFirst({
        where: { userId, currency },
      });
      if (!pairWallet) {
        pairWallet = await db.wallet.create({
          data: {
            userId,
            currency,
            type: currency in priceMap ? "crypto" : "primary",
            balance: 0,
            label: `${currency} Wallet`,
          },
        });
      }

      const [updatedGaex, updatedPair] = await db.$transaction([
        db.wallet.update({
          where: { id: gaexWallet.id },
          data: { balance: { decrement: gaexSpent } },
        }),
        db.wallet.update({
          where: { id: pairWallet.id },
          data: { balance: { increment: netCurrency } },
        }),
      ]);

      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "gaex.sell",
          entity: "wallet",
          entityId: gaexWallet.id,
          details: JSON.stringify({
            spent: gaexSpent, received: netCurrency, currency, fee: feeCurrency, rate,
          }),
          severity: "info",
        },
      });

      await db.notification.create({
        data: {
          userId,
          title: "GAEX sold",
          message: `Sold ${gaexSpent.toFixed(4)} GAEX for ${netCurrency.toFixed(2)} ${currency}.`,
          type: "success",
          channel: "in_app",
          actionUrl: "gaex-token",
        },
      });

      return NextResponse.json({
        success: true,
        side: "sell",
        rate,
        spent: gaexSpent,
        received: netCurrency,
        receivedCurrency: currency,
        fee: feeCurrency,
        gaexBalanceAfter: updatedGaex.balance,
        pairBalanceAfter: updatedPair.balance,
      });
    }
  } catch (e) {
    return apiCatch(e);
  }
}
