"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, User, CheckCircle2, XCircle, Mail, FileText } from "lucide-react";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState, apiAction, showError } from "./shared";

export function DisputesSection() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [resolveTarget, setResolveTarget] = useState<any | null>(null);
  const [resolution, setResolution] = useState("");
  const [finalStatus, setFinalStatus] = useState("resolved");

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter !== "all") p.set("status", statusFilter);
    return `/api/admin/disputes?${p.toString()}&k=${reloadKey}`;
  }, [statusFilter, reloadKey]);

  const { data, loading } = useFetch<any>(url);
  const disputes = data?.disputes ?? [];
  const stats = data?.stats ?? {};

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Disputes & Claims"
        description="Resolution center — assign, investigate, resolve"
        icon={AlertTriangle}
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Open" value={stats.open ?? 0} color="bg-sky-500/15 text-sky-600" />
        <StatCard label="Under Review" value={stats.under_review ?? 0} color="bg-amber-500/15 text-amber-600" />
        <StatCard label="Resolved" value={stats.resolved ?? 0} color="bg-emerald-500/15 text-emerald-600" />
        <StatCard label="Rejected" value={stats.rejected ?? 0} color="bg-rose-500/15 text-rose-600" />
        <StatCard label="Refunded" value={stats.refunded ?? 0} color="bg-violet-500/15 text-violet-600" />
      </div>

      <Card className="p-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All disputes</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={5} /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disputer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState message="No disputes" icon={AlertTriangle} /></TableCell></TableRow>}
                {disputes.map((d: any) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{d.user?.firstName?.[0]}{d.user?.lastName?.[0]}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-medium">{d.user?.firstName} {d.user?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{d.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{d.reason?.replace(/_/g, " ")}</Badge>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">{d.description}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-mono">{d.transactionRef}</p>
                      {d.transaction && <p className="text-muted-foreground">{formatMoney(d.transaction.amount, d.transaction.currency)}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        d.priority === "high" ? "text-rose-600 text-[10px] capitalize"
                        : d.priority === "medium" ? "text-amber-600 text-[10px] capitalize"
                        : "text-[10px] capitalize"
                      }>{d.priority}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(d.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {d.status === "open" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-sky-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/disputes?action=assign`, "PATCH", { disputeId: d.id, status: "under_review", assignedTo: "Admin" }, "Dispute taken under review");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }}>
                            <User className="h-3.5 w-3.5 mr-1" /> Take
                          </Button>
                        )}
                        {d.status !== "resolved" && d.status !== "rejected" && d.status !== "refunded" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setResolveTarget(d); setResolution(""); setFinalStatus("resolved"); }}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Resolve dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Dispute from {resolveTarget?.user?.firstName} {resolveTarget?.user?.lastName} · {resolveTarget?.reason}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Resolution</Label>
              <Select value={finalStatus} onValueChange={setFinalStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolve in favor of user</SelectItem>
                  <SelectItem value="refunded">Refund user</SelectItem>
                  <SelectItem value="rejected">Reject (in favor of merchant)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resolution note</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="Detailed explanation of the resolution…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await apiAction(`/api/admin/disputes?action=resolve`, "PATCH", {
                disputeId: resolveTarget.id, status: finalStatus, resolution,
              }, "Dispute resolved");
              if (!r.ok) showError(r.error || "Failed"); else { setReloadKey((k) => k + 1); setResolveTarget(null); }
            }}>Resolve dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${color} mb-2`}>
        <AlertTriangle className="h-3.5 w-3.5" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}
