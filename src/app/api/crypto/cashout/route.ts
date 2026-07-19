import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { getCryptoRates, FIAT_USD_RATE } from "@/lib/coingecko";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { cashoutSchema, formatZodError } from "@/lib/validations";
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

/** Cashout fee — 1.0% taken from the crypto side. */
const CASHOUT_FEE_PCT = 0.01;

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
 * POST /api/crypto/cashout
 *
 * Convert crypto holdings directly into fiat in the same wallet, using REAL
 * CoinGecko prices. The fee (1.0%) is charged in crypto — the user receives
 * the FULL market value of the (crypto − fee) in fiat.
 *
 * Atomicity: the wallet balance checks + updates + transaction records are
 * wrapped in `db.$transaction` so a failure mid-way rolls back the entire
 * cashout (no orphan debits/credits).
 *
 * Security hardening:
 *   - `getAuthUserId` — 401 in production without a valid token
 *   - `cashoutSchema` (zod) — rejects bad crypto/fiat/amount
 *   - `rateLimitSensitive` — 10 cashouts / minute / identifier
 *   - All error paths through `apiCatch` — no internals leaked to client
 *
 * Body:
 *   {
 *     crypto: "BTC",
 *     fiatCurrency: "NGN",
 *     amount: 0.001     // amount of crypto to cash out
 *   }
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
        { error: "Too many cashout requests. Please slow down." },
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
    const parsed = cashoutSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }
    const { amount } = parsed.data;
    const cryptoUpper = parsed.data.crypto.toUpperCase();
    const fiatUpper = parsed.data.fiatCurrency.toUpperCase();

    // ---------- Crypto/fiat allow-list ----------
    const cryptoMeta = CRYPTOCURRENCIES.find((c) => c.code === cryptoUpper);
    if (!cryptoMeta) {
      return apiError("Unsupported cryptocurrency", 400);
    }
    if (!FIAT_USD_RATE[fiatUpper]) {
      return apiError("Unsupported fiat currency", 400);
    }

    // ---------- Real prices ----------
    const { rates, priceMap } = await getCryptoRates();
    const cryptoPriceUSD = priceMap[cryptoUpper];
    if (!cryptoPriceUSD || cryptoPriceUSD <= 0) {
      return apiError("Price feed unavailable", 503);
    }
    const cryptoRate = rates.find((r) => r.code === cryptoUpper);
    const fiatPerUsd = FIAT_USD_RATE[fiatUpper];
    const directFiatPrice = cryptoRate?.prices?.[fiatUpper];
    // 1 crypto = X fiat units (real CoinGecko price)
    const realRate =
      typeof directFiatPrice === "number" && directFiatPrice > 0
        ? directFiatPrice
        : cryptoPriceUSD * fiatPerUsd;

    // ---------- Compute economics ----------
    // Fee is in crypto: we deduct 1.0% of `amount` as the cashout fee.
    // The user receives the full market value of the *remaining* crypto in fiat.
    const feeCrypto = amount * CASHOUT_FEE_PCT;
    const cryptoDebited = amount; // total crypto removed from wallet (incl. fee)
    const cryptoConverted = amount - feeCrypto; // crypto that actually gets converted
    const fiatCredited = cryptoConverted * realRate;
    const feeFiatValue = feeCrypto * realRate; // for display only
    const netRate = amount > 0 ? fiatCredited / amount : 0;

    // ---------- Atomic cashout ----------
    const cryptoRef = ref();
    const fiatRef = ref();

    const result = await db.$transaction(async (tx) => {
      // 1. Re-fetch the crypto wallet inside the transaction (serializable
      //    isolation on SQLite) and verify the user actually has the balance.
      const cryptoWallet = await tx.wallet.findFirst({
        where: { userId, currency: cryptoUpper, type: "crypto" },
      });
      if (!cryptoWallet) {
        throw new HttpError(400, `You don't have a ${cryptoUpper} wallet to cash out from`);
      }
      if (cryptoWallet.balance < amount) {
        throw new HttpError(400, `Insufficient ${cryptoUpper} balance (available: ${cryptoWallet.balance})`);
      }

      // 2. Decrement the crypto wallet
      const updatedCryptoWallet = await tx.wallet.update({
        where: { id: cryptoWallet.id },
        data: { balance: { decrement: amount } },
      });

      // 3. Find or create the destination fiat wallet
      let fiatWallet = await tx.wallet.findFirst({
        where: { userId, currency: fiatUpper, type: "primary" },
      });
      if (!fiatWallet) {
        fiatWallet = await tx.wallet.create({
          data: {
            userId,
            currency: fiatUpper,
            label: `${fiatUpper} Wallet`,
            type: "primary",
            balance: 0,
            ledgerBalance: 0,
            isDefault: false,
            status: "active",
          },
        });
      }

      // 4. Credit the fiat wallet
      const updatedFiatWallet = await tx.wallet.update({
        where: { id: fiatWallet.id },
        data: { balance: { increment: fiatCredited } },
      });

      // 5. Create the paired transaction records
      const cryptoTx = await tx.transaction.create({
        data: {
          reference: cryptoRef,
          userId,
          senderId: userId,
          type: "exchange",
          direction: "debit",
          status: "completed",
          amount,
          fee: feeCrypto,
          currency: cryptoUpper,
          description: `Cashed out ${amount} ${cryptoUpper} to ${fiatUpper}`,
          category: "investment",
          counterpartyName: `GaexPay Cashout → ${fiatUpper}`,
          method: "wallet",
          provider: "gaexpay-cashout",
          walletId: cryptoWallet.id,
          metadata: JSON.stringify({
            kind: "crypto-cashout",
            direction: "debit",
            crypto: cryptoUpper,
            cryptoName: cryptoMeta.name,
            fiatCurrency: fiatUpper,
            amount,
            marketRate: realRate,
            cryptoPriceUSD,
            fiatPerUsd,
            feePct: CASHOUT_FEE_PCT * 100,
            feeCrypto,
            feeFiatValue,
            cryptoConverted,
            fiatCredited,
            pairedTxRef: fiatRef,
            priceSource: "CoinGecko",
          }),
          completedAt: new Date(),
        },
      });

      const fiatTx = await tx.transaction.create({
        data: {
          reference: fiatRef,
          userId,
          senderId: userId,
          type: "exchange",
          direction: "credit",
          status: "completed",
          amount: fiatCredited,
          fee: 0,
          currency: fiatUpper,
          description: `Received from ${cryptoUpper} cashout`,
          category: "investment",
          counterpartyName: `GaexPay Cashout ← ${cryptoUpper}`,
          method: "wallet",
          provider: "gaexpay-cashout",
          walletId: fiatWallet.id,
          metadata: JSON.stringify({
            kind: "crypto-cashout",
            direction: "credit",
            crypto: cryptoUpper,
            cryptoName: cryptoMeta.name,
            fiatCurrency: fiatUpper,
            amount,
            marketRate: realRate,
            cryptoPriceUSD,
            fiatPerUsd,
            feePct: CASHOUT_FEE_PCT * 100,
            feeCrypto,
            feeFiatValue,
            cryptoConverted,
            fiatCredited,
            pairedTxRef: cryptoRef,
            priceSource: "CoinGecko",
          }),
          completedAt: new Date(),
        },
      });

      return {
        cryptoTx,
        fiatTx,
        remainingCryptoBalance: updatedCryptoWallet.balance,
        fiatWalletId: updatedFiatWallet.id,
      };
    });

    // ---------- Notification (outside the financial transaction) ----------
    await db.notification.create({
      data: {
        userId,
        title: "Crypto cashout completed",
        message: `Cashed out ${amount} ${cryptoUpper} → ${fiatCredited.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper} (1.0% fee in crypto).`,
        type: "transaction",
        channel: "push",
        actionUrl: "/transactions",
        metadata: JSON.stringify({
          kind: "crypto-cashout",
          crypto: cryptoUpper,
          fiatCurrency: fiatUpper,
          cryptoDebited: amount,
          fiatCredited,
          reference: result.cryptoTx.reference,
        }),
      },
    });

    // ---------- Response ----------
    return NextResponse.json({
      success: true,
      reference: result.cryptoTx.reference,
      debitReference: result.cryptoTx.reference,
      creditReference: result.fiatTx.reference,
      crypto: cryptoUpper,
      cryptoName: cryptoMeta.name,
      fiatCurrency: fiatUpper,
      amount,
      cryptoDebited,
      cryptoConverted,
      fiatCredited,
      fee: feeCrypto,
      feeCrypto,
      feeFiatValue,
      feePct: CASHOUT_FEE_PCT * 100,
      rate: realRate,
      netRate,
      cryptoPriceUSD,
      fiatPerUsd,
      remainingCryptoBalance: result.remainingCryptoBalance,
      completedAt: result.cryptoTx.completedAt,
      source: "CoinGecko",
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return apiError(e.message, e.status);
    }
    return apiCatch(e);
  }
}

