import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID, CRYPTOCURRENCIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Crypto prices in USD (mirrors rates/convert routes)
const CRYPTO_PRICES_USD: Record<string, number> = {
  BTC: 67500, ETH: 3450, BNB: 585, SOL: 145, XRP: 0.52, ADA: 0.45,
  DOT: 7.2, MATIC: 0.72, LTC: 84, TRX: 0.12,
  USDT: 1.0, USDC: 1.0, BUSD: 1.0, DAI: 1.0,
  PI: 47.35,
};

// Per-crypto network fee in USD (simulated gas/ miner fee)
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

interface SwapRequestBody {
  fromCrypto: string;
  toCrypto: string;
  amount: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SwapRequestBody;
    const { fromCrypto, toCrypto, amount } = body;

    // Validation
    if (!fromCrypto || !toCrypto || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields (fromCrypto, toCrypto, amount)" },
        { status: 400 },
      );
    }

    const fromValid = CRYPTOCURRENCIES.some((c) => c.code === fromCrypto);
    const toValid = CRYPTOCURRENCIES.some((c) => c.code === toCrypto);
    if (!fromValid || !toValid) {
      return NextResponse.json(
        { error: "Unsupported cryptocurrency code" },
        { status: 400 },
      );
    }
    if (fromCrypto === toCrypto) {
      return NextResponse.json(
        { error: "Cannot swap a coin for itself" },
        { status: 400 },
      );
    }

    const fromPrice = CRYPTO_PRICES_USD[fromCrypto];
    const toPrice = CRYPTO_PRICES_USD[toCrypto];
    if (!fromPrice || !toPrice) {
      return NextResponse.json(
        { error: "Price feed unavailable for selected asset" },
        { status: 500 },
      );
    }

    // Live-ish price with tiny fluctuation to feel real
    const fromPriceLive = fromPrice * (1 + (Math.random() - 0.5) * 0.01);
    const toPriceLive = toPrice * (1 + (Math.random() - 0.5) * 0.01);

    const grossRate = fromPriceLive / toPriceLive; // 1 from = X to
    const swapFeeInFrom = amount * SWAP_FEE_PCT;
    const amountAfterFee = amount - swapFeeInFrom;
    const convertedAmount = amountAfterFee * grossRate;

    // Network fee denominated in the destination crypto (USD -> to-crypto units)
    const networkFeeUSD = NETWORK_FEE_USD[toCrypto] ?? 0.5;
    const networkFeeCrypto = toPriceLive > 0 ? networkFeeUSD / toPriceLive : 0;
    const minReceived = convertedAmount * (1 - DEFAULT_SLIPPAGE_PCT / 100) - networkFeeCrypto;

    // Price impact heuristic — larger swaps move price more
    const usdValue = amount * fromPriceLive;
    const priceImpactPct =
      usdValue < 1000 ? 0.05 : usdValue < 10000 ? 0.18 : usdValue < 100000 ? 0.42 : 0.85;

    // Persist a transaction record (exchange / wallet method, as specified)
    const fromMeta = CRYPTOCURRENCIES.find((c) => c.code === fromCrypto);
    const toMeta = CRYPTOCURRENCIES.find((c) => c.code === toCrypto);

    const tx = await db.transaction.create({
      data: {
        reference: ref(),
        userId: DEMO_USER_ID,
        senderId: DEMO_USER_ID,
        type: "exchange",
        direction: "debit",
        status: "completed",
        amount,
        fee: swapFeeInFrom * fromPriceLive, // fee in USD for record-keeping
        currency: fromCrypto,
        description: `Swap ${amount} ${fromCrypto} → ${convertedAmount.toFixed(6)} ${toCrypto}`,
        category: "investment",
        counterpartyName: `GaexPay Swap → ${toCrypto}`,
        method: "wallet",
        provider: "gaexpay-swap",
        metadata: JSON.stringify({
          kind: "crypto-swap",
          from: fromCrypto,
          to: toCrypto,
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
        }),
        completedAt: new Date(),
      },
    });

    // User-facing notification
    await db.notification.create({
      data: {
        userId: DEMO_USER_ID,
        title: "Crypto swap completed",
        message: `Swapped ${amount} ${fromCrypto} for ${convertedAmount.toFixed(6)} ${toCrypto} at 1 ${fromCrypto} = ${grossRate.toFixed(6)} ${toCrypto}.`,
        type: "transaction",
        channel: "push",
      },
    });

    return NextResponse.json({
      success: true,
      reference: tx.reference,
      transactionId: tx.id,
      from: fromCrypto,
      to: toCrypto,
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
      completedAt: tx.completedAt,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Swap failed" },
      { status: 500 },
    );
  }
}

// Convenience GET that returns current swap quote (rate + fees) without executing
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params required" }, { status: 400 });
  }
  const fromPrice = CRYPTO_PRICES_USD[from];
  const toPrice = CRYPTO_PRICES_USD[to];
  if (!fromPrice || !toPrice) {
    return NextResponse.json({ error: "Unsupported crypto" }, { status: 400 });
  }

  const fromPriceLive = fromPrice * (1 + (Math.random() - 0.5) * 0.01);
  const toPriceLive = toPrice * (1 + (Math.random() - 0.5) * 0.01);
  const grossRate = fromPriceLive / toPriceLive;

  return NextResponse.json({
    from,
    to,
    rate: grossRate,
    fromPriceUSD: fromPriceLive,
    toPriceUSD: toPriceLive,
    swapFeePct: SWAP_FEE_PCT * 100,
    networkFeeUSD: NETWORK_FEE_USD[to] ?? 0.5,
    slippagePct: DEFAULT_SLIPPAGE_PCT,
  });
}
