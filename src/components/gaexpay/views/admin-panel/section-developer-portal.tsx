"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Code2, KeyRound, Webhook, Boxes, Plus, Copy, Check, Eye, Trash2,
  Activity, Send, Zap, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { timeAgo } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, KpiCard, apiAction, showError } from "./shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeveloperApiKey {
  id: string;
  appId: string;
  developerId: string;
  developerName: string;
  keyPrefix: string;
  keyMasked: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  app: { id: string; name: string; type: string; status: string };
  fullKey?: string;
}

interface Webhook {
  id: string;
  appId: string;
  developerId: string;
  developerName: string;
  url: string;
  events: string[];
  secretMasked: string | null;
  status: string;
  lastDeliveryAt: string | null;
  lastStatus: string | null;
  lastStatusCode: number | null;
  successRate: number;
  totalDelivered: number;
  failedDelivered: number;
  createdAt: string;
  app: { id: string; name: string; type: string };
}

interface DeveloperApp {
  id: string;
  name: string;
  description: string | null;
  developerId: string;
  developerName: string;
  developerEmail: string | null;
  type: string;
  status: string;
  createdAt: string;
  _count: { apiKeys: number; webhooks: number };
}

interface DeveloperPortalData {
  apiKeys: DeveloperApiKey[];
  webhooks: Webhook[];
  apps: DeveloperApp[];
  stats: {
    totalApps: number;
    activeApps: number;
    totalApiKeys: number;
    activeApiKeys: number;
    revokedApiKeys: number;
    totalWebhooks: number;
    activeWebhooks: number;
    failingWebhooks: number;
    disabledWebhooks: number;
    totalWebhookDeliveries: number;
    avgWebhookSuccessRate: number;
  };
  availableEvents: string[];
}

const SCOPE_OPTIONS = [
  "payments.create", "payments.read", "payments.refund",
  "wallets.read", "wallets.write",
  "cards.read", "cards.create",
  "users.read", "users.write",
  "kyc.read", "kyb.read",
  "invoices.read", "invoices.write",
  "transactions.read", "transactions.export",
  "payouts.create", "payouts.read",
];