/**
 * GET /api/crypto/cashout?crypto=BTC&fiat=NGN
 * Quote-only endpoint — returns the current real market rate + fee preview
 * without executing a cashout. Used by the UI's live preview.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const crypto = (url.searchParams.get("crypto") || "BTC").toUpperCase();
    const fiat = (url.searchParams.get("fiat") || "NGN").toUpperCase();

    const cryptoMeta = CRYPTOCURRENCIES.find((c) => c.code === crypto);
    const fiatPerUsd = FIAT_USD_RATE[fiat];
    if (!cryptoMeta || !fiatPerUsd) {
      return apiError("Invalid crypto or fiat", 400);
    }

    const { rates, priceMap } = await getCryptoRates();
    const cryptoPriceUSD = priceMap[crypto] ?? 0;
    if (cryptoPriceUSD <= 0) {
      return apiError("Price feed unavailable", 503);
    }
    const cryptoRate = rates.find((r) => r.code === crypto);
    const directFiatPrice = cryptoRate?.prices?.[fiat];
    const realRate =
      typeof directFiatPrice === "number" && directFiatPrice > 0
        ? directFiatPrice
        : cryptoPriceUSD * fiatPerUsd;

    // Pull the available balance from the DB so the UI shows the LIVE remaining
    // balance after previous cashouts, not a stale constant.
    const cryptoWallet = await db.wallet.findFirst({
      where: { userId, currency: crypto, type: "crypto" },
    });
    const available = cryptoWallet?.balance ?? 0;

    return NextResponse.json({
      crypto,
      cryptoName: cryptoMeta.name,
      fiat,
      marketRate: realRate,
      netRate: realRate * (1 - CASHOUT_FEE_PCT),
      cryptoPriceUSD,
      fiatPerUsd,
      feePct: CASHOUT_FEE_PCT * 100,
      availableBalance: available,
      change24h: cryptoRate?.change24h ?? 0,
      source: "CoinGecko",
    });
  } catch (e) {
    return apiCatch(e);
  }
}
