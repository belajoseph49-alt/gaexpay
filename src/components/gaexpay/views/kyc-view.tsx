"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, CheckCircle2, Clock, XCircle, Upload, FileCheck, IdCard,
  User, MapPin, Camera, ChevronRight, Lock, Zap, Globe, Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { KYC_TIERS, formatDate } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

const DOC_TYPES = [
  { id: "national_id", label: "National ID Card", icon: IdCard },
  { id: "passport", label: "International Passport", icon: IdCard },
  { id: "drivers_license", label: "Driver's License", icon: IdCard },
  { id: "voters_card", label: "Voter's Card", icon: IdCard },
];

export function KycView() {
  const { data, reload } = useFetch<any>("/api/kyc");
  const [submitting, setSubmitting] = useState(false);
  const { fmt, symbol, currency: userCur } = useFormatMoney();

  const status = data?.kycStatus || "verified";
  const tier = data?.kycTier ?? 3;
  const docs = data?.documents ?? [];

  const submitKyc = async (type: string) => {
    setSubmitting(true);
    await fetch("/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, documentNumber: "AUTO-" + Date.now() }),
    });
    setSubmitting(false);
    toast.success("Document submitted for review");
    reload();
  };

  const completion = Math.min(100, tier * 33 + (status === "verified" ? 1 : 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Identity Verification (KYC)</h1>
        <p className="text-sm text-muted-foreground">Verify your identity to unlock higher limits</p>
      </div>

      {/* Status banner */}
      <Card className={cn(
        "relative overflow-hidden border-0 p-6 text-white",
        status === "verified" ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-amber-500 to-orange-600",
      )}>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur">
              {status === "verified" ? <CheckCircle2 className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold capitalize">{status}</h2>
                <Badge className="bg-white/20 text-white border-0">Tier {tier}</Badge>
              </div>
              <p className="text-sm text-white/80">
                {status === "verified"
                  ? "Your identity is fully verified. All features unlocked."
                  : status === "pending"
                  ? "Your documents are under review. This takes 1-2 hours."
                  : "Complete verification to unlock all features."}
              </p>
              {data?.kycVerifiedAt && (
                <p className="text-xs text-white/70 mt-0.5">Verified on {formatDate(data.kycVerifiedAt)}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">Verification Progress</p>
            <p className="text-2xl font-bold">{completion}%</p>
          </div>
        </div>
        <Progress value={completion} className="mt-4 h-1.5 bg-white/20" />
      </Card>

      {/* Tier table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Verification Tiers & Limits</h3>
        <p className="text-xs text-muted-foreground mb-4">Upgrade your tier to access more features</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KYC_TIERS.map((t) => {
            const unlocked = tier >= t.tier;
            const current = tier === t.tier;
            return (
              <div
                key={t.tier}
                className={cn(
                  "rounded-xl border p-4 transition",
                  current ? "border-primary bg-primary/5 ring-2 ring-primary/20" : unlocked ? "border-emerald-500/30 bg-emerald-500/5" : "opacity-60",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {t.tier === 3 ? <Award className="h-4 w-4 text-amber-500" /> : t.tier === 0 ? <Lock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    <span className="font-semibold text-sm">{t.name}</span>
                  </div>
                  {current && <Badge className="text-[10px]">Current</Badge>}
                  {unlocked && !current && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs text-muted-foreground mb-2">Daily limit</p>
                <p className="text-lg font-bold tabular-nums">{symbol}{t.daily.toLocaleString()}</p>
                <div className="mt-3 space-y-1">
                  {t.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Documents */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Submitted Documents</h3>
        <p className="text-xs text-muted-foreground mb-4">Your verification documents</p>
        <div className="space-y-2">
          {docs.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No documents submitted yet
            </div>
          )}
          {docs.map((d: any) => {
            const Icon = DOC_TYPES.find((t) => t.id === d.type)?.icon || FileCheck;
            const sc: Record<string, any> = {
              approved: { color: "text-emerald-600 bg-emerald-500/10", icon: CheckCircle2 },
              pending: { color: "text-amber-600 bg-amber-500/10", icon: Clock },
              rejected: { color: "text-rose-600 bg-rose-500/10", icon: XCircle },
            };
            const s = sc[d.status];
            const SIcon = s.icon;
            return (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{d.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.documentNumber && `#${d.documentNumber} · `}
                    {d.reviewedAt ? `Reviewed ${formatDate(d.reviewedAt)}` : "Awaiting review"}
                  </p>
                </div>
                <Badge className={cn("border-0", s.color)} variant="outline">
                  <SIcon className="h-3 w-3 mr-1" /> {d.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upload new */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Upload Document</h3>
        <p className="text-xs text-muted-foreground mb-4">Choose a document type to verify</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOC_TYPES.map((d) => {
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                onClick={() => submitKyc(d.id)}
                disabled={submitting}
                className="flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground">Front & back + selfie</p>
                </div>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Compliance badges */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "AML Compliant", desc: "Anti-Money Laundering checks" },
          { icon: Lock, title: "PCI-DSS", desc: "Card data security standard" },
          { icon: Globe, title: "ISO 27001", desc: "Information security mgmt" },
        ].map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.title} className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
