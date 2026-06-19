"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Code2, Key, Webhook, Activity, Server, FlaskConical,
  Plus, Copy, Eye, EyeOff, RefreshCw, Download, Trash2, Pencil,
  Check, X, Clock, Zap, AlertTriangle, ShieldCheck, Send,
  Terminal, BookOpen, Lock, Database, CreditCard, Phone,
  Building2, RotateCcw, Play, ChevronRight, Star,
  TrendingUp, Gauge, AlertOctagon, CheckCircle2, ExternalLink,
  Hash, Cpu, FileCode2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { AnimatedNumber } from "../animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

/* ------------------------- helpers ------------------------- */
const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
};
const fmtMoney = (n: number, currency = "NGN") => {
  const symbols: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£", GHS: "₵" };
  return `${symbols[currency] ?? ""}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
};
const timeAgoShort = (d: string | Date | null) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 0) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* ------------------------- types ------------------------- */
interface ApiKey {
  id: string; name: string; key: string; fullKey: string; prefix: string;
  created: string; lastUsed: string | null;
  status: "active" | "revoked";
  permissions: string[]; rateLimit: number; requestsToday: number;
  environment: "production" | "sandbox";
}
interface WebhookDelivery {
  id: string; event: string; url: string; statusCode: number;
  durationMs: number; timestamp: string; success: boolean;
}
interface Webhook {
  id: string; url: string; events: string[];
  status: "active" | "paused";
  lastDelivery: string | null; successRate: number;
  totalDeliveries: number; recentDeliveries: WebhookDelivery[];
}
interface EndpointEntry {
  category: string; method: string; path: string;
  description: string; color: string;
}
interface DeveloperData {
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  recentDeliveries: WebhookDelivery[];
  usage: {
    totalRequests30d: number;
    requestsByEndpoint: { endpoint: string; count: number }[];
    requestsByDay: { date: string; label: string; requests: number; errors: number }[];
    usageByStatusCode: { code: string; label: string; count: number; color: string }[];
    errorRate: number; avgResponseMs: number;
    peakDayRequests: number; uniqueEndpoints: number;
  };
  rateLimits: {
    currentTier: string;
    tiers: {
      tier: string; limitPerHour: number; limitPerMonth: number;
      price: string; features: string[]; current: number; usagePct: number;
    }[];
    currentHourUsage: number; currentHourLimit: number; resetInMinutes: number;
  };
  sandbox: {
    balance: Record<string, number>;
    testCards: { brand: string; number: string; cvv: string; exp: string; behavior: string }[];
    testPhones: { label: string; number: string; behavior: string }[];
    testBanks: { bank: string; accountNumber: string; name: string; behavior: string }[];
    lastReset: string; totalTestRequests: number;
  };
  endpoints: { category: string; endpoints: EndpointEntry[] }[];
  documentation: {
    quickStart: { step: number; title: string; description: string }[];
    authentication: {
      type: string; header: string; description: string;
      example: { curl: string; javascript: string; python: string };
    };
    errorCodes: { code: string; name: string; description: string }[];
    sdks: { name: string; language: string; install: string; color: string; icon: string }[];
    baseUrls: { production: string; sandbox: string };
    version: string;
  };
  generatedAt: string;
}

/* ------------------------- config maps ------------------------- */
const METHOD_BG: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DELETE: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  PUT: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

const PERMISSION_COLORS: Record<string, string> = {
  read: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  write: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  admin: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const EVENT_COLORS: Record<string, string> = {
  "payment.received": "bg-emerald-500/15 text-emerald-400",
  "payment.completed": "bg-emerald-500/15 text-emerald-400",
  "payment.failed": "bg-rose-500/15 text-rose-400",
  "transfer.completed": "bg-sky-500/15 text-sky-400",
  "transfer.failed": "bg-rose-500/15 text-rose-400",
  "kyc.approved": "bg-emerald-500/15 text-emerald-400",
  "kyc.rejected": "bg-rose-500/15 text-rose-400",
  "kyc.under_review": "bg-amber-500/15 text-amber-400",
  "fraud.detected": "bg-rose-500/15 text-rose-400",
  "fraud.review": "bg-amber-500/15 text-amber-400",
  "fraud.cleared": "bg-emerald-500/15 text-emerald-400",
};

/* =========================================================
 *  Main view
 * ========================================================= */
export function DeveloperPortalView() {
  const { data, loading, reload } = useFetch<DeveloperData>("/api/developer-portal");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Developer Portal</h1>
            <p className="text-sm text-muted-foreground">
              API keys · Webhooks · Usage analytics · Endpoints · Sandbox testing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
            <Terminal className="h-3 w-3 mr-1" /> v1.4.2
          </Badge>
          <Button size="sm" variant="outline" onClick={() => reload()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("API documentation exported (Markdown)")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
      </motion.div>

      {loading || !data ? (
        <DeveloperSkeleton />
      ) : (
        <Tabs defaultValue="keys">
          <TabsList className="flex-wrap h-auto bg-muted/50">
            <TabsTrigger value="keys" className="gap-1.5">
              <Key className="h-4 w-4" /> API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-1.5">
              <Webhook className="h-4 w-4" /> Webhooks
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5">
              <Activity className="h-4 w-4" /> Usage
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="gap-1.5">
              <Server className="h-4 w-4" /> Endpoints
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-1.5">
              <FlaskConical className="h-4 w-4" /> Sandbox
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="mt-5">
            <ApiKeysTab data={data} />
          </TabsContent>
          <TabsContent value="webhooks" className="mt-5">
            <WebhooksTab data={data} />
          </TabsContent>
          <TabsContent value="usage" className="mt-5">
            <UsageTab data={data} />
          </TabsContent>
          <TabsContent value="endpoints" className="mt-5">
            <EndpointsTab data={data} />
          </TabsContent>
          <TabsContent value="sandbox" className="mt-5">
            <SandboxTab data={data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* =========================================================
 *  Tab 1: API Keys
 * ========================================================= */
function ApiKeysTab({ data }: { data: DeveloperData }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [newKey, setNewKey] = useState<{ name: string; permissions: string[]; environment: string }>({
    name: "", permissions: ["read"], environment: "production",
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newKey.name.trim()) {
      toast.error("API key name is required");
      return;
    }
    const prefix = newKey.environment === "production" ? "gxp_live" : "gxp_test";
    const randomPart = Array.from({ length: 32 }, () =>
      "0123456789abcdef"[hash % 16]
    ).join("");
    const fullKey = `${prefix}_${randomPart}`;
    setCreatedKey(fullKey);
    setCreateOpen(false);
    toast.success(`API key "${newKey.name}" created`);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success("Copied to clipboard");
  };

  const togglePermission = (perm: string) => {
    setNewKey((k) => ({
      ...k,
      permissions: k.permissions.includes(perm)
        ? k.permissions.filter((p) => p !== perm)
        : [...k.permissions, perm],
    }));
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Key} label="Total Keys" value={data.apiKeys.length}
          accent="emerald" sub={`${data.apiKeys.filter((k) => k.status === "active").length} active`}
        />
        <SummaryCard
          icon={Zap} label="Requests Today"
          value={data.apiKeys.reduce((s, k) => s + k.requestsToday, 0)}
          accent="teal" sub="across all keys"
        />
        <SummaryCard
          icon={AlertTriangle} label="Revoked"
          value={data.apiKeys.filter((k) => k.status === "revoked").length}
          accent="rose" sub="disabled keys"
        />
        <SummaryCard
          icon={ShieldCheck} label="Admin Keys"
          value={data.apiKeys.filter((k) => k.permissions.includes("admin")).length}
          accent="amber" sub="full access"
        />
      </div>

      {/* API Keys table */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-500" /> API Keys
            </h3>
            <p className="text-xs text-muted-foreground">
              Manage authentication keys for programmatic API access
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create new API key</DialogTitle>
                <DialogDescription>
                  Generate a new API key. You will only see the full key once — store it securely.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="keyname">Key name</Label>
                  <Input
                    id="keyname" placeholder="e.g. Production backend"
                    value={newKey.name}
                    onChange={(e) => setNewKey((k) => ({ ...k, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="keyenv">Environment</Label>
                  <Select
                    value={newKey.environment}
                    onValueChange={(v) => setNewKey((k) => ({ ...k, environment: v }))}
                  >
                    <SelectTrigger id="keyenv"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production (gxp_live_)</SelectItem>
                      <SelectItem value="sandbox">Sandbox (gxp_test_)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="mt-1.5 space-y-2 rounded-lg border bg-muted/30 p-3">
                    {[
                      { id: "read", label: "Read", desc: "GET endpoints — read payments, wallets, transactions" },
                      { id: "write", label: "Write", desc: "POST/PATCH — initiate payments, transfers, swaps" },
                      { id: "admin", label: "Admin", desc: "Full access — manage keys, webhooks, settings" },
                    ].map((p) => (
                      <label key={p.id} className="flex items-start gap-2.5 cursor-pointer">
                        <Checkbox
                          checked={newKey.permissions.includes(p.id)}
                          onCheckedChange={() => togglePermission(p.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-600">
                  <Lock className="h-3 w-3 inline mr-1" />
                  This key will have access to all data the selected permissions allow. Choose carefully.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>
                  <Key className="h-4 w-4 mr-1.5" /> Generate Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Name</th>
                <th className="pb-2 pr-3 font-medium">Key</th>
                <th className="pb-2 pr-3 font-medium">Permissions</th>
                <th className="pb-2 pr-3 font-medium">Created</th>
                <th className="pb-2 pr-3 font-medium">Last Used</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium text-right">Requests Today</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.apiKeys.map((k, i) => (
                <motion.tr
                  key={k.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold",
                        k.environment === "production"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      )}>
                        {k.environment === "production" ? "L" : "T"}
                      </div>
                      <div>
                        <p className="font-medium">{k.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{k.environment}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                        {revealed[k.id] ? k.fullKey : k.key}
                      </code>
                      <button
                        onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                        className="text-muted-foreground hover:text-foreground"
                        title={revealed[k.id] ? "Hide" : "Reveal"}
                      >
                        {revealed[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(revealed[k.id] ? k.fullKey : k.fullKey, k.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy"
                      >
                        {copiedId === k.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {k.permissions.map((p) => (
                        <span
                          key={p}
                          className={cn(
                            "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            PERMISSION_COLORS[p]
                          )}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {new Date(k.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {timeAgoShort(k.lastUsed)}
                  </td>
                  <td className="py-3 pr-3">
                    {k.status === "active" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-500/30 text-rose-600">
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" /> Revoked
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums font-medium">
                    {fmtNum(k.requestsToday)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toast.info("Edit API key permissions (demo)")}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                        onClick={() => toast.error(`API key "${k.name}" has been revoked (demo)`)}
                        disabled={k.status === "revoked"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Created key dialog */}
      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              API key created
            </DialogTitle>
            <DialogDescription>
              Copy your new API key now. For security reasons, this is the only time the full key will be shown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border bg-muted/40 p-3">
              <code className="block break-all font-mono text-sm text-emerald-600">{createdKey}</code>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm" className="flex-1"
                onClick={() => {
                  if (createdKey) {
                    navigator.clipboard?.writeText(createdKey);
                    toast.success("API key copied to clipboard");
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-1.5" /> Copy Key
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCreatedKey(null)}>
                Done
              </Button>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-600">
              <Lock className="h-3 w-3 inline mr-1" />
              Treat this key like a password. Never commit it to version control or expose it in client-side code.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================
 *  Tab 2: Webhooks
 * ========================================================= */
function WebhooksTab({ data }: { data: DeveloperData }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newHook, setNewHook] = useState<{ url: string; events: string[] }>({
    url: "", events: ["payment.received"],
  });
  const [statuses, setStatuses] = useState<Record<string, "active" | "paused">>(
    Object.fromEntries(data.webhooks.map((w) => [w.id, w.status]))
  );

  const ALL_EVENTS = [
    "payment.received", "payment.completed", "payment.failed",
    "transfer.completed", "transfer.failed",
    "kyc.approved", "kyc.rejected", "kyc.under_review",
    "fraud.detected", "fraud.review", "fraud.cleared",
  ];

  const toggleEvent = (ev: string) => {
    setNewHook((h) => ({
      ...h,
      events: h.events.includes(ev) ? h.events.filter((e) => e !== ev) : [...h.events, ev],
    }));
  };

  const handleAdd = () => {
    if (!newHook.url.trim() || !newHook.url.startsWith("http")) {
      toast.error("Please enter a valid URL starting with https://");
      return;
    }
    if (newHook.events.length === 0) {
      toast.error("Select at least one event to subscribe to");
      return;
    }
    setAddOpen(false);
    toast.success(`Webhook registered for ${newHook.events.length} event(s)`);
    setNewHook({ url: "", events: ["payment.received"] });
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Webhook} label="Endpoints"
          value={data.webhooks.length} accent="emerald"
          sub={`${data.webhooks.filter((w) => statuses[w.id] === "active").length} active`}
        />
        <SummaryCard
          icon={Send} label="Total Deliveries"
          value={data.webhooks.reduce((s, w) => s + w.totalDeliveries, 0)}
          accent="teal" sub="lifetime"
        />
        <SummaryCard
          icon={CheckCircle2} label="Avg Success"
          value={(data.webhooks.reduce((s, w) => s + w.successRate, 0) / data.webhooks.length).toFixed(1)}
          suffix="%" accent="emerald" sub="across all endpoints"
        />
        <SummaryCard
          icon={Clock} label="Last Delivery"
          value={Math.min(...data.webhooks
            .filter((w) => w.lastDelivery)
            .map((w) => Math.floor((Date.now() - new Date(w.lastDelivery!).getTime()) / 60000)))}
          suffix="m ago" accent="amber" sub="most recent"
        />
      </div>

      {/* Webhook list */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Webhook className="h-4 w-4 text-emerald-500" /> Webhook Endpoints
            </h3>
            <p className="text-xs text-muted-foreground">
              Receive real-time event notifications at your endpoints
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Register webhook endpoint</DialogTitle>
                <DialogDescription>
                  We will POST event payloads to this URL. Respond with a 2xx status within 10 seconds.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="hookurl">Endpoint URL</Label>
                  <Input
                    id="hookurl" placeholder="https://api.yourapp.com/webhooks/gaexpay"
                    value={newHook.url}
                    onChange={(e) => setNewHook((h) => ({ ...h, url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Events to subscribe</Label>
                  <div className="mt-1.5 grid grid-cols-1 gap-1.5 rounded-lg border bg-muted/30 p-3 max-h-60 overflow-y-auto no-scrollbar">
                    {ALL_EVENTS.map((ev) => (
                      <label key={ev} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={newHook.events.includes(ev)}
                          onCheckedChange={() => toggleEvent(ev)}
                        />
                        <code className="text-xs">{ev}</code>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd}>
                  <Webhook className="h-4 w-4 mr-1.5" /> Register
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {data.webhooks.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card-lift rounded-xl border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <code className="text-sm font-mono truncate">{w.url}</code>
                    {statuses[w.id] === "active" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-600">
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> Paused
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {w.events.map((ev) => (
                      <span
                        key={ev}
                        className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                          EVENT_COLORS[ev] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span><Clock className="h-3 w-3 inline mr-1" />Last: {timeAgoShort(w.lastDelivery)}</span>
                    <span><Send className="h-3 w-3 inline mr-1" />{fmtNum(w.totalDeliveries)} deliveries</span>
                    <span className={cn(
                      w.successRate >= 95 ? "text-emerald-600" : w.successRate >= 85 ? "text-amber-600" : "text-rose-600"
                    )}>
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      {w.successRate.toFixed(1)}% success
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Active</span>
                    <Switch
                      checked={statuses[w.id] === "active"}
                      onCheckedChange={(checked) => {
                        setStatuses((s) => ({ ...s, [w.id]: checked ? "active" : "paused" }));
                        toast.info(`Webhook ${checked ? "activated" : "paused"}`);
                      }}
                    />
                  </div>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => toast.success("Test event sent — awaiting response (demo)")}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Test
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700"
                    onClick={() => toast.error("Webhook deleted (demo)")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Recent deliveries */}
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-emerald-500" /> Recent Deliveries
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Last {data.recentDeliveries.length} webhook deliveries across all endpoints
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Event</th>
                <th className="pb-2 pr-3 font-medium">URL</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Duration</th>
                <th className="pb-2 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="max-h-96 overflow-y-auto no-scrollbar">
              {data.recentDeliveries.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="py-2.5 pr-3">
                    <span className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                      EVENT_COLORS[d.event] ?? "bg-muted text-muted-foreground"
                    )}>
                      {d.event}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <code className="text-xs text-muted-foreground truncate max-w-[220px] inline-block align-bottom">
                      {d.url}
                    </code>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium",
                      d.statusCode >= 200 && d.statusCode < 300
                        ? "bg-emerald-500/15 text-emerald-600"
                        : d.statusCode >= 400 && d.statusCode < 500
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-rose-500/15 text-rose-600"
                    )}>
                      {d.success ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {d.statusCode}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs tabular-nums text-muted-foreground">
                    {d.durationMs < 1000 ? `${d.durationMs}ms` : `${(d.durationMs / 1000).toFixed(2)}s`}
                  </td>
                  <td className="py-2.5 text-right text-xs text-muted-foreground">
                    {timeAgoShort(d.timestamp)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Tab 3: Usage
 * ========================================================= */
function UsageTab({ data }: { data: DeveloperData }) {
  const u = data.usage;
  const rl = data.rateLimits;

  const gaugeData = [
    {
      name: "Rate Limit",
      value: Math.min((rl.currentHourUsage / rl.currentHourLimit) * 100, 100),
      fill: (rl.currentHourUsage / rl.currentHourLimit) > 0.8 ? "#f43f5e"
        : (rl.currentHourUsage / rl.currentHourLimit) > 0.6 ? "#f59e0b" : "#10b981",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Hero stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/50 to-slate-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat
            icon={Activity} label="Total Requests (30d)"
            value={u.totalRequests30d} accent="emerald"
          />
          <HeroStat
            icon={AlertOctagon} label="Error Rate"
            value={u.errorRate} suffix="%" decimals={2} accent={u.errorRate < 1 ? "emerald" : "amber"}
          />
          <HeroStat
            icon={Gauge} label="Avg Response"
            value={u.avgResponseMs} suffix="ms" accent="teal"
          />
          <HeroStat
            icon={Server} label="Endpoints Used"
            value={u.uniqueEndpoints} accent="sky"
          />
        </div>
      </motion.div>

      {/* Charts row 1 */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* 14-day request volume area chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Request Volume (14 days)
              </h3>
              <p className="text-xs text-muted-foreground">Daily API requests with error overlay</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
              Peak: {fmtCompact(u.peakDayRequests)}
            </Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={u.requestsByDay} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="gradReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradErr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#1e293b" }} tickLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  formatter={(v: number) => fmtNum(v)}
                />
                <Area
                  type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2}
                  fill="url(#gradReq)" name="Requests"
                />
                <Area
                  type="monotone" dataKey="errors" stroke="#f43f5e" strokeWidth={2}
                  fill="url(#gradErr)" name="Errors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Rate limit gauge */}
        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-1">
            <Gauge className="h-4 w-4 text-emerald-500" /> Rate Limit Usage
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Current hour vs Pro tier limit</p>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="68%" outerRadius="100%" data={gaugeData}
                startAngle={90} endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "#1e293b" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <AnimatedNumber
                value={(rl.currentHourUsage / rl.currentHourLimit) * 100}
                decimals={1} suffix="%"
                className="text-3xl font-bold tabular-nums"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {fmtNum(rl.currentHourUsage)} / {fmtNum(rl.currentHourLimit)} req/hr
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xs text-muted-foreground">Resets in</p>
            <p className="text-lg font-semibold tabular-nums">{rl.resetInMinutes}m</p>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Requests by endpoint bar chart */}
        <Card className="p-5 lg:col-span-3">
          <h3 className="font-semibold flex items-center gap-2 mb-1">
            <Server className="h-4 w-4 text-emerald-500" /> Requests by Endpoint (Top 10)
          </h3>
          <p className="text-xs text-muted-foreground mb-4">30-day aggregated request count</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={u.requestsByEndpoint}
                layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gradBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number" tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                <YAxis
                  type="category" dataKey="endpoint"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false} tickLine={false} width={140}
                />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  formatter={(v: number) => fmtNum(v)}
                  cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                />
                <Bar dataKey="count" fill="url(#gradBar)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status code pie */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold flex items-center gap-2 mb-1">
            <AlertOctagon className="h-4 w-4 text-emerald-500" /> Status Code Distribution
          </h3>
          <p className="text-xs text-muted-foreground mb-4">30-day response status breakdown</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={u.usageByStatusCode} dataKey="count" nameKey="label"
                  innerRadius={50} outerRadius={85} paddingAngle={3}
                >
                  {u.usageByStatusCode.map((e) => (
                    <Cell key={e.code} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  formatter={(v: number) => fmtNum(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {u.usageByStatusCode.map((s) => (
              <div key={s.code} className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] font-medium uppercase">{s.code}</span>
                </div>
                <p className="text-sm font-semibold tabular-nums mt-1">{fmtCompact(s.count)}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Rate limit tiers */}
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-1">
          <Cpu className="h-4 w-4 text-emerald-500" /> Rate Limit Tiers
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Compare plans and current usage · your plan is{" "}
          <span className="font-medium text-emerald-600">{rl.currentTier}</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {rl.tiers.map((t, i) => {
            const isCurrent = t.tier === rl.currentTier;
            return (
              <motion.div
                key={t.tier}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "card-lift rounded-xl border p-4",
                  isCurrent ? "border-emerald-500/40 bg-emerald-500/5" : "bg-card"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{t.tier}</h4>
                  {isCurrent && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                      <Star className="h-3 w-3 mr-1" /> Current
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold tabular-nums">{t.price}</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Hourly limit</span>
                    <span className="font-medium tabular-nums">{fmtNum(t.limitPerHour)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Monthly limit</span>
                    <span className="font-medium tabular-nums">{fmtNum(t.limitPerMonth)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Current usage</span>
                    <span className={cn(
                      "font-medium tabular-nums",
                      t.usagePct > 80 ? "text-rose-600" : t.usagePct > 60 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {t.usagePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        t.usagePct > 80 ? "bg-rose-500" : t.usagePct > 60 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(t.usagePct, 100)}%` }}
                    />
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    size="sm" variant="outline" className="w-full mt-3"
                    onClick={() => toast.info(`Upgrade to ${t.tier} (demo)`)}
                  >
                    {t.tier === "Free" ? "Downgrade" : "Upgrade"}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Tab 4: Endpoints
 * ========================================================= */
