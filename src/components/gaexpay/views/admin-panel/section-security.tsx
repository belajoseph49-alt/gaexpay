"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, Lock, Smartphone, Globe, AlertTriangle, Ban, LogIn, Clock, Activity,
} from "lucide-react";
import { timeAgo, formatDateTime } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState, apiAction, showError } from "./shared";

export function SecuritySection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/security");
  const [tab, setTab] = useState("login");
  const [terminateTarget, setTerminateTarget] = useState<any | null>(null);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Security Settings" description="Login history, suspicious activity, fraud rules" icon={Shield} />
        <LoadingTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Security Settings"
        description="Login history · suspicious activity · blocked accounts · fraud rules"
        icon={Shield}
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard icon={LogIn} label="Total Logins" value={data.stats.totalLogins} color="bg-sky-500/15 text-sky-600" />
        <StatCard icon={AlertTriangle} label="Suspicious" value={data.stats.totalSuspicious} color="bg-amber-500/15 text-amber-600" />
        <StatCard icon={Ban} label="Blocked" value={data.stats.totalBlocked} color="bg-rose-500/15 text-rose-600" />
        <StatCard icon={Lock} label="2FA Users" value={data.stats.twoFAUsers} color="bg-violet-500/15 text-violet-600" />
        <StatCard icon={Activity} label="2FA Coverage" value={`${data.stats.twoFAPercent}%`} color="bg-violet-500/15 text-violet-600" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="login"><LogIn className="h-4 w-4 mr-1.5" /> Login History</TabsTrigger>
          <TabsTrigger value="suspicious"><AlertTriangle className="h-4 w-4 mr-1.5" /> Suspicious</TabsTrigger>
          <TabsTrigger value="sessions"><Clock className="h-4 w-4 mr-1.5" /> Active Sessions</TabsTrigger>
          <TabsTrigger value="blocked"><Ban className="h-4 w-4 mr-1.5" /> Blocked</TabsTrigger>
          <TabsTrigger value="rules"><Shield className="h-4 w-4 mr-1.5" /> Fraud Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-4">
          <Card className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.loginHistory ?? []).length === 0 && <TableRow><TableCell colSpan={5}><EmptyState message="No login history" icon={LogIn} /></TableCell></TableRow>}
                  {(data.loginHistory ?? []).map((l: any) => (
                    <TableRow key={l.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs">
                        {l.user ? `${l.user.firstName} ${l.user.lastName}` : l.actor}
                      </TableCell>
                      <TableCell className="text-xs">{l.action?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs font-mono">{l.ip || "—"}</TableCell>
                      <TableCell><StatusBadge status={l.severity} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(l.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" /> Suspicious Activity ({(data.suspiciousAudit ?? []).length + (data.suspiciousTx ?? []).length})
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(data.suspiciousAudit ?? []).map((l: any) => (
                <div key={`a-${l.id}`} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{l.action?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground truncate">{l.user ? `${l.user.firstName} ${l.user.lastName}` : l.actor} · {l.ip}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(l.createdAt)}</span>
                </div>
              ))}
              {(data.suspiciousTx ?? []).map((t: any) => (
                <div key={`t-${t.id}`} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/15 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono">{t.reference}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.user?.firstName} {t.user?.lastName} · Risk {Math.round((t.riskScore || 0) * 100)}%
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</span>
                </div>
              ))}
              {(data.suspiciousAudit ?? []).length === 0 && (data.suspiciousTx ?? []).length === 0 && (
                <EmptyState message="No suspicious activity" icon={AlertTriangle} />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <Card className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.activeSessions ?? []).length === 0 && <TableRow><TableCell colSpan={6}><EmptyState message="No active sessions" icon={Clock} /></TableCell></TableRow>}
                  {(data.activeSessions ?? []).map((s: any) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs">
                        <p>{s.user?.firstName} {s.user?.lastName}</p>
                        <p className="text-muted-foreground">{s.user?.email}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="capitalize">{s.type} · {s.name}</p>
                        <p className="text-muted-foreground">{s.browser} / {s.os}</p>
                      </TableCell>
                      <TableCell className="text-xs">{s.location || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{s.ip || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(s.lastActive)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => setTerminateTarget(s)}>
                          Terminate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="blocked" className="mt-4">
          <Card className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.blockedAccounts ?? []).length === 0 && <TableRow><TableCell colSpan={5}><EmptyState message="No blocked accounts" icon={Ban} /></TableCell></TableRow>}
                  {(data.blockedAccounts ?? []).map((u: any) => (
                    <TableRow key={u.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={u.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(u.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-violet-600" onClick={async () => {
                          const r = await apiAction(`/api/admin/users?action=activate`, "PATCH", { userId: u.id }, "User reactivated");
                          if (!r.ok) showError(r.error || "Failed"); else reload();
                        }}>Reactivate</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Fraud Detection Rules</h3>
            <div className="space-y-2">
              {(data.fraudRules ?? []).map((rule: any) => (
                <div key={rule.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${
                    rule.severity === "high" ? "bg-rose-500/15 text-rose-600"
                    : rule.severity === "medium" ? "bg-amber-500/15 text-amber-600"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] capitalize ${
                    rule.severity === "high" ? "text-rose-600" : rule.severity === "medium" ? "text-amber-600" : ""
                  }`}>{rule.severity}</Badge>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={async (v) => {
                      const r = await apiAction(`/api/admin/security`, "PATCH", { action: "toggle_rule", ruleId: rule.id, enabled: v }, v ? "Rule enabled" : "Rule disabled");
                      if (!r.ok) showError(r.error || "Failed"); else reload();
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Terminate session confirm */}
      <AlertDialog open={!!terminateTarget} onOpenChange={(o) => !o && setTerminateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out {terminateTarget?.user?.firstName} {terminateTarget?.user?.lastName} from this device. They will need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const r = await apiAction(`/api/admin/security`, "PATCH", { action: "terminate_session", sessionId: terminateTarget.id }, "Session terminated");
              if (!r.ok) showError(r.error || "Failed"); else reload();
              setTerminateTarget(null);
            }}>Terminate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card className="p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${color} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </Card>
  );
}
