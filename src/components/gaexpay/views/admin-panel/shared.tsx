"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// ---------------- Status helpers ----------------
const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  verified: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  approved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  open: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  unverified: "bg-muted/40 text-muted-foreground border-border",
  under_review: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  in_progress: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  flagged: "bg-orange-500/15 text-orange-600 border-orange-500/20",
  warning: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  suspended: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  frozen: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  closed: "bg-muted/40 text-muted-foreground border-border",
  failed: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  rejected: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  refunded: "bg-violet-500/15 text-violet-600 border-violet-500/20",
  reversed: "bg-violet-500/15 text-violet-600 border-violet-500/20",
  critical: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  info: "bg-sky-500/15 text-sky-600 border-sky-500/20",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cls = STATUS_CLASSES[status?.toLowerCase?.()] || "bg-muted/40 text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", cls, className)}>
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}

export function AccountTypeBadge({ type }: { type: string }) {
  if (type === "business") {
    return <Badge className="bg-violet-500/15 text-violet-600 border-0 text-[10px]">Business</Badge>;
  }
  return <Badge className="bg-sky-500/15 text-sky-600 border-0 text-[10px]">Personal</Badge>;
}

// ---------------- KPI Card ----------------
export function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  color = "bg-primary/15 text-primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}) {
  return (
    <Card className="p-4 card-lift">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
            trendUp ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600",
          )}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

// ---------------- Loading skeletons ----------------
export function LoadingGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

// ---------------- Section header ----------------
export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ---------------- Empty state ----------------
export function EmptyState({ message, icon: Icon }: { message: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground mb-2" />}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------------- Toast helper for fetch with JSON ----------------
export async function apiAction(
  url: string,
  method: "PATCH" | "POST" | "DELETE" = "PATCH",
  body?: unknown,
  successMsg?: string,
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    if (successMsg) {
      const { toast } = await import("sonner");
      toast.success(successMsg);
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export function showError(error: string) {
  import("sonner").then(({ toast }) => toast.error(error));
}

// ---------------- Small color-coded indicator ----------------
export function HealthDot({ status }: { status: "operational" | "degraded" | "down" }) {
  const cls = status === "operational" ? "bg-emerald-500" : status === "degraded" ? "bg-amber-500" : "bg-rose-500";
  return <span className={cn("inline-block h-2 w-2 rounded-full animate-pulse", cls)} />;
}
