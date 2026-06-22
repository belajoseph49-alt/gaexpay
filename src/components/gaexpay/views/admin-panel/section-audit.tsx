"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, Download } from "lucide-react";
import { timeAgo, formatDateTime } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState } from "./shared";
import { toast } from "sonner";

export function AuditSection() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("userId", search);
    if (severity !== "all") p.set("severity", severity);
    if (action) p.set("action", action);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("limit", "500");
    return `/api/admin/audit?${p.toString()}`;
  }, [search, severity, action, from, to]);

  const { data, loading } = useFetch<{ logs: any[] }>(url);
  const logs = data?.logs ?? [];

  function exportCSV() {
    const headers = ["Date", "Action", "Actor", "User", "Entity", "Entity ID", "Severity", "IP", "Details"];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.action, l.actor,
      l.user ? `${l.user.firstName} ${l.user.lastName}` : "—",
      l.entity, l.entityId || "", l.severity, l.ip || "", l.details || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `audit-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(u);
    toast.success(`Exported ${logs.length} audit entries`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Audit Log"
        description={`${logs.length} entries · complete admin action trail`}
        icon={ScrollText}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filter by user ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Input placeholder="Action contains…" value={action} onChange={(e) => setAction(e.target.value)} className="w-[180px]" />
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
        </div>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={8} /></div> : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState message="No audit logs match filters" icon={ScrollText} /></TableCell></TableRow>}
                {logs.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="text-sm font-medium font-mono">{l.action}</p>
                      {l.details && <p className="text-xs text-muted-foreground truncate max-w-[300px]">{l.details}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{l.actor}</TableCell>
                    <TableCell className="text-xs">
                      {l.user ? `${l.user.firstName} ${l.user.lastName}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{l.entity}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={l.severity} /></TableCell>
                    <TableCell className="text-xs font-mono">{l.ip || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <p>{timeAgo(l.createdAt)}</p>
                      <p className="text-[10px] text-muted-foreground/70">{formatDateTime(l.createdAt)}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
