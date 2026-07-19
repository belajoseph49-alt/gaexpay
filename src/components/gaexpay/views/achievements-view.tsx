"use client";

import { motion } from "framer-motion";
import {
  Trophy, Lock, Star, Zap, Crown, Award, Target, TrendingUp, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

export function AchievementsView() {
  const { t } = useTranslation();
  const { data } = useFetch<any>("/api/achievements");
  const { setView } = useApp();

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { grouped, unlockedCount, totalCount, completionPct, level, xpInLevel, xpForNextLevel, stats } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("achievements.title")}</h1>
        <p className="text-sm text-muted-foreground">Unlock badges as you use GaexPay</p>
      </div>

      {/* Level & Progress hero */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-20 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Level badge */}
            <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white/20 backdrop-blur">
              <div className="text-center">
                <p className="text-xs text-white/70 uppercase tracking-wider">Level</p>
                <p className="text-4xl font-bold">{level}</p>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-2 -right-2"
              >
                <Crown className="h-6 w-6 text-amber-200" />
              </motion.div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{unlockedCount} / {totalCount} Achievements</h2>
              <p className="text-sm text-white/80">{completionPct.toFixed(0)}% complete · {totalCount - unlockedCount} remaining</p>
              <div className="mt-2 max-w-xs">
                <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                  <span>XP to Level {level + 1}</span>
                  <span>{xpInLevel} / {xpForNextLevel}</span>
                </div>
                <Progress value={(xpInLevel / xpForNextLevel) * 100} className="h-2 bg-white/20" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold tabular-nums">{stats.totalTx}</p>
              <p className="text-xs text-white/70">Transactions</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold tabular-nums">{stats.uniqueCounterparties}</p>
              <p className="text-xs text-white/70">People Paid</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Achievement categories */}
      {grouped.map((cat: any) => (
        <div key={cat.id}>
          <h3 className="font-semibold mb-3">{cat.label}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.achievements.map((a: any, i: number) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn(
                  "relative h-full overflow-hidden p-4 transition card-lift",
                  a.unlocked ? "border-amber-500/30 bg-amber-500/5" : "opacity-70",
                )}>
                  {a.unlocked && (
                    <div className="absolute right-3 top-3">
                      <Badge className="bg-amber-500/15 text-amber-600 border-0">
                        <Check className="h-3 w-3 mr-1" /> Unlocked
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl",
                      a.unlocked ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg" : "bg-muted grayscale",
                    )}>
                      {a.unlocked ? a.icon : "🔒"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                      {!a.unlocked && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{a.current} / {a.target}</span>
                            <span>{a.progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={a.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* CTA */}
      <Card className="flex items-center gap-4 border-primary/30 bg-primary/5 p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Keep going to unlock more!</h3>
          <p className="text-xs text-muted-foreground">
            {totalCount - unlockedCount} achievements remaining. Complete more transactions, save more, and invite friends to level up.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setView("send")}>Send Money</Button>
        <Button size="sm" variant="outline" onClick={() => setView("referral")}>Invite Friends</Button>
      </Card>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
