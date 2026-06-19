"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bitcoin, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  TrendingUp, TrendingDown, Wallet as WalletIcon, Zap, Shield,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CRYPTOCURRENCIES, CURRENCY_SYMBOL } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CRYPTO_META: Record<string, any> = {
  BTC: { name: "Bitcoin", icon: "🪙", color: "#F7931A", gradient: "from-amber-500 to-orange-600" },
  ETH: { name: "Ethereum", icon: "💎", color: "#627EEA", gradient: "from-blue-500 to-indigo-600" },
  USDT: { name: "Tether", icon: "💵", color: "#26A17B", gradient: "from-emerald-500 to-teal-600" },
  USDC: { name: "USD Coin", icon: "💵", color: "#2775CA", gradient: "from-blue-500 to-sky-600" },
  BUSD: { name: "Binance USD", icon: "💵", color: "#F0B90B", gradient: "from-yellow-500 to-amber-600" },
  DAI: { name: "Dai", icon: "💵", color: "#F5AC37", gradient: "from-amber-400 to-yellow-600" },
  BNB: { name: "BNB", icon: "🟡", color: "#F0B90B", gradient: "from-yellow-500 to-amber-600" },
  SOL: { name: "Solana", icon: "🌞", color: "#9945FF", gradient: "from-violet-500 to-purple-600" },
  XRP: { name: "Ripple", icon: "💧", color: "#23292F", gradient: "from-slate-600 to-slate-800" },
  ADA: { name: "Cardano", icon: "🔵", color: "#0033AD", gradient: "from-blue-600 to-indigo-700" },
  DOT: { name: "Polkadot", icon: "🔴", color: "#E6007A", gradient: "from-pink-500 to-rose-600" },
  MATIC: { name: "Polygon", icon: "🔺", color: "#8247E5", gradient: "from-purple-500 to-violet-600" },
  LTC: { name: "Litecoin", icon: "🪙", color: "#345D9D", gradient: "from-slate-500 to-blue-600" },
  TRX: { name: "TRON", icon: "🔴", color: "#FF060A", gradient: "from-red-500 to-rose-600" },
  PI: { name: "Pi Network", icon: "🟣", color: "#8B5CF6", gradient: "from-violet-500 to-purple-700" },
};

