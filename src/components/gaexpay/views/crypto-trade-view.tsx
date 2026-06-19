"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Clock, DollarSign,
  History, Loader2, RefreshCw, Shield, Sparkles, TrendingDown,
  TrendingUp, Wallet, Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import {
  CRYPTOCURRENCIES, CURRENCY_SYMBOL, formatMoney, timeAgo,
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

// Fiat currencies supported in the Buy/Sell UI
const FIATS = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", flag: "🇬🇭" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
  { code: "XAF", name: "Central African CFA", symbol: "FCFA", flag: "🇨🇲" },
  { code: "XOF", name: "West African CFA", symbol: "CFA", flag: "🇨🇮" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
];

const FIAT_MAP: Record<string, (typeof FIATS)[number]> = Object.fromEntries(
  FIATS.map((f) => [f.code, f]),
);

const BUY_FEE_PCT = 1.5;
const SELL_FEE_PCT = 1.0;

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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CryptoTradeView() {
  const { data: ratesData, reload: reloadRates } = useFetch<{ rates: any[] }>("/api/crypto/rates");
  const { data: walletData, reload: reloadWallets } = useFetch<{ wallets: any[] }>("/api/crypto/wallets");

  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const { fmt, symbol, currency: userCur } = useFormatMoney();

  // Shared selections
  const [crypto, setCrypto] = useState("BTC");
  const [fiat, setFiat] = useState("NGN");

  // Buy state
  const [buyAmount, setBuyAmount] = useState("50000");
  const [buyAmountType, setBuyAmountType] = useState<"fiat" | "crypto">("fiat");

  // Sell state
  const [sellAmount, setSellAmount] = useState("0.001");
  // Sell always in crypto units (per spec)

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

  // Find the user's wallet balance for the selected crypto (for sell flow)
  const wallet = wallets.find((w: any) => w.code === crypto);
  const walletBalance = wallet?.balance ?? 0;

  // Poll the live trade quote every 60s — gives us the freshest market rate
  const [quote, setQuote] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/crypto/trade?crypto=${crypto}&fiat=${fiat}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setQuote(data);
      } catch {
        /* ignore — we have fallback to rates */
      }
    };
    fetchQuote();
    const id = setInterval(fetchQuote, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [crypto, fiat]);

  // The live market rate: 1 crypto = X fiat
  const marketRate = quote?.marketRate ?? (priceUSD > 0 && rate?.prices?.[fiat] ? rate.prices[fiat] : 0);

  // Auto-refresh rates every 60s
  useEffect(() => {
    const id = setInterval(() => {
      reloadRates();
      reloadWallets();
    }, 60_000);
    return () => clearInterval(id);
  }, [reloadRates, reloadWallets]);

  // ---------- Buy calculations ----------
  const buyNumeric = Number(buyAmount) || 0;
  const buyFiatBase =
    buyAmountType === "fiat" ? buyNumeric : buyNumeric * marketRate;
  const buyCryptoBase =
    buyAmountType === "crypto" ? buyNumeric : marketRate > 0 ? buyNumeric / marketRate : 0;
  const buyFeeFiat = buyFiatBase * (BUY_FEE_PCT / 100);
  const buyTotalFiat = buyFiatBase + buyFeeFiat;
  const buyReceiveCrypto = buyCryptoBase; // fee is on top of fiat

  // ---------- Sell calculations ----------
  const sellNumeric = Number(sellAmount) || 0;
  const sellCryptoBase = sellNumeric;
  const sellFiatBase = sellCryptoBase * marketRate;
  const sellFeeFiat = sellFiatBase * (SELL_FEE_PCT / 100);
  const sellReceiveFiat = sellFiatBase - sellFeeFiat;
  const sellRemainingBalance = Math.max(0, walletBalance - sellCryptoBase);

  // ---------- Submit handlers ----------
  const executeBuy = async () => {
    if (buyNumeric <= 0) {
      toast.error("Enter an amount to buy");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/crypto/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          crypto,
          fiatCurrency: fiat,
          amount: buyNumeric,
          amountType: buyAmountType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Buy failed");
      }
      setSuccess(data);
      toast.success(`Bought ${formatCrypto(data.totalCrypto, crypto)} ${crypto}`);
      reloadWallets();
    } catch (e: any) {
      toast.error(e?.message || "Buy failed");
    } finally {
      setSubmitting(false);
    }
  };

  const executeSell = async () => {
    if (sellNumeric <= 0) {
      toast.error("Enter an amount to sell");
      return;
    }
    if (sellNumeric > walletBalance) {
      toast.error(`Insufficient ${crypto} balance`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/crypto/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sell",
          crypto,
          fiatCurrency: fiat,
          amount: sellNumeric,
          amountType: "crypto",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sell failed");
      }
      setSuccess(data);
      toast.success(`Sold ${formatCrypto(data.totalCrypto, crypto)} ${crypto}`);
      reloadWallets();
    } catch (e: any) {
      toast.error(e?.message || "Sell failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Confetti trigger={!!success} />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buy / Sell Crypto</h1>
          <p className="text-sm text-muted-foreground">
            Instantly buy or sell {CRYPTOCURRENCIES.length} cryptocurrencies with fiat at live CoinGecko rates
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live · CoinGecko
          </Badge>
          <Badge variant="outline" className="border-amber-500/30 text-amber-600">
            Buy 1.5% · Sell 1.0%
          </Badge>
        </div>
      </div>

      {/* Live price ticker */}
      <LiveTicker rates={rates} loading={!ratesData} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "buy" | "sell")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="buy" className="gap-1.5">
            <ArrowDown className="h-3.5 w-3.5" /> Buy Crypto
          </TabsTrigger>
          <TabsTrigger value="sell" className="gap-1.5">
            <ArrowUp className="h-3.5 w-3.5" /> Sell Crypto
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ===== Trade form card ===== */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-5 text-white shadow-2xl sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />

          <div className="relative space-y-4">
            {/* Crypto + Fiat pickers */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPickerOpen("crypto")}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-sm", CRYPTO_GRADIENT[crypto] || "from-slate-600 to-slate-800")}>
                    {cryptoMeta?.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/50">{tab === "buy" ? "You buy" : "You sell"}</p>
                    <p className="text-sm font-semibold">{crypto}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </button>
              <button
                onClick={() => setPickerOpen("fiat")}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-sm">
                    {fiatMeta?.flag}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/50">{tab === "buy" ? "You pay with" : "You receive"}</p>
                    <p className="text-sm font-semibold">{fiat}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </button>
            </div>

            {/* Amount input */}
            <AnimatePresence mode="wait" initial={false}>
              {tab === "buy" ? (
                <motion.div
                  key="buy-amount"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  <AmountInput
                    label={`Amount (${buyAmountType === "fiat" ? fiat : crypto})`}
                    value={buyAmount}
                    onChange={setBuyAmount}
                    placeholder="0.00"
                    suffix={buyAmountType === "fiat" ? fiatMeta?.symbol : crypto}
                  />
                  {/* Quick chips + amount-type toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      {buyAmountType === "fiat" ? (
                        <>
                          {[1000, 5000, 25000, 100000].map((v) => (
                            <button
                              key={v}
                              onClick={() => setBuyAmount(String(v))}
                              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                            >
                              {formatFiat(v, fiat)}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {(crypto === "BTC" ? [0.001, 0.01, 0.1, 1] : crypto === "ETH" ? [0.1, 0.5, 1, 5] : [10, 100, 1000, 10000]).map((v) => (
                            <button
                              key={v}
                              onClick={() => setBuyAmount(String(v))}
                              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                            >
                              {formatCrypto(v, crypto)}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setBuyAmountType(buyAmountType === "fiat" ? "crypto" : "fiat")}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Switch to {buyAmountType === "fiat" ? "crypto" : "fiat"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="sell-amount"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  <AmountInput
                    label={`Amount (${crypto})`}
                    value={sellAmount}
                    onChange={setSellAmount}
                    placeholder="0.00"
                    suffix={crypto}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => setSellAmount(String(walletBalance))}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      <Wallet className="h-3 w-3" />
                      Balance: {formatCrypto(walletBalance, crypto)} {crypto} · MAX
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live rate row */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className={cn("h-3 w-3", submitting && "animate-spin")} />
                {marketRate > 0 ? (
                  <>
                    1 {crypto} = <span className="font-semibold text-white">{marketRate.toLocaleString("en-US", { maximumFractionDigits: marketRate < 1 ? 6 : 2 })}</span> {fiat}
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

            {/* 24h change pill */}
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
              <span className="text-white/60">24h change</span>
              <span className={cn("inline-flex items-center gap-1 font-semibold", change24h >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </span>
            </div>

            {/* Cost breakdown */}
            {tab === "buy" ? (
              <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                <Row label="Market rate" value={`1 ${crypto} = ${marketRate.toLocaleString("en-US", { maximumFractionDigits: marketRate < 1 ? 6 : 2 })} ${fiat}`} />
                <Row label="Base amount" value={`${formatFiat(buyFiatBase, fiat)} · ${formatCrypto(buyCryptoBase, crypto)} ${crypto}`} />
                <Row label={`Buy fee (${BUY_FEE_PCT}%)`} value={formatFiat(buyFeeFiat, fiat)} tone="warn" />
                <div className="my-1.5 h-px bg-white/10" />
                <Row label="Total cost" value={formatFiat(buyTotalFiat, fiat)} tone="strong" />
                <Row label="You receive" value={`${formatCrypto(buyReceiveCrypto, crypto)} ${crypto}`} tone="ok" />
              </div>
            ) : (
              <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                <Row label="Market rate" value={`1 ${crypto} = ${marketRate.toLocaleString("en-US", { maximumFractionDigits: marketRate < 1 ? 6 : 2 })} ${fiat}`} />
                <Row label="Selling" value={`${formatCrypto(sellCryptoBase, crypto)} ${crypto}`} />
                <Row label="Base proceeds" value={formatFiat(sellFiatBase, fiat)} />
                <Row label={`Sell fee (${SELL_FEE_PCT}%)`} value={`− ${formatFiat(sellFeeFiat, fiat)}`} tone="warn" />
                <div className="my-1.5 h-px bg-white/10" />
                <Row label="You receive" value={formatFiat(sellReceiveFiat, fiat)} tone="ok" />
                <Row label="Remaining balance" value={`${formatCrypto(sellRemainingBalance, crypto)} ${crypto}`} />
              </div>
            )}

            {/* CTA */}
            <Button
              onClick={tab === "buy" ? executeBuy : executeSell}
              disabled={submitting || (tab === "buy" ? buyNumeric <= 0 : sellNumeric <= 0)}
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
                    {tab === "buy" ? "Buying…" : "Selling…"}
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    {tab === "buy" ? (
                      <>
                        <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
                        {buyNumeric <= 0 ? "Enter an amount" : `Buy ${crypto} with ${fiat}`}
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 transition-transform group-hover:scale-110" />
                        {sellNumeric <= 0 ? "Enter an amount" : `Sell ${crypto} for ${fiat}`}
                      </>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* Security note */}
            <div className="flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-white/70">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>
                Trades settle instantly at locked rates. Funds are protected by AES-256 encryption, multi-signature cold storage and 2FA.
              </span>
            </div>
          </div>
        </Card>

        {/* ===== Right column ===== */}
        <div className="space-y-4">
          {/* Live rate card */}
          <Card className="relative overflow-hidden p-5">
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
              <Stat label="Buy fee" value={`${BUY_FEE_PCT}%`} />
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
                    <AnimatedNumber value={wallet.valueUSD} prefix="$" decimals={2} />
                  </span>
                </div>
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">
                You don&apos;t have a {crypto} wallet yet. Buy some to get started.
              </p>
            )}
          </Card>

          {/* Recent trades */}
          <RecentTrades />
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
                ? `Choose from ${CRYPTOCURRENCIES.length} supported cryptocurrencies`
                : "Choose the fiat currency to pay or receive with"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {pickerOpen === "crypto"
              ? CRYPTOCURRENCIES.map((c) => {
                  const r = rates.find((x: any) => x.code === c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCrypto(c.code);
                        setPickerOpen(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-muted/60",
                        crypto === c.code && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
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
            <DialogTitle className="text-center">
              {success?.action === "buy" ? "Purchase Complete" : "Sale Complete"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {success?.action === "buy"
                ? "Your crypto purchase was executed at live market rates."
                : "Your crypto sale was executed at live market rates."}
            </DialogDescription>
          </DialogHeader>

          {success && (
            <div className="space-y-3">
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm">
                  {success.action === "buy" ? (
                    <>
                      <span className="font-semibold">{formatFiat(success.totalFiat, success.fiatCurrency)}</span>
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-emerald-600">{formatCrypto(success.totalCrypto, success.crypto)} {success.crypto}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{formatCrypto(success.totalCrypto, success.crypto)} {success.crypto}</span>
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-emerald-600">{formatFiat(success.totalFiat, success.fiatCurrency)}</span>
                    </>
                  )}
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  1 {success.crypto} = {success.marketRate.toLocaleString("en-US", { maximumFractionDigits: success.marketRate < 1 ? 6 : 2 })} {success.fiatCurrency}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <SuccessRow label="Reference" value={success.reference} mono />
                <SuccessRow label="Market rate" value={`1 ${success.crypto} = ${success.marketRate.toLocaleString("en-US", { maximumFractionDigits: success.marketRate < 1 ? 6 : 2 })} ${success.fiatCurrency}`} />
                <SuccessRow label="Crypto price" value={formatPrice(success.cryptoPriceUSD)} />
                <SuccessRow label={`Fee (${success.feePct}%)`} value={`${formatFiat(success.feeFiat, success.fiatCurrency)} (${formatCrypto(success.feeCrypto, success.crypto)} ${success.crypto})`} />
                {success.action === "buy" ? (
                  <>
                    <SuccessRow label="Total paid" value={formatFiat(success.totalFiat, success.fiatCurrency)} />
                    <SuccessRow label="Crypto received" value={`${formatCrypto(success.totalCrypto, success.crypto)} ${success.crypto}`} tone="ok" />
                  </>
                ) : (
                  <>
                    <SuccessRow label="Crypto sold" value={`${formatCrypto(success.totalCrypto, success.crypto)} ${success.crypto}`} />
                    <SuccessRow label="Fiat received" value={formatFiat(success.totalFiat, success.fiatCurrency)} tone="ok" />
                  </>
                )}
                <SuccessRow label="Completed" value={success.completedAt ? new Date(success.completedAt).toLocaleString() : "—"} />
                <SuccessRow label="Price source" value="CoinGecko (live)" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setSuccess(null)}>
                  New trade
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setSuccess(null);
                    if (success.action === "buy") {
                      setBuyAmount("");
                    } else {
                      setSellAmount("");
                    }
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

function LiveTicker({ rates, loading }: { rates: any[]; loading: boolean }) {
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

  // Top 12 cryptos by market cap (skip stablecoins for variety)
  const top = [...rates]
    .filter((r) => !["USDT", "USDC", "BUSD", "DAI"].includes(r.code))
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, 10);

  return (
    <Card className="p-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {top.map((r) => {
          const meta = CRYPTO_MAP[r.code];
          const up = (r.change24h || 0) >= 0;
          return (
            <button
              key={r.code}
              className="flex min-w-[140px] flex-col gap-1 rounded-lg border bg-muted/20 px-3 py-2 text-left transition hover:bg-muted/40"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{meta?.icon}</span>
                <span className="text-xs font-semibold">{r.code}</span>
              </div>
              <p className="text-xs font-bold tabular-nums">{formatPrice(r.priceUSD)}</p>
              <p className={cn("text-[10px] tabular-nums", up ? "text-emerald-600" : "text-rose-600")}>
                {up ? "+" : ""}{(r.change24h || 0).toFixed(2)}%
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function RecentTrades() {
  const { data, loading } = useFetch<{ transactions: any[] }>(
    "/api/transactions?type=exchange&limit=15",
  );

  const trades = useMemo(() => {
    const all = data?.transactions ?? [];
    return all
      .filter((t) => {
        try {
          const meta = JSON.parse(t.metadata || "{}");
          return meta.kind === "crypto-trade";
        } catch {
          return false;
        }
      })
      .slice(0, 6);
  }, [data]);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recent trades</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          <Clock className="mr-1 h-2.5 w-2.5" />
          Live
        </Badge>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-muted/40">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No trades yet.</p>
          <p className="text-[11px] text-muted-foreground">Buy or sell crypto to see your history here.</p>
        </div>
      ) : (
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1 no-scrollbar">
          <AnimatePresence initial={false}>
            {trades.map((t) => {
              let meta: any = {};
              try {
                meta = JSON.parse(t.metadata || "{}");
              } catch {
                meta = {};
              }
              const isBuy = meta.action === "buy";
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
                    <div className={cn(
                      "grid h-8 w-8 place-items-center rounded-full text-xs font-bold",
                      isBuy ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
                    )}>
                      {isBuy ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        {isBuy ? "Buy" : "Sell"} {meta.crypto}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {timeAgo(t.createdAt)} · {t.reference?.slice(0, 10)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums">
                      {formatCrypto(meta.totalCrypto, meta.crypto)} {meta.crypto}
                    </p>
                    <p className={cn("text-[10px] tabular-nums", isBuy ? "text-rose-600" : "text-emerald-600")}>
                      {isBuy ? "−" : "+"}{formatFiat(meta.totalFiat, meta.fiatCurrency)}
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

function AmountInput({
  label, value, onChange, placeholder, suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">{label}</span>
        {suffix && <span className="text-[11px] text-white/50">{suffix}</span>}
      </div>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder={placeholder}
        className="w-full bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-white/30"
      />
    </div>
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