export function DeveloperPortalSection() {
  const { data, loading, reload } = useFetch<DeveloperPortalData>("/api/admin/developer-portal");
  const [tab, setTab] = useState("keys");
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DeveloperApiKey | null>(null);
  const [createdKey, setCreatedKey] = useState<{ fullKey: string; appName: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; statusCode: number; latencyMs: number; message: string } | null>(null);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Developer Portal" description="API keys & webhooks" icon={Code2} />
        <LoadingTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Developer Portal"
        description="Manage developer API keys, webhooks & applications"
        icon={Code2}
        actions={
          <Button size="sm" onClick={() => setCreateKeyOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Issue API Key
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Boxes} label="Total Apps" value={data.stats.totalApps} color="bg-slate-500/15 text-slate-500" />
        <KpiCard icon={KeyRound} label="Active API Keys" value={data.stats.activeApiKeys} color="bg-emerald-500/15 text-emerald-500" />
        <KpiCard icon={Webhook} label="Active Webhooks" value={data.stats.activeWebhooks} color="bg-sky-500/15 text-sky-500" />
        <KpiCard icon={Activity} label="Avg Success Rate" value={`${data.stats.avgWebhookSuccessRate}%`} color="bg-violet-500/15 text-violet-500" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="keys"><KeyRound className="h-4 w-4 mr-1.5" /> API Keys</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-1.5" /> Webhooks</TabsTrigger>
          <TabsTrigger value="apps"><Boxes className="h-4 w-4 mr-1.5" /> Apps</TabsTrigger>
        </TabsList>

        {/* API Keys */}
        <TabsContent value="keys" className="mt-4">
          <Card className="p-0">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.apiKeys.length === 0 && (
                    <TableRow><TableCell colSpan={8}><EmptyState message="No API keys issued" icon={KeyRound} /></TableCell></TableRow>
                  )}
                  {data.apiKeys.map((k) => (
                    <TableRow key={k.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-slate-500/15 text-slate-600">
                              {k.developerName?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{k.developerName}</p>
                            <p className="text-[10px] text-muted-foreground truncate font-mono">{k.developerId.slice(-8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium truncate">{k.app?.name}</p>
                        <Badge variant="outline" className="text-[9px] capitalize">{k.app?.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono bg-muted/40 px-2 py-1 rounded">{k.keyMasked}</code>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard?.writeText(k.keyMasked); toast.success("Masked key copied"); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {k.scopes.length === 0 && <span className="text-xs text-muted-foreground">No scopes</span>}
                          {k.scopes.slice(0, 3).map((s) => (
                            <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>
                          ))}
                          {k.scopes.length > 3 && (
                            <Badge variant="outline" className="text-[9px]">+{k.scopes.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {k.status === "active"
                          ? <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Active</Badge>
                          : <Badge className="bg-rose-500/15 text-rose-600 border-0 text-[10px]">Revoked</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(k.createdAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{k.lastUsedAt ? timeAgo(k.lastUsedAt) : "Never"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {k.status === "active" && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setRevokeTarget(k)} title="Revoke key">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks" className="mt-4">
          <Card className="p-0">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Success Rate</TableHead>
                    <TableHead>Last Delivery</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.webhooks.length === 0 && (
                    <TableRow><TableCell colSpan={7}><EmptyState message="No webhooks configured" icon={Webhook} /></TableCell></TableRow>
                  )}
                  {data.webhooks.map((w) => (
                    <TableRow key={w.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="text-xs font-medium truncate">{w.developerName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{w.app?.name}</p>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono text-muted-foreground truncate block max-w-[220px]">{w.url}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {w.events.slice(0, 2).map((e) => (
                            <Badge key={e} variant="outline" className="text-[9px]">{e}</Badge>
                          ))}
                          {w.events.length > 2 && (
                            <Badge variant="outline" className="text-[9px]">+{w.events.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {w.status === "active" && <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Active</Badge>}
                        {w.status === "failing" && <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">Failing</Badge>}
                        {w.status === "disabled" && <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">Disabled</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          w.successRate >= 95 ? "text-emerald-600" : w.successRate >= 80 ? "text-amber-600" : "text-rose-600",
                        )}>{w.successRate.toFixed(1)}%</span>
                        <p className="text-[10px] text-muted-foreground">{w.totalDelivered} sent · {w.failedDelivered} failed</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {w.lastDeliveryAt ? timeAgo(w.lastDeliveryAt) : "Never"}
                        {w.lastStatusCode && (
                          <Badge variant="outline" className={cn(
                            "ml-1 text-[9px]",
                            w.lastStatusCode >= 200 && w.lastStatusCode < 300 ? "text-emerald-600" : "text-rose-600",
                          )}>{w.lastStatusCode}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                            const r = await apiAction(`/api/admin/developer-portal?action=test_webhook`, "PATCH", { webhookId: w.id });
                            if (!r.ok) showError(r.error || "Failed"); else {
                              setTestResult(r.data?.testResult);
                              reload();
                            }
                          }}>
                            <Zap className="h-3 w-3 mr-1" /> Test
                          </Button>
                          <Switch
                            checked={w.status !== "disabled"}
                            onCheckedChange={async (v) => {
                              const r = await apiAction(`/api/admin/developer-portal?action=toggle_webhook`, "PATCH", { webhookId: w.id }, v ? "Webhook enabled" : "Webhook disabled");
                              if (!r.ok) showError(r.error || "Failed"); else reload();
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Apps */}
        <TabsContent value="apps" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.apps.length === 0 && (
              <Card className="p-8 col-span-full"><EmptyState message="No developer apps registered" icon={Boxes} /></Card>
            )}
            {data.apps.map((a) => (
              <Card key={a.id} className="p-4 card-lift">
                <div className="flex items-start justify-between mb-2">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-500/15 text-slate-500">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>
                </div>
                <p className="font-semibold text-sm truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{a.description || "No description"}</p>
                <div className="text-xs space-y-0.5 mb-2">
                  <p className="text-muted-foreground">Developer: <span className="text-foreground font-medium">{a.developerName}</span></p>
                  {a.developerEmail && <p className="text-muted-foreground truncate">Email: <span className="text-foreground font-medium">{a.developerEmail}</span></p>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Badge variant="outline" className="text-[9px]">{a._count.apiKeys} keys</Badge>
                  <Badge variant="outline" className="text-[9px]">{a._count.webhooks} webhooks</Badge>
                  <span className="ml-auto">{timeAgo(a.createdAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create API key dialog */}
      <CreateKeyDialog
        open={createKeyOpen}
        apps={data.apps}
        availableEvents={data.availableEvents}
        onClose={() => setCreateKeyOpen(false)}
        onCreated={(key) => {
          setCreateKeyOpen(false);
          setCreatedKey(key);
          reload();
        }}
      />

      {/* Created key reveal dialog */}
      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy this key now — for security, it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Application</p>
              <p className="text-sm font-medium">{createdKey?.appName}</p>
            </div>
            <div>
              <Label>Full API Key</Label>
              <div className="flex gap-2">
                <Input readOnly value={createdKey?.fullKey ?? ""} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(createdKey?.fullKey ?? ""); toast.success("API key copied to clipboard"); }}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Store this key securely. Treat it like a password — anyone with this key can access the API based on its scopes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>I&apos;ve saved the key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke key confirm */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable the key <code className="font-mono text-xs">{revokeTarget?.keyMasked}</code> for app <strong>{revokeTarget?.app?.name}</strong>. Any integrations using this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                if (!revokeTarget) return;
                const r = await apiAction(`/api/admin/developer-portal?action=revoke_key`, "PATCH", { keyId: revokeTarget.id, reason: "Revoked by admin" }, "API key revoked");
                if (!r.ok) showError(r.error || "Failed"); else { setRevokeTarget(null); reload(); }
              }}
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Webhook test result */}
      <Dialog open={!!testResult} onOpenChange={(o) => !o && setTestResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.success
                ? <Check className="h-5 w-5 text-emerald-600" />
                : <AlertTriangle className="h-5 w-5 text-rose-600" />}
              Webhook Test {testResult?.success ? "Succeeded" : "Failed"}
            </DialogTitle>
            <DialogDescription>A test delivery was sent to the webhook endpoint.</DialogDescription>
          </DialogHeader>
          {testResult && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={cn("text-sm font-semibold", testResult.success ? "text-emerald-600" : "text-rose-600")}>
                  {testResult.success ? "PASS" : "FAIL"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">HTTP Code</p>
                <p className="text-sm font-semibold tabular-nums">{testResult.statusCode}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Latency</p>
                <p className="text-sm font-semibold tabular-nums">{testResult.latencyMs}ms</p>
              </div>
              <div className="col-span-3 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Message</p>
                <p className="text-sm">{testResult.message}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setTestResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateKeyDialog({
  open, apps, availableEvents, onClose, onCreated,
}: {
  open: boolean;
  apps: DeveloperApp[];
  availableEvents: string[];
  onClose: () => void;
  onCreated: (key: { fullKey: string; appName: string }) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [appId, setAppId] = useState("");
  const [appName, setAppName] = useState("");
  const [appType, setAppType] = useState("web");
  const [developerId, setDeveloperId] = useState("");
  const [developerName, setDeveloperName] = useState("");
  const [developerEmail, setDeveloperEmail] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleScope(s: string) {
    setScopes((arr) => arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]);
  }

  async function submit() {
    setSaving(true);
    const payload = mode === "existing"
      ? { appId, scopes }
      : { appName, appType, developerId, developerName, developerEmail, scopes };
    const r = await apiAction(`/api/admin/developer-portal`, "POST", payload, "API key issued");
    setSaving(false);
    if (!r.ok) return showError(r.error || "Failed to create key");
    if (r.data?.apiKey?.fullKey) {
      onCreated({ fullKey: r.data.apiKey.fullKey, appName: r.data.app?.name || appName });
    } else {
      showError("Key created but full key not returned");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-emerald-600" /> Issue New API Key</DialogTitle>
          <DialogDescription>Generate a new API key for an existing or new developer application.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>
              Existing app
            </Button>
            <Button size="sm" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
              New app
            </Button>
          </div>

          {mode === "existing" ? (
            <div>
              <Label>Application</Label>
              {apps.length === 0 ? (
                <p className="text-xs text-muted-foreground">No apps available — switch to &quot;New app&quot;.</p>
              ) : (
                <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={appId} onChange={(e) => setAppId(e.target.value)}>
                  <option value="">Select app…</option>
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.developerName}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>App name *</Label>
                  <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="e.g., Mobile Sync SDK" />
                </div>
                <div>
                  <Label>App type</Label>
                  <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={appType} onChange={(e) => setAppType(e.target.value)}>
                    <option value="web">Web</option>
                    <option value="mobile">Mobile</option>
                    <option value="backend">Backend</option>
                    <option value="integration">Integration</option>
                    <option value="plugin">Plugin</option>
                  </select>
                </div>
                <div>
                  <Label>Developer ID *</Label>
                  <Input value={developerId} onChange={(e) => setDeveloperId(e.target.value)} placeholder="User ID" />
                </div>
                <div>
                  <Label>Developer name *</Label>
                  <Input value={developerName} onChange={(e) => setDeveloperName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <Label>Developer email</Label>
                  <Input value={developerEmail} onChange={(e) => setDeveloperEmail(e.target.value)} placeholder="email@example.com" />
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Scopes</Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto rounded-md border p-2">
              {SCOPE_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={() => toggleScope(s)}
                    className="rounded"
                  />
                  <span className="font-mono">{s}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{scopes.length} scope(s) selected</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || (mode === "existing" && !appId) || (mode === "new" && (!appName || !developerId))}>
            {saving ? "Issuing…" : "Issue key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
