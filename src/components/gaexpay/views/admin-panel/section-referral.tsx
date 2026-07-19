"use client";

import { useState, useEffect } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Gift, Users, TrendingUp, Award, Trophy, Save, Crown, Medal,
} from "lucide-react";
import { formatMoney } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, KpiCard, apiAction, showError } from "./shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TopReferrer {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  referralsCount: number;
  earnings: number;
  rewardPoints: number;
}

interface PointsLeader {
  id: string;
  firstName: string;
  lastName: string;
  rewardPoints: number;
  referralCount: number;
}

interface Settings {
  commissionRatePct: number;
  signupBonusAmount: number;
  minPayoutThreshold: number;
  referralRewardPoints: number;
  rewardPointsPerReferral: number;
}

interface ReferralData {
  stats: {
    totalReferrals: number;
    totalPaidOut: number;
    activeReferrers: number;
    conversionRate: number;
    totalUsersWithCodes: number;
  };
  topReferrers: TopReferrer[];
  rewardDistribution: { tier: string; count: number }[];
  pointsLeaders: PointsLeader[];
  settings: Settings;
}

export function ReferralSection() {
  const { data, loading, reload } = useFetch<ReferralData>("/api/admin/referral");

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Referral & Rewards" description="Referral program & reward points" icon={Gift} />
        <LoadingTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Referral & Rewards"
        description="Referral program management, top referrers, reward points leaderboard"
        icon={Gift}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Total Referrals" value={data.stats.totalReferrals} color="bg-pink-500/15 text-pink-500" />
        <KpiCard icon={TrendingUp} label="Total Paid Out" value={formatMoney(data.stats.totalPaidOut, "NGN")} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Award} label="Active Referrers" value={data.stats.activeReferrers} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Gift} label="Conversion Rate" value={`${data.stats.conversionRate}%`} color="bg-sky-500/15 text-sky-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top referrers table */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Top Referrers
            </h3>
            <Badge variant="outline" className="text-[10px]">{data.topReferrers.length} top</Badge>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Referrals</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topReferrers.length === 0 && (
                  <TableRow><TableCell colSpan={6}><EmptyState message="No referrers yet" icon={Users} /></TableCell></TableRow>
                )}
                {data.topReferrers.map((u, i) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className={cn(
                        "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold",
                        i === 0 ? "bg-yellow-500/20 text-yellow-600" : i === 1 ? "bg-muted-foreground/20 text-muted-foreground" : i === 2 ? "bg-orange-500/20 text-orange-600" : "bg-muted text-muted-foreground",
                      )}>
                        {i === 0 ? <Crown className="h-3 w-3" /> : i === 1 ? <Medal className="h-3 w-3" /> : i === 2 ? <Medal className="h-3 w-3" /> : i + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-pink-500/15 text-pink-600">
                            {u.name?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{u.referralCode || "—"}</TableCell>
                    <TableCell className="text-center text-sm font-semibold">{u.referralsCount}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatMoney(u.earnings, "NGN")}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{u.rewardPoints}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Reward tier distribution */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-violet-600" /> Reward Tier Distribution
          </h3>
          <div className="space-y-2">
            {data.rewardDistribution.map((t) => {
              const max = Math.max(...data.rewardDistribution.map((x) => x.count), 1);
              const pct = (t.count / max) * 100;
              return (
                <div key={t.tier}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{t.tier}</span>
                    <span className="text-muted-foreground">{t.count} users</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        t.tier === "Bronze" ? "bg-orange-500" :
                        t.tier === "Silver" ? "bg-slate-400" :
                        t.tier === "Gold" ? "bg-yellow-500" :
                        "bg-gradient-to-r from-violet-500 to-pink-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Settings */}
        <div className="lg:col-span-2">
          <SettingsCard settings={data.settings} onSaved={() => reload()} />
        </div>

        {/* Points leaderboard */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" /> Points Leaderboard
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {data.pointsLeaders.length === 0 && <EmptyState message="No points yet" icon={Award} />}
            {data.pointsLeaders.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border p-2">
                <div className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  i === 0 ? "bg-yellow-500/20 text-yellow-600" : i === 1 ? "bg-slate-400/20 text-slate-500" : i === 2 ? "bg-orange-500/20 text-orange-600" : "bg-muted text-muted-foreground",
                )}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground">{u.referralCount} referrals</p>
                </div>
                <Badge className="bg-yellow-500/15 text-yellow-600 border-0 text-[10px]">
                  {u.rewardPoints} pts
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsCard({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [commissionRate, setCommissionRate] = useState(String(settings.commissionRatePct));
  const [signupBonus, setSignupBonus] = useState(String(settings.signupBonusAmount));
  const [minPayout, setMinPayout] = useState(String(settings.minPayoutThreshold));
  const [rewardPoints, setRewardPoints] = useState(String(settings.referralRewardPoints));
  const [pointsPerReferral, setPointsPerReferral] = useState(String(settings.rewardPointsPerReferral));
  const [saving, setSaving] = useState(false);

  // Sync if settings change after reload
  useEffect(() => {
    setCommissionRate(String(settings.commissionRatePct));
    setSignupBonus(String(settings.signupBonusAmount));
    setMinPayout(String(settings.minPayoutThreshold));
    setRewardPoints(String(settings.referralRewardPoints));
    setPointsPerReferral(String(settings.rewardPointsPerReferral));
  }, [settings]);

  async function save() {
    setSaving(true);
    const r = await apiAction(`/api/admin/referral`, "PATCH", {
      commissionRatePct: Number(commissionRate),
      signupBonusAmount: Number(signupBonus),
      minPayoutThreshold: Number(minPayout),
      referralRewardPoints: Number(rewardPoints),
      rewardPointsPerReferral: Number(pointsPerReferral),
    }, "Referral settings updated");
    setSaving(false);
    if (!r.ok) return showError(r.error || "Failed to update settings");
    toast.success("Referral program settings saved");
    onSaved();
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4 text-pink-600" /> Program Settings
        </h3>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Commission rate (%)</Label>
          <Input type="number" step="0.1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-0.5">Referrer earns this % of referral&apos;s fees</p>
        </div>
        <div>
          <Label>Sign-up bonus (NGN)</Label>
          <Input type="number" value={signupBonus} onChange={(e) => setSignupBonus(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-0.5">Credited on referee&apos;s first transaction</p>
        </div>
        <div>
          <Label>Min payout threshold (NGN)</Label>
          <Input type="number" value={minPayout} onChange={(e) => setMinPayout(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-0.5">Minimum balance before payout</p>
        </div>
        <div>
          <Label>Achievement reward points</Label>
          <Input type="number" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-0.5">Points awarded for referral achievements</p>
        </div>
        <div className="col-span-2">
          <Label>Points per referral</Label>
          <Input type="number" value={pointsPerReferral} onChange={(e) => setPointsPerReferral(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-0.5">Reward points granted to referrer per successful referral</p>
        </div>
      </div>
    </Card>
  );
}
