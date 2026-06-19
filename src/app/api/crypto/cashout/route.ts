import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID, CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { getCryptoRates, FIAT_USD_RATE } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Cashout fee — 1.0% taken from the crypto side
const CASHOUT_FEE_PCT = 0.01;

// The 8 cryptos that have demo wallets (kept in sync with
// /api/crypto/wallets). Used to verify the user actually has a wallet for the
// requested coin.
const DEMO_CRYPTO_CODES = ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "PI", "TRX"];

// Simulated balances for the demo user's crypto wallets. In a real system this
// would live in the DB; we keep the same constants as /api/crypto/wallets so the
// cashout debit can be reflected in the UI after a successful transaction.
const DEMO_CRYPTO_BALANCES: Record<string, number> = {
  BTC: 0.04582,
  ETH: 1.2847,
  USDT: 2850.5,
  USDC: 1240.0,
  BNB: 3.582,
  SOL: 12.45,
  PI: 1850.0,
  TRX: 4580.0,
};

interface CashoutRequestBody {
  crypto: string;
  fiatCurrency: string;
  amount: number;
}

/**
 * POST /api/crypto/cashout
 *
 * Convert crypto holdings directly into fiat in the same wallet, using REAL
 * CoinGecko prices. The fee (1.0%) is charged in crypto — the user receives the
 * FULL market value of the (crypto - fee) in fiat.
 *
 * Body:
 *   {
 *     crypto: "BTC",
 *     fiatCurrency: "NGN",
 *     amount: 0.001     // amount of crypto to cash out
 *   }
 *
 * Side effects:
 *   1. Debit crypto wallet:  type=exchange, direction=debit,  currency=crypto,
 *      method=wallet, description="Cashed out {amount} {crypto} to {fiat}"
 *   2. Credit fiat wallet:   type=exchange, direction=credit, currency=fiat,
 *      method=wallet, description="Received from {crypto} cashout"
 *   3. Notification: "Cashed out {amount} {crypto} → {fiatAmount} {fiat}"
 *
 * The fiat wallet is created on the fly if it doesn't already exist (so we can
 * cash out to XAF / XOF which the demo user doesn't have by default).
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
    if (!DEMO_CRYPTO_CODES.includes(cryptoUpper)) {
      return NextResponse.json(
        { error: `You don't have a ${cryptoUpper} wallet to cash out from` },
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

    // ---------- Balance check ----------
    const available = DEMO_CRYPTO_BALANCES[cryptoUpper] ?? 0;
    if (numericAmount > available) {
      return NextResponse.json(
        {
          error: `Insufficient ${cryptoUpper} balance (available: ${available})`,
        },
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
    const cryptoConverted = numericAmount - feeCrypto; // crypto that actually gets converted to fiat
    const fiatCredited = cryptoConverted * realRate;
    const feeFiatValue = feeCrypto * realRate; // for display only
    const netRate = numericAmount > 0 ? fiatCredited / numericAmount : 0;

    // ---------- Persist transactions ----------
    // 1. Debit the crypto wallet
    const cryptoTx = await db.transaction.create({
      data: {
        reference: ref(),
        userId: DEMO_USER_ID,
        senderId: DEMO_USER_ID,
        type: "exchange",
        direction: "debit",
        status: "completed",
        amount: numericAmount,
        fee: feeCrypto, // fee recorded in crypto units
        currency: cryptoUpper,
        description: `Cashed out ${numericAmount} ${cryptoUpper} to ${fiatUpper}`,
        category: "investment",
        counterpartyName: `GaexPay Cashout → ${fiatUpper}`,
        method: "wallet",
        provider: "gaexpay-cashout",
        metadata: JSON.stringify({
          kind: "crypto-cashout",
          direction: "debit",
          crypto: cryptoUpper,
          cryptoName: cryptoMeta.name,
          fiatCurrency: fiatUpper,
          amount: numericAmount,
          marketRate: realRate, // 1 crypto = X fiat
          cryptoPriceUSD,
          fiatPerUsd,
          feePct: CASHOUT_FEE_PCT * 100,
          feeCrypto,
          feeFiatValue,
          cryptoConverted,
          fiatCredited,
          priceSource: "CoinGecko",
        }),
        completedAt: new Date(),
      },
    });

    // Find or create the destination fiat wallet
    let fiatWallet = await db.wallet.findFirst({
      where: { userId: DEMO_USER_ID, currency: fiatUpper, type: "primary" },
    });
    if (!fiatWallet) {
      fiatWallet = await db.wallet.create({
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

    // Credit the fiat wallet
    await db.wallet.update({
      where: { id: fiatWallet.id },
      data: { balance: { increment: fiatCredited } },
    });

    // 2. Credit the fiat wallet (transaction record)
    const fiatTx = await db.transaction.create({
      data: {
        reference: ref(),
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
          pairedTxRef: cryptoTx.reference,
          priceSource: "CoinGecko",
        }),
        completedAt: new Date(),
      },
    });

    // Link the two transactions via pairedTxRef for the debit side too
    await db.transaction.update({
      where: { id: cryptoTx.id },
      data: {
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
          pairedTxRef: fiatTx.reference,
          priceSource: "CoinGecko",
        }),
      },
    });

    // Mutate the in-memory demo balance so subsequent requests can reflect the
    // deduction (until the dev server restarts).
    DEMO_CRYPTO_BALANCES[cryptoUpper] = available - numericAmount;

    // ---------- Notification ----------
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
          reference: cryptoTx.reference,
        }),
      },
    });

    // ---------- Response ----------
    return NextResponse.json({
      success: true,
      reference: cryptoTx.reference,
      debitReference: cryptoTx.reference,
      creditReference: fiatTx.reference,
      crypto: cryptoUpper,
      cryptoName: cryptoMeta.name,
      fiatCurrency: fiatUpper,
      amount: numericAmount,
      cryptoDebited,
      cryptoConverted,
      fiatCredited,
      fee: feeCrypto, // fee in crypto units
      feeCrypto,
      feeFiatValue,
      feePct: CASHOUT_FEE_PCT * 100,
      rate: realRate, // 1 crypto = X fiat (gross market rate)
      netRate, // 1 crypto = X fiat AFTER fee (fiatCredited / amount)
      cryptoPriceUSD,
      fiatPerUsd,
      remainingCryptoBalance: DEMO_CRYPTO_BALANCES[cryptoUpper],
      completedAt: cryptoTx.completedAt,
      source: "CoinGecko",
    });
  } catch (e: any) {
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

  const available = DEMO_CRYPTO_BALANCES[crypto] ?? 0;

  return NextResponse.json({
    crypto,
    cryptoName: cryptoMeta.name,
    fiat,
    marketRate: realRate, // 1 crypto = X fiat (gross)
    netRate: realRate * (1 - CASHOUT_FEE_PCT), // after 1% fee
    cryptoPriceUSD,
    fiatPerUsd,
    feePct: CASHOUT_FEE_PCT * 100,
    availableBalance: available,
    change24h: cryptoRate?.change24h ?? 0,
    source: "CoinGecko",
  });
}
