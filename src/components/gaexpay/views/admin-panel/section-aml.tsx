"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileCheck, AlertTriangle, ShieldAlert, FileText, Download, Search, CheckCircle2, XCircle, Eye,
} from "lucide-react";
import { formatMoney, formatDateTime, timeAgo } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, StatusBadge, apiAction, showError } from "./shared";

const REPORT_TYPES = [
  { value: "STR", label: "STR — Suspicious Transaction Report" },
  { value: "CTR", label: "CTR — Currency Transaction Report" },
  { value: "SAR", label: "SAR — Suspicious Activity Report" },
];

export function AmlSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/aml");
  const [tab, setTab] = useState("suspicious");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const suspicious = data?.suspicious ?? [];
  const rules = data?.rules ?? [];
  const reports = data?.reports ?? [];
  const stats = data?.stats ?? { total: 0, flagged: 0, reviewed: 0, reported: 0 };

  const filtered = suspicious.filter((s: any) => {
    const matchSearch =
      !search ||
      s.userName?.toLowerCase().includes(search.toLowerCase()) ||
      s.reference?.toLowerCase().includes(search.toLowerCase()) ||
      s.userEmail?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <SectionHeader
        title="AML & Compliance"
        description="Anti-money laundering rules, suspicious activity & regulatory reports"
        icon={FileCheck}
        actions={
          <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
            <FileText className="h-4 w-4 mr-1.5" /> File Report
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile icon={AlertTriangle} label="Total Flags" value={stats.total} color="bg-orange-500/15 text-orange-600" />
        <StatTile icon={ShieldAlert} label="Pending Review" value={stats.flagged} color="bg-rose-500/15 text-rose-600" />
        <StatTile icon={CheckCircle2} label="Reviewed" value={stats.reviewed} color="bg-violet-500/15 text-violet-600" />
        <StatTile icon={FileText} label="Reports Filed" value={stats.reported} color="bg-violet-500/15 text-violet-600" />
      </div>

      {loading ? <LoadingTable rows={6} /> : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="suspicious"><AlertTriangle className="h-4 w-4 mr-1.5" /> Suspicious Activity</TabsTrigger>
            <TabsTrigger value="rules"><ShieldAlert className="h-4 w-4 mr-1.5" /> AML Rules</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1.5" /> Compliance Reports</TabsTrigger>
          </TabsList>

          {/* Suspicious Activity Tab */}
          <TabsContent value="suspicious" className="mt-4 space-y-3">
            <Card className="p-3">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, reference, or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="p-0">
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Risk</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={8}><EmptyState message="No suspicious transactions" icon={AlertTriangle} /></TableCell></TableRow>
                    )}
                    {filtered.map((s: any) => (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{s.reference}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{s.userName}</p>
                          <p className="text-xs text-muted-foreground">{s.userEmail}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {formatMoney(s.amount, s.currency)}
                        </TableCell>
                        <TableCell className="text-center">
                          <RiskPill score={s.riskScore} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.reason}</TableCell>
                        <TableCell>
                          <StatusBadge status={s.status === "flagged" ? "flagged" : "verified"} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{timeAgo(s.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {s.status === "flagged" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReviewTarget(s)}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* AML Rules Tab */}
          <TabsContent value="rules" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Fraud Detection Rules
              </h3>
              <div className="space-y-2">
                {rules.length === 0 && <EmptyState message="No AML rules configured" icon={ShieldAlert} />}
                {rules.map((rule: any) => (
                  <RuleRow key={rule.id} rule={rule} onUpdated={reload} />
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Compliance Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <Card className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filed</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 && (
                      <TableRow><TableCell colSpan={7}><EmptyState message="No compliance reports filed yet" icon={FileText} /></TableCell></TableRow>
                    )}
                    {reports.map((r: any) => (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{r.id}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] font-mono">{r.type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.periodStart).toLocaleDateString()} → {new Date(r.periodEnd).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">{Array.isArray(r.transactionIds) ? r.transactionIds.length : 0}</TableCell>
                        <TableCell><StatusBadge status="verified" /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.filedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => {
                              const csv = `field,value\nid,${r.id}\ntype,${r.type}\nperiodStart,${r.periodStart}\nperiodEnd,${r.periodEnd}\nsummary,${(r.summary || "").replace(/,/g, ";")}\n`;
                              downloadCsv(csv, `${r.id}.csv`);
                            }}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> CSV
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Review modal */}
      <ReviewDialog target={reviewTarget} onClose={() => setReviewTarget(null)} onSaved={() => { reload(); setReviewTarget(null); }} />

      {/* File report modal */}
      <FileReportDialog open={reportOpen} onClose={() => setReportOpen(false)} onSaved={() => { reload(); setReportOpen(false); }} />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${color} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value.toLocaleString()}</p>
    </Card>
  );
}

function RiskPill({ score }: { score: number }) {
  const pct = Math.round((score || 0) * 100);
  const cls = pct >= 80 ? "bg-rose-500/15 text-rose-600"
    : pct >= 50 ? "bg-orange-500/15 text-orange-600"
    : "bg-amber-500/15 text-amber-600";
  return <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold ${cls}`}>{pct}%</span>;
}

function RuleRow({ rule, onUpdated }: { rule: any; onUpdated: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const severityColor = rule.severity === "high"
    ? "bg-rose-500/15 text-rose-600"
    : rule.severity === "medium"
    ? "bg-amber-500/15 text-amber-600"
    : "bg-muted text-muted-foreground";

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${severityColor}`}>
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{rule.name}</p>
            <Badge variant="outline" className={`text-[9px] capitalize ${severityColor}`}>{rule.severity}</Badge>
            <Badge variant="outline" className="text-[9px] capitalize">{rule.type.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{rule.description}</p>
          {rule.threshold !== undefined && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Threshold: {rule.threshold}{rule.currency ? ` ${rule.currency}` : rule.windowMinutes ? ` / ${rule.windowMinutes}min` : rule.windowHours ? ` / ${rule.windowHours}h` : ""}
            </p>
          )}
        </div>
        <Switch
          checked={!!rule.enabled}
          onCheckedChange={async (v) => {
            const r = await apiAction(`/api/admin/aml`, "PATCH", { action: "toggle_rule", ruleId: rule.id, enabled: v }, v ? "Rule enabled" : "Rule disabled");
            if (!r.ok) showError(r.error || "Failed"); else onUpdated();
          }}
        />
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditOpen(true)}>Edit</Button>
      </div>

      <RuleEditDialog rule={rule} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); onUpdated(); }} />
    </>
  );
}

