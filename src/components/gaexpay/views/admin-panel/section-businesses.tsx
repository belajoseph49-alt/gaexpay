"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Building2, Search, Eye, CheckCircle2, XCircle, Mail, Ban, FileText,
} from "lucide-react";
import { timeAgo } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState, apiAction, showError } from "./shared";

export function BusinessesSection() {
  const [search, setSearch] = useState("");
  const [kybStatus, setKybStatus] = useState("all");
  const [detail, setDetail] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (kybStatus !== "all") p.set("kybStatus", kybStatus);
    return `/api/admin/businesses?${p.toString()}&k=${reloadKey}`;
  }, [search, kybStatus, reloadKey]);

  const { data, loading } = useFetch<{ businesses: any[] }>(url);
  const businesses = data?.businesses ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Business Management"
        description={`${businesses.length} business profiles · KYB verification queue`}
        icon={Building2}
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search company name, registration #, tax ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={kybStatus} onValueChange={setKybStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="KYB Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYB</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Reg #</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>KYB</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.length === 0 && (
                  <TableRow><TableCell colSpan={7}><EmptyState message="No businesses found" icon={Building2} /></TableCell></TableRow>
                )}
                {businesses.map((b) => (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-violet-500/15 text-violet-600 text-[10px] font-semibold">
                            {b.companyName?.[0] ?? "B"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{b.companyName}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.legalCity}, {b.legalCountry}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{b.industry || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{b.registrationNumber || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{b.taxId || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <p>{b.user?.firstName} {b.user?.lastName}</p>
                      <p className="text-muted-foreground">{b.user?.email}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={b.kybStatus} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetail(b)} title="View details"><Eye className="h-3.5 w-3.5" /></Button>
                        {b.kybStatus !== "verified" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/businesses?action=verify`, "PATCH", { businessId: b.id }, "Business verified");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Verify KYB"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                        )}
                        {b.kybStatus !== "rejected" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => { setRejectTarget(b); setRejectReason(""); }} title="Reject KYB"><XCircle className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-sky-600" onClick={async () => {
                          const r = await apiAction(`/api/admin/businesses?action=request_info`, "PATCH", { businessId: b.id, reason: "Please submit additional business verification documents." }, "Info requested");
                          if (!r.ok) showError(r.error || "Failed");
                        }} title="Request info"><Mail className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={async () => {
                          const r = await apiAction(`/api/admin/businesses?action=suspend`, "PATCH", { businessId: b.id }, "Business suspended");
                          if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                        }} title="Suspend"><Ban className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* KYB detail modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-violet-600" />
              {detail?.companyName}
            </DialogTitle>
            <DialogDescription>KYB review — all documents and ownership info</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Company Type" value={detail.companyType || "—"} />
                <Info label="Industry" value={detail.industry || "—"} />
                <Info label="Registration #" value={detail.registrationNumber || "—"} />
                <Info label="Tax ID" value={detail.taxId || "—"} />
                <Info label="Commercial Registry" value={detail.commercialRegistry || "—"} />
                <Info label="Website" value={detail.website || "—"} />
                <Info label="Legal Address" value={detail.legalAddress || "—"} />
                <Info label="Location" value={`${detail.legalCity || "—"}, ${detail.legalCountry || "—"}`} />
                <Info label="KYB Status" value={<StatusBadge status={detail.kybStatus} />} />
                <Info label="KYB Tier" value={`Tier ${detail.kybTier}`} />
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Directors</h4>
                {(() => {
                  try {
                    const arr = JSON.parse(detail.directors || "[]");
                    if (!arr.length) return <p className="text-xs text-muted-foreground">No directors listed</p>;
                    return (
                      <div className="space-y-1">
                        {arr.map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded border p-2 text-xs">
                            <span>{d.name} — {d.role || "Director"}</span>
                            <span className="text-muted-foreground">{d.idNumber || ""}</span>
                          </div>
                        ))}
                      </div>
                    );
                  } catch { return <p className="text-xs text-muted-foreground">—</p>; }
                })()}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Beneficial Owners</h4>
                {(() => {
                  try {
                    const arr = JSON.parse(detail.beneficialOwners || "[]");
                    if (!arr.length) return <p className="text-xs text-muted-foreground">No beneficial owners listed</p>;
                    return (
                      <div className="space-y-1">
                        {arr.map((o: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded border p-2 text-xs">
                            <span>{o.name}</span>
                            <Badge variant="outline" className="text-[10px]">{o.ownershipPercent}% ownership</Badge>
                          </div>
                        ))}
                      </div>
                    );
                  } catch { return <p className="text-xs text-muted-foreground">—</p>; }
                })()}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Documents</h4>
                {(() => {
                  try {
                    const arr = JSON.parse(detail.documents || "[]");
                    if (!arr.length) return <p className="text-xs text-muted-foreground">No documents uploaded</p>;
                    return (
                      <div className="space-y-1">
                        {arr.map((doc: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded border p-2 text-xs">
                            <span className="flex items-center gap-2"><FileText className="h-3 w-3" /> {doc.type || "Document"}</span>
                            <span className="text-muted-foreground">{doc.uploadedAt ? timeAgo(doc.uploadedAt) : ""}</span>
                          </div>
                        ))}
                      </div>
                    );
                  } catch { return <p className="text-xs text-muted-foreground">—</p>; }
                })()}
              </div>

              {detail.kybRejectionReason && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                  <p className="text-xs font-medium text-rose-600">Rejection Reason:</p>
                  <p className="text-sm mt-1">{detail.kybRejectionReason}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                {detail.kybStatus !== "verified" && (
                  <Button onClick={async () => {
                    const r = await apiAction(`/api/admin/businesses?action=verify`, "PATCH", { businessId: detail.id }, "Verified");
                    if (!r.ok) showError(r.error || "Failed"); else { setReloadKey((k) => k + 1); setDetail(null); }
                  }}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Verify KYB
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYB Application</DialogTitle>
            <DialogDescription>Provide a reason for rejecting {rejectTarget?.companyName}&apos;s KYB</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Rejection reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="E.g., Documentation insufficient, business registration not found…" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              const r = await apiAction(`/api/admin/businesses?action=reject`, "PATCH", { businessId: rejectTarget.id, reason: rejectReason || "Documentation insufficient" }, "KYB rejected");
              if (!r.ok) showError(r.error || "Failed"); else { setReloadKey((k) => k + 1); setRejectTarget(null); }
            }}>Reject application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}
