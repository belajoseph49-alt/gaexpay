"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Coins, TrendingUp, TrendingDown, DollarSign, Copy, Check,
  Loader2, ArrowUpRight, ArrowDownRight, Wallet, Sparkles,
  Vote, Rocket, Gift, Percent, Shield, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { formatMoney } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenInfo {
  symbol: string;
  name: string;
  priceUSD: number;
  change24h: number;
  marketCap: number;
  totalSupply: number;
  circulatingSupply: number;
  contractAddress: string;
  chain: string;
  myBalance: number;
  myLockedInStaking: number;
  myAvailable: number;
  myUsdValue: number;
  tokenomics: { label: string; percent: number; color: string; description: string }[];
  utilities: { icon: string; title: string; description: string; value: string }[];
}

interface PriceHistory {
  history: { date: string; price: number; volume: number }[];
}

interface WalletsResponse {
  wallets: { id: string; currency: string; balance: number; type: string }[];
}

const UTILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Percent, Rocket, Vote, Gift,
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function GaexTokenView() {
  const { t } = useTranslation();
  const { fmt, fmtCompact } = useFormatMoney();
  const { data: info, loading: infoLoading, reload: reloadInfo } = useFetch<TokenInfo>("/api/gaex-token/info");
  const { data: histData, loading: histLoading } = useFetch<PriceHistory>("/api/gaex-token/price-history");
  const { data: walletsData, reload: reloadWallets } = useFetch<WalletsResponse>("/api/wallets");

  const changeIsUp = (info?.change24h ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("gaexToken.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("gaexToken.subtitle")}</p>
          </div>
        </div>
        {info && (
          <Badge variant="outline" className="self-start sm:self-auto border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="mr-1 h-3 w-3" />
            {info.chain.split(" ")[0]}
          </Badge>
        )}
      </motion.div>

      {/* Hero: price + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Price block */}
        <Card className="lg:col-span-1 p-5 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent border-emerald-500/20">
          {infoLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : info ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm">
                    ⬢
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{info.name}</p>
                    <p className="text-[10px] text-muted-foreground">{info.symbol}</p>
                  </div>
                </div>
                <Badge variant={changeIsUp ? "outline" : "outline"} className={cn(
                  "text-xs",
                  changeIsUp ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5" : "border-rose-500/40 text-rose-600 bg-rose-500/5",
                )}>
                  {changeIsUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(info.change24h).toFixed(2)}%
                </Badge>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("gaexToken.price")}</p>
                <p className="text-3xl font-bold tracking-tight mt-0.5">
                  ${info.priceUSD.toFixed(4)}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-background/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">{t("gaexToken.marketCap")}</p>
                  <p className="font-semibold">${fmtCompact(info.marketCap * 1500).replace(/[₦$€£]/g, "")}</p>
                </div>
                <div className="rounded-lg bg-background/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">24h Vol</p>
                  <p className="font-semibold">${(info.marketCap * 0.018 / 1_000_000).toFixed(2)}M</p>
                </div>
              </div>
            </>
          ) : null}
        </Card>

        {/* Price chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm">{t("gaexToken.priceChart")}</h3>
              <p className="text-[11px] text-muted-foreground">{t("gaexToken.last90Days")}</p>
            </div>
            {info && (
              <Badge variant="outline" className="text-[10px]">
                1 GAEX = ${info.priceUSD.toFixed(4)}
              </Badge>
            )}
          </div>
          {histLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : histData && histData.history.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={histData.history}>
                  <defs>
                    <linearGradient id="gaexPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval={Math.floor(histData.history.length / 6)}
                    tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `$${v.toFixed(2)}`}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    formatter={(v: number) => [`$${v.toFixed(4)}`, "Price"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#gaexPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">No data</div>
          )}
        </Card>
      </div>

      {/* Supply stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label={t("gaexToken.marketCap")}
          value={`$${fmtCompact(info?.marketCap ?? 0).replace(/[₦$€£]/g, "")}`}
          loading={infoLoading}
        />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label={t("gaexToken.totalSupply")}
          value={info ? `${(info.totalSupply / 1_000_000).toFixed(0)}M` : "—"}
          loading={infoLoading}
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label={t("gaexToken.circulatingSupply")}
          value={info ? `${(info.circulatingSupply / 1_000_000).toFixed(1)}M` : "—"}
          loading={infoLoading}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Circ. %"
          value={info ? `${((info.circulatingSupply / info.totalSupply) * 100).toFixed(1)}%` : "—"}
          loading={infoLoading}
        />
      </div>

      {/* My GAEX + Trade + Tokenomics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My GAEX */}
        <Card className="p-5 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t("gaexToken.myGAEX")}</h3>
              <p className="text-[11px] text-muted-foreground">{info?.name}</p>
            </div>
          </div>
          {infoLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : info ? (
            <>
              <p className="text-2xl font-bold">
                {info.myBalance.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">GAEX</span>
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                ≈ ${info.myUsdValue.toFixed(2)} USD
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs rounded-lg bg-background/60 px-2.5 py-1.5">
                  <span className="text-muted-foreground">{t("gaexToken.available")}</span>
                  <span className="font-medium">{info.myAvailable.toFixed(2)} GAEX</span>
                </div>
                <div className="flex items-center justify-between text-xs rounded-lg bg-background/60 px-2.5 py-1.5">
                  <span className="text-muted-foreground">{t("gaexToken.lockedInStaking")}</span>
                  <span className="font-medium">{info.myLockedInStaking.toFixed(2)} GAEX</span>
                </div>
              </div>
            </>
          ) : null}
        </Card>

        {/* Trade form */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t("gaexToken.trade")}</h3>
              <p className="text-[11px] text-muted-foreground">Buy or sell GAEX with your wallet currencies</p>
            </div>
          </div>
          {info && (
            <TradeForm
              info={info}
              wallets={walletsData?.wallets ?? []}
              onTraded={() => { reloadInfo(); reloadWallets(); }}
            />
          )}
        </Card>
      </div>

      {/* Contract address */}
      {info && (
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted/60 shrink-0">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("gaexToken.contract")} · {info.chain}</p>
              <p className="text-xs font-mono truncate">{info.contractAddress}</p>
            </div>
          </div>
          <CopyButton text={info.contractAddress} />
        </Card>
      )}

      {/* Tokenomics + utilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tokenomics pie */}
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold text-sm">{t("gaexToken.tokenomics")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("gaexToken.tokenomicsDesc")}</p>
          </div>
          {info && (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={info.tokenomics}
                      dataKey="percent"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {info.tokenomics.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(v: number, _name: string, props: any) => [`${v}%`, props.payload.label]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                {info.tokenomics.map((tomo) => (
                  <div key={tomo.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: tomo.color }} />
                      <span className="text-muted-foreground truncate">{tomo.label}</span>
                    </div>
                    <span className="font-medium ml-2 shrink-0">{tomo.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Utilities */}
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold text-sm">{t("gaexToken.utilities")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("gaexToken.utilitiesDesc")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {info?.utilities.map((u) => {
              const Icon = UTILITY_ICONS[u.icon] ?? Sparkles;
              return (
                <motion.div
                  key={u.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/60 p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">{u.title}</p>
                        <Badge variant="outline" className="text-[9px] py-0 h-4 bg-primary/5 text-primary border-primary/20">
                          {u.value}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{u.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon, label, value, loading,
}: { icon: React.ReactNode; label: string; value: string; loading: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-20 mt-1" />
      ) : (
        <p className="text-lg font-bold">{value}</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
      {copied ? (
        <><Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />{t("gaexToken.copied")}</>
      ) : (
        <><Copy className="h-3.5 w-3.5 mr-1" />{t("gaexToken.copyContract")}</>
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Trade form
// ---------------------------------------------------------------------------

function TradeForm({
  info, wallets, onTraded,
}: { info: TokenInfo; wallets: { currency: string; balance: number; type: string }[]; onTraded: () => void }) {
  const { t } = useTranslation();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [currency, setCurrency] = useState<string>(wallets[0]?.currency ?? "NGN");
  const [amount, setAmount] = useState<string>("100");
  const [submitting, setSubmitting] = useState(false);

  const pairWallet = wallets.find((w) => w.currency === currency);
  const gaexWallet = wallets.find((w) => w.currency === "GAEX");

  // For BUY: user enters amount in `currency`, receives GAEX
  // For SELL: user enters amount in GAEX, receives `currency`
  const amountNum = Number(amount) || 0;
  const pairUsd = currency === "USD" ? 1 : currency === "NGN" ? 1 / 1500 : currency === "EUR" ? 1.08 : currency === "GBP" ? 1.25 : 0.01;
  const rate = pairUsd / info.priceUSD;

  let youPay: number;
  let youReceive: number;
  let fee: number;
  if (side === "buy") {
    youPay = amountNum;
    fee = (amountNum * rate) * 0.001;
    youReceive = (amountNum * rate) - fee;
  } else {
    youPay = amountNum;
    fee = (amountNum / rate) * 0.001;
    youReceive = (amountNum / rate) - fee;
  }

  const submit = async () => {
    if (amountNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/gaex-token/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, currency, amount: amountNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trade failed");
      toast.success(t("gaexToken.tradeSuccess"));
      setAmount("");
      onTraded();
    } catch (e: any) {
      toast.error(e.message || t("gaexToken.tradeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const walletBalance = side === "buy" ? pairWallet?.balance ?? 0 : gaexWallet?.balance ?? 0;
  const insufficient = amountNum > walletBalance;

  return (
    <div className="space-y-4">
      <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="buy" className="text-xs">
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
            {t("gaexToken.buy")}
          </TabsTrigger>
          <TabsTrigger value="sell" className="text-xs">
            <ArrowDownRight className="h-3.5 w-3.5 mr-1" />
            {t("gaexToken.sell")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Currency pair */}
        <div className="space-y-1.5">
          <Label className="text-xs">{t("gaexToken.currency")}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {wallets
                .filter((w) => side === "buy" ? w.currency !== "GAEX" : w.currency === "GAEX")
                .map((w, i) => (
                  <SelectItem key={w.id || `${w.currency}-${i}`} value={w.currency}>
                    {w.currency} — {w.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              {side === "buy" && wallets.filter((w) => w.currency !== "GAEX").length === 0 && (
                <SelectItem value="NGN" disabled>NGN — no wallet</SelectItem>
              )}
              {side === "sell" && !gaexWallet && (
                <SelectItem value="GAEX" disabled>GAEX — no wallet</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        {/* Amount */}
        <div className="space-y-1.5">
          <Label className="text-xs">{t("gaexToken.amount")} ({side === "buy" ? currency : "GAEX"})</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min={0}
          />
          {pairWallet && side === "buy" && (
            <p className="text-[10px] text-muted-foreground">
              {t("gaexToken.walletBalance")}: {pairWallet.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} {currency}
            </p>
          )}
          {gaexWallet && side === "sell" && (
            <p className="text-[10px] text-muted-foreground">
              {t("gaexToken.walletBalance")}: {gaexWallet.balance.toFixed(4)} GAEX
            </p>
          )}
        </div>
      </div>

      {/* Trade summary */}
      <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("gaexToken.rate")}</span>
          <span className="font-medium">1 {side === "buy" ? currency : "GAEX"} = {rate.toFixed(6)} {side === "buy" ? "GAEX" : currency}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("gaexToken.youPay")}</span>
          <span className="font-medium">
            {youPay.toFixed(4)} {side === "buy" ? currency : "GAEX"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("gaexToken.fee")}</span>
          <span className="font-medium text-muted-foreground">
            {side === "buy" ? fee.toFixed(6) + " GAEX" : fee.toFixed(4) + " " + currency}
          </span>
        </div>
        <div className="border-t border-border/40 pt-1.5 flex items-center justify-between">
          <span className="font-medium">{t("gaexToken.youReceive")}</span>
          <span className="font-bold text-emerald-600">
            {side === "buy" ? youReceive.toFixed(6) + " GAEX" : youReceive.toFixed(4) + " " + currency}
          </span>
        </div>
      </div>

      <Button
        onClick={submit}
        disabled={submitting || amountNum <= 0 || insufficient}
        className={cn(
          "w-full",
          side === "buy" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white",
        )}
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{t("gaexToken.processing")}</>
        ) : insufficient ? (
          <>Insufficient balance</>
        ) : side === "buy" ? (
          <><ArrowUpRight className="h-4 w-4 mr-1" />{t("gaexToken.confirmBuy")}</>
        ) : (
          <><ArrowDownRight className="h-4 w-4 mr-1" />{t("gaexToken.confirmSell")}</>
        )}
      </Button>
    </div>
  );
}