function EndpointsTab({ data }: { data: DeveloperData }) {
  const [search, setSearch] = useState("");
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointEntry | null>(null);
  const [codeTab, setCodeTab] = useState<"curl" | "javascript" | "python">("curl");

  const filtered = data.endpoints
    .map((g) => ({
      ...g,
      endpoints: g.endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(search.toLowerCase()) ||
          e.description.toLowerCase().includes(search.toLowerCase()) ||
          e.method.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((g) => g.endpoints.length > 0);

  const totalCount = data.endpoints.reduce((s, g) => s + g.endpoints.length, 0);
  const filteredCount = filtered.reduce((s, g) => s + g.endpoints.length, 0);

  const generateCode = (ep: EndpointEntry | null, lang: "curl" | "javascript" | "python") => {
    if (!ep) return "";
    const baseUrl = "https://api.gaexpay.com";
    const cleanPath = ep.path.replace(/\{[^}]+\}/g, "sample_id");
    if (lang === "curl") {
      const body = ep.method === "POST" || ep.method === "PATCH" || ep.method === "PUT"
        ? ` \\\n  -d '{"amount": 50000, "currency": "NGN"}' \\\n  -H "Content-Type: application/json"`
        : "";
      return `curl -X ${ep.method} ${baseUrl}${cleanPath} \\
  -H "Authorization: Bearer gxp_live_xxxxxxxx"${body}`;
    }
    if (lang === "javascript") {
      const body = ep.method === "POST" || ep.method === "PATCH" || ep.method === "PUT"
        ? `,\n  body: JSON.stringify({ amount: 50000, currency: 'NGN' })`
        : "";
      return `const res = await fetch('${baseUrl}${cleanPath}', {
  method: '${ep.method}',
  headers: {
    'Authorization': 'Bearer gxp_live_xxxxxxxx',
    'Content-Type': 'application/json',
  }${body}
});

const data = await res.json();
console.log(data);`;
    }
    const body = ep.method === "POST" || ep.method === "PATCH" || ep.method === "PUT"
      ? `,\n    json={'amount': 50000, 'currency': 'NGN'}`
      : "";
    return `import requests

url = '${baseUrl}${cleanPath}'
headers = {
    'Authorization': 'Bearer gxp_live_xxxxxxxx',
    'Content-Type': 'application/json',
}

response = requests.${ep.method.toLowerCase()}(url, headers=headers${body})
print(response.json())`;
  };

  return (
    <div className="space-y-5">
      {/* Quick start + auth card */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-emerald-500" /> Quick Start Guide
          </h3>
          <div className="space-y-3">
            {data.documentation.quickStart.map((qs) => (
              <div key={qs.step} className="flex gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600">
                  {qs.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{qs.title}</p>
                  <p className="text-xs text-muted-foreground">{qs.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-emerald-500" /> Authentication
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {data.documentation.authentication.description}
          </p>
          <div className="rounded-lg bg-slate-900 border border-slate-700 p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
            {data.documentation.authentication.header}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase">Production</p>
              <code className="text-xs">{data.documentation.baseUrls.production}</code>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase">Sandbox</p>
              <code className="text-xs">{data.documentation.baseUrls.sandbox}</code>
            </div>
          </div>
        </Card>
      </div>

      {/* Endpoints search */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-500" /> API Endpoints
            </h3>
            <p className="text-xs text-muted-foreground">
              {filteredCount} of {totalCount} endpoints · grouped by category
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Input
              placeholder="Search endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
            <Server className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-5">
          {filtered.map((group, gi) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-sm font-semibold">{group.category}</h4>
                <Badge variant="outline" className="text-[10px]">{group.endpoints.length}</Badge>
              </div>
              <div className="space-y-1.5">
                {group.endpoints.map((ep) => (
                  <button
                    key={`${ep.method}-${ep.path}`}
                    onClick={() => setActiveEndpoint(ep)}
                    className="card-lift flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-all hover:border-emerald-500/40"
                  >
                    <span
                      className={cn(
                        "inline-flex w-16 shrink-0 justify-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        METHOD_BG[ep.method]
                      )}
                    >
                      {ep.method}
                    </span>
                    <code className="text-sm font-mono shrink-0">{ep.path}</code>
                    <span className="flex-1 text-xs text-muted-foreground truncate hidden sm:block">
                      {ep.description}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Server className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No endpoints match &ldquo;{search}&rdquo;</p>
            </div>
          )}
        </div>
      </Card>

      {/* Error codes + SDKs */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <AlertOctagon className="h-4 w-4 text-emerald-500" /> Error Codes
          </h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
            {data.documentation.errorCodes.map((err) => (
              <div
                key={err.code}
                className="flex items-start gap-3 rounded-lg border bg-card p-2.5"
              >
                <span className={cn(
                  "inline-flex w-12 shrink-0 justify-center rounded font-mono text-xs font-bold py-0.5",
                  Number(err.code) < 300 ? "bg-emerald-500/15 text-emerald-600"
                    : Number(err.code) < 500 ? "bg-amber-500/15 text-amber-600"
                    : "bg-rose-500/15 text-rose-600"
                )}>
                  {err.code}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{err.name}</p>
                  <p className="text-xs text-muted-foreground">{err.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <FileCode2 className="h-4 w-4 text-emerald-500" /> Official SDKs
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.documentation.sdks.map((sdk) => (
              <div key={sdk.name} className="card-lift rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-md text-[10px] font-bold text-white"
                    style={{ background: sdk.color }}
                  >
                    {sdk.icon}
                  </span>
                  <span className="text-sm font-medium">{sdk.name}</span>
                </div>
                <code className="block text-[10px] text-muted-foreground break-all">{sdk.install}</code>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Endpoint detail dialog */}
      <Dialog open={!!activeEndpoint} onOpenChange={(o) => !o && setActiveEndpoint(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeEndpoint && (
                <span
                  className={cn(
                    "inline-flex w-16 justify-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    METHOD_BG[activeEndpoint.method]
                  )}
                >
                  {activeEndpoint.method}
                </span>
              )}
              <code className="font-mono">{activeEndpoint?.path}</code>
            </DialogTitle>
            <DialogDescription>{activeEndpoint?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-1">
              {(["curl", "javascript", "python"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCodeTab(lang)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    codeTab === lang
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {lang === "curl" ? "cURL" : lang === "javascript" ? "JavaScript" : "Python"}
                </button>
              ))}
            </div>
            <pre className="rounded-lg bg-slate-900 border border-slate-700 p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-80 overflow-y-auto no-scrollbar">
              <code>{generateCode(activeEndpoint, codeTab)}</code>
            </pre>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">
                <p>Base URL: <code className="text-foreground">https://api.gaexpay.com</code></p>
                <p>Auth: Bearer token in <code className="text-foreground">Authorization</code> header</p>
              </div>
              <Button
                size="sm"
                onClick={() => toast.success("Test request sent to sandbox (demo)")}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" /> Try it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================
 *  Tab 5: Sandbox
 * ========================================================= */
function SandboxTab({ data }: { data: DeveloperData }) {
  const sb = data.sandbox;
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("/v1/payments");
  const [requestMethod, setRequestMethod] = useState<string>("POST");
  const [requestBody, setRequestBody] = useState<string>(
    `{
  "amount": 50000,
  "currency": "NGN",
  "recipient": "rec_abc123",
  "reference": "test_order_001"
}`
  );
  const [response, setResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const runTestRequest = () => {
    setSending(true);
    setResponse(null);
    setTimeout(() => {
      const mockResponses: Record<string, any> = {
        "/v1/payments": {
          id: "pay_sandbox_8x2k9f3a",
          status: "pending",
          amount: 50000,
          currency: "NGN",
          reference: "test_order_001",
          created_at: new Date().toISOString(),
          sandbox: true,
        },
        "/v1/transfers": {
          id: "trf_sandbox_9k3l4m5n",
          status: "processing",
          amount: 50000,
          currency: "NGN",
          fee: 250,
          estimated_completion: new Date(Date.now() + 3600000).toISOString(),
        },
        "/v1/cards": {
          id: "card_sandbox_2j8h5k3d",
          type: "virtual",
          status: "active",
          last4: "1111",
          brand: "Visa",
          exp_month: 12,
          exp_year: 2027,
        },
        "/v1/crypto/swap": {
          id: "swap_sandbox_5n2k8j1h",
          status: "completed",
          from: { asset: "BTC", amount: 0.001 },
          to: { asset: "USDT", amount: 62.45 },
          rate: 62450,
          fee: 0.05,
        },
        "/v1/kyc/submit": {
          id: "kyc_sandbox_3k9m2n7p",
          status: "under_review",
          tier: 2,
          estimated_review_time: "4-24 hours",
        },
        "/v1/webhooks": {
          id: "wh_sandbox_8h4j2k5l",
          url: "https://example.com/webhook",
          status: "active",
          events: ["payment.received", "payment.completed"],
          created_at: new Date().toISOString(),
        },
      };
      const resp = mockResponses[selectedEndpoint] ?? {
        status: "success",
        message: "Sandbox response",
        timestamp: new Date().toISOString(),
      };
      setResponse(JSON.stringify(resp, null, 2));
      setSending(false);
      toast.success("Test request completed (sandbox)");
    }, 1100);
  };

  const allEndpoints = data.endpoints.flatMap((g) =>
    g.endpoints.map((e) => ({ ...e, category: g.category }))
  );
  const endpointOptions = allEndpoints.filter((e) => e.method === requestMethod);

  return (
    <div className="space-y-5">
      {/* Sandbox balance */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/50 to-slate-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-emerald-300">
                <FlaskConical className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/80">
                  Sandbox Balance
                </p>
                <p className="text-[11px] text-slate-400">
                  Last reset {timeAgoShort(sb.lastReset)} · {fmtNum(sb.totalTestRequests)} test requests
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(sb.balance).map(([cur, amount]) => (
                <div key={cur} className="rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2">
                  <p className="text-[10px] uppercase text-slate-400">{cur}</p>
                  <p className="text-lg font-bold tabular-nums text-white">
                    {fmtMoney(amount, cur)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => toast.success("Sandbox reset — balances restored to defaults")}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Sandbox
          </Button>
        </div>
      </motion.div>

      {/* Test request runner */}
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-1">
          <Terminal className="h-4 w-4 text-emerald-500" /> Test Request Runner
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Send test requests to the GaexPay sandbox API
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={requestMethod} onValueChange={(v) => {
                setRequestMethod(v);
                const first = allEndpoints.find((e) => e.method === v);
                if (first) setSelectedEndpoint(first.path);
              }}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PATCH", "DELETE"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {endpointOptions.map((e) => (
                    <SelectItem key={e.path} value={e.path}>
                      {e.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Request body (JSON)</Label>
              <Textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="font-mono text-xs h-48"
                disabled={requestMethod === "GET" || requestMethod === "DELETE"}
                placeholder={requestMethod === "GET" || requestMethod === "DELETE" ? "No body required for this method" : "{}"}
              />
            </div>
            <Button
              className="w-full"
              onClick={runTestRequest}
              disabled={sending}
            >
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1.5" /> Send Test Request
                </>
              )}
            </Button>
          </div>
          <div>
            <Label>Response</Label>
            <div className="rounded-lg bg-slate-900 border border-slate-700 p-3 h-[calc(100%-24px)] min-h-[280px] overflow-y-auto no-scrollbar">
              {response ? (
                <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                  <code>{response}</code>
                </pre>
              ) : sending ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Send a request to see the response</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Test data */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Test cards */}
        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-emerald-500" /> Test Cards
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Use these cards to simulate payment flows
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
            {sb.testCards.map((c, i) => (
              <div key={i} className="rounded-lg border bg-card p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{c.brand}</span>
                  <Badge variant="outline" className={cn(
                    "text-[9px] border-0",
                    c.behavior.includes("succeeds") ? "bg-emerald-500/15 text-emerald-600"
                      : c.behavior.includes("declines") || c.behavior.includes("Insufficient") ? "bg-rose-500/15 text-rose-600"
                      : "bg-amber-500/15 text-amber-600"
                  )}>
                    {c.behavior}
                  </Badge>
                </div>
                <code className="block text-xs font-mono">{c.number}</code>
                <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span>CVV: {c.cvv}</span>
                  <span>EXP: {c.exp}</span>
                  <button
                    className="text-emerald-600 hover:underline ml-auto"
                    onClick={() => {
                      navigator.clipboard?.writeText(c.number);
                      toast.success("Card number copied");
                    }}
                  >
                    <Copy className="h-3 w-3 inline mr-0.5" />Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Test phones */}
        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-1">
            <Phone className="h-4 w-4 text-emerald-500" /> Test Phone Numbers
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Simulate OTP delivery & SMS flows
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
            {sb.testPhones.map((p, i) => (
              <div key={i} className="rounded-lg border bg-card p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{p.label}</span>
                  <button
                    className="text-emerald-600 hover:underline text-[10px]"
                    onClick={() => {
                      navigator.clipboard?.writeText(p.number);
                      toast.success("Phone number copied");
                    }}
                  >
                    <Copy className="h-3 w-3 inline mr-0.5" />Copy
                  </button>
                </div>
                <code className="block text-xs font-mono">{p.number}</code>
                <p className="text-[10px] text-muted-foreground mt-1">{p.behavior}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Test banks */}
        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-emerald-500" /> Test Bank Accounts
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Resolve & simulate bank transfers
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
            {sb.testBanks.map((b, i) => (
              <div key={i} className="rounded-lg border bg-card p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{b.bank}</span>
                  <Badge variant="outline" className={cn(
                    "text-[9px] border-0",
                    b.behavior.includes("Valid") ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-rose-500/15 text-rose-600"
                  )}>
                    {b.behavior}
                  </Badge>
                </div>
                <code className="block text-xs font-mono">{b.accountNumber}</code>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Account name: <span className="font-medium text-foreground">{b.name}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================
 *  Shared components
 * ========================================================= */
function SummaryCard({
  icon: Icon, label, value, sub, suffix, decimals, accent,
}: {
  icon: any; label: string; value: number; sub?: string;
  suffix?: string; decimals?: number;
  accent: "emerald" | "teal" | "sky" | "amber" | "rose";
}) {
  const colorMap = {
    emerald: "from-emerald-500 to-emerald-600 text-emerald-500",
    teal: "from-teal-500 to-teal-600 text-teal-500",
    sky: "from-sky-500 to-sky-600 text-sky-500",
    amber: "from-amber-500 to-amber-600 text-amber-500",
    rose: "from-rose-500 to-rose-600 text-rose-500",
  };
  const [grad, text] = colorMap[accent].split(" text-");
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-lift rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white", grad)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">
        <AnimatedNumber value={value} decimals={decimals ?? 0} suffix={suffix ?? ""} />
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function HeroStat({
  icon: Icon, label, value, suffix, decimals, accent,
}: {
  icon: any; label: string; value: number; suffix?: string; decimals?: number;
  accent: "emerald" | "teal" | "sky" | "amber" | "rose";
}) {
  const colorMap = {
    emerald: "text-emerald-300 bg-white/10",
    teal: "text-teal-300 bg-white/10",
    sky: "text-sky-300 bg-white/10",
    amber: "text-amber-300 bg-white/10",
    rose: "text-rose-300 bg-white/10",
  };
  return (
    <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg", colorMap[accent])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-white">
        <AnimatedNumber value={value} decimals={decimals ?? 0} suffix={suffix ?? ""} />
      </p>
    </div>
  );
}

/* =========================================================
 *  Skeleton
 * ========================================================= */
function DeveloperSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-10 w-80 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
