import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID, CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { getCryptoRates, FIAT_USD_RATE } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Fees — buy = 1.5%, sell = 1.0%
const BUY_FEE_PCT = 0.015;
const SELL_FEE_PCT = 0.010;

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
 * Body:
 *   {
 *     action: "buy" | "sell",
 *     crypto: "BTC",
 *     fiatCurrency: "NGN",
 *     amount: number,
 *     amountType: "fiat" | "crypto"
 *   }
 *
 * - BUY  : user pays `amount` in fiat, receives crypto at market + 1.5% fee.
 * - SELL : user sells `amount` of crypto, receives fiat at market − 1.0% fee.
 *
 * Persists a Transaction (type="exchange", method="card" for buy / "wallet"
 * for sell, category="investment") and a Notification. Returns the full
 * trade receipt (rate, fee, received amount, reference).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TradeRequestBody;
    const { action, crypto, fiatCurrency, amount, amountType } = body;

    // ---------- Validation ----------
    if (!action || (action !== "buy" && action !== "sell")) {
      return NextResponse.json({ error: "action must be 'buy' or 'sell'" }, { status: 400 });
    }
    const cryptoMeta = CRYPTOCURRENCIES.find((c) => c.code === crypto);
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
    const cryptoPriceUSD = priceMap[crypto];
    if (!cryptoPriceUSD || cryptoPriceUSD <= 0) {
      return NextResponse.json({ error: "Price feed unavailable" }, { status: 500 });
    }

    // Use CoinGecko's direct fiat price when available (more accurate than
    // USD × static rate). Fall back to USD × FIAT_USD_RATE for currencies
    // CoinGecko doesn't support (XAF, XOF, UGX, ETB, …).
    const cryptoRate = rates.find((r) => r.code === crypto);
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

    // ---------- Persist Transaction ----------
    const direction = action === "buy" ? "debit" : "credit";
    const method = action === "buy" ? "card" : "wallet";
    const description =
      action === "buy"
        ? `Buy ${totalCrypto.toFixed(6)} ${crypto} with ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper}`
        : `Sell ${totalCrypto.toFixed(6)} ${crypto} for ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper}`;

    const tx = await db.transaction.create({
      data: {
        reference: ref(),
        userId: DEMO_USER_ID,
        senderId: DEMO_USER_ID,
        type: "exchange",
        direction,
        status: "completed",
        amount: totalCrypto,
        fee: feeFiat,
        currency: action === "buy" ? fiatUpper : crypto,
        description,
        category: "investment",
        counterpartyName:
          action === "buy"
            ? `GaexPay Trade — Buy ${crypto}`
            : `GaexPay Trade — Sell ${crypto}`,
        method,
        provider: "gaexpay-trade",
        metadata: JSON.stringify({
          kind: "crypto-trade",
          action,
          crypto,
          cryptoName: cryptoMeta.name,
          fiatCurrency: fiatUpper,
          amountType,
          inputAmount: amount,
          marketRate, // 1 crypto = X fiat
          cryptoPriceUSD,
          fiatPerUsd,
          fiatAmount,
          cryptoAmount,
          feePct: action === "buy" ? BUY_FEE_PCT * 100 : SELL_FEE_PCT * 100,
          feeFiat,
          feeCrypto,
          totalFiat,
          totalCrypto,
          priceSource: "CoinGecko",
        }),
        completedAt: new Date(),
      },
    });

    // ---------- Notification ----------
    await db.notification.create({
      data: {
        userId: DEMO_USER_ID,
        title:
          action === "buy" ? "Crypto purchase completed" : "Crypto sale completed",
        message:
          action === "buy"
            ? `You bought ${totalCrypto.toFixed(6)} ${crypto} for ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper} (incl. ${feeFiat.toFixed(2)} ${fiatUpper} fee).`
            : `You sold ${totalCrypto.toFixed(6)} ${crypto} and received ${totalFiat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fiatUpper} (after ${feeFiat.toFixed(2)} ${fiatUpper} fee).`,
        type: "transaction",
        channel: "push",
      },
    });

    // ---------- Response ----------
    return NextResponse.json({
      success: true,
      reference: tx.reference,
      transactionId: tx.id,
      action,
      crypto,
      cryptoName: cryptoMeta.name,
      fiatCurrency: fiatUpper,
      amountType,
      inputAmount: Number(amount),
      marketRate, // 1 crypto = X fiat (real CoinGecko price)
      cryptoPriceUSD,
      fiatPerUsd,
      fiatAmount,
      cryptoAmount,
      feePct: action === "buy" ? BUY_FEE_PCT * 100 : SELL_FEE_PCT * 100,
      feeFiat,
      feeCrypto,
      totalFiat, // user pays (buy) / receives (sell)
      totalCrypto, // user receives (buy) / sells (sell)
      completedAt: tx.completedAt,
      source: "CoinGecko",
    });
  } catch (e: any) {
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
  const crypto = url.searchParams.get("crypto") || "BTC";
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

  return NextResponse.json({
    crypto,
    cryptoName: cryptoMeta.name,
    fiat,
    marketRate, // 1 crypto = X fiat
    cryptoPriceUSD,
    fiatPerUsd,
    buyFeePct: BUY_FEE_PCT * 100,
    sellFeePct: SELL_FEE_PCT * 100,
    source: "CoinGecko",
  });
}
