"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Trash2, Download, Loader2, ChevronRight, ChevronDown,
  FileText, Filter, AlertTriangle, Info, AlertOctagon,
  CheckCircle2, XCircle, Clock, Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFetch } from "@/hooks/use-fetch";
import { getServiceMeta, type ApiConfig, type ApiLog } from "./data";

interface Props {
  configs: ApiConfig[];
  initialConfigId: string | null;
}

const LEVEL_META: Record<string, { label: string; icon: any; color: string; dot: string }> = {
  info:  { label: "Info",    icon: Info,           color: "bg-sky-500/15 text-sky-600 border-sky-500/30",       dot: "bg-sky-500" },
  warn:  { label: "Warning", icon: AlertTriangle,  color: "bg-amber-500/15 text-amber-600 border-amber-500/30", dot: "bg-amber-500" },
  error: { label: "Error",   icon: AlertOctagon,   color: "bg-rose-500/15 text-rose-600 border-rose-500/30",   dot: "bg-rose-500" },
};

const fmtDateTime = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

export function LogsViewer({ configs, initialConfigId }: Props) {
  const [selectedId, setSelectedId] = useState<string>(initialConfigId || configs[0]?.id || "");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [daysFilter, setDaysFilter] = useState<string>("30");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Keep selection in sync if configs change or initialConfigId arrives
  useEffect(() => {
    if (initialConfigId && initialConfigId !== selectedId) {
      setSelectedId(initialConfigId);
    } else if (!selectedId && configs[0]) {
      setSelectedId(configs[0].id);
    }
  }, [initialConfigId, configs, selectedId]);

  const logsUrl = selectedId
    ? `/api/admin/api-configs/${selectedId}/logs?level=${levelFilter !== "all" ? levelFilter : ""}&days=${daysFilter}&limit=500`
    : null;
  const { data, loading, reload } = useFetch<{ config: { id: string; name: string; service: string }; logs: ApiLog[] }>(logsUrl);

  const selectedConfig = configs.find(c => c.id === selectedId);

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    if (!search.trim()) return data.logs;
    const q = search.toLowerCase();
    return data.logs.filter(l =>
      l.message.toLowerCase().includes(q) ||
      (l.endpoint || "").toLowerCase().includes(q) ||
      String(l.statusCode || "").includes(q),
    );
  }, [data, search]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClear = async () => {
    if (!selectedId) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/admin/api-configs/${selectedId}/logs`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      toast.success(`Cleared ${json.deleted} log entries`);
      setClearOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear logs");
    } finally {
      setClearing(false);
    }
  };

  const handleExportCsv = () => {
    if (!filteredLogs.length) {
      toast.error("No logs to export");
      return;
    }
    const headers = ["Timestamp", "Level", "Message", "Endpoint", "Status Code", "Response Time (ms)", "Request Body", "Response Body"];
    const rows = filteredLogs.map(l => [
      l.createdAt,
      l.level,
      l.message.replace(/"/g, '""'),
      (l.endpoint || "").replace(/"/g, '""'),
      String(l.statusCode ?? ""),
      String(l.responseTimeMs ?? ""),
      (l.requestBody || "").replace(/"/g, '""').slice(0, 1000),
      (l.responseBody || "").replace(/"/g, '""').slice(0, 4000),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-${selectedConfig?.name || selectedId}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} log entries`);
  };

  return (
    <div className="space-y-4">
      {/* Config selector + actions */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an API configuration..." />
              </SelectTrigger>
              <SelectContent>
                {configs.map(c => {
                  const m = getServiceMeta(c.service);
                  const Icon = m.icon;
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {c.name}
                        <span className="text-xs text-muted-foreground">({m.label})</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={daysFilter} onValueChange={setDaysFilter}>
            <SelectTrigger className="w-[120px]">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24h</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!filteredLogs.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={reload}>
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
            onClick={() => setClearOpen(true)}
            disabled={!selectedId}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear
          </Button>
        </div>
        {selectedConfig && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            Viewing logs for <span className="font-medium text-foreground">{selectedConfig.name}</span>
            {" "}— {data?.logs.length || 0} entries
          </div>
        )}
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search logs by message, endpoint, or status code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Logs list */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : !filteredLogs.length ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium">No logs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedId
                ? "Try adjusting filters or run a Test connection to generate log entries."
                : "Select an API configuration to view its logs."}
            </p>
          </div>
        ) : (
          <div className="divide-y max-h-[600px] overflow-y-auto">
            <AnimatePresence>
              {filteredLogs.map((log, idx) => {
                const lm = LEVEL_META[log.level] || LEVEL_META.info;
                const Icon = lm.icon;
                const isExpanded = expanded.has(log.id);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.01, 0.2) }}
                    className="group"
                  >
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", lm.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] h-5 border", lm.color)}>
                            <Icon className="h-2.5 w-2.5 mr-1" />
                            {lm.label}
                          </Badge>
                          {log.statusCode != null && (
                            <Badge variant="outline" className={cn("text-[10px] h-5",
                              log.statusCode >= 200 && log.statusCode < 300 ? "text-emerald-600 border-emerald-500/30"
                              : log.statusCode >= 400 && log.statusCode < 500 ? "text-amber-600 border-amber-500/30"
                              : log.statusCode >= 500 ? "text-rose-600 border-rose-500/30"
                              : "text-muted-foreground")}>
                              {log.statusCode}
                            </Badge>
                          )}
                          {log.responseTimeMs != null && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {log.responseTimeMs}ms
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDateTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13px] mt-1 line-clamp-2">{log.message}</p>
                        {log.endpoint && (
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                            {log.endpoint}
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden border-t bg-muted/10"
                        >
                          <div className="p-4 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Endpoint</p>
                                <p className="text-xs font-mono break-all">{log.endpoint || "—"}</p>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                                  <p className="text-xs font-semibold tabular-nums">{log.statusCode ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Latency</p>
                                  <p className="text-xs font-semibold tabular-nums">{log.responseTimeMs ?? "—"}ms</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Log ID</p>
                                  <p className="text-xs font-mono truncate">{log.id.slice(-8)}</p>
                                </div>
                              </div>
                            </div>
                            {log.requestBody && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Request Body (sanitized)</p>
                                <pre className="rounded bg-muted/40 p-2 text-[11px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                  {log.requestBody}
                                </pre>
                              </div>
                            )}
                            {log.responseBody && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Response Body</p>
                                <pre className="rounded bg-muted/40 p-2 text-[11px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                  {log.responseBody}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Clear confirm */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all logs for this API?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>all log entries</strong> for
              {" "}<strong>{selectedConfig?.name}</strong>. The ApiConfig itself is not affected,
              but you will lose the audit trail. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              disabled={clearing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {clearing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Clear All Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
