"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Gift, Copy, Share2, Check, Users, TrendingUp, Award, ChevronRight,
  Twitter, Facebook, Mail, MessageCircle, Trophy, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

export function ReferralView() {
  const { data } = useFetch<any>("/api/referral");
  const [copied, setCopied] = useState(false);
  const { fmt, symbol, currency: userCur } = useFormatMoney();

  const code = data?.referralCode || "GXP-ADAEZE";
  const count = data?.referralCount ?? 14;
  const earnings = data?.referralEarnings ?? 12500;
  const points = data?.rewardPoints ?? 2840;
  const referred = data?.referred ?? [];
  const tiers = data?.tiers ?? [];

  const link = `https://gaexpay.com/r/${code}`;
  const currentTier = [...tiers].reverse().find((t: any) => count >= t.min) || tiers[0];
  const nextTier = tiers.find((t: any) => count < t.min);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral & Rewards</h1>
        <p className="text-sm text-muted-foreground">Invite friends, earn rewards & climb the tiers</p>
      </div>

      {/* Hero referral card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-fuchsia-600 via-rose-600 to-orange-500 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-20 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-5 w-5" />
            <span className="text-sm font-medium text-white/90">Earn ₦500 per friend</span>
          </div>
          <h2 className="text-2xl font-bold">Invite friends to GaexPay</h2>
          <p className="mt-1 text-sm text-white/80">You both get ₦500 when they complete their first transaction.</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
              <span className="font-mono text-sm font-semibold">{link}</span>
            </div>
            <Button variant="secondary" className="bg-white text-rose-600 hover:bg-white/90" onClick={() => copy(link)}>
              {copied ? <><Check className="h-4 w-4 mr-1.5" /> Copied</> : <><Copy className="h-4 w-4 mr-1.5" /> Copy</>}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30">
              <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30">
              <Twitter className="h-4 w-4 mr-1.5" /> Twitter
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30">
              <Mail className="h-4 w-4 mr-1.5" /> Email
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30">
              <Share2 className="h-4 w-4 mr-1.5" /> More
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Friends Invited" value={String(count)} color="bg-sky-500/15 text-sky-500" trend="+3 this week" />
        <StatCard icon={TrendingUp} label="Total Earnings" value={fmt(earnings)} color="bg-emerald-500/15 text-emerald-500" trend="+₦2,500 this week" />
        <StatCard icon={Sparkles} label="Reward Points" value={points.toLocaleString()} color="bg-amber-500/15 text-amber-500" trend="240 pts to next reward" />
      </div>

      {/* Tier progress */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Your Tier</h3>
            <p className="text-xs text-muted-foreground">Climb tiers for bigger rewards</p>
          </div>
          {currentTier && (
            <Badge className="bg-amber-500/15 text-amber-600 border-0">
              <Trophy className="h-3.5 w-3.5 mr-1" /> {currentTier.name}
            </Badge>
          )}
        </div>
        {nextTier && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{count} / {nextTier.min} referrals to {nextTier.name}</span>
              <span className="font-medium">{Math.min(100, (count / nextTier.min) * 100).toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(100, (count / nextTier.min) * 100)} className="h-2" />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          {tiers.map((t: any, i: number) => {
            const unlocked = count >= t.min;
            const current = currentTier?.name === t.name;
            return (
              <div key={t.name} className={cn(
                "rounded-xl border p-3 text-center transition",
                current ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20" : unlocked ? "border-emerald-500/30 bg-emerald-500/5" : "opacity-60",
              )}>
                <div className={cn("mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-full", unlocked ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground")}>
                  <Award className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.reward}</p>
                {unlocked && <Check className="mx-auto mt-1 h-3 w-3 text-emerald-500" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Referred friends */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Referred Friends</h3>
        <div className="space-y-1">
          {referred.map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {f.firstName[0]}{f.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{f.firstName} {f.lastName}</p>
                <p className="text-xs text-muted-foreground">Joined {timeAgo(f.createdAt)}</p>
              </div>
              <Badge variant="outline" className={cn("text-[10px]", f.status === "active" ? "text-emerald-600" : "text-amber-600")}>
                {f.status}
              </Badge>
              <span className="text-xs font-medium text-emerald-600">+₦500</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Rewards catalog */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Redeem Rewards</h3>
        <p className="text-xs text-muted-foreground mb-4">Use your {points.toLocaleString()} points</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "₦1,000 Cash", points: 1000, icon: "💵" },
            { name: "Free Transfer Month", points: 500, icon: "🚀" },
            { name: "Netflix Subscription", points: 2500, icon: "🎬" },
            { name: "Airtime ₦2,000", points: 1800, icon: "📱" },
            { name: "GaexPay Merch Tee", points: 3000, icon: "👕" },
            { name: "VIP Support Access", points: 4000, icon: "⭐" },
          ].map((r) => {
            const canRedeem = points >= r.points;
            return (
              <div key={r.name} className={cn("rounded-xl border p-4 transition", canRedeem ? "hover:border-primary/40 hover:bg-muted/30" : "opacity-60")}>
                <div className="mb-2 text-3xl">{r.icon}</div>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.points.toLocaleString()} points</p>
                <Button size="sm" className="mt-3 w-full" variant={canRedeem ? "default" : "outline"} disabled={!canRedeem}>
                  {canRedeem ? "Redeem" : "Not enough"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, trend }: any) {
  return (
    <Card className="p-5 card-lift">
      <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-emerald-600">{trend}</p>
    </Card>
  );
}
