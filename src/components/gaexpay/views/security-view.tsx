"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Fingerprint, KeyRound,
  AlertTriangle, CheckCircle2, XCircle, Smartphone, Monitor, Tablet,
  Laptop, Globe, Clock, Activity,
  RefreshCw, Trash2, Sparkles, FileLock2, BadgeCheck,
  ScanFace, UserCheck, Wifi, MapPin, Server, Bot, Lightbulb, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { timeAgo, formatDateTime, formatMoney } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

type SecurityOverview = {
  user: { firstName: string; lastName: string; email: string };
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    label: string;
    points: number;
    max: number;
    status: "pass" | "warn" | "fail";
  }[];
  encryption: {
    algorithm: string;
    transport: string;
    endToEnd: boolean;
    keyRotation: string;
    lastKeyRotation: string;
    cardData: string;
    secretsVault: string;
    quantumResistant: boolean;
  };
  compliance: {
    pciDss: { status: string; level: string; lastAudit: string };
    aml: { status: string; framework: string; lastCheck: string };
    gdpr: { status: string; framework: string };
    iso27001: { status: string; framework: string };
    soc2: { status: string; type: string };
  };
  mfaEnabled: boolean;
  biometricEnabled: boolean;
  twoFactorMethod: string | null;
  kycTier: number;
  kycStatus: string;
  lastLoginAt: string | null;
  lastPasswordChange: string;
  passwordAgeDays: number;
  devices: {
    total: number;
    active: number;
    trusted: number;
    list: any[];
  };
  blockedLoginAttempts: number;
  fraudAlerts: {
    total: number;
    recent: number;
    list: any[];
  };
  securityEvents: any[];
  recommendations: {
    id: string;
    title: string;
    desc: string;
    severity: "high" | "medium" | "low";
    icon: string;
  }[];
};

function gradeColor(grade: string) {
  switch (grade) {
    case "A": return { ring: "#10b981", text: "text-emerald-500", glow: "shadow-emerald-500/30", bg: "from-emerald-500 to-teal-600" };
    case "B": return { ring: "#14b8a6", text: "text-teal-500", glow: "shadow-teal-500/30", bg: "from-teal-500 to-cyan-600" };
    case "C": return { ring: "#f59e0b", text: "text-amber-500", glow: "shadow-amber-500/30", bg: "from-amber-500 to-orange-600" };
    case "D": return { ring: "#f97316", text: "text-orange-500", glow: "shadow-orange-500/30", bg: "from-orange-500 to-rose-600" };
    default: return { ring: "#f43f5e", text: "text-rose-500", glow: "shadow-rose-500/30", bg: "from-rose-500 to-red-700" };
  }
}

function CircularGauge({ value, grade }: { value: number; grade: string }) {
  const size = 220;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = gradeColor(grade);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.ring} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color.ring} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-accent"
          opacity={0.25}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          filter="url(#glow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-7xl font-black", color.text)}>
          {grade}
        </span>
        <AnimatedNumber
          value={value}
          className="text-3xl font-bold tabular-nums"
          suffix="/100"
        />
        <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          Security Score
        </span>
      </div>
    </div>
  );
}

function DeviceIcon({ type }: { type: string }) {
  const Icon = type === "mobile" ? Smartphone : type === "desktop" ? Laptop : type === "tablet" ? Tablet : Monitor;
  return <Icon className="h-5 w-5" />;
}

function EventIcon({ action }: { action: string }) {
  const act = action || "";
  if (act.includes("login") || act.includes("logout")) return { icon: UserCheck, color: "text-sky-500 bg-sky-500/10" };
  if (act.includes("password")) return { icon: KeyRound, color: "text-violet-500 bg-violet-500/10" };
  if (act.includes("mfa")) return { icon: Shield, color: "text-emerald-500 bg-emerald-500/10" };
  if (act.includes("suspicious") || act.includes("blocked")) return { icon: AlertTriangle, color: "text-rose-500 bg-rose-500/10" };
  if (act.includes("biometric")) return { icon: Fingerprint, color: "text-amber-500 bg-amber-500/10" };
  if (act.includes("device")) return { icon: Monitor, color: "text-teal-500 bg-teal-500/10" };
  return { icon: Activity, color: "text-muted-foreground bg-accent" };
}