function RuleEditDialog({ rule, open, onClose, onSaved }: { rule: any; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [threshold, setThreshold] = useState<number>(rule?.threshold ?? 0);
  const [severity, setSeverity] = useState<string>(rule?.severity ?? "medium");
  const [description, setDescription] = useState<string>(rule?.description ?? "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Rule: {rule?.name}</DialogTitle>
          <DialogDescription>Update threshold and severity</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Threshold</Label>
            <Input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/aml`, "PATCH", { action: "update_rule", ruleId: rule.id, updates: { threshold, severity, description } }, "Rule updated");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ target, onClose, onSaved }: { target: any; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState("");
  if (!target) return null;
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Suspicious Transaction</DialogTitle>
          <DialogDescription>{target.reference} · {formatMoney(target.amount, target.currency)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <Row label="User" value={`${target.userName} (${target.userEmail})`} />
          <Row label="Type" value={`${target.type} (${target.direction})`} />
          <Row label="Risk Score" value={`${Math.round((target.riskScore || 0) * 100)}%`} />
          <Row label="Reason" value={target.reason} />
          <Row label="Date" value={formatDateTime(target.createdAt)} />
        </div>
        <div>
          <Label>Review Note</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Optional note for the audit log…" />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const r = await apiAction(`/api/admin/aml`, "PATCH", { action: "file_report", type: "STR", periodStart: target.createdAt, periodEnd: new Date().toISOString(), transactionIds: [target.id], summary: note || target.reason }, "Report filed");
              if (!r.ok) showError(r.error || "Failed");
              else { await apiAction(`/api/admin/aml`, "PATCH", { action: "review_flag", transactionId: target.id, note }); onSaved(); }
            }}
          >
            <ShieldAlert className="h-4 w-4 mr-1.5" /> File & Report
          </Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/aml`, "PATCH", { action: "review_flag", transactionId: target.id, note }, "Flag reviewed");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Reviewed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileReportDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState("STR");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [summary, setSummary] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File Compliance Report</DialogTitle>
          <DialogDescription>Submit a regulatory report for the selected period</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Report Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period Start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period End</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Brief summary of the report…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            if (!periodStart || !periodEnd) { showError("Period start and end required"); return; }
            const r = await apiAction(`/api/admin/aml`, "PATCH", {
              action: "file_report",
              type,
              periodStart: new Date(periodStart).toISOString(),
              periodEnd: new Date(periodEnd).toISOString(),
              summary,
            }, "Report filed");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>File Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u; a.download = filename; a.click();
  URL.revokeObjectURL(u);
}
