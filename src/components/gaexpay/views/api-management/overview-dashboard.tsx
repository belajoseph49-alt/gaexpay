"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, CheckCircle2, Pause, Play, Pencil,
  FileText, Star, ArrowUpRight, ArrowDownRight, Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  SERVICE_META, SERVICES, getServiceMeta, getHealth, HEALTH_META,
  type ApiConfig,
} from "./data";

const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
};
const timeAgo = (d: string | Date | null) => {
  if (!d) return "never";
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 0) return "just now";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

interface Props {
  configs: ApiConfig[];
  loading: boolean;
  onTest: (c: ApiConfig) => void;
  onEdit: (c: ApiConfig) => void;
  onToggle: (c: ApiConfig, enabled: boolean) => void;
  onSetDefault: (c: ApiConfig) => void;
  onShowLogs: (c: ApiConfig) => void;
}

export function OverviewDashboard({
  configs, loading, onTest, onEdit, onToggle, onSetDefault, onShowLogs,
}: Props) {
  // Group by service
  const grouped = useMemo(() => {
    const map: Record<string, ApiConfig[]> = {};
    for (const c of configs) {
      if (!map[c.service]) map[c.service] = [];
      map[c.service].push(c);
    }
    return map;
  }, [configs]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map((s) => <Skeleton key={s} className="h-72" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service category cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map((serviceKey, idx) => {
          const meta = getServiceMeta(serviceKey);
          const list = grouped[serviceKey] || [];
          const enabled = list.filter(c => c.enabled);
          const totalReq = list.reduce((s, c) => s + c.totalRequests, 0);
          const failedReq = list.reduce((s, c) => s + c.failedRequests, 0);
          const hasActiveError = list.some(c => c.enabled && getHealth(c) === "error");
          const hasWarning = list.some(c => c.enabled && getHealth(c) === "warning");

          const Icon = meta.icon;

          return (
            <motion.div
              key={serviceKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.25 }}
            >
              <Card className="overflow-hidden card-lift">
                {/* Header strip */}
                <div className="flex items-start justify-between border-b bg-muted/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1 ring-border", meta.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold">{meta.label}</h3>
                        {hasActiveError ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> error
                          </span>
                        ) : hasWarning ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> warn
                          </span>
                        ) : enabled.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                            <Pause className="h-2.5 w-2.5" /> idle
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">APIs</p>
                    <p className="text-lg font-bold tabular-nums">
                      {enabled.length}<span className="text-xs font-normal text-muted-foreground">/{list.length}</span>
                    </p>
                  </div>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 divide-x border-b bg-muted/10">
                  <div className="px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Requests</p>
                    <p className="text-sm font-semibold tabular-nums">{fmtCompact(totalReq)}</p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Errors</p>
                    <p className={cn("text-sm font-semibold tabular-nums", failedReq > 0 ? "text-rose-600" : "text-muted-foreground")}>
                      {fmtCompact(failedReq)}
                    </p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Err Rate</p>
                    <p className={cn("text-sm font-semibold tabular-nums",
                      totalReq > 0 && failedReq / totalReq > 0.05 ? "text-rose-600"
                      : totalReq > 0 && failedReq / totalReq > 0.01 ? "text-amber-600"
                      : "text-violet-600")}>
                      {totalReq > 0 ? `${(failedReq / totalReq * 100).toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>

                {/* API entries */}
                <div className="max-h-56 overflow-y-auto p-2">
                  {list.length === 0 ? (
                    <div className="px-2 py-6 text-center">
                      <p className="text-xs text-muted-foreground">No APIs configured for this category</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {list.map((c) => {
                        const health = getHealth(c);
                        const hm = HEALTH_META[health];
                        return (
                          <div
                            key={c.id}
                            className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors"
                          >
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", hm.dot)} />
                            <button
                              onClick={() => onEdit(c)}
                              className="flex-1 min-w-0 text-left"
                              title="Edit"
                            >
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-medium truncate">{c.name}</p>
                                {c.isDefault && (
                                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {c.provider || "—"} • {c.environment} • used {timeAgo(c.lastUsedAt)}
                              </p>
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => onTest(c)}
                              title="Test connection"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => onShowLogs(c)}
                              title="View logs"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onEdit({ ...({} as ApiConfig), service: serviceKey } as ApiConfig)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Configure
                  </Button>
                  <span className="text-[10px] text-muted-foreground">{enabled.length} active</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
