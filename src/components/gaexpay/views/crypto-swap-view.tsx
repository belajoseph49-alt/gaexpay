"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown, ArrowUpDown, CheckCircle2, ChevronDown, Info, Loader2,
  RefreshCw, Shield, TrendingDown, TrendingUp, Zap, Repeat,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Local convenience map derived from the shared CRYPTOCURRENCIES constant
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

// Number of decimals to display per crypto
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

// Deterministic pseudo-random based on a seed (so charts are stable per render)
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Build a deterministic-ish 7-day price series (168 hourly points → sample to 7 daily candles + intraday detail)
function buildPriceSeries(code: string, basePrice: number): { t: string; p: number }[] {
  const points: { t: string; p: number }[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  // 7 days, 4 samples per day (every 6h) → 28 points
  const samples = 28;
  let price = basePrice * 0.92; // start a bit lower to imply an uptrend baseline
  for (let i = samples; i >= 0; i--) {
    const time = new Date(now - i * 6 * 60 * 60 * 1000);
    const noise = (seededRandom(i * 7 + code.charCodeAt(0) * 13) - 0.5) * 0.04; // ±2%
    const drift = 0.004; // gentle upward drift
    price = price * (1 + drift + noise);
    // Stable-coins should stay pegged
    if (["USDT", "USDC", "BUSD", "DAI"].includes(code)) {
      price = basePrice + (seededRandom(i + code.length) - 0.5) * 0.002;
    }
    const label = time.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit" });
    points.push({ t: label, p: price });
  }
  // Force the last point to ~current price
  if (points.length > 0) points[points.length - 1].p = basePrice;
  return points;
}

const CRYPTO_PRICES_USD: Record<string, number> = {
  BTC: 67500, ETH: 3450, BNB: 585, SOL: 145, XRP: 0.52, ADA: 0.45,
  DOT: 7.2, MATIC: 0.72, LTC: 84, TRX: 0.12,
  USDT: 1.0, USDC: 1.0, BUSD: 1.0, DAI: 1.0,
  PI: 47.35,
};

export function CryptoSwapView() {
  const { data: ratesData, loading: ratesLoading } = useFetch<{ rates: any[] }>("/api/crypto/rates");
  const { data: walletData, loading: walletsLoading } = useFetch<{ wallets: any[] }>("/api/crypto/wallets");

  const [from, setFrom] = useState("BTC");
  const [to, setTo] = useState("ETH");
  const [amount, setAmount] = useState("0.05");
  const [pickerOpen, setPickerOpen] = useState<null | "from" | "to">(null);
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const rates = ratesData?.rates ?? [];
  const wallets = walletData?.wallets ?? [];

  const fromMeta = CRYPTO_MAP[from];
  const toMeta = CRYPTO_MAP[to];
  const fromPriceUSD = CRYPTO_PRICES_USD[from] ?? 0;
  const toPriceUSD = CRYPTO_PRICES_USD[to] ?? 0;

  // Live rate from /api/crypto/swap GET (quote-only endpoint) — refresh every 15s
  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch(`/api/crypto/swap?from=${from}&to=${to}`, { cache: "no-store" });
        if (!res.ok) throw new Error("quote failed");
        const data = await res.json();
        if (!cancelled) setQuote(data);
      } catch {
        /* ignore — fall back to local calc below */
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };
    fetchQuote();
    const id = setInterval(fetchQuote, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [from, to]);

  // Local fallback rate (in case quote fetch fails or hasn't resolved yet)
  const liveRate = quote?.rate ?? (toPriceUSD > 0 ? fromPriceUSD / toPriceUSD : 0);

  const numericAmount = Number(amount) || 0;
  const swapFeePct = 0.3; // %
  const swapFeeInFrom = numericAmount * (swapFeePct / 100);
  const convertedAmount = Math.max(0, (numericAmount - swapFeeInFrom) * liveRate);
  const slippagePct = 0.5;
  const minReceived = Math.max(0, convertedAmount * (1 - slippagePct / 100));

  // Price impact heuristic
  const usdValue = numericAmount * fromPriceUSD;
  const priceImpactPct =
    usdValue < 1000 ? 0.05 : usdValue < 10000 ? 0.18 : usdValue < 100000 ? 0.42 : 0.85;

  const networkFeeUSD = useMemo(() => {
    const FEES: Record<string, number> = {
      BTC: 1.85, ETH: 2.45, BNB: 0.15, SOL: 0.005, XRP: 0.001, ADA: 0.0017,
      DOT: 0.02, MATIC: 0.01, LTC: 0.03, TRX: 0.001,
      USDT: 1.0, USDC: 1.0, BUSD: 0.8, DAI: 1.2, PI: 0.0001,
    };
    return FEES[to] ?? 0.5;
  }, [to]);
  const networkFeeCrypto = toPriceUSD > 0 ? networkFeeUSD / toPriceUSD : 0;

  // Wallet balance for the "from" coin (for the MAX button + balance hint)
  const fromWallet = wallets.find((w: any) => w.code === from);
  const fromBalance = fromWallet?.balance ?? 0;

  // Build chart series for the "from" crypto (7-day simulation)
  const chartData = useMemo(() => buildPriceSeries(from, fromPriceUSD), [from, fromPriceUSD]);
  const firstPrice = chartData[0]?.p ?? fromPriceUSD;
  const lastPrice = chartData[chartData.length - 1]?.p ?? fromPriceUSD;
  const chartChangePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const chartUp = chartChangePct >= 0;

  const swapSides = () => {
    setFrom(to);
    setTo(from);
    setAmount(formatCrypto(convertedAmount, to).replace(/,/g, ""));
  };

  const executeSwap = async () => {
    if (numericAmount <= 0) {
      toast.error("Enter an amount to swap");
      return;
    }
    if (fromBalance > 0 && numericAmount > fromBalance) {
      toast.error(`Insufficient ${from} balance`);
      return;
    }
    setSwapping(true);
    try {
      const res = await fetch("/api/crypto/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromCrypto: from, toCrypto: to, amount: numericAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Swap failed");
      }
      setSuccess(data);
      toast.success(`Swapped ${from} → ${to} successfully`);
    } catch (e: any) {
      toast.error(e?.message || "Swap failed");
    } finally {
      setSwapping(false);
    }
  };

  const highImpact = priceImpactPct > 0.3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crypto Swap</h1>
          <p className="text-sm text-muted-foreground">
            Instantly trade between {CRYPTOCURRENCIES.length} assets at live market rates
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live · 0.3% fee
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ===== Swap Card (hero) ===== */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-5 text-white shadow-2xl sm:p-6">
          {/* glow blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />

          <div className="relative space-y-3">
            {/* FROM */}
            <SwapInputCard
              label="From"
              meta={fromMeta}
              amount={amount}
              onAmountChange={setAmount}
              onPick={() => setPickerOpen("from")}
              balance={fromBalance}
              onMax={() => setAmount(String(fromBalance))}
              editable
              usdValue={numericAmount * fromPriceUSD}
            />

            {/* SWAP button */}
            <div className="relative flex justify-center">
              <motion.button
                type="button"
                onClick={swapSides}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                animate={{ rotate: quoteLoading ? 360 : 0 }}
                transition={{ rotate: { duration: 0.8, ease: "linear" }, scale: { duration: 0.15 } }}
                className="z-10 grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-slate-950 text-emerald-300 shadow-lg shadow-emerald-900/40 hover:border-emerald-400/60 hover:bg-emerald-500/10"
                aria-label="Swap sides"
              >
                <ArrowDown className="h-5 w-5" />
              </motion.button>
              {/* faint connector line */}
              <div className="absolute left-0 right-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-white/5" />
            </div>

            {/* TO */}
            <SwapInputCard
              label="To (estimated)"
              meta={toMeta}
              amount={formatCrypto(convertedAmount, to)}
              onAmountChange={() => {}}
              onPick={() => setPickerOpen("to")}
              editable={false}
              usdValue={convertedAmount * toPriceUSD}
            />

            {/* Live rate row */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className={cn("h-3 w-3", quoteLoading && "animate-spin")} />
                {quoteLoading ? "Fetching rate…" : (
                  <>
                    1 {from} ≈ <span className="font-semibold text-white">{formatCrypto(liveRate, to)}</span> {to}
                  </>
                )}
              </span>
              <button
                onClick={() => { setFrom(to); setTo(from); }}
                className="inline-flex items-center gap-1 text-white/60 transition hover:text-white"
              >
                <ArrowUpDown className="h-3 w-3" /> Flip
              </button>
            </div>

            {/* Price impact warning */}
            {highImpact && numericAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Price impact <span className="font-semibold">{priceImpactPct.toFixed(2)}%</span> — high relative to liquidity. You may receive less than estimated.
                </span>
              </motion.div>
            )}

            {/* Swap CTA */}
            <Button
              onClick={executeSwap}
              disabled={swapping || numericAmount <= 0}
              className="group relative w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-base font-semibold text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
              size="lg"
            >
              <AnimatePresence mode="wait" initial={false}>
                {swapping ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" /> Swapping…
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
                    {numericAmount <= 0 ? "Enter an amount" : `Swap ${from} → ${to}`}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <DetailTile label="Minimum received" value={`${formatCrypto(minReceived, to)} ${to}`} hint={`incl. ${slippagePct}% slippage`} />
              <DetailTile label="Price impact" value={`-${priceImpactPct.toFixed(2)}%`} tone={highImpact ? "warn" : "ok"} />
              <DetailTile label="Swap fee" value={`${swapFeeInFrom.toFixed(decimalsFor(from))} ${from}`} hint={`${swapFeePct}%`} />
              <DetailTile label="Network fee" value={`$${networkFeeUSD.toFixed(4)}`} hint={`${formatCrypto(networkFeeCrypto, to)} ${to}`} />
            </div>
          </div>
        </Card>

        {/* ===== Price Chart + asset picker context ===== */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-lg", CRYPTO_GRADIENT[from] || "from-slate-600 to-slate-800")}>
                  {fromMeta?.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{from} / USD</p>
                  <p className="text-xs text-muted-foreground">{fromMeta?.name} · 7d</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold tabular-nums">
                  ${fromPriceUSD < 1 ? fromPriceUSD.toFixed(4) : fromPriceUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <Badge variant="outline" className={cn("text-[10px]", chartUp ? "text-emerald-600" : "text-rose-600")}>
                  {chartUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                  {chartUp ? "+" : ""}{chartChangePct.toFixed(2)}%
                </Badge>
              </div>
            </div>

            <div className="h-48 w-full">
              {ratesLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cryptoSwapArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartUp ? "#10b981" : "#f43f5e"} stopOpacity={0.55} />
                        <stop offset="95%" stopColor={chartUp ? "#10b981" : "#f43f5e"} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval={Math.floor(chartData.length / 5)}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) =>
                        v < 1 ? `$${v.toFixed(3)}` : v < 100 ? `$${v.toFixed(2)}` : `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                      formatter={(v: any) => [`$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`, from]}
                    />
                    <Area
                      type="monotone"
                      dataKey="p"
                      stroke={chartUp ? "#10b981" : "#f43f5e"}
                      strokeWidth={2}
                      fill="url(#cryptoSwapArea)"
                      isAnimationActive
                      animationDuration={650}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Your wallet balances relevant to swap */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Your crypto balances</h3>
              <button
                onClick={() => setAmount(String(fromBalance))}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Use max
              </button>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1 no-scrollbar">
              {walletsLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              {!walletsLoading && wallets.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No wallet balances found.</p>
              )}
              {wallets.map((w: any) => {
                const meta = CRYPTO_MAP[w.code];
                const rate = rates.find((r: any) => r.code === w.code);
                const change24h = rate?.change24h ?? 0;
                return (
                  <button
                    key={w.code}
                    onClick={() => {
                      if (from !== w.code && to !== w.code) setFrom(w.code);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-muted/50",
                      from === w.code && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-base", CRYPTO_GRADIENT[w.code] || "from-slate-600 to-slate-800")}>
                        {meta?.icon ?? "🪙"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{w.code}</p>
                        <p className="text-xs text-muted-foreground">{meta?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {w.balance.toLocaleString("en-US", { maximumFractionDigits: decimalsFor(w.code) })} {w.code}
                      </p>
                      <p className={cn("text-xs tabular-nums", change24h >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        ≈ ${w.valueUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Security note */}
          <Card className="flex items-center gap-3 border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Shield className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Non-custodial swap</p>
              <p className="text-muted-foreground">Swaps settle instantly at locked rates. No slippage beyond your tolerance.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ===== Asset Picker Dialog ===== */}
      <Dialog open={!!pickerOpen} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select {pickerOpen === "from" ? "from" : "to"} asset
            </DialogTitle>
            <DialogDescription>Choose from {CRYPTOCURRENCIES.length} supported cryptocurrencies</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {CRYPTOCURRENCIES.map((c) => {
              const disabled =
                pickerOpen === "from" ? c.code === to : c.code === from;
              return (
                <button
                  key={c.code}
                  disabled={disabled}
                  onClick={() => {
                    if (pickerOpen === "from") setFrom(c.code);
                    else setTo(c.code);
                    setPickerOpen(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-muted/60 disabled:opacity-40",
                    (pickerOpen === "from" ? from === c.code : to === c.code) && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-base", CRYPTO_GRADIENT[c.code] || "from-slate-600 to-slate-800")}>
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      ${(CRYPTO_PRICES_USD[c.code] ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: CRYPTO_PRICES_USD[c.code] < 1 ? 4 : 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{c.network}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Success Dialog ===== */}
      <Dialog open={!!success} onOpenChange={(o) => !o && setSuccess(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-center">Swap Complete</DialogTitle>
            <DialogDescription className="text-center">
              Your crypto swap was executed successfully.
            </DialogDescription>
          </DialogHeader>

          {success && (
            <div className="space-y-3">
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm">
                  <span className="font-semibold">{formatCrypto(success.amount, success.from)} {success.from}</span>
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-emerald-600">{formatCrypto(success.convertedAmount, success.to)} {success.to}</span>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  1 {success.from} = {formatCrypto(success.rate, success.to)} {success.to}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <SuccessRow label="Reference" value={success.reference} mono />
                <SuccessRow label="Minimum received" value={`${formatCrypto(success.minReceived, success.to)} ${success.to}`} />
                <SuccessRow label="Swap fee" value={`${success.swapFeeInFrom?.toFixed(decimalsFor(success.from))} ${success.from} (${success.swapFeePct}%)`} />
                <SuccessRow label="Network fee" value={`$${success.networkFeeUSD?.toFixed(4)} (${formatCrypto(success.networkFeeCrypto, success.to)} ${success.to})`} />
                <SuccessRow label="Price impact" value={`-${success.priceImpactPct?.toFixed(2)}%`} />
                <SuccessRow label="Completed" value={success.completedAt ? new Date(success.completedAt).toLocaleString() : "—"} />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setSuccess(null)}>
                  New swap
                </Button>
                <Button className="flex-1" onClick={() => { setSuccess(null); setAmount(""); }}>
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

/* ---------- Sub-components ---------- */

function SwapInputCard({
  label, meta, amount, onAmountChange, onPick, balance, onMax, editable, usdValue,
}: {
  label: string;
  meta: (typeof CRYPTOCURRENCIES)[number] | undefined;
  amount: string;
  onAmountChange: (v: string) => void;
  onPick: () => void;
  balance?: number;
  onMax?: () => void;
  editable: boolean;
  usdValue: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">{label}</span>
        {balance !== undefined && (
          <button
            onClick={onMax}
            className="text-[11px] text-white/50 transition hover:text-emerald-300"
          >
            Balance: {balance.toLocaleString("en-US", { maximumFractionDigits: 6 })} {meta?.code} · MAX
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onPick}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-2 text-left transition hover:bg-white/15"
        >
          <div className={cn("grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-sm", CRYPTO_GRADIENT[meta?.code ?? ""] || "from-slate-600 to-slate-800")}>
            {meta?.icon}
          </div>
          <span className="text-sm font-semibold">{meta?.code}</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/60" />
        </button>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          readOnly={!editable}
          className={cn(
            "w-full bg-transparent text-right text-xl font-bold tabular-nums outline-none placeholder:text-white/30",
            !editable && "cursor-default text-emerald-300",
          )}
        />
      </div>
      <div className="mt-1 text-right text-[11px] text-white/50">
        ≈ ${usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function DetailTile({
  label, value, hint, tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-white/50">{label}</p>
      <p className={cn(
        "text-sm font-semibold tabular-nums",
        tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-white",
      )}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-white/40">{hint}</p>}
    </div>
  );
}

function SuccessRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium", mono && "font-mono text-[11px]")}>{value}</span>
    </div>
  );
}