export function CryptoView() {
  const { data: walletData, reload } = useFetch<any>("/api/crypto/wallets");
  const { data: ratesData } = useFetch<any>("/api/crypto/rates");
  const [showConverter, setShowConverter] = useState(false);

  const wallets = walletData?.wallets ?? [];
  const totalValueUSD = walletData?.totalValueUSD ?? 0;
  const totalValueNGN = walletData?.totalValueNGN ?? 0;
  const rates = ratesData?.rates ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crypto Wallets</h1>
          <p className="text-sm text-muted-foreground">Bitcoin, Ethereum, Pi Network & more</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConverter(!showConverter)}>
            <ArrowUpDown className="h-4 w-4 mr-1.5" /> Convert
          </Button>
          <Button size="sm" onClick={() => toast.success("Deposit address copied")}>
            <ArrowDownToLine className="h-4 w-4 mr-1.5" /> Deposit
          </Button>
        </div>
      </div>

      {/* Total portfolio value */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-2xl" />
        <div className="absolute right-20 bottom-0 h-24 w-24 rounded-full bg-violet-500/20 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bitcoin className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-medium text-white/80">Total Crypto Portfolio</span>
            </div>
            <h2 className="text-4xl font-bold tabular-nums">
              $<AnimatedNumber value={totalValueUSD} decimals={2} />
            </h2>
            <p className="mt-1 text-sm text-white/70">
              ≈ <AnimatedNumber value={totalValueNGN} prefix="₦" decimals={2} />
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                <TrendingUp className="h-3 w-3 mr-1" /> +8.4% (24h)
              </Badge>
              <span className="text-xs text-white/60">{wallets.length} assets</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" className="bg-white/10 text-white border-0 backdrop-blur hover:bg-white/20">
              <ArrowUpFromLine className="h-4 w-4 mr-1.5" /> Send Crypto
            </Button>
            <Button variant="secondary" className="bg-white/10 text-white border-0 backdrop-blur hover:bg-white/20">
              <Zap className="h-4 w-4 mr-1.5" /> Swap
            </Button>
          </div>
        </div>
      </Card>

      {/* Pi Network highlight */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 text-3xl backdrop-blur">
              🟣
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">Pi Network</h3>
                <Badge className="bg-white/20 text-white border-0 text-[10px]">Special</Badge>
              </div>
              <p className="text-xs text-white/70">1 π = $47.35 · Pre-mainnet phase</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">Your Balance</p>
            <p className="text-lg font-bold tabular-nums">π 1,850.00</p>
            <p className="text-xs text-white/60">≈ $87,597.50</p>
          </div>
        </div>
      </Card>

      {/* Crypto wallets grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        {wallets.map((w: any, i: number) => {
          const meta = CRYPTO_META[w.code] || {};
          const rate = rates.find((r: any) => r.code === w.code);
          const change24h = rate?.change24h || 0;
          return (
            <motion.div
              key={w.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group relative overflow-hidden p-5 card-lift">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-xl shadow", meta.gradient || "from-slate-500 to-slate-700")}>
                      {meta.icon || "🪙"}
                    </div>
                    <div>
                      <p className="font-semibold">{w.code}</p>
                      <p className="text-xs text-muted-foreground">{meta.name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", change24h >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {change24h >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {Math.abs(change24h).toFixed(2)}%
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-xl font-bold tabular-nums">
                    {w.balance.toLocaleString("en-US", { maximumFractionDigits: w.code === "BTC" || w.code === "ETH" ? 6 : 2 })} {w.symbol || w.code}
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">≈ ${w.valueUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>

                <div className="mt-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                  <Button size="sm" variant="outline" className="h-7 flex-1 text-xs">
                    <ArrowUpFromLine className="h-3 w-3 mr-1" /> Send
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 flex-1 text-xs">
                    <ArrowDownToLine className="h-3 w-3 mr-1" /> Receive
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 flex-1 text-xs">
                    <ArrowUpDown className="h-3 w-3 mr-1" /> Swap
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Crypto Converter */}
      {showConverter && <CryptoConverter rates={rates} />}

      {/* Live prices table */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Live Crypto Prices</h3>
            <p className="text-xs text-muted-foreground">Real-time market rates</p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Live
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Asset</th>
                <th className="pb-2 pr-3 font-medium text-right">Price (USD)</th>
                <th className="pb-2 pr-3 font-medium text-right">24h Change</th>
                <th className="pb-2 pr-3 font-medium text-right">Price (NGN)</th>
                <th className="pb-2 font-medium text-right">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r: any) => {
                const meta = CRYPTO_META[r.code] || {};
                return (
                  <tr key={r.code} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{meta.icon}</span>
                        <div>
                          <p className="font-medium">{r.code}</p>
                          <p className="text-xs text-muted-foreground">{r.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">
                      ${r.priceUSD < 1 ? r.priceUSD.toFixed(4) : r.priceUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className={cn("font-medium tabular-nums", r.change24h >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {r.change24h >= 0 ? "+" : ""}{r.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                      ₦{r.prices?.NGN ? r.prices.NGN.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      ${(r.marketCap / 1e9).toFixed(2)}B
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Security note */}
      <Card className="flex items-center gap-4 border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Bank-Grade Crypto Security</h3>
          <p className="text-xs text-muted-foreground">
            All crypto assets are secured with multi-signature cold storage, AES-256 encryption, and 2FA. Private keys never leave our secure enclave.
          </p>
        </div>
      </Card>
    </div>
  );
}

function CryptoConverter({ rates }: { rates: any[] }) {
  const [from, setFrom] = useState("BTC");
  const [to, setTo] = useState("NGN");
  const [amount, setAmount] = useState("0.01");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const convert = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, amount: Number(amount) }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      toast.error("Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const allAssets = [
    ...rates.map((r: any) => ({ code: r.code, name: r.name, type: "crypto", icon: CRYPTO_META[r.code]?.icon })),
    { code: "NGN", name: "Nigerian Naira", type: "fiat", icon: "₦" },
    { code: "USD", name: "US Dollar", type: "fiat", icon: "$" },
    { code: "XAF", name: "Central African CFA", type: "fiat", icon: "FCFA" },
    { code: "XOF", name: "West African CFA", type: "fiat", icon: "CFA" },
    { code: "GHS", name: "Ghanaian Cedi", type: "fiat", icon: "₵" },
    { code: "KES", name: "Kenyan Shilling", type: "fiat", icon: "KSh" },
    { code: "EUR", name: "Euro", type: "fiat", icon: "€" },
    { code: "GBP", name: "British Pound", type: "fiat", icon: "£" },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-1">Crypto ↔ Fiat Converter</h3>
      <p className="text-xs text-muted-foreground mb-4">Convert between crypto and fiat currencies</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            {allAssets.map((a) => (
              <option key={a.code} value={a.code}>{a.icon} {a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-semibold tabular-nums" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            {allAssets.map((a) => (
              <option key={a.code} value={a.code}>{a.icon} {a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={convert} disabled={loading} className="w-full">
            {loading ? "Converting..." : "Convert"}
          </Button>
        </div>
      </div>
      {result && (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            {amount} {from} =
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {result.converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: result.toType === "crypto" ? 8 : 2 })} {to}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rate: 1 {from} = {result.rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {to}
          </p>
        </div>
      )}
    </Card>
  );
}
