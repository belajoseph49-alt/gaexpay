"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserCheck, Search, CheckCircle2, XCircle, AlertCircle, FileText, User, MapPin, Calendar, CreditCard,
} from "lucide-react";
import { formatDate, timeAgo } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, StatusBadge, apiAction, showError } from "./shared";

export function KycReviewSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/kyc-review?status=pending");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);

  // Re-fetch when filter changes
  const { data: filteredData, loading: filteredLoading, reload: filteredReload } = useFetch<any>(
    `/api/admin/kyc-review?status=${statusFilter}`,
  );

  const counts = filteredData?.counts ?? data?.counts ?? { pending: 0, verified: 0, rejected: 0 };
  const submissions = filteredData?.submissions ?? data?.submissions ?? [];

  const visible = submissions.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <SectionHeader
        title="KYC Review"
        description="Identity verification queue — review documents, approve or reject"
        icon={UserCheck}
      />

      <div className="grid gap-3 grid-cols-3">
        <Card className="p-4 cursor-pointer hover:bg-muted/30" onClick={() => { setStatusFilter("pending"); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className={`text-2xl font-bold ${statusFilter === "pending" ? "text-amber-600" : ""}`}>{counts.pending ?? 0}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-600"><AlertCircle className="h-5 w-5" /></div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-muted/30" onClick={() => setStatusFilter("verified")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className={`text-2xl font-bold ${statusFilter === "verified" ? "text-violet-600" : ""}`}>{counts.verified ?? 0}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-600"><CheckCircle2 className="h-5 w-5" /></div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:bg-muted/30" onClick={() => setStatusFilter("rejected")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className={`text-2xl font-bold ${statusFilter === "rejected" ? "text-rose-600" : ""}`}>{counts.rejected ?? 0}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/15 text-rose-600"><XCircle className="h-5 w-5" /></div>
          </div>
        </Card>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0">
        {loading || filteredLoading ? <div className="p-4"><LoadingTable rows={5} /></div> : (
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState message="No KYC submissions" icon={UserCheck} /></TableCell></TableRow>}
                {visible.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setReviewTarget(s)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{s.firstName?.[0]}{s.lastName?.[0]}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${s.accountType === "business" ? "text-violet-600 bg-violet-500/15" : "text-sky-600 bg-sky-500/15"}`}>
                        {s.accountType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.kycSubmittedAt ? timeAgo(s.kycSubmittedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">{s.documentsCount}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">T{s.kycTier}</Badge></TableCell>
                    <TableCell><StatusBadge status={s.kycStatus} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setReviewTarget(s); }}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ReviewDialog
        target={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSaved={() => { setReviewTarget(null); reload(); filteredReload(); }}
        onReject={(t) => { setReviewTarget(null); setRejectTarget(t); }}
      />

      <RejectDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSaved={() => { setRejectTarget(null); reload(); filteredReload(); }}
      />
    </div>
  );
}

function ReviewDialog({ target, onClose, onSaved, onReject }: {
  target: any;
  onClose: () => void;
  onSaved: () => void;
  onReject: (t: any) => void;
}) {
  const [tier, setTier] = useState(2);
  const [note, setNote] = useState("");
  if (!target) return null;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>KYC Review · {target.firstName} {target.lastName}</DialogTitle>
          <DialogDescription>{target.email} · {target.accountType} account</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* User info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><User className="h-4 w-4 text-primary" /> User Information</h3>
            <div className="space-y-2 text-sm">
              <InfoRow icon={User} label="Name" value={`${target.firstName} ${target.lastName}`} />
              <InfoRow icon={User} label="Email" value={target.email} />
              <InfoRow icon={User} label="Phone" value={target.phone} />
              <InfoRow icon={MapPin} label="Country" value={target.country} />
              <InfoRow icon={MapPin} label="City" value={target.city || "—"} />
              <InfoRow icon={MapPin} label="Address" value={target.address || "—"} />
              <InfoRow icon={Calendar} label="DOB" value={target.dob || "—"} />
              <InfoRow icon={CreditCard} label="Account Type" value={target.accountType} />
              <InfoRow icon={CheckCircle2} label="KYC Status" value={target.kycStatus} />
              <InfoRow icon={User} label="Submitted" value={target.kycSubmittedAt ? formatDate(target.kycSubmittedAt) : "—"} />
              {target.kycRejectionReason && (
                <InfoRow icon={XCircle} label="Rejection Reason" value={target.kycRejectionReason} />
              )}
            </div>

            {target.businessProfile && (
              <>
                <h3 className="font-semibold mt-4 mb-2 text-sm">Business Profile</h3>
                <div className="space-y-2 text-sm">
                  <InfoRow icon={User} label="Company" value={target.businessProfile.companyName} />
                  <InfoRow icon={User} label="Type" value={target.businessProfile.companyType || "—"} />
                  <InfoRow icon={CreditCard} label="Reg. #" value={target.businessProfile.registrationNumber || "—"} />
                  <InfoRow icon={MapPin} label="Industry" value={target.businessProfile.industry || "—"} />
                </div>
              </>
            )}
          </Card>

          {/* Documents */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /> Documents ({target.documents?.length ?? 0})</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {(target.documents ?? []).length === 0 && <EmptyState message="No documents" icon={FileText} />}
              {(target.documents ?? []).map((doc: any) => (
                <div key={doc.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold capitalize">{doc.type.replace(/_/g, " ")}</p>
                    <StatusBadge status={doc.status === "approved" ? "verified" : doc.status === "rejected" ? "rejected" : "pending"} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Doc #: {doc.documentNumber || "—"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {doc.frontImage && (
                      <DocImage label="Front" url={doc.frontImage} />
                    )}
                    {doc.backImage && (
                      <DocImage label="Back" url={doc.backImage} />
                    )}
                    {doc.selfieImage && (
                      <DocImage label="Selfie" url={doc.selfieImage} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {target.kycStatus === "pending" && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label className="text-xs">Approve at Tier</Label>
                <Select value={String(tier)} onValueChange={(v) => setTier(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tier 1 (Basic)</SelectItem>
                    <SelectItem value="2">Tier 2 (Standard)</SelectItem>
                    <SelectItem value="3">Tier 3 (Premium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Internal Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reviewed by reviewer…" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={async () => {
                const r = await apiAction(`/api/admin/kyc-review`, "PATCH", { action: "request_info", userId: target.id, note }, "Info requested");
                if (!r.ok) showError(r.error || "Failed"); else onSaved();
              }}>
                <AlertCircle className="h-4 w-4 mr-1.5" /> Request Info
              </Button>
              <Button variant="destructive" onClick={() => onReject(target)}>
                <XCircle className="h-4 w-4 mr-1.5" /> Reject
              </Button>
              <Button onClick={async () => {
                const r = await apiAction(`/api/admin/kyc-review`, "PATCH", { action: "approve", userId: target.id, tier, note }, "KYC approved");
                if (!r.ok) showError(r.error || "Failed"); else onSaved();
              }}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ target, onClose, onSaved }: { target: any; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  if (!target) return null;

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject KYC for {target.firstName} {target.lastName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The user will need to resubmit their documents. Please provide a clear reason.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g., ID document is expired or unclear. Please re-submit a valid government-issued ID."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700"
            onClick={async () => {
              const r = await apiAction(`/api/admin/kyc-review`, "PATCH", { action: "reject", userId: target.id, reason: reason || "Rejected by reviewer" }, "KYC rejected");
              if (!r.ok) showError(r.error || "Failed"); else onSaved();
            }}
          >
            Reject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className="text-xs font-medium text-right capitalize">{value || "—"}</span>
    </div>
  );
}

function DocImage({ label, url }: { label: string; url: string }) {
  return (
    <div className="aspect-[4/3] rounded-md border bg-muted/30 overflow-hidden relative">
      <img src={url} alt={label} className="w-full h-full object-cover" />
      <span className="absolute top-1 left-1 bg-background/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono">{label}</span>
    </div>
  );
}
