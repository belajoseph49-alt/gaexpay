"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Unlock, TrendingUp, Coins, Clock, Trophy, Calculator,
  Loader2, CheckCircle2, AlertCircle, Sparkles, ArrowUpRight,
  Wallet, PiggyBank, Gift, ChevronRight, Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { formatMoney, formatDate } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pool {
  id: string;
  token: string;
  apy: number;
  lockPeriodDays: number;
  minStake: number;
  totalStaked: number;
  enabled: boolean;
  activeStakers: number;
  usdPrice: number;
  dailyApy: number;
}

interface Stake {
  id: string;
  poolId: string;
  token: string;
  amount: number;
  rewardsEarned: number;
  accruedRewards: number;
  stakedAt: string;
  unlockAt: string;
  status: "active" | "unstaked";
  isLocked: boolean;
  remainingDays: number;
  progressPct: number;
  apy: number;
  lockPeriodDays: number;
  usdPrice: number;
  usdValue: number;
  usdRewards: number;
}

interface PoolsResponse {
  pools: Pool[];
}

interface MyStakesResponse {
  stakes: Stake[];
  stats: {
    totalStakedUSD: number;
    totalRewardsUSD: number;
    activeStakes: number;
    totalStakes: number;
  };
}

interface WalletsResponse {
  wallets: { id: string; currency: string; balance: number; type: string }[];
}

// ---------------------------------------------------------------------------
// Token visual config
// ---------------------------------------------------------------------------

