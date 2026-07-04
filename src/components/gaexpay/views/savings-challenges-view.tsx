"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Flame, Plus, Target, TrendingUp, Award, Sparkles,
  ChevronRight, Calendar, X, Medal, Zap, Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useFetch } from "@/hooks/use-fetch";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { Confetti } from "@/components/gaexpay/confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---- Types -----------------------------------------------------------------

interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: "streak" | "amount" | "behavior" | "roundup";
  targetAmount: number;
  durationDays: number;
  difficulty: "easy" | "medium" | "hard";
  colorFrom: string;
  colorTo: string;
  badgeBronze: number;
  badgeSilver: number;
  badgeGold: number;
  badgePlatinum: number;
  createdAt: string;
}

interface Contribution {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

interface Participation {
  id: string;
  challengeId: string;
  status: "active" | "completed" | "abandoned";
  currentAmount: number;
  streak: number;
  longestStreak: number;
  lastContributionAt: string | null;
  joinedAt: string;
  completedAt: string | null;
  challenge: Challenge;
  progress: number;
  badges: string[];
  daysLeft: number | null;
  recentContributions: Contribution[];
}

interface SavingsChallengesResponse {
  challenges: Challenge[];
  participations: Participation[];
  activeCount: number;
  totalSaved: number;
  bestStreak: number;
}

// ---- Static lookups --------------------------------------------------------

const BADGE_META: Record<string, { emoji: string; label: string; ring: string }> = {
  bronze: { emoji: "🥉", label: "Bronze", ring: "ring-amber-700/40 bg-amber-700/10 text-amber-700" },
  silver: { emoji: "🥈", label: "Silver", ring: "ring-slate-400/40 bg-slate-400/10 text-slate-600" },
  gold: { emoji: "🥇", label: "Gold", ring: "ring-amber-500/50 bg-amber-500/10 text-amber-600" },
  platinum: { emoji: "💎", label: "Platinum", ring: "ring-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600" },
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  hard: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const CATEGORIES = [
  { id: "all", key: "savingsChallenges.categoryAll" },
  { id: "streak", key: "savingsChallenges.categoryStreak" },
  { id: "amount", key: "savingsChallenges.categoryAmount" },
  { id: "behavior", key: "savingsChallenges.categoryBehavior" },
  { id: "roundup", key: "savingsChallenges.categoryRoundup" },
] as const;

// ---- Main view -------------------------------------------------------------

export function SavingsChallengesView() {
  const { t } = useTranslation();
  const { fmt, fmtCompact, symbol } = useFormatMoney();
  const { data, loading, reload } = useFetch<SavingsChallengesResponse>("/api/savings-challenges");

  const [filter, setFilter] = useState<string>("all");
  const [contributeParticipation, setContributeParticipation] = useState<Participation | null>(null);
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string } | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const challenges = data?.challenges ?? [];
  const participations = data?.participations ?? [];
  const activeParticipations = participations.filter((p) => p.status === "active");
  const activeCount = data?.activeCount ?? activeParticipations.length;
  const totalSaved = data?.totalSaved ?? 0;
  const bestStreak = data?.bestStreak ?? 0;

  const joinedChallengeIds = useMemo(
    () => new Set(participations.map((p) => p.challengeId)),
    [participations],
  );

  const browseable = useMemo(() => {
    if (filter === "all") return challenges;
    return challenges.filter((c) => c.category === filter);
  }, [challenges, filter]);

  // ---- Actions -------------------------------------------------------------

  const join = async (challenge: Challenge) => {
    setJoining(challenge.id);
    try {
      const res = await fetch(`/api/savings-challenges/${challenge.id}/join`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      toast.success(t("savingsChallenges.joined", { title: challenge.title }));
      reload();
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setJoining(null);
    }
  };

  const contribute = async (participation: Participation, amount: number, note?: string) => {
    try {
      const res = await fetch(`/api/savings-challenges/${participation.challengeId}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: note || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      // Fire confetti for newly-unlocked badges OR challenge completion.
      if (json.completed) {
        setCelebration({
          title: t("savingsChallenges.completed"),
          subtitle: participation.challenge.title,
        });
        setTimeout(() => setCelebration(null), 4500);
        toast.success(t("savingsChallenges.completedToast", { title: participation.challenge.title }));
      } else if (Array.isArray(json.newBadges) && json.newBadges.length > 0) {
        const names = json.newBadges.map((b: string) => BADGE_META[b]?.label || b).join(", ");
        setCelebration({
          title: t("savingsChallenges.badgeUnlocked"),
          subtitle: names,
        });
        setTimeout(() => setCelebration(null), 4000);
        toast.success(t("savingsChallenges.badgeUnlockedToast", { badges: names }));
      } else {
        toast.success(t("savingsChallenges.contributionAdded", { amount: fmt(amount) }));
      }
      setContributeParticipation(null);
      reload();
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    }
  };

  const abandon = async (participation: Participation) => {
    if (!confirm(t("savingsChallenges.abandonConfirm", { title: participation.challenge.title }))) return;
    try {
      const res = await fetch(`/api/savings-challenges/${participation.challengeId}/abandon`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      toast.success(t("savingsChallenges.abandoned", { title: participation.challenge.title }));
      reload();
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    }
  };

  // ---- Render --------------------------------------------------------------

  if (loading) {
    return <SavingsChallengesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Confetti trigger={!!celebration} count={140} />
      {celebration && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-1/2 left-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-700 p-8 text-center text-white shadow-2xl"
        >
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold">{celebration.title}</h2>
          <p className="mt-1 text-white/85">{celebration.subtitle}</p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-amber-300">
            <Award className="h-5 w-5" />
            <span className="text-sm font-medium">{t("savingsChallenges.achievementUnlocked")}</span>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          {t("savingsChallenges.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("savingsChallenges.subtitle")}</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Trophy}
          label={t("savingsChallenges.activeChallenges")}
          value={String(activeCount)}
          color="violet"
          trend={activeParticipations.length > 0 ? `${activeParticipations.length} live` : undefined}
        />
        <KpiCard
          icon={Target}
          label={t("savingsChallenges.totalSaved")}
          value={`${symbol}${fmtCompact(totalSaved)}`}
          color="emerald"
          trend={totalSaved > 0 ? `+${activeParticipations.length} streaks` : undefined}
        />
        <KpiCard
          icon={Flame}
          label={t("savingsChallenges.bestStreak")}
          value={`${bestStreak} ${t("savingsChallenges.days")}`}
          color="amber"
          trend={bestStreak > 0 ? t("savingsChallenges.keepGoing") : undefined}
        />
      </div>

      {/* My Active Challenges */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              {t("savingsChallenges.myActive")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("savingsChallenges.myActiveDesc")}</p>
          </div>
          <span className="text-xs text-muted-foreground">{activeParticipations.length} {t("savingsChallenges.active")}</span>
        </div>

        {activeParticipations.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t("savingsChallenges.noActive")}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t("savingsChallenges.noActiveHint")}</p>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar -mx-1 px-1">
            {activeParticipations.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="snap-start shrink-0 w-[320px]"
              >
                <ActiveChallengeCard
                  participation={p}
                  onContribute={() => setContributeParticipation(p)}
                  onAbandon={() => abandon(p)}
                  t={t}
                  fmt={fmt}
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Browse Challenges */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              {t("savingsChallenges.browse")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("savingsChallenges.browseDesc")}</p>
          </div>
          {/* Category filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => {
              const active = filter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t(c.key)}
                </button>
              );
            })}
          </div>
        </div>

        {browseable.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm text-muted-foreground">{t("savingsChallenges.noChallenges")}</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browseable.map((c, i) => {
              const alreadyJoined = joinedChallengeIds.has(c.id);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <BrowseChallengeCard
                    challenge={c}
                    joined={alreadyJoined}
                    joining={joining === c.id}
                    onJoin={() => join(c)}
                    t={t}
                    fmt={fmt}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Contribute dialog */}
      <Dialog open={!!contributeParticipation} onOpenChange={(o) => !o && setContributeParticipation(null)}>
        {contributeParticipation && (
          <ContributeDialog
            participation={contributeParticipation}
            onSubmit={(amount, note) => contribute(contributeParticipation, amount, note)}
            t={t}
            fmt={fmt}
          />
        )}
      </Dialog>
    </div>
  );
}

// ---- Sub-components --------------------------------------------------------

function KpiCard({
  icon: Icon, label, value, color, trend,
}: {
  icon: any; label: string; value: string; color: "violet" | "emerald" | "amber"; trend?: string;
}) {
  const colors: Record<string, string> = {
    violet: "bg-violet-500/15 text-violet-500",
    emerald: "bg-emerald-500/15 text-emerald-500",
    amber: "bg-amber-500/15 text-amber-500",
  };
  return (
    <Card className="p-5 card-lift">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <Badge variant="outline" className="text-violet-600 border-violet-500/30">
            <TrendingUp className="h-3 w-3 mr-1" />{trend}
          </Badge>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function ActiveChallengeCard({
  participation: p, onContribute, onAbandon, t, fmt,
}: {
  participation: Participation;
  onContribute: () => void;
  onAbandon: () => void;
  t: (k: string, params?: Record<string, string | number>) => string;
  fmt: (n: number) => string;
}) {
  const c = p.challenge;
  const target = c.targetAmount;
  const remaining = Math.max(0, target - p.currentAmount);
  const gradient = `linear-gradient(135deg, ${c.colorFrom}, ${c.colorTo})`;

  return (
    <Card className="relative overflow-hidden p-5 card-lift h-full flex flex-col">
      {/* Decorative gradient blob */}
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: gradient }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl shadow-lg"
          style={{ background: gradient }}
        >
          <span>{c.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{c.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {p.daysLeft !== null
              ? t("savingsChallenges.daysLeft", { days: p.daysLeft })
              : t("savingsChallenges.noDeadline")}
          </p>
        </div>
        <Badge variant="outline" className={cn("capitalize text-[10px] shrink-0", DIFFICULTY_STYLE[c.difficulty])}>
          {t(`savingsChallenges.difficulty${c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}`)}
        </Badge>
      </div>

      {/* Streak + badges row */}
      <div className="relative mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-600">
          <Flame className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold tabular-nums">{p.streak}</span>
          <span className="text-[10px] text-amber-600/80">{t("savingsChallenges.streak")}</span>
        </div>
        <div className="flex items-center gap-1">
          {p.badges.length === 0 ? (
            <span className="text-[10px] text-muted-foreground/60">{t("savingsChallenges.noBadgesYet")}</span>
          ) : (
            p.badges.map((b) => {
              const meta = BADGE_META[b];
              if (!meta) return null;
              return (
                <span
                  key={b}
                  title={meta.label}
                  className={cn("grid h-7 w-7 place-items-center rounded-full text-sm ring-1", meta.ring)}
                >
                  {meta.emoji}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* Amount + progress */}
      <div className="relative mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xl font-bold tabular-nums">{fmt(p.currentAmount)}</span>
          <span className="text-xs text-muted-foreground">/ {fmt(target)}</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, p.progress)}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: gradient }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("savingsChallenges.percentComplete", { pct: p.progress.toFixed(1) })}</span>
          {remaining > 0 && (
            <span className="font-medium">{t("savingsChallenges.toGo", { amount: fmt(remaining) })}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="relative mt-4 flex gap-2">
        <Button size="sm" className="flex-1 h-9" onClick={onContribute}>
          <Plus className="h-4 w-4 mr-1.5" /> {t("savingsChallenges.contribute")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
          onClick={onAbandon}
        >
          {t("savingsChallenges.abandon")}
        </Button>
      </div>

      {/* Recent contributions mini-list */}
      {p.recentContributions.length > 0 && (
        <div className="relative mt-4 pt-3 border-t border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            {t("savingsChallenges.recentContributions")}
          </p>
          <div className="max-h-24 overflow-y-auto no-scrollbar space-y-1">
            {p.recentContributions.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <Zap className="h-3 w-3 text-violet-500 shrink-0" />
                <span className="font-medium tabular-nums">+{fmt(c.amount)}</span>
                {c.note && <span className="text-muted-foreground truncate">· {c.note}</span>}
                <span className="ml-auto text-muted-foreground/70">{relativeTime(c.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function BrowseChallengeCard({
  challenge: c, joined, joining, onJoin, t, fmt,
}: {
  challenge: Challenge;
  joined: boolean;
  joining: boolean;
  onJoin: () => void;
  t: (k: string, params?: Record<string, string | number>) => string;
  fmt: (n: number) => string;
}) {
  const gradient = `linear-gradient(135deg, ${c.colorFrom}, ${c.colorTo})`;
  return (
    <Card className="relative overflow-hidden p-5 card-lift h-full flex flex-col">
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-15 blur-2xl"
        style={{ background: gradient }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl shadow-lg"
          style={{ background: gradient }}
        >
          <span>{c.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{c.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("capitalize text-[10px]", DIFFICULTY_STYLE[c.difficulty])}>
              {t(`savingsChallenges.difficulty${c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}`)}
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize">
              {t(`savingsChallenges.category${c.category.charAt(0).toUpperCase() + c.category.slice(1)}`)}
            </Badge>
          </div>
        </div>
      </div>

      <p className="relative mt-3 text-sm text-muted-foreground line-clamp-3 flex-1">{c.description}</p>

      <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">{t("savingsChallenges.target")}</p>
          <p className="font-semibold tabular-nums mt-0.5">
            {c.targetAmount > 0 ? fmt(c.targetAmount) : t("savingsChallenges.behaviorTarget")}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">{t("savingsChallenges.duration")}</p>
          <p className="font-semibold tabular-nums mt-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {c.durationDays} {t("savingsChallenges.days")}
          </p>
        </div>
      </div>

      {/* Badge roadmap */}
      <div className="relative mt-3 flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground/70">{t("savingsChallenges.badges")}:</span>
        <div className="flex items-center gap-1">
          {(["bronze", "silver", "gold", "platinum"] as const).map((b) => {
            const meta = BADGE_META[b];
            const threshold =
              b === "bronze" ? c.badgeBronze :
              b === "silver" ? c.badgeSilver :
              b === "gold" ? c.badgeGold : c.badgePlatinum;
            return (
              <span
                key={b}
                title={`${meta.label} @ ${threshold}%`}
                className="text-sm"
              >
                {meta.emoji}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative mt-4">
        {joined ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="h-4 w-4 mr-1.5" /> {t("savingsChallenges.alreadyJoined")}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={onJoin}
            disabled={joining}
            style={joining ? undefined : { background: gradient }}
          >
            {joining ? (
              <><span className="h-4 w-4 mr-1.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t("savingsChallenges.joining")}</>
            ) : (
              <><Trophy className="h-4 w-4 mr-1.5" /> {t("savingsChallenges.join")}</>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

function ContributeDialog({
  participation: p, onSubmit, t, fmt,
}: {
  participation: Participation;
  onSubmit: (amount: number, note?: string) => void;
  t: (k: string, params?: Record<string, string | number>) => string;
  fmt: (n: number) => string;
}) {
  const c = p.challenge;
  const target = c.targetAmount;
  const remaining = Math.max(0, target - p.currentAmount);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const quickAmounts = useMemo(() => {
    if (target <= 0) return [1000, 5000, 10000];
    const base = Math.max(1000, Math.round(remaining / 10));
    return [base, base * 5, base * 10].filter((x) => x <= target);
  }, [target, remaining]);

  const amt = Number(amount) || 0;
  const newProgress = target > 0 ? Math.min(100, ((p.currentAmount + amt) / target) * 100) : 0;
  const currentProgress = p.progress;
  const wouldUnlockBadge = (
    (currentProgress < c.badgeBronze && newProgress >= c.badgeBronze) ||
    (currentProgress < c.badgeSilver && newProgress >= c.badgeSilver) ||
    (currentProgress < c.badgeGold && newProgress >= c.badgeGold) ||
    (currentProgress < c.badgePlatinum && newProgress >= c.badgePlatinum)
  );

  const gradient = `linear-gradient(135deg, ${c.colorFrom}, ${c.colorTo})`;

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl shadow"
            style={{ background: gradient }}
          >
            <span>{c.icon}</span>
          </div>
          <div>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>{t("savingsChallenges.contributeSubtitle")}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4">
        {/* Current progress snapshot */}
        <div className="rounded-xl border bg-muted/40 p-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-medium">{fmt(p.currentAmount)}</span>
            <span className="text-xs text-muted-foreground">/ {fmt(target)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, currentProgress)}%`, background: gradient }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{currentProgress.toFixed(1)}%</span>
            <span className="flex items-center gap-1 text-amber-600">
              <Flame className="h-3 w-3" /> {p.streak} {t("savingsChallenges.streak")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">{t("savingsChallenges.contributeAmount")}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₦</span>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7"
            />
          </div>
          {quickAmounts.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/70"
                >
                  {fmt(q)}
                </button>
              ))}
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(remaining))}
                  className="rounded-md bg-violet-500/10 px-2 py-1 text-xs text-violet-600 hover:bg-violet-500/20"
                >
                  {t("savingsChallenges.finishIt")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">{t("savingsChallenges.contributeNote")}</Label>
          <Input
            id="note"
            placeholder={t("savingsChallenges.contributeNotePlaceholder")}
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Badge-unlock preview */}
        {amt > 0 && wouldUnlockBadge && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Medal className="h-4 w-4 shrink-0" />
            <span>{t("savingsChallenges.willUnlockBadge")}</span>
          </div>
        )}
        {amt > 0 && target > 0 && p.currentAmount + amt >= target && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0" />
            <span>{t("savingsChallenges.willCompleteChallenge")}</span>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          onClick={() => onSubmit(amt, note.trim() || undefined)}
          disabled={amt <= 0}
          style={amt > 0 ? { background: gradient } : undefined}
        >
          <Plus className="h-4 w-4 mr-1.5" /> {t("savingsChallenges.contributeSubmit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SavingsChallengesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div>
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 w-[320px] shrink-0" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Helpers ---------------------------------------------------------------

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  return `${mo}mo`;
}
