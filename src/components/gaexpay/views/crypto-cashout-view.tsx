"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown, ArrowDownToLine, CheckCircle2, ChevronDown, Clock, History,
  Loader2, RefreshCw, Shield, Sparkles, TrendingDown, TrendingUp, Wallet,
  Zap, Banknote, Repeat,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import {
  CRYPTOCURRENCIES, CURRENCY_SYMBOL, timeAgo,
} from "@/lib/gaexpay";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { Confetti } from "@/components/gaexpay/confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CRYPTO_MAP: Record<string, (typeof CRYPTOCURRENCIES)[number]> = Object.fromEntries(
  CRYPTOCURRENCIES.map((c) => [c.code, c]),
);

// Tailwind gradient classes per crypto (visual flourish on the icon tile)
const CRYPTO_GRADIENT: Record<string, string> = {
  USDT: "from-emerald-500 to-teal-600",
  USDC: "from-sky-500 to-blue-600",
  BUSD: "from-yellow-500 to-amber-600",
  DAI: "from-amber-400 to-yellow-600",
  BTC: "from-amber-500 to-orange-600",
  ETH: "from-blue-500 to-indigo-600",
  BNB: "from-yellow-500 to-amber-600",
  SOL: "from-violet-500 to-purple-600",
  XRP: "from-slate-600 to-slate-800",
  ADA: "from-blue-600 to-indigo-700",
  DOT: "from-pink-500 to-rose-600",
  MATIC: "from-purple-500 to-violet-600",
  LTC: "from-slate-500 to-blue-600",
  TRX: "from-red-500 to-rose-600",
  PI: "from-violet-500 to-purple-700",
};

// Fiat currencies supported for cashout
const FIATS = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", flag: "🇬🇭" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
  { code: "XAF", name: "Central African CFA", symbol: "FCFA", flag: "🇨🇲" },
  { code: "XOF", name: "West African CFA", symbol: "CFA", flag: "🇨🇮" },
];

const FIAT_MAP: Record<string, (typeof FIATS)[number]> = Object.fromEntries(
  FIATS.map((f) => [f.code, f]),
);

// 1.0% cashout fee charged in crypto
const CASHOUT_FEE_PCT = 1.0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decimalsFor(code: string): number {
  const stable = ["USDT", "USDC", "BUSD", "DAI"];
  if (stable.includes(code)) return 2;
  const low = ["XRP", "ADA", "TRX", "DOT", "MATIC"];
  if (low.includes(code)) return 4;
  return 6;
}

