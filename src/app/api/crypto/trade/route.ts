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

// Fees — buy = 1.5%, sell = 1.0%
const BUY_FEE_PCT = 0.015;
const SELL_FEE_PCT = 0.01;

/** Thrown inside the transaction to abort with a specific HTTP status. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface TradeRequestBody {
  action: "buy" | "sell";
  crypto: string;
  fiatCurrency: string;
  amount: number;
  amountType: "fiat" | "crypto";
}

/**
 * POST /api/crypto/trade
 *
 * Buy or sell crypto against a fiat balance using REAL CoinGecko prices.
 *
 *  - BUY  : user pays `totalFiat` (base + 1.5% fee), receives `totalCrypto`.
 *           Checks the fiat wallet has ≥ totalFiat; debits fiat, credits crypto.
 *  - SELL : user gives `totalCrypto`, receives `totalFiat` (base − 1.0% fee).
 *           Checks the crypto wallet has ≥ totalCrypto; debits crypto, credits fiat.
 *
 * All wallet mutations + transaction record are wrapped in `db.$transaction`
 * for atomicity. Fiat/crypto wallets are created on the fly if missing (so a
 * BUY into a brand-new crypto works, and a SELL into an unused fiat works).
 *
 * Body:
 *   {
 *     action: "buy" | "sell",
 *     crypto: "BTC",
 *     fiatCurrency: "NGN",
 *     amount: number,
 *     amountType: "fiat" | "crypto"
 *   }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TradeRequestBody;
    const { action, crypto, fiatCurrency, amount, amountType } = body;

    // ---------- Validation ----------
    if (!action || (action !== "buy" && action !== "sell")) {
      return NextResponse.json({ error: "action must be 'buy' or 'sell'" }, { status: 400 });
    }
    const cryptoUpper = String(crypto || "").toUpperCase();
    const cryptoMeta = CRYPTOCURRENCIES.find((c) => c.code === cryptoUpper);
    if (!cryptoMeta) {
      return NextResponse.json({ error: "Unsupported cryptocurrency" }, { status: 400 });
    }
    const fiatUpper = String(fiatCurrency || "").toUpperCase();
    if (!FIAT_USD_RATE[fiatUpper]) {
      return NextResponse.json({ error: "Unsupported fiat currency" }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }
    if (amountType !== "fiat" && amountType !== "crypto") {
      return NextResponse.json({ error: "amountType must be 'fiat' or 'crypto'" }, { status: 400 });
    }

    // ---------- Real prices ----------
    const { rates, priceMap } = await getCryptoRates();
    const cryptoPriceUSD = priceMap[cryptoUpper];
    if (!cryptoPriceUSD || cryptoPriceUSD <= 0) {
      return NextResponse.json({ error: "Price feed unavailable" }, { status: 500 });
    }

    // Use CoinGecko's direct fiat price when available (more accurate than
    // USD × static rate). Fall back to USD × FIAT_USD_RATE for currencies
    // CoinGecko doesn't support (XAF, XOF, UGX, ETB, …).
    const cryptoRate = rates.find((r) => r.code === cryptoUpper);
    const fiatPerUsd = FIAT_USD_RATE[fiatUpper];
    const directFiatPrice = cryptoRate?.prices?.[fiatUpper];
    // 1 crypto = X fiat units (real market rate)
    const marketRate =
      typeof directFiatPrice === "number" && directFiatPrice > 0
        ? directFiatPrice
        : cryptoPriceUSD * fiatPerUsd;

    // ---------- Compute trade economics ----------
    let fiatAmount = 0; // total fiat the user pays (buy) or receives (sell) BEFORE fee
    let cryptoAmount = 0; // total crypto the user receives (buy) or sells (sell)
    let feeFiat = 0;
    let feeCrypto = 0;
    let totalFiat = 0; // incl. fee (buy) / after fee (sell)
    let totalCrypto = 0; // received (buy) / sold (sell) net of fee

    if (action === "buy") {
      if (amountType === "fiat") {
        fiatAmount = amount;
        cryptoAmount = fiatAmount / marketRate;
      } else {
        cryptoAmount = amount;
        fiatAmount = cryptoAmount * marketRate;
      }
      // 1.5% buy fee — quoted in fiat
      feeFiat = fiatAmount * BUY_FEE_PCT;
      feeCrypto = cryptoAmount * BUY_FEE_PCT;
      totalFiat = fiatAmount + feeFiat; // user pays base + fee
      totalCrypto = cryptoAmount; // user receives this much crypto
    } else {
      // SELL
      if (amountType === "crypto") {
        cryptoAmount = amount;
        fiatAmount = cryptoAmount * marketRate;
      } else {
        fiatAmount = amount;
        cryptoAmount = fiatAmount / marketRate;
      }
      // 1.0% sell fee — taken out of the fiat proceeds
      feeFiat = fiatAmount * SELL_FEE_PCT;
      feeCrypto = cryptoAmount * SELL_FEE_PCT;
      totalFiat = fiatAmount - feeFiat; // user receives this much fiat
      totalCrypto = cryptoAmount; // user sells this much crypto
    }

    const direction = action === "buy" ? "debit" : "credit";
    const method = action === "buy" ? "card" : "wallet";
    const description =
      action === "buy"
        ? `Buy ${totalCrypto.toFixed(6)} ${cryptoUpper} with ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper}`
        : `Sell ${totalCrypto.toFixed(6)} ${cryptoUpper} for ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper}`;

    const txRef = ref();

    // ---------- Atomic trade ----------
    const result = await db.$transaction(async (tx) => {
      // 1. Find (or create) the fiat wallet
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

      // 2. Find (or create) the crypto wallet
      let cryptoWallet = await tx.wallet.findFirst({
        where: { userId: DEMO_USER_ID, currency: cryptoUpper, type: "crypto" },
      });
      if (!cryptoWallet) {
        cryptoWallet = await tx.wallet.create({
          data: {
            userId: DEMO_USER_ID,
            currency: cryptoUpper,
            balance: 0,
            ledgerBalance: 0,
            type: "crypto",
            label: "Crypto Wallet",
            isDefault: false,
            status: "active",
          },
        });
      }

      // 3. Balance check + apply debit/credit based on action
      let fiatBalanceAfter = fiatWallet.balance;
      let cryptoBalanceAfter = cryptoWallet.balance;

      if (action === "buy") {
        // User pays totalFiat from fiat wallet
        if (fiatWallet.balance < totalFiat) {
          throw new HttpError(
            400,
            `Insufficient ${fiatUpper} balance (available: ${fiatWallet.balance}, required: ${totalFiat})`,
          );
        }
        const updatedFiat = await tx.wallet.update({
          where: { id: fiatWallet.id },
          data: { balance: { decrement: totalFiat } },
        });
        const updatedCrypto = await tx.wallet.update({
          where: { id: cryptoWallet.id },
          data: { balance: { increment: totalCrypto } },
        });
        fiatBalanceAfter = updatedFiat.balance;
        cryptoBalanceAfter = updatedCrypto.balance;
      } else {
        // SELL — user pays totalCrypto from crypto wallet
        if (cryptoWallet.balance < totalCrypto) {
          throw new HttpError(
            400,
            `Insufficient ${cryptoUpper} balance (available: ${cryptoWallet.balance}, required: ${totalCrypto})`,
          );
        }
        const updatedCrypto = await tx.wallet.update({
          where: { id: cryptoWallet.id },
          data: { balance: { decrement: totalCrypto } },
        });
        const updatedFiat = await tx.wallet.update({
          where: { id: fiatWallet.id },
          data: { balance: { increment: totalFiat } },
        });
        cryptoBalanceAfter = updatedCrypto.balance;
        fiatBalanceAfter = updatedFiat.balance;
      }

      // 4. Persist transaction record
      const txRecord = await tx.transaction.create({
        data: {
          reference: txRef,
          userId: DEMO_USER_ID,
          senderId: DEMO_USER_ID,
          type: "exchange",
          direction,
          status: "completed",
          amount: totalCrypto,
          fee: feeFiat,
          currency: action === "buy" ? fiatUpper : cryptoUpper,
          description,
          category: "investment",
          counterpartyName:
            action === "buy"
              ? `GaexPay Trade — Buy ${cryptoUpper}`
              : `GaexPay Trade — Sell ${cryptoUpper}`,
          method,
          provider: "gaexpay-trade",
          walletId: action === "buy" ? fiatWallet.id : cryptoWallet.id,
          metadata: JSON.stringify({
            kind: "crypto-trade",
            action,
            crypto: cryptoUpper,
            cryptoName: cryptoMeta.name,
            fiatCurrency: fiatUpper,
            amountType,
            inputAmount: amount,
            marketRate,
            cryptoPriceUSD,
            fiatPerUsd,
            fiatAmount,
            cryptoAmount,
            feePct: action === "buy" ? BUY_FEE_PCT * 100 : SELL_FEE_PCT * 100,
            feeFiat,
            feeCrypto,
            totalFiat,
            totalCrypto,
            fiatWalletId: fiatWallet.id,
            cryptoWalletId: cryptoWallet.id,
            fiatBalanceAfter,
            cryptoBalanceAfter,
            priceSource: "CoinGecko",
          }),
          completedAt: new Date(),
        },
      });

      return {
        txRecord,
        fiatBalanceAfter,
        cryptoBalanceAfter,
      };
    });

    // ---------- Notification ----------
    await db.notification.create({
      data: {
        userId: DEMO_USER_ID,
        title:
          action === "buy" ? "Crypto purchase completed" : "Crypto sale completed",
        message:
          action === "buy"
            ? `You bought ${totalCrypto.toFixed(6)} ${cryptoUpper} for ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper} (incl. ${feeFiat.toFixed(2)} ${fiatUpper} fee).`
            : `You sold ${totalCrypto.toFixed(6)} ${cryptoUpper} and received ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper} (after ${feeFiat.toFixed(2)} ${fiatUpper} fee).`,
        type: "transaction",
        channel: "push",
      },
    });

    // ---------- Response ----------
    return NextResponse.json({
      success: true,
      reference: result.txRecord.reference,
      transactionId: result.txRecord.id,
      action,
      crypto: cryptoUpper,
      cryptoName: cryptoMeta.name,
      fiatCurrency: fiatUpper,
      amountType,
      inputAmount: Number(amount),
      marketRate,
      cryptoPriceUSD,
      fiatPerUsd,
      fiatAmount,
      cryptoAmount,
      feePct: action === "buy" ? BUY_FEE_PCT * 100 : SELL_FEE_PCT * 100,
      feeFiat,
      feeCrypto,
      totalFiat,
      totalCrypto,
      fiatBalanceAfter: result.fiatBalanceAfter,
      cryptoBalanceAfter: result.cryptoBalanceAfter,
      completedAt: result.txRecord.completedAt,
      source: "CoinGecko",
    });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e?.message || "Trade failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/crypto/trade?crypto=BTC&fiat=NGN
 * Quote-only endpoint: returns current market rate + fee preview without
 * executing a trade. Used by the Buy/Sell UI's live preview card.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const crypto = (url.searchParams.get("crypto") || "BTC").toUpperCase();
  const fiat = (url.searchParams.get("fiat") || "NGN").toUpperCase();

  const cryptoMeta = CRYPTOCURRENCIES.find((c) => c.code === crypto);
  const fiatPerUsd = FIAT_USD_RATE[fiat];
  if (!cryptoMeta || !fiatPerUsd) {
    return NextResponse.json({ error: "Invalid crypto or fiat" }, { status: 400 });
  }

  const { rates, priceMap } = await getCryptoRates();
  const cryptoPriceUSD = priceMap[crypto] ?? 0;
  if (cryptoPriceUSD <= 0) {
    return NextResponse.json({ error: "Price feed unavailable" }, { status: 500 });
  }
  const cryptoRate = rates.find((r) => r.code === crypto);
  const directFiatPrice = cryptoRate?.prices?.[fiat];
  const marketRate =
    typeof directFiatPrice === "number" && directFiatPrice > 0
      ? directFiatPrice
      : cryptoPriceUSD * fiatPerUsd;

  // Pull live wallet balances so the UI's "available" reflects prior trades.
  const [fiatWallet, cryptoWallet] = await Promise.all([
    db.wallet.findFirst({
      where: { userId: DEMO_USER_ID, currency: fiat, type: "primary" },
    }),
    db.wallet.findFirst({
      where: { userId: DEMO_USER_ID, currency: crypto, type: "crypto" },
    }),
  ]);

  return NextResponse.json({
    crypto,
    cryptoName: cryptoMeta.name,
    fiat,
    marketRate,
    cryptoPriceUSD,
    fiatPerUsd,
    buyFeePct: BUY_FEE_PCT * 100,
    sellFeePct: SELL_FEE_PCT * 100,
    availableFiatBalance: fiatWallet?.balance ?? 0,
    availableCryptoBalance: cryptoWallet?.balance ?? 0,
    source: "CoinGecko",
  });
}
