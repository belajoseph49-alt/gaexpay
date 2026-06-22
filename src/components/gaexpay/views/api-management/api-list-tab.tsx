"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, Play, Pencil, FileText, Star, MoreHorizontal,
  CheckCircle2, AlertTriangle, XCircle, Pause, ArrowUpDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  SERVICES, getServiceMeta, getHealth, HEALTH_META,
  type ApiConfig,
} from "./data";

const timeAgo = (d: string | Date | null) => {
  if (!d) return "—";
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
  onDelete: (c: ApiConfig) => void;
  onShowLogs: (c: ApiConfig) => void;
}

type SortKey = "name" | "service" | "lastUsed" | "requests" | "errorRate";

export function ApiListTab({
  configs, loading, onTest, onEdit, onToggle, onSetDefault, onDelete, onShowLogs,
}: Props) {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    let list = [...configs];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.provider || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q),
      );
    }
    if (serviceFilter !== "all") list = list.filter(c => c.service === serviceFilter);
    if (statusFilter !== "all") {
      list = list.filter(c => {
        const h = getHealth(c);
        if (statusFilter === "enabled") return c.enabled;
        if (statusFilter === "disabled") return !c.enabled;
        return h === statusFilter;
      });
    }
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "service") return a.service.localeCompare(b.service);
      if (sortKey === "lastUsed") {
        const av = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bv = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return bv - av;
      }
      if (sortKey === "requests") return (b.totalRequests ?? 0) - (a.totalRequests ?? 0);
      if (sortKey === "errorRate") {
        const ar = a.totalRequests > 0 ? a.failedRequests / a.totalRequests : 0;
        const br = b.totalRequests > 0 ? b.failedRequests / b.totalRequests : 0;
        return br - ar;
      }
      return 0;
    });
    return list;
  }, [configs, search, serviceFilter, statusFilter, sortKey]);

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, provider, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {SERVICES.map(s => (
                <SelectItem key={s} value={s}>{getServiceMeta(s).label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[140px] h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="lastUsed">Last Used</SelectItem>
              <SelectItem value="requests">Requests</SelectItem>
              <SelectItem value="errorRate">Error Rate</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="h-9 px-3 flex items-center gap-1">
            {filtered.length} of {configs.length}
          </Badge>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead className="hidden lg:table-cell">Provider</TableHead>
                <TableHead className="hidden md:table-cell">Env</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Requests</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Error Rate</TableHead>
                <TableHead className="hidden xl:table-cell">Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    No API configurations match your filters.
                  </TableCell>
                </TableRow>
              ) : filtered.map((c, idx) => {
                const meta = getServiceMeta(c.service);
                const Icon = meta.icon;
                const health = getHealth(c);
                const hm = HEALTH_META[health];
                const errorRate = c.totalRequests > 0 ? c.failedRequests / c.totalRequests : 0;
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                    className="group cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => onEdit(c)}
                  >
                    <TableCell className="pl-3">
                      <span className={cn("block h-2 w-2 rounded-full", hm.dot)} title={hm.label} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 place-items-center rounded-lg shrink-0", meta.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-medium truncate">{c.name}</p>
                            {c.isDefault && (
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate md:hidden">{meta.label}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{c.provider || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={c.environment === "production" ? "default" : "secondary"} className="text-[10px]">
                        {c.environment === "production" ? "Prod" : "Sandbox"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] border", hm.color)}>
                        {hm.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums text-xs">
                      {(c.totalRequests ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right">
                      <span className={cn("text-xs tabular-nums font-medium",
                        errorRate > 0.05 ? "text-rose-600"
                        : errorRate > 0.01 ? "text-amber-600"
                        : "text-emerald-600")}>
                        {c.totalRequests > 0 ? `${(errorRate * 100).toFixed(2)}%` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                      {timeAgo(c.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onTest(c)}
                          title="Test connection"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(c)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onShowLogs(c)}>
                              <FileText className="h-3.5 w-3.5 mr-2" /> View Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onTest(c)}>
                              <Play className="h-3.5 w-3.5 mr-2" /> Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onToggle(c, !c.enabled)}>
                              {c.enabled ? (
                                <>
                                  <Pause className="h-3.5 w-3.5 mr-2" /> Disable
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Enable
                                </>
                              )}
                            </DropdownMenuItem>
                            {!c.isDefault && (
                              <DropdownMenuItem onClick={() => onSetDefault(c)}>
                                <Star className="h-3.5 w-3.5 mr-2" /> Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(c)}
                              className="text-rose-600 focus:text-rose-700 focus:bg-rose-500/10"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