function formatCrypto(amount: number, code: string): string {
  if (!isFinite(amount)) return "0";
  const d = decimalsFor(code);
  return amount.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

function formatFiat(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? "";
  return `${sym}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 100) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRate(rate: number): string {
  if (!isFinite(rate) || rate === 0) return "0";
  if (rate < 1) return rate.toLocaleString("en-US", { maximumFractionDigits: 6 });
  if (rate < 1000) return rate.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return rate.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CryptoCashoutView() {
  const { data: ratesData, reload: reloadRates } = useFetch<{ rates: any[] }>("/api/crypto/rates");
  const { data: walletData, reload: reloadWallets } = useFetch<{ wallets: any[]; totalValueUSD: number; totalValueNGN: number }>("/api/crypto/wallets");

  const [crypto, setCrypto] = useState("BTC");
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [fiat, setFiat] = useState("NGN");
  const [amount, setAmount] = useState("0.001");

  const [pickerOpen, setPickerOpen] = useState<null | "crypto" | "fiat">(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const rates = ratesData?.rates ?? [];
  const wallets = walletData?.wallets ?? [];

  const cryptoMeta = CRYPTO_MAP[crypto];
  const fiatMeta = FIAT_MAP[fiat];
  const rate = rates.find((r: any) => r.code === crypto);
  const priceUSD = rate?.priceUSD ?? 0;
  const change24h = rate?.change24h ?? 0;

  // The user's wallet balance for the selected crypto
  const wallet = wallets.find((w: any) => w.code === crypto);
  const walletBalance = wallet?.balance ?? 0;
  const walletValueUSD = wallet?.valueUSD ?? 0;

  // Poll the live cashout quote every 60s — gives us the freshest market rate
  const [quote, setQuote] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/crypto/cashout?crypto=${crypto}&fiat=${fiat}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setQuote(data);
      } catch {
        /* ignore — fallback to rates */
      }
    };
    fetchQuote();
    const id = setInterval(fetchQuote, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [crypto, fiat]);

  // The live market rate: 1 crypto = X fiat (gross, before the 1% fee)
  const marketRate = quote?.marketRate ?? (priceUSD > 0 && rate?.prices?.[fiat] ? rate.prices[fiat] : 0);
  const availableBalance = quote?.availableBalance ?? walletBalance;

  // Auto-refresh rates + wallets every 60s
  useEffect(() => {
    const id = setInterval(() => {
      reloadRates();
      reloadWallets();
    }, 60_000);
    return () => clearInterval(id);
  }, [reloadRates, reloadWallets]);

  // ---------- Calculations ----------
  const numericAmount = Number(amount) || 0;
  // fee is charged in crypto
  const feeCrypto = numericAmount * (CASHOUT_FEE_PCT / 100);
  const cryptoConverted = numericAmount - feeCrypto; // the crypto that actually gets converted
  const fiatCredited = cryptoConverted * marketRate;
  const netRate = numericAmount > 0 ? fiatCredited / numericAmount : 0;
  const remainingBalance = Math.max(0, walletBalance - numericAmount);

  const insufficientBalance = numericAmount > walletBalance;
  const canSubmit =
    numericAmount > 0 &&
    !insufficientBalance &&
    marketRate > 0 &&
    !submitting;

  // ---------- Submit handler ----------
  const executeCashout = async () => {
    if (numericAmount <= 0) {
      toast.error("Enter an amount to cash out");
      return;
    }
    if (insufficientBalance) {
      toast.error(`Insufficient ${crypto} balance`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/crypto/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crypto,
          fiatCurrency: fiat,
          amount: numericAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Cashout failed");
      }
      setSuccess(data);
      toast.success(`Cashed out ${formatCrypto(data.cryptoDebited, crypto)} ${crypto} → ${formatFiat(data.fiatCredited, fiat)}`);
      reloadWallets();
    } catch (e: any) {
      toast.error(e?.message || "Cashout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Confetti trigger={!!success} />

      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crypto → Fiat Cashout</h1>
          <p className="text-sm text-muted-foreground">
            Instantly convert your crypto holdings into fiat — paid straight into your fiat wallet at live CoinGecko rates
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live · CoinGecko
          </Badge>
          <Badge variant="outline" className="border-amber-500/30 text-amber-600">
            1.0% fee · in crypto
          </Badge>
        </div>
      </div>

      {/* ---------- Live price ticker ---------- */}
      <LiveTicker rates={rates} loading={!ratesData} onPick={(code) => setCrypto(code)} activeCode={crypto} />

      {/* ---------- Hero card ---------- */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-5 text-white shadow-2xl sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0.85, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-900/40"
            >
              <Banknote className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold">Instant Crypto → Fiat</h2>
              <p className="text-xs text-white/70">
                Sell crypto from your wallet and receive fiat in seconds. No banks, no waiting.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right backdrop-blur">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Live rate</p>
            <p className="text-base font-bold tabular-nums sm:text-lg">
              1 {crypto} ={" "}
              <AnimatedNumber
                value={marketRate}
                decimals={marketRate < 1 ? 6 : 2}
                prefix={fiatMeta?.symbol}
              />{" "}
              {fiat}
            </p>
            <p className="mt-0.5 text-[11px] text-white/50">
              ≈ <AnimatedNumber value={priceUSD} prefix="$" decimals={priceUSD < 1 ? 4 : 2} /> USD · 24h{" "}
              <span className={cn(change24h >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/* ---------- Main grid: form + summary ---------- */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ===== Conversion form ===== */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-5 text-white shadow-2xl sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />

          <div className="relative space-y-4">
            {/* ---- From section ---- */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-white/60">From</span>
                <button
                  onClick={() => setPickerOpen("crypto")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/[0.10]"
                >
                  <div className={cn("grid h-5 w-5 place-items-center rounded bg-gradient-to-br text-[10px]", CRYPTO_GRADIENT[crypto] || "from-slate-600 to-slate-800")}>
                    {cryptoMeta?.icon}
                  </div>
                  {crypto}
                  <ChevronDown className="h-3 w-3 text-white/60" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  className="w-full flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:text-white/30"
                />
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-white/50">≈ {formatPrice(numericAmount * priceUSD)} USD</span>
                  <button
                    onClick={() => setAmount(String(walletBalance))}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    <Wallet className="h-3 w-3" />
                    MAX
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
                <span>Balance: {formatCrypto(walletBalance, crypto)} {crypto}</span>
                <span>Value: {formatPrice(walletValueUSD)}</span>
              </div>
            </div>

            {/* ---- Swap arrow (animated, rotating) ---- */}
            <div className="flex justify-center">
              <motion.button
                onClick={() => setPickerOpen("crypto")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ rotate: submitting ? 360 : 0 }}
                transition={submitting ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500/25"
              >
                <ArrowDown className="h-4 w-4" />
              </motion.button>
            </div>

            {/* ---- To section ---- */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-white/60">To (receive in your fiat wallet)</span>
                <button
                  onClick={() => setPickerOpen("fiat")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/[0.10]"
                >
                  <span className="text-sm">{fiatMeta?.flag}</span>
                  {fiat}
                  <ChevronDown className="h-3 w-3 text-white/60" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-full flex-1 text-3xl font-bold tabular-nums">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${fiat}-${fiatCredited.toFixed(2)}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="block truncate"
                    >
                      {marketRate > 0 ? (
                        <AnimatedNumber
                          value={fiatCredited}
                          decimals={2}
                          prefix={fiatMeta?.symbol}
                        />
                      ) : (
                        <span className="text-white/30">0.00</span>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-white/50">≈ {formatPrice(fiatCredited / (priceUSD > 0 ? 1 : 1))}</span>
                  <span className="text-[10px] text-white/40">{fiatMeta?.name}</span>
                </div>
              </div>
            </div>

            {/* ---- Live rate display ---- */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className={cn("h-3 w-3", submitting && "animate-spin")} />
                {marketRate > 0 ? (
                  <>
                    1 {crypto} ={" "}
                    <span className="font-semibold text-white">
                      {formatRate(marketRate)}
                    </span>{" "}
                    {fiat}
                  </>
                ) : (
                  "Fetching rate…"
                )}
              </span>
              <span className="inline-flex items-center gap-1 text-white/50">
                <Sparkles className="h-3 w-3" />
                CoinGecko · 60s
              </span>
            </div>

            {/* ---- Fee breakdown ---- */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <Row label="You send" value={`${formatCrypto(numericAmount, crypto)} ${crypto}`} tone="strong" />
              <Row label="Cashout fee (1.0%)" value={`− ${formatCrypto(feeCrypto, crypto)} ${crypto}`} tone="warn" />
              <Row label="Crypto converted" value={`${formatCrypto(cryptoConverted, crypto)} ${crypto}`} />
              <Row label="Live rate" value={`1 ${crypto} = ${formatRate(marketRate)} ${fiat}`} />
              <div className="my-1.5 h-px bg-white/10" />
              <Row label="You receive" value={formatFiat(fiatCredited, fiat)} tone="ok" />
            </div>

            {/* ---- Insufficient balance warning ---- */}
            <AnimatePresence>
              {insufficientBalance && numericAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300"
                >
                  Insufficient {crypto} balance. You have {formatCrypto(walletBalance, crypto)} {crypto} but tried to cash out {formatCrypto(numericAmount, crypto)} {crypto}.
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- CTA ---- */}
            <Button
              onClick={executeCashout}
              disabled={!canSubmit}
              className="group relative w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-base font-semibold text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
              size="lg"
            >
              <AnimatePresence mode="wait" initial={false}>
                {submitting ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cashing out…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
                    {numericAmount <= 0
                      ? "Enter an amount"
                      : insufficientBalance
                      ? "Insufficient balance"
                      : `Cash Out ${formatCrypto(numericAmount, crypto)} ${crypto} → ${fiat}`}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* ---- Security note ---- */}
            <div className="flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-white/70">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>
                Cashouts settle instantly at locked CoinGecko rates. Funds arrive in your fiat wallet within seconds, secured by AES-256 encryption and 2FA.
              </span>
            </div>
          </div>
        </Card>

        {/* ===== Right column: summary + recent ===== */}
        <div className="space-y-4">
          {/* Summary card */}
          <Card className="relative overflow-hidden p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">Cashout summary</h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                <Clock className="mr-1 h-2.5 w-2.5" />
                Live
              </Badge>
            </div>

            <div className="space-y-3">
              <SummaryRow
                label="You send"
                value={
                  <span className="flex items-center gap-1.5">
                    <span className={cn("grid h-5 w-5 place-items-center rounded bg-gradient-to-br text-[10px]", CRYPTO_GRADIENT[crypto] || "from-slate-600 to-slate-800")}>
                      {cryptoMeta?.icon}
                    </span>
                    <span className="font-semibold tabular-nums">{formatCrypto(numericAmount, crypto)} {crypto}</span>
                  </span>
                }
              />
              <SummaryRow
                label="Rate (live)"
                value={
                  <span className="text-sm font-semibold tabular-nums">
                    1 {crypto} = {formatRate(marketRate)} {fiat}
                  </span>
                }
              />
              <SummaryRow
                label={`Fee (${CASHOUT_FEE_PCT}%)`}
                value={
                  <span className="text-sm font-semibold tabular-nums text-amber-600">
                    − {formatCrypto(feeCrypto, crypto)} {crypto}
                  </span>
                }
              />
              <div className="my-1 h-px bg-border" />
              <SummaryRow
                label="You receive"
                value={
                  <span className="text-base font-bold tabular-nums text-emerald-600">
                    {formatFiat(fiatCredited, fiat)}
                  </span>
                }
              />
              <div className="mt-2 rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total conversion</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  <span className="text-amber-600">{formatCrypto(numericAmount, crypto)} {crypto}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="text-emerald-600">{formatFiat(fiatCredited, fiat)}</span>
                </p>
              </div>

              {/* Net rate */}
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Net rate (after fee)</span>
                <span className="font-semibold tabular-nums text-emerald-600">
                  1 {crypto} = {formatRate(netRate)} {fiat}
                </span>
              </div>

              {/* Remaining balance */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Remaining {crypto} balance</span>
                <span className="font-semibold tabular-nums">
                  {formatCrypto(remainingBalance, crypto)} {crypto}
                </span>
              </div>
            </div>
          </Card>

          {/* Live rate card */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-lg", CRYPTO_GRADIENT[crypto] || "from-slate-600 to-slate-800")}>
                  {cryptoMeta?.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{crypto} / {fiat}</p>
                  <p className="text-xs text-muted-foreground">{cryptoMeta?.name}</p>
                </div>
              </div>
              <Badge variant="outline" className={cn("text-[10px]", change24h >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {change24h >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </Badge>
            </div>

            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Live price (CoinGecko)</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                <AnimatedNumber
                  value={marketRate}
                  decimals={marketRate < 1 ? 6 : 2}
                  prefix={fiatMeta?.symbol}
                />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ <AnimatedNumber value={priceUSD} prefix="$" decimals={priceUSD < 1 ? 4 : 2} /> USD
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label="24h change" value={`${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`} tone={change24h >= 0 ? "ok" : "bad"} />
              <Stat label="Market cap" value={rate?.marketCap ? `$${(rate.marketCap / 1e9).toFixed(2)}B` : "—"} />
              <Stat label="24h volume" value={rate?.volume24h ? `$${(rate.volume24h / 1e6).toFixed(1)}M` : "—"} />
              <Stat label="Cashout fee" value={`${CASHOUT_FEE_PCT}%`} />
            </div>
          </Card>

          {/* Your wallet */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Your {crypto} wallet</h3>
              <Badge variant="outline" className="text-[10px]">
                {wallet ? "Active" : "Empty"}
              </Badge>
            </div>
            {wallets.length === 0 ? (
              <Skeleton className="h-16 w-full" />
            ) : wallet ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="text-sm font-semibold tabular-nums">
                    <AnimatedNumber value={walletBalance} decimals={decimalsFor(crypto)} suffix={` ${crypto}`} />
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Value</span>
                  <span className="text-sm font-semibold tabular-nums">
                    <AnimatedNumber value={walletValueUSD} prefix="$" decimals={2} />
                  </span>
                </div>
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">
                You don&apos;t have a {crypto} wallet yet.
              </p>
            )}
          </Card>

          {/* Recent cashouts */}
          <RecentCashouts />
        </div>
      </div>

      {/* ===== Asset Picker Dialog ===== */}
      <Dialog open={!!pickerOpen} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select {pickerOpen === "crypto" ? "cryptocurrency" : "fiat currency"}
            </DialogTitle>
            <DialogDescription>
              {pickerOpen === "crypto"
                ? "Choose from your crypto wallets"
                : "Choose the fiat wallet to receive your cashout"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1 no-scrollbar">
            {pickerOpen === "crypto"
              ? wallets.map((w: any) => {
                  const meta = CRYPTO_MAP[w.code];
                  const r = rates.find((x: any) => x.code === w.code);
                  if (!meta) return null;
                  return (
                    <button
                      key={w.code}
                      onClick={() => {
                        setCrypto(w.code);
                        setPickerOpen(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-muted/60",
                        crypto === w.code && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-base", CRYPTO_GRADIENT[w.code] || "from-slate-600 to-slate-800")}>
                          {meta.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{w.code}</p>
                          <p className="text-xs text-muted-foreground">{formatCrypto(w.balance, w.code)} {w.code} · {formatPrice(w.valueUSD)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {r ? formatPrice(r.priceUSD) : "—"}
                        </p>
                        {r && (
                          <p className={cn("text-[10px] tabular-nums", r.change24h >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {r.change24h >= 0 ? "+" : ""}{r.change24h.toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              : FIATS.map((f) => (
                  <button
                    key={f.code}
                    onClick={() => {
                      setFiat(f.code);
                      setPickerOpen(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-muted/60",
                      fiat === f.code && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-base">
                        {f.flag}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{f.code}</p>
                        <p className="text-xs text-muted-foreground">{f.name}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{f.symbol}</span>
                  </button>
                ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Success Dialog ===== */}
      <Dialog open={!!success} onOpenChange={(o) => !o && setSuccess(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <DialogTitle className="text-center">Cashout Complete</DialogTitle>
            <DialogDescription className="text-center">
              Your crypto has been converted into fiat at live market rates.
            </DialogDescription>
          </DialogHeader>

          {success && (
            <div className="space-y-3">
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm">
                  <span className="font-semibold">{formatCrypto(success.cryptoDebited, success.crypto)} {success.crypto}</span>
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-emerald-600">{formatFiat(success.fiatCredited, success.fiatCurrency)}</span>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  1 {success.crypto} = {formatRate(success.rate)} {success.fiatCurrency} (live CoinGecko)
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <SuccessRow label="Reference" value={success.reference} mono />
                <SuccessRow label="Debit ref" value={success.debitReference} mono />
                <SuccessRow label="Credit ref" value={success.creditReference} mono />
                <SuccessRow label="Market rate" value={`1 ${success.crypto} = ${formatRate(success.rate)} ${success.fiatCurrency}`} />
                <SuccessRow label="Crypto price" value={formatPrice(success.cryptoPriceUSD)} />
                <SuccessRow label={`Fee (${success.feePct}%)`} value={`${formatCrypto(success.feeCrypto, success.crypto)} ${success.crypto} (≈ ${formatFiat(success.feeFiatValue, success.fiatCurrency)})`} />
                <SuccessRow label="Crypto debited" value={`${formatCrypto(success.cryptoDebited, success.crypto)} ${success.crypto}`} />
                <SuccessRow label="Crypto converted" value={`${formatCrypto(success.cryptoConverted, success.crypto)} ${success.crypto}`} />
                <SuccessRow label="Fiat received" value={formatFiat(success.fiatCredited, success.fiatCurrency)} tone="ok" />
                <SuccessRow label="Remaining balance" value={`${formatCrypto(success.remainingCryptoBalance, success.crypto)} ${success.crypto}`} />
                <SuccessRow label="Completed" value={success.completedAt ? new Date(success.completedAt).toLocaleString() : "—"} />
                <SuccessRow label="Price source" value="CoinGecko (live)" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setSuccess(null)}>
                  New cashout
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setSuccess(null);
                    setAmount("");
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LiveTicker({
  rates, loading, onPick, activeCode,
}: {
  rates: any[];
  loading: boolean;
  onPick?: (code: string) => void;
  activeCode?: string;
}) {
  if (loading && rates.length === 0) {
    return (
      <Card className="p-3">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 flex-1" />
          ))}
        </div>
      </Card>
    );
  }

  // Top 6 cryptos by market cap (skip stablecoins for variety)
  const top = [...rates]
    .filter((r) => !["USDT", "USDC", "BUSD", "DAI"].includes(r.code))
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, 6);

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          Live prices · CoinGecko
        </div>
        <Badge variant="outline" className="text-[10px]">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Real-time
        </Badge>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {top.map((r) => {
          const meta = CRYPTO_MAP[r.code];
          const up = (r.change24h || 0) >= 0;
          const isActive = activeCode === r.code;
          return (
            <button
              key={r.code}
              onClick={() => onPick?.(r.code)}
              className={cn(
                "flex min-w-[150px] flex-col gap-1 rounded-lg border px-3 py-2 text-left transition",
                isActive
                  ? "border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                  : "border-border bg-muted/20 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{meta?.icon}</span>
                  <span className="text-xs font-semibold">{r.code}</span>
                </div>
                {isActive && <span className="text-[9px] font-semibold text-emerald-600">SELECTED</span>}
              </div>
              <p className="text-xs font-bold tabular-nums">{formatPrice(r.priceUSD)}</p>
              <p className={cn("text-[10px] tabular-nums", up ? "text-emerald-600" : "text-rose-600")}>
                {up ? "+" : ""}{(r.change24h || 0).toFixed(2)}% · 24h
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function RecentCashouts() {
  const { data, loading } = useFetch<{ transactions: any[] }>(
    "/api/transactions?type=exchange&limit=30",
  );

  const cashouts = useMemo(() => {
    const all = data?.transactions ?? [];
    return all
      .filter((t) => {
        try {
          const meta = JSON.parse(t.metadata || "{}");
          return meta.kind === "crypto-cashout" && t.direction === "debit";
        } catch {
          return false;
        }
      })
      .slice(0, 8);
  }, [data]);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recent cashouts</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          <Repeat className="mr-1 h-2.5 w-2.5" />
          Crypto → Fiat
        </Badge>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : cashouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-muted/40">
            <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No cashouts yet.</p>
          <p className="text-[11px] text-muted-foreground">Convert crypto to fiat to see your history here.</p>
        </div>
      ) : (
        <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1 no-scrollbar">
          <AnimatePresence initial={false}>
            {cashouts.map((t) => {
              let meta: any = {};
              try {
                meta = JSON.parse(t.metadata || "{}");
              } catch {
                meta = {};
              }
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        {meta.crypto} → {meta.fiatCurrency}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {timeAgo(t.createdAt)} · {t.reference?.slice(0, 10)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums text-rose-600">
                      − {formatCrypto(meta.amount || t.amount, meta.crypto)} {meta.crypto}
                    </p>
                    <p className="text-[10px] font-semibold tabular-nums text-emerald-600">
                      + {formatFiat(meta.fiatCredited || 0, meta.fiatCurrency)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}

function Row({
  label, value, tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "strong" | "bad";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/60">{label}</span>
      <span className={cn(
        "font-semibold tabular-nums",
        tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : tone === "strong" ? "text-white text-sm" : tone === "bad" ? "text-rose-300" : "text-white",
      )}>
        {value}
      </span>
    </div>
  );
}

function SummaryRow({
  label, value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function Stat({
  label, value, tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "bad";
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        "text-sm font-semibold tabular-nums",
        tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "",
      )}>
        {value}
      </p>
    </div>
  );
}

function SuccessRow({
  label, value, mono, tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "text-right font-medium",
        mono && "font-mono text-[11px]",
        tone === "ok" && "text-emerald-600",
      )}>
        {value}
      </span>
    </div>
  );
}
