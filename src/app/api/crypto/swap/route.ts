import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { getCryptoPriceMap } from "@/lib/coingecko";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { swapSchema, formatZodError } from "@/lib/validations";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function ref() {
  return (
    "GXP" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

// Per-crypto network fee in USD (estimated gas/miner fee)
const NETWORK_FEE_USD: Record<string, number> = {
  BTC: 1.85, ETH: 2.45, BNB: 0.15, SOL: 0.005, XRP: 0.001, ADA: 0.0017,
  DOT: 0.02, MATIC: 0.01, LTC: 0.03, TRX: 0.001,
  USDT: 1.0, USDC: 1.0, BUSD: 0.8, DAI: 1.2,
  PI: 0.0001,
};

// 0.3% swap fee (DEX-style)
const SWAP_FEE_PCT = 0.003;

// Slippage tolerance default
const DEFAULT_SLIPPAGE_PCT = 0.5;

/** Thrown inside the transaction to abort with a specific HTTP status. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * POST /api/crypto/swap
 *
 * Swap one crypto for another using REAL CoinGecko prices. Checks the
 * fromCrypto wallet's real DB balance, debits it, and credits the converted
 * amount to the toCrypto wallet (creating it on the fly if missing). All
 * wallet mutations + transaction record are wrapped in `db.$transaction`.
 *
 * Security hardening:
 *   - `getAuthUserId` — 401 in production without a valid token
 *   - `swapSchema` (zod) — rejects bad crypto codes / non-positive amounts
 *   - `rateLimitSensitive` — 10 swaps / minute / identifier
 *   - All error paths through `apiCatch` — no internals leaked to client
 */
export async function POST(req: Request) {
  try {
    // ---------- Auth ----------
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---------- Rate limit ----------
    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many swap requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    // ---------- Parse + validate body ----------
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const parsed = swapSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }
    const { amount } = parsed.data;
    const fromUpper = parsed.data.fromCrypto.toUpperCase();
    const toUpper = parsed.data.toCrypto.toUpperCase();

    // ---------- Crypto allow-list + sanity ----------
    const fromValid = CRYPTOCURRENCIES.some((c) => c.code === fromUpper);
    const toValid = CRYPTOCURRENCIES.some((c) => c.code === toUpper);
    if (!fromValid || !toValid) {
      return apiError("Unsupported cryptocurrency code", 400);
    }
    if (fromUpper === toUpper) {
      return apiError("Cannot swap a coin for itself", 400);
    }

    // ---------- Real CoinGecko prices (60s cache) ----------
    const priceMap = await getCryptoPriceMap();
    const fromPrice = priceMap[fromUpper];
    const toPrice = priceMap[toUpper];
    if (!fromPrice || !toPrice) {
      return apiError("Price feed unavailable for selected asset", 503);
    }

    // Live rate from real USD prices
    const grossRate = toPrice > 0 ? fromPrice / toPrice : 0;
    const swapFeeInFrom = amount * SWAP_FEE_PCT;
    const amountAfterFee = amount - swapFeeInFrom;
    const convertedAmount = amountAfterFee * grossRate;

    // Network fee denominated in the destination crypto (USD → to-crypto units)
    const networkFeeUSD = NETWORK_FEE_USD[toUpper] ?? 0.5;
    const networkFeeCrypto = toPrice > 0 ? networkFeeUSD / toPrice : 0;
    const minReceived =
      convertedAmount * (1 - DEFAULT_SLIPPAGE_PCT / 100) - networkFeeCrypto;

    // Price impact heuristic — larger swaps move price more
    const usdValue = amount * fromPrice;
    const priceImpactPct =
      usdValue < 1000 ? 0.05 : usdValue < 10000 ? 0.18 : usdValue < 100000 ? 0.42 : 0.85;

    const fromMeta = CRYPTOCURRENCIES.find((c) => c.code === fromUpper);
    const toMeta = CRYPTOCURRENCIES.find((c) => c.code === toUpper);

    const txRef = ref();

    // ---------- Atomic swap ----------
    const result = await db.$transaction(async (tx) => {
      // 1. Verify the source wallet exists and has sufficient balance
      const fromWallet = await tx.wallet.findFirst({
        where: { userId, currency: fromUpper, type: "crypto" },
      });
      if (!fromWallet) {
        throw new HttpError(400, `You don't have a ${fromUpper} wallet to swap from`);
      }
      if (fromWallet.balance < amount) {
        throw new HttpError(400, `Insufficient ${fromUpper} balance (available: ${fromWallet.balance})`);
      }

      // 2. Find or create the destination wallet
      let toWallet = await tx.wallet.findFirst({
        where: { userId, currency: toUpper, type: "crypto" },
      });
      if (!toWallet) {
        toWallet = await tx.wallet.create({
          data: {
            userId,
            currency: toUpper,
            balance: 0,
            ledgerBalance: 0,
            type: "crypto",
            label: "Crypto Wallet",
            isDefault: false,
            status: "active",
          },
        });
      }

      // 3. Debit source wallet, credit destination wallet
      const updatedFrom = await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: amount } },
      });
      const updatedTo = await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: convertedAmount } },
      });

      // 4. Persist a transaction record
      const txRecord = await tx.transaction.create({
        data: {
          reference: txRef,
          userId,
          senderId: userId,
          type: "exchange",
          direction: "debit",
          status: "completed",
          amount,
          fee: swapFeeInFrom * fromPrice, // fee in USD for record-keeping
          currency: fromUpper,
          description: `Swap ${amount} ${fromUpper} → ${convertedAmount.toFixed(6)} ${toUpper}`,
          category: "investment",
          counterpartyName: `GaexPay Swap → ${toUpper}`,
          method: "wallet",
          provider: "gaexpay-swap",
          walletId: fromWallet.id,
          metadata: JSON.stringify({
            kind: "crypto-swap",
            from: fromUpper,
            to: toUpper,
            fromName: fromMeta?.name,
            toName: toMeta?.name,
            rate: grossRate,
            convertedAmount,
            networkFeeUSD,
            networkFeeCrypto,
            swapFeeInFrom,
            slippagePct: DEFAULT_SLIPPAGE_PCT,
            minReceived,
            priceImpactPct,
            priceSource: "CoinGecko",
            fromPriceUSD: fromPrice,
            toPriceUSD: toPrice,
            fromWalletId: fromWallet.id,
            toWalletId: toWallet.id,
            remainingFromBalance: updatedFrom.balance,
            newToBalance: updatedTo.balance,
          }),
          completedAt: new Date(),
        },
      });

      return {
        txRecord,
        remainingFromBalance: updatedFrom.balance,
        newToBalance: updatedTo.balance,
      };
    });

    // ---------- Notification ----------
    await db.notification.create({
      data: {
        userId,
        title: "Crypto swap completed",
        message: `Swapped ${amount} ${fromUpper} for ${convertedAmount.toFixed(6)} ${toUpper} at 1 ${fromUpper} = ${grossRate.toFixed(6)} ${toUpper}.`,
        type: "transaction",
        channel: "push",
      },
    });

    return NextResponse.json({
      success: true,
      reference: result.txRecord.reference,
      transactionId: result.txRecord.id,
      from: fromUpper,
      to: toUpper,
      fromName: fromMeta?.name,
      toName: toMeta?.name,
      amount,
      rate: grossRate,
      convertedAmount,
      swapFeeInFrom,
      swapFeePct: SWAP_FEE_PCT * 100,
      networkFeeUSD,
      networkFeeCrypto,
      slippagePct: DEFAULT_SLIPPAGE_PCT,
      minReceived,
      priceImpactPct,
      fromPriceUSD: fromPrice,
      toPriceUSD: toPrice,
      remainingFromBalance: result.remainingFromBalance,
      newToBalance: result.newToBalance,
      completedAt: result.txRecord.completedAt,
      source: "CoinGecko",
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return apiError(e.message, e.status);
    }
    return apiCatch(e);
  }
}

// Convenience GET that returns current swap quote (rate + fees) without executing
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return apiError("from and to query params required", 400);
    }

    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    const priceMap = await getCryptoPriceMap();
    const fromPrice = priceMap[fromUpper];
    const toPrice = priceMap[toUpper];
    if (!fromPrice || !toPrice) {
      return apiError("Unsupported crypto", 400);
    }

    const grossRate = toPrice > 0 ? fromPrice / toPrice : 0;

    return NextResponse.json({
      from: fromUpper,
      to: toUpper,
      rate: grossRate,
      fromPriceUSD: fromPrice,
      toPriceUSD: toPrice,
      swapFeePct: SWAP_FEE_PCT * 100,
      networkFeeUSD: NETWORK_FEE_USD[toUpper] ?? 0.5,
      slippagePct: DEFAULT_SLIPPAGE_PCT,
      source: "CoinGecko",
    });
  } catch (e) {
    return apiCatch(e);
  }
}