const TOKEN_META: Record<string, { gradient: string; ring: string; icon: string; color: string }> = {
  BTC: { gradient: "from-amber-500 to-orange-600", ring: "ring-amber-500/30", icon: "₿", color: "#F7931A" },
  ETH: { gradient: "from-sky-500 to-indigo-600", ring: "ring-sky-500/30", icon: "Ξ", color: "#627EEA" },
  USDT: { gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-500/30", icon: "₮", color: "#26A17B" },
  GAEX: { gradient: "from-emerald-500 to-teal-700", ring: "ring-emerald-500/40", icon: "⬢", color: "#10B981" },
  PI: { gradient: "from-violet-500 to-purple-600", ring: "ring-violet-500/30", icon: "π", color: "#8B5CF6" },
};

function tokenMeta(token: string) {
  return TOKEN_META[token] ?? { gradient: "from-slate-500 to-slate-700", ring: "ring-slate-500/30", icon: "◆", color: "#64748B" };
}

function formatTokenAmount(amount: number, token: string) {
  if (token === "USDT") return formatMoney(amount, "USDT");
  if (amount < 1) return amount.toFixed(6);
  if (amount < 100) return amount.toFixed(4);
  return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function StakingView() {
  const { t } = useTranslation();
  const { fmt, fmtCompact } = useFormatMoney();
  const { data: poolsData, loading: poolsLoading, reload: reloadPools } = useFetch<PoolsResponse>("/api/staking/pools");
  const { data: stakesData, loading: stakesLoading, reload: reloadStakes } = useFetch<MyStakesResponse>("/api/staking/my-stakes");
  const { data: walletsData } = useFetch<WalletsResponse>("/api/wallets");

  const [stakePool, setStakePool] = useState<Pool | null>(null);
  const [unstakeTarget, setUnstakeTarget] = useState<Stake | null>(null);

  const pools = poolsData?.pools ?? [];
  const stakes = stakesData?.stakes ?? [];
  const stats = stakesData?.stats ?? { totalStakedUSD: 0, totalRewardsUSD: 0, activeStakes: 0, totalStakes: 0 };

  const reloadAll = () => {
    reloadPools();
    reloadStakes();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("staking.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("staking.subtitle")}</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto border-primary/30 bg-primary/5 text-primary">
          <Sparkles className="mr-1 h-3 w-3" />
          {pools.length} {t("staking.stakingPools")}
        </Badge>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<PiggyBank className="h-5 w-5" />}
          label={t("staking.totalStaked")}
          value={fmtCompact(stats.totalStakedUSD * 1500)}
          accent="from-emerald-500/20 to-emerald-500/5"
          loading={stakesLoading}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label={t("staking.activeStakes")}
          value={String(stats.activeStakes)}
          accent="from-sky-500/20 to-sky-500/5"
          loading={stakesLoading}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label={t("staking.totalRewards")}
          value={fmtCompact(stats.totalRewardsUSD * 1500)}
          accent="from-amber-500/20 to-amber-500/5"
          loading={stakesLoading}
        />
      </div>

      {/* Staking pools */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">{t("staking.stakingPools")}</h2>
            <p className="text-xs text-muted-foreground">{t("staking.stakingPoolsDesc")}</p>
          </div>
        </div>
        {poolsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pools.map((pool, idx) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                index={idx}
                onStake={() => setStakePool(pool)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rewards calculator */}
      <RewardsCalculator pools={pools} />

      {/* My stakes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">{t("staking.myStakes")}</h2>
            <p className="text-xs text-muted-foreground">{stakes.length} {t("staking.active")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reloadAll}>
            <ArrowUpRight className="h-4 w-4 mr-1" />
            {t("common.viewAll")}
          </Button>
        </div>
        <MyStakesTable
          stakes={stakes}
          loading={stakesLoading}
          onUnstake={(s) => setUnstakeTarget(s)}
        />
      </div>

      {/* Stake modal */}
      <StakeModal
        pool={stakePool}
        wallets={walletsData?.wallets ?? []}
        onClose={() => setStakePool(null)}
        onSuccess={() => {
          setStakePool(null);
          reloadAll();
        }}
      />

      {/* Unstake confirm modal */}
      <UnstakeModal
        stake={unstakeTarget}
        onClose={() => setUnstakeTarget(null)}
        onSuccess={() => {
          setUnstakeTarget(null);
          reloadAll();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon, label, value, accent, loading,
}: { icon: React.ReactNode; label: string; value: string; accent: string; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn("relative overflow-hidden border-border/60 p-5 bg-gradient-to-br", accent)}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-background/70 backdrop-blur">
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Pool card
// ---------------------------------------------------------------------------

function PoolCard({
  pool, index, onStake,
}: { pool: Pool; index: number; onStake: () => void }) {
  const { t } = useTranslation();
  const meta = tokenMeta(pool.token);
  const usdValue = pool.totalStaked * pool.usdPrice;
  const isPremium = pool.apy >= 20;

  // Imaginary pool cap for progress visualization (varies per token)
  const poolCap = useMemo(() => {
    if (pool.token === "BTC") return 5;
    if (pool.token === "ETH") return 200;
    if (pool.token === "USDT") return 1_000_000;
    if (pool.token === "GAEX") return 5_000_000;
    if (pool.token === "PI") return 1_000_000;
    return 1000;
  }, [pool.token]);
  const fillPct = Math.min(100, (pool.totalStaked / poolCap) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -3 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-border/60 p-5 transition-shadow hover:shadow-xl hover:shadow-emerald-500/5",
      )}>
        {/* Top: token icon + name + APY badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md",
              meta.gradient,
            )}>
              <span className="text-lg font-bold">{meta.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base">{pool.token} Pool</h3>
                {isPremium && (
                  <Badge variant="outline" className="text-[9px] py-0 h-4 border-amber-500/40 bg-amber-500/10 text-amber-600">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    {t("staking.premium")}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {pool.lockPeriodDays} {t("staking.days")} · {pool.activeStakers} {t("staking.activeStakers")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
              isPremium ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600",
            )}>
              <TrendingUp className="h-3 w-3" />
              {pool.apy}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("staking.apy")}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("staking.minStake")}</p>
            <p className="text-sm font-semibold mt-0.5">
              {formatTokenAmount(pool.minStake, pool.token)} <span className="text-muted-foreground text-xs">{pool.token}</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("staking.lockPeriod")}</p>
            <p className="text-sm font-semibold mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {pool.lockPeriodDays} {t("staking.days")}
            </p>
          </div>
        </div>

        {/* Pool fill progress */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("staking.totalStakedInPool")}</span>
            <span className="font-medium">
              {formatTokenAmount(pool.totalStaked, pool.token)} {pool.token}
            </span>
          </div>
          <Progress value={fillPct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground text-right">
            ≈ {formatMoney(usdValue, "USD")}
          </p>
        </div>

        {/* Stake button */}
        <Button
          onClick={onStake}
          className={cn(
            "w-full bg-gradient-to-r text-white shadow-md hover:shadow-lg transition-shadow",
            meta.gradient,
          )}
        >
          <Lock className="h-4 w-4 mr-1.5" />
          {t("staking.stakeNow")}
        </Button>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Rewards calculator
// ---------------------------------------------------------------------------

function RewardsCalculator({ pools }: { pools: Pool[] }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("100");
  const [poolId, setPoolId] = useState<string>(pools[0]?.id ?? "");

  // Update pool when pools load — derive id from props instead of setState-in-useMemo.
  const activePoolId = poolId || pools[0]?.id || "";

  const pool = pools.find((p) => p.id === activePoolId);
  const amountNum = Number(amount) || 0;

  const dailyReward = pool ? amountNum * (pool.apy / 100) / 365 : 0;
  const weeklyReward = dailyReward * 7;
  const monthlyReward = dailyReward * 30;
  const yearlyReward = dailyReward * 365;
  const usdDaily = pool ? dailyReward * pool.usdPrice : 0;

  return (
    <Card className="border-border/60 p-5 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <div className="flex items-center gap-2 mb-1">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Calculator className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="font-semibold">{t("staking.rewardsCalculator")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("staking.rewardsCalculatorDesc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs">{t("staking.selectPoolCalc")}</Label>
          <Select value={activePoolId} onValueChange={setPoolId}>
            <SelectTrigger><SelectValue placeholder={t("staking.selectPool")} /></SelectTrigger>
            <SelectContent>
              {pools.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.token} · {p.apy}% APY · {p.lockPeriodDays}d
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("staking.enterAmount")}</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min={0}
          />
          {pool && (
            <p className="text-[10px] text-muted-foreground">
              Min: {formatTokenAmount(pool.minStake, pool.token)} {pool.token}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("staking.dailyReward")} (USD)</Label>
          <div className="rounded-lg bg-emerald-500/10 px-3 py-2 border border-emerald-500/20">
            <p className="text-lg font-bold text-emerald-600">
              ${usdDaily.toFixed(4)}
            </p>
            {pool && (
              <p className="text-[10px] text-muted-foreground">
                ≈ {formatTokenAmount(dailyReward, pool.token)} {pool.token}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <CalcStat label={t("staking.weeklyReward")} amount={weeklyReward} token={pool?.token ?? ""} />
        <CalcStat label={t("staking.monthlyReward")} amount={monthlyReward} token={pool?.token ?? ""} />
        <CalcStat label={t("staking.yearlyReward")} amount={yearlyReward} token={pool?.token ?? ""} />
      </div>
    </Card>
  );
}

function CalcStat({ label, amount, token }: { label: string; amount: number; token: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2 bg-background/60">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5">
        {formatTokenAmount(amount, token)} <span className="text-muted-foreground text-xs">{token}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// My stakes table
// ---------------------------------------------------------------------------

function MyStakesTable({
  stakes, loading, onUnstake,
}: { stakes: Stake[]; loading: boolean; onUnstake: (s: Stake) => void }) {
  const { t } = useTranslation();
  const { fmt, fmtCompact } = useFormatMoney();

  if (loading) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }
  if (stakes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted/50 mb-3">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("staking.noStakes")}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border/60">
            <tr>
              <Th>{t("staking.token")}</Th>
              <Th>{t("staking.stakedAmount")}</Th>
              <Th>{t("staking.stakedDate")}</Th>
              <Th>{t("staking.unlockDateLabel")}</Th>
              <Th>{t("staking.rewardsEarned")}</Th>
              <Th>{t("staking.status")}</Th>
              <Th className="text-right">{t("staking.action")}</Th>
            </tr>
          </thead>
          <tbody>
            {stakes.map((s) => {
              const meta = tokenMeta(s.token);
              return (
                <tr key={s.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white text-xs font-bold", meta.gradient)}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className="font-medium">{s.token}</p>
                        <p className="text-[10px] text-muted-foreground">{s.apy}% APY</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="font-medium">{formatTokenAmount(s.amount, s.token)} {s.token}</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(s.usdValue * 1500)}</p>
                  </Td>
                  <Td className="text-muted-foreground text-xs">{formatDate(s.stakedAt)}</Td>
                  <Td>
                    <p className="text-xs">{formatDate(s.unlockAt)}</p>
                    {s.isLocked ? (
                      <Badge variant="outline" className="mt-0.5 text-[9px] py-0 h-4 border-amber-500/40 text-amber-600 bg-amber-500/5">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {t("staking.daysRemaining", { days: s.remainingDays })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-0.5 text-[9px] py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                        <Unlock className="h-2.5 w-2.5 mr-0.5" />
                        {t("staking.unlocked")}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <p className="font-medium text-emerald-600">
                      +{formatTokenAmount(s.accruedRewards, s.token)} {s.token}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{fmt(s.usdRewards * 1500)}</p>
                  </Td>
                  <Td>
                    <Badge variant={s.status === "active" ? "secondary" : "outline"}>
                      {s.status === "active" ? t("staking.active") : t("staking.unstaked")}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    {s.status === "active" && (
                      <Button
                        size="sm"
                        variant={s.isLocked ? "outline" : "default"}
                        disabled={s.isLocked}
                        onClick={() => onUnstake(s)}
                        className="h-7 text-xs"
                      >
                        {s.isLocked ? (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            {t("staking.locked")}
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3 mr-1" />
                            {t("staking.unstake")}
                          </>
                        )}
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border/40">
        {stakes.map((s) => {
          const meta = tokenMeta(s.token);
          return (
            <div key={s.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br text-white text-sm font-bold", meta.gradient)}>
                    {meta.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.token}</p>
                    <p className="text-[10px] text-muted-foreground">{s.apy}% APY · {s.lockPeriodDays}d lock</p>
                  </div>
                </div>
                <Badge variant={s.status === "active" ? "secondary" : "outline"} className="text-[10px]">
                  {s.status === "active" ? t("staking.active") : t("staking.unstaked")}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground">{t("staking.stakedAmount")}</p>
                  <p className="font-medium">{formatTokenAmount(s.amount, s.token)} {s.token}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("staking.rewardsEarned")}</p>
                  <p className="font-medium text-emerald-600">+{formatTokenAmount(s.accruedRewards, s.token)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("staking.unlockDateLabel")}</p>
                  <p className="font-medium">{formatDate(s.unlockAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("staking.status")}</p>
                  {s.isLocked ? (
                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-500/40 text-amber-600">
                      {t("staking.daysRemaining", { days: s.remainingDays })}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-emerald-500/40 text-emerald-600">
                      {t("staking.unlocked")}
                    </Badge>
                  )}
                </div>
              </div>
              {s.status === "active" && (
                <Button
                  size="sm"
                  variant={s.isLocked ? "outline" : "default"}
                  disabled={s.isLocked}
                  onClick={() => onUnstake(s)}
                  className="w-full h-8"
                >
                  {s.isLocked ? (
                    <><Lock className="h-3 w-3 mr-1" />{t("staking.locked")}</>
                  ) : (
                    <><Unlock className="h-3 w-3 mr-1" />{t("staking.unstake")}</>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-3", className)}>{children}</td>;
}

// ---------------------------------------------------------------------------
// Stake modal
// ---------------------------------------------------------------------------

function StakeModal({
  pool, wallets, onClose, onSuccess,
}: { pool: Pool | null; wallets: { currency: string; balance: number; type: string }[]; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const wallet = pool ? wallets.find((w) => w.currency === pool.token) : null;
  const amountNum = Number(amount) || 0;
  const validAmount = pool && amountNum >= pool.minStake && (!wallet || amountNum <= wallet.balance);
  const estDailyReward = pool ? amountNum * (pool.apy / 100) / 365 : 0;
  const estTotalReward = pool ? amountNum * (pool.apy / 100) * (pool.lockPeriodDays / 365) : 0;
  const unlockDate = pool ? new Date(Date.now() + pool.lockPeriodDays * 24 * 60 * 60 * 1000) : null;

  const submit = async () => {
    if (!pool || !validAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/staking/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId: pool.id, amount: amountNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Stake failed");
      toast.success(t("staking.stakeSuccess"));
      setAmount("");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || t("staking.stakeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!pool} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pool && (
              <>
                <div className={cn("grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white text-xs font-bold", tokenMeta(pool.token).gradient)}>
                  {tokenMeta(pool.token).icon}
                </div>
                {t("staking.stakeTokens")} — {pool.token}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {pool && `${pool.apy}% APY · ${pool.lockPeriodDays}-day lock`}
          </DialogDescription>
        </DialogHeader>

        {pool && (
          <div className="space-y-4">
            {/* Wallet balance */}
            <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("staking.walletBalance")}</span>
              </div>
              <span className="text-sm font-semibold">
                {wallet ? `${formatTokenAmount(wallet.balance, pool.token)} ${pool.token}` : `0 ${pool.token}`}
              </span>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("staking.amount")} ({pool.token})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${pool.minStake}`}
                min={pool.minStake}
              />
              <p className="text-[10px] text-muted-foreground">
                {t("staking.minStake")}: {formatTokenAmount(pool.minStake, pool.token)} {pool.token}
              </p>
            </div>

            {/* Estimates */}
            <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("staking.estDailyReward")}</span>
                <span className="font-medium text-emerald-600">
                  +{formatTokenAmount(estDailyReward, pool.token)} {pool.token}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Est. total at unlock</span>
                <span className="font-medium text-emerald-600">
                  +{formatTokenAmount(estTotalReward, pool.token)} {pool.token}
                </span>
              </div>
              {unlockDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("staking.unlockDate")}</span>
                  <span className="font-medium">{formatDate(unlockDate)}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={submit}
                disabled={!validAmount || submitting}
                className={cn("bg-gradient-to-r text-white", tokenMeta(pool.token).gradient)}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{t("staking.staking")}</>
                ) : (
                  <><Lock className="h-4 w-4 mr-1" />{t("staking.confirmStake")}</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Unstake modal
// ---------------------------------------------------------------------------

function UnstakeModal({
  stake, onClose, onSuccess,
}: { stake: Stake | null; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!stake) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/staking/unstake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stakeId: stake.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unstake failed");
      toast.success(
        t("staking.unstakeSuccess") + ` (+${formatTokenAmount(data.rewards, stake.token)} ${stake.token})`,
      );
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || t("staking.unstakeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!stake} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-emerald-600" />
            {t("staking.unstake")}
          </DialogTitle>
          <DialogDescription>
            {stake && `${stake.token} · ${stake.apy}% APY`}
          </DialogDescription>
        </DialogHeader>

        {stake && (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("staking.stakedAmount")}</span>
                <span className="font-semibold">{formatTokenAmount(stake.amount, stake.token)} {stake.token}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("staking.rewardsEarned")}</span>
                <span className="font-semibold text-emerald-600">+{formatTokenAmount(stake.accruedRewards, stake.token)} {stake.token}</span>
              </div>
              <div className="border-t border-emerald-500/20 pt-2 flex items-center justify-between">
                <span className="text-sm font-medium">{t("staking.unstakeConfirm")}</span>
                <span className="font-bold">
                  {formatTokenAmount(stake.amount + stake.accruedRewards, stake.token)} {stake.token}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>Tokens + rewards will be returned to your {stake.token} wallet immediately.</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{t("staking.unstaking")}</>
                ) : (
                  <><Unlock className="h-4 w-4 mr-1" />{t("staking.unstake")}</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
