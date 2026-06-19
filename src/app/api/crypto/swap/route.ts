import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID, CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { getCryptoPriceMap } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

function ref() {
  return (
    "GXP" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

// Per-crypto network fee in USD (simulated gas/miner fee)
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

interface SwapRequestBody {
  fromCrypto: string;
  toCrypto: string;
  amount: number;
}

/**
 * POST /api/crypto/swap
 *
 * Swap one crypto for another using REAL CoinGecko prices. Checks the
 * fromCrypto wallet's real DB balance, debits it, and credits the converted
 * amount to the toCrypto wallet (creating it on the fly if missing). All
 * wallet mutations + transaction record are wrapped in `db.$transaction`.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SwapRequestBody;
    const { fromCrypto, toCrypto, amount } = body;

    // ---------- Validation ----------
    if (!fromCrypto || !toCrypto || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields (fromCrypto, toCrypto, amount)" },
        { status: 400 },
      );
    }

    const fromUpper = String(fromCrypto).toUpperCase();
    const toUpper = String(toCrypto).toUpperCase();

    const fromValid = CRYPTOCURRENCIES.some((c) => c.code === fromUpper);
    const toValid = CRYPTOCURRENCIES.some((c) => c.code === toUpper);
    if (!fromValid || !toValid) {
      return NextResponse.json(
        { error: "Unsupported cryptocurrency code" },
        { status: 400 },
      );
    }
    if (fromUpper === toUpper) {
      return NextResponse.json(
        { error: "Cannot swap a coin for itself" },
        { status: 400 },
      );
    }

    // ---------- Real CoinGecko prices (60s cache) ----------
    const priceMap = await getCryptoPriceMap();
    const fromPrice = priceMap[fromUpper];
    const toPrice = priceMap[toUpper];
    if (!fromPrice || !toPrice) {
      return NextResponse.json(
        { error: "Price feed unavailable for selected asset" },
        { status: 500 },
      );
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
        where: { userId: DEMO_USER_ID, currency: fromUpper, type: "crypto" },
      });
      if (!fromWallet) {
        throw new HttpError(
          400,
          `You don't have a ${fromUpper} wallet to swap from`,
        );
      }
      if (fromWallet.balance < amount) {
        throw new HttpError(
          400,
          `Insufficient ${fromUpper} balance (available: ${fromWallet.balance})`,
        );
      }

      // 2. Find or create the destination wallet
      let toWallet = await tx.wallet.findFirst({
        where: { userId: DEMO_USER_ID, currency: toUpper, type: "crypto" },
      });
      if (!toWallet) {
        toWallet = await tx.wallet.create({
          data: {
            userId: DEMO_USER_ID,
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
          userId: DEMO_USER_ID,
          senderId: DEMO_USER_ID,
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
        userId: DEMO_USER_ID,
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
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
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

  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  const priceMap = await getCryptoPriceMap();
  const fromPrice = priceMap[fromUpper];
  const toPrice = priceMap[toUpper];
  if (!fromPrice || !toPrice) {
    return NextResponse.json({ error: "Unsupported crypto" }, { status: 400 });
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
}