function RecIcon({ name }: { name: string }) {
  const map: Record<string, any> = {
    KeyRound, Fingerprint, Lock, ShieldCheck, Monitor, AlertTriangle, CheckCircle2,
  };
  const Icon = map[name] || Lightbulb;
  return <Icon className="h-4 w-4" />;
}

const FEATURES = [
  { key: "encryption", icon: FileLock2, title: "End-to-End Encryption", subtitle: "AES-256-GCM" },
  { key: "mfa", icon: KeyRound, title: "Two-Factor Authentication", subtitle: "TOTP / SMS / Email" },
  { key: "biometric", icon: Fingerprint, title: "Biometric Login", subtitle: "Face ID / Touch ID" },
  { key: "pci", icon: BadgeCheck, title: "PCI-DSS Compliance", subtitle: "Level 1 Service Provider" },
  { key: "aml", icon: ShieldCheck, title: "AML Compliance", subtitle: "FATF / NFIU Framework" },
  { key: "fraud", icon: Bot, title: "AI Fraud Detection", subtitle: "Real-time risk scoring" },
];

export function SecurityView() {
  const { t } = useTranslation();
  const { data, loading, reload } = useFetch<SecurityOverview>("/api/security/overview");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (deviceId: string, name: string) => {
    setRevokingId(deviceId);
    try {
      const res = await fetch(`/api/devices?id=${deviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success(`Revoked session for ${name}`);
      reload();
    } catch {
      toast.error("Failed to revoke device");
    } finally {
      setRevokingId(null);
    }
  };

  if (loading || !data) return <SecuritySkeleton />;

  const color = gradeColor(data.grade);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("security.title")}</h1>
              <p className="text-sm text-muted-foreground">
                Monitor your account protection, devices & compliance
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => reload()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Hero — Security Score + Encryption summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className={cn(
          "relative overflow-hidden border-0 p-6 text-white shadow-xl",
          "bg-gradient-to-br",
          color.bg,
          color.glow,
        )}>
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
          <div className="relative grid gap-6 lg:grid-cols-[auto_1fr]">
            {/* Gauge */}
            <div className="flex justify-center lg:justify-start">
              <div className="rounded-3xl bg-black/15 p-4 backdrop-blur-sm">
                <CircularGauge value={data.score} grade={data.grade} />
              </div>
            </div>
            {/* Summary */}
            <div className="flex flex-col justify-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  <h2 className="text-xl font-bold">
                    {data.grade === "A" || data.grade === "B"
                      ? "Excellent protection"
                      : data.grade === "C"
                      ? "Good, with room to improve"
                      : data.grade === "D"
                      ? "Needs attention"
                      : "Action required"}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-white/85 max-w-md">
                  Your account scored <strong>{data.score}/100</strong> (Grade {data.grade}).{
                    data.recommendations.length > 0
                      ? ` ${data.recommendations.length} recommendation${data.recommendations.length > 1 ? "s" : ""} below.`
                      : " Keep up the great security hygiene!"
                  }
                </p>
              </div>

              {/* Encryption pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Lock, label: data.encryption.algorithm },
                  { icon: Globe, label: data.encryption.transport },
                  { icon: Server, label: "End-to-End" },
                  { icon: RefreshCw, label: `Keys rotate / ${data.encryption.keyRotation}` },
                ].map((p) => {
                  const Icon = p.icon;
                  return (
                    <span
                      key={p.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur"
                    >
                      <Icon className="h-3 w-3" /> {p.label}
                    </span>
                  );
                })}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill label="Active Devices" value={data.devices.active} icon={Monitor} />
                <StatPill label="Blocked Logins" value={data.blockedLoginAttempts} icon={ShieldAlert} />
                <StatPill label="Fraud Alerts" value={data.fraudAlerts.recent} icon={AlertTriangle} />
                <StatPill label="KYC Tier" value={data.kycTier} icon={BadgeCheck} />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Security Score Breakdown */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Score Breakdown</h3>
            <p className="text-xs text-muted-foreground">How your security score is calculated</p>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.breakdown.map((b, i) => {
            const pct = (b.points / b.max) * 100;
            const sc =
              b.status === "pass"
                ? "text-emerald-600 bg-emerald-500/10"
                : b.status === "warn"
                ? "text-amber-600 bg-amber-500/10"
                : "text-rose-600 bg-rose-500/10";
            return (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{b.label}</span>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", sc)}>
                    {b.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{b.points} / {b.max} pts</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Security Features Grid */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Protection Layers
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            let active = false;
            let statusLabel = "";
            let statusColor = "";
            if (f.key === "encryption") {
              active = true;
              statusLabel = "Active";
              statusColor = "bg-emerald-500/15 text-emerald-600";
            } else if (f.key === "mfa") {
              active = data.mfaEnabled;
              statusLabel = active ? "Enabled" : "Disabled";
              statusColor = active ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600";
            } else if (f.key === "biometric") {
              active = data.biometricEnabled;
              statusLabel = active ? "Enabled" : "Disabled";
              statusColor = active ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600";
            } else if (f.key === "pci") {
              active = data.compliance.pciDss.status === "verified";
              statusLabel = active ? "Verified" : "Pending";
              statusColor = active ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600";
            } else if (f.key === "aml") {
              active = data.compliance.aml.status === "compliant";
              statusLabel = active ? "Compliant" : "Pending";
              statusColor = active ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600";
            } else if (f.key === "fraud") {
              active = true;
              statusLabel = "AI Active";
              statusColor = "bg-emerald-500/15 text-emerald-600";
            }
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group relative h-full overflow-hidden p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-2.5">
                    <div className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl",
                      active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge className={cn("border-0 text-[10px] font-semibold", statusColor)}>
                      {active ? <CheckCircle2 className="h-3 w-3 mr-0.5" /> : <XCircle className="h-3 w-3 mr-0.5" />}
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.subtitle}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Two-column: Devices + Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Devices */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Active Devices</h3>
              <p className="text-xs text-muted-foreground">
                {data.devices.active} active · {data.devices.trusted} trusted · {data.devices.total} total
              </p>
            </div>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {data.devices.list.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No devices registered
              </div>
            )}
            <AnimatePresence>
              {data.devices.list.map((d) => (
                <motion.div
                  key={d.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition",
                    d.trusted ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-amber-500/20 bg-amber-500/[0.03]",
                  )}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <DeviceIcon type={d.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      {d.trusted && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.os || "Unknown OS"} · {d.browser || "Unknown"}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{d.location || "Unknown"}</span>
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{timeAgo(d.lastActive)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revokingId === d.id}
                    onClick={() => handleRevoke(d.id, d.name)}
                    className="h-8 shrink-0 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                  >
                    {revokingId === d.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                      </>
                    )}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>

        {/* Recent Security Events */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Security Activity</h3>
              <p className="text-xs text-muted-foreground">Recent login & security events</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="relative max-h-[420px] overflow-y-auto pr-1">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-accent" />
            <div className="space-y-3">
              {data.securityEvents.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No security events yet
                </div>
              )}
              {data.securityEvents.map((e, i) => {
                const { icon: Icon, color: icColor } = EventIcon(e.action);
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative flex items-start gap-3"
                  >
                    <div className={cn("relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ring-background", icColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium capitalize">
                        {e.action.replace(/_/g, " ")}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="capitalize">{e.actor}</span>
                        {e.ip && <span>· {e.ip}</span>}
                        {e.userAgent && <span className="truncate">· {e.userAgent}</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(e.createdAt)} · {formatDateTime(e.createdAt)}</p>
                    </div>
                    {e.severity === "critical" && (
                      <Badge className="bg-rose-500/15 text-rose-600 border-0 text-[10px]">Critical</Badge>
                    )}
                    {e.severity === "warning" && (
                      <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">Warning</Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Fraud Alerts + Recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fraud Alerts */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Fraud Alerts</h3>
              <p className="text-xs text-muted-foreground">
                {data.fraudAlerts.total} flagged · {data.fraudAlerts.recent} in last 30d
              </p>
            </div>
            <AlertTriangle className={cn("h-4 w-4", data.fraudAlerts.recent > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {data.fraudAlerts.list.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">No fraud alerts</p>
                <p className="text-xs text-muted-foreground mt-0.5">All your transactions look clean</p>
              </div>
            )}
            {data.fraudAlerts.list.map((t, i) => {
              const risk = Math.min(100, Math.round((t.riskScore || 0) * 100));
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.counterpartyName || "Unknown"} · {t.reference}
                      </p>
                    </div>
                    <Badge className="bg-rose-500/15 text-rose-600 border-0 text-[10px] shrink-0">
                      {t.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(t.amount, t.currency)}
                    </span>
                    <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Risk</span>
                      <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            risk >= 80 ? "bg-rose-500" : risk >= 60 ? "bg-amber-500" : "bg-emerald-500",
                          )}
                          style={{ width: `${risk}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums">
                        {risk}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{timeAgo(t.createdAt)}</p>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Security Recommendations */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Recommendations</h3>
              <p className="text-xs text-muted-foreground">Actionable tips to improve your security</p>
            </div>
            <Lightbulb className="h-4 w-4 text-amber-500" />
          </div>
          <div className="space-y-2.5">
            {data.recommendations.map((r, i) => {
              const sc =
                r.severity === "high"
                  ? "border-rose-500/30 bg-rose-500/[0.04]"
                  : r.severity === "medium"
                  ? "border-amber-500/30 bg-amber-500/[0.04]"
                  : "border-emerald-500/30 bg-emerald-500/[0.04]";
              const icColor =
                r.severity === "high"
                  ? "bg-rose-500/10 text-rose-500"
                  : r.severity === "medium"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-500";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn("rounded-xl border p-3.5", sc)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", icColor)}>
                      <RecIcon name={r.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{r.title}</p>
                        {r.severity !== "low" && (
                          <Badge className={cn("border-0 text-[10px] capitalize",
                            r.severity === "high" ? "bg-rose-500/15 text-rose-600" : "bg-amber-500/15 text-amber-600")}>
                            {r.severity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                      {r.severity !== "low" && (
                        <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                          Take action <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Account security meta */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard
          icon={Clock}
          label="Last Login"
          value={data.lastLoginAt ? timeAgo(data.lastLoginAt) : "Never"}
          sub={data.lastLoginAt ? formatDateTime(data.lastLoginAt) : "—"}
        />
        <MetaCard
          icon={KeyRound}
          label="Password Age"
          value={`${data.passwordAgeDays} days`}
          sub={`Changed ${timeAgo(data.lastPasswordChange)}`}
          tone={data.passwordAgeDays > 90 ? "warn" : "ok"}
        />
        <MetaCard
          icon={ScanFace}
          label="2FA Method"
          value={data.mfaEnabled ? (data.twoFactorMethod || "Authenticator") : "Disabled"}
          sub={data.mfaEnabled ? "Active" : "Not enabled"}
          tone={data.mfaEnabled ? "ok" : "warn"}
        />
        <MetaCard
          icon={Wifi}
          label="Encrypted Channel"
          value={data.encryption.transport}
          sub={data.encryption.algorithm}
          tone="ok"
        />
      </div>

      {/* Compliance footer */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Certifications & Compliance</h3>
            <p className="text-xs text-muted-foreground">GaexPay is independently audited & certified</p>
          </div>
          <BadgeCheck className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { name: "PCI-DSS", detail: `${data.compliance.pciDss.level}`, sub: `Audited ${data.compliance.pciDss.lastAudit}`, icon: Lock },
            { name: "AML", detail: data.compliance.aml.status, sub: data.compliance.aml.framework, icon: ShieldCheck },
            { name: "GDPR", detail: data.compliance.gdpr.status, sub: data.compliance.gdpr.framework, icon: FileLock2 },
            { name: "ISO 27001", detail: data.compliance.iso27001.status, sub: data.compliance.iso27001.framework, icon: Globe },
            { name: "SOC 2", detail: data.compliance.soc2.type, sub: "Type II audit", icon: Server },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.name} className="rounded-xl border p-3.5 text-center">
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] capitalize text-emerald-600 font-medium">{c.detail}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{c.sub}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatPill({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

function MetaCard({
  icon: Icon, label, value, sub, tone = "default",
}: {
  icon: any; label: string; value: string; sub: string; tone?: "default" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok" ? "bg-emerald-500/10 text-emerald-500"
    : tone === "warn" ? "bg-amber-500/10 text-amber-500"
    : "bg-primary/10 text-primary";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("grid h-8 w-8 place-items-center rounded-lg", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-base font-semibold truncate">{value}</p>
      <p className="text-xs text-muted-foreground truncate">{sub}</p>
    </Card>
  );
}

function SecuritySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <Card className="relative overflow-hidden border-0 p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Skeleton className="h-[220px] w-[220px] rounded-3xl bg-white/15" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-56 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/20" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-24 rounded-full bg-white/20" />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl bg-white/15" />
              ))}
            </div>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
