import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID, CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { getCryptoRates, FIAT_USD_RATE } from "@/lib/coingecko";

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

interface CashoutRequestBody {
  crypto: string;
  fiatCurrency: string;
  amount: number;
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
 * Body:
 *   {
 *     crypto: "BTC",
 *     fiatCurrency: "NGN",
 *     amount: 0.001     // amount of crypto to cash out
 *   }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CashoutRequestBody;
    const { crypto, fiatCurrency, amount } = body;

    // ---------- Validation ----------
    const cryptoUpper = String(crypto || "").toUpperCase();
    const fiatUpper = String(fiatCurrency || "").toUpperCase();
    const numericAmount = Number(amount);

    const cryptoMeta = CRYPTOCURRENCIES.find((c) => c.code === cryptoUpper);
    if (!cryptoMeta) {
      return NextResponse.json(
        { error: "Unsupported cryptocurrency" },
        { status: 400 },
      );
    }
    if (!FIAT_USD_RATE[fiatUpper]) {
      return NextResponse.json(
        { error: "Unsupported fiat currency" },
        { status: 400 },
      );
    }
    if (!isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "amount must be greater than 0" },
        { status: 400 },
      );
    }

    // ---------- Real prices ----------
    const { rates, priceMap } = await getCryptoRates();
    const cryptoPriceUSD = priceMap[cryptoUpper];
    if (!cryptoPriceUSD || cryptoPriceUSD <= 0) {
      return NextResponse.json(
        { error: "Price feed unavailable" },
        { status: 500 },
      );
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
    const feeCrypto = numericAmount * CASHOUT_FEE_PCT;
    const cryptoDebited = numericAmount; // total crypto removed from wallet (incl. fee)
    const cryptoConverted = numericAmount - feeCrypto; // crypto that actually gets converted
    const fiatCredited = cryptoConverted * realRate;
    const feeFiatValue = feeCrypto * realRate; // for display only
    const netRate = numericAmount > 0 ? fiatCredited / numericAmount : 0;

    // ---------- Atomic cashout ----------
    const cryptoRef = ref();
    const fiatRef = ref();

    const result = await db.$transaction(async (tx) => {
      // 1. Re-fetch the crypto wallet inside the transaction (serializable
      //    isolation on SQLite) and verify the user actually has the balance.
      const cryptoWallet = await tx.wallet.findFirst({
        where: { userId: DEMO_USER_ID, currency: cryptoUpper, type: "crypto" },
      });
      if (!cryptoWallet) {
        throw new HttpError(
          400,
          `You don't have a ${cryptoUpper} wallet to cash out from`,
        );
      }
      if (cryptoWallet.balance < numericAmount) {
        throw new HttpError(
          400,
          `Insufficient ${cryptoUpper} balance (available: ${cryptoWallet.balance})`,
        );
      }

      // 2. Decrement the crypto wallet
      const updatedCryptoWallet = await tx.wallet.update({
        where: { id: cryptoWallet.id },
        data: { balance: { decrement: numericAmount } },
      });

      // 3. Find or create the destination fiat wallet
      let fiatWallet = await tx.wallet.findFirst({
        where: { userId: DEMO_USER_ID, currency: fiatUpper, type: "primary" },
      });
      if (!fiatWallet) {
        fiatWallet = await tx.wallet.create({
          data: {
            userId: DEMO_USER_ID,
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
          userId: DEMO_USER_ID,
          senderId: DEMO_USER_ID,
          type: "exchange",
          direction: "debit",
          status: "completed",
          amount: numericAmount,
          fee: feeCrypto,
          currency: cryptoUpper,
          description: `Cashed out ${numericAmount} ${cryptoUpper} to ${fiatUpper}`,
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
            amount: numericAmount,
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
          userId: DEMO_USER_ID,
          senderId: DEMO_USER_ID,
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
            amount: numericAmount,
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
        userId: DEMO_USER_ID,
        title: "Crypto cashout completed",
        message: `Cashed out ${numericAmount} ${cryptoUpper} → ${fiatCredited.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper} (1.0% fee in crypto).`,
        type: "transaction",
        channel: "push",
        actionUrl: "/transactions",
        metadata: JSON.stringify({
          kind: "crypto-cashout",
          crypto: cryptoUpper,
          fiatCurrency: fiatUpper,
          cryptoDebited: numericAmount,
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
      amount: numericAmount,
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
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e?.message || "Cashout failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/crypto/cashout?crypto=BTC&fiat=NGN
 * Quote-only endpoint — returns the current real market rate + fee preview
 * without executing a cashout. Used by the UI's live preview.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const crypto = (url.searchParams.get("crypto") || "BTC").toUpperCase();
  const fiat = (url.searchParams.get("fiat") || "NGN").toUpperCase();

  const cryptoMeta = CRYPTOCURRENCIES.find((c) => c.code === crypto);
  const fiatPerUsd = FIAT_USD_RATE[fiat];
  if (!cryptoMeta || !fiatPerUsd) {
    return NextResponse.json(
      { error: "Invalid crypto or fiat" },
      { status: 400 },
    );
  }

  const { rates, priceMap } = await getCryptoRates();
  const cryptoPriceUSD = priceMap[crypto] ?? 0;
  if (cryptoPriceUSD <= 0) {
    return NextResponse.json(
      { error: "Price feed unavailable" },
      { status: 500 },
    );
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
    where: { userId: DEMO_USER_ID, currency: crypto, type: "crypto" },
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
}
