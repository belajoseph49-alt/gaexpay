"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Save, Trash2, Play, Loader2, Eye, EyeOff, Star, Key,
  Plus, X, AlertTriangle, CheckCircle2, Settings2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SERVICES, getServiceMeta, type ApiConfig, type ApiConfigWithCreds,
} from "./data";

interface Props {
  open: boolean;
  config: ApiConfigWithCreds | null;
  onClose: () => void;
  onSaved: () => void;
  onTest: (c: ApiConfig) => void;
}

interface FormState {
  service: string;
  name: string;
  provider: string;
  baseUrl: string;
  webhookUrl: string;
  environment: string;
  credentials: Record<string, string>;
  rateLimitPerMin: string;
  rateLimitPerDay: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
  isDefault: boolean;
}

const emptyForm: FormState = {
  service: "payment",
  name: "",
  provider: "",
  baseUrl: "",
  webhookUrl: "",
  environment: "sandbox",
  credentials: {},
  rateLimitPerMin: "",
  rateLimitPerDay: "",
  description: "",
  category: "",
  icon: "",
  enabled: false,
  isDefault: false,
};

export function ApiEditModal({ open, config, onClose, onSaved }: Props) {
  const isCreating = open && !config;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState("basic");

  // Load form when config changes
  useEffect(() => {
    if (!open) return;
    if (config) {
      let creds: Record<string, string> = {};
      try {
        const parsed = JSON.parse(config.credentials || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          creds = parsed as Record<string, string>;
        }
      } catch {
        creds = {};
      }
      setForm({
        service: config.service,
        name: config.name,
        provider: config.provider || "",
        baseUrl: config.baseUrl || "",
        webhookUrl: config.webhookUrl || "",
        environment: config.environment,
        credentials: creds,
        rateLimitPerMin: config.rateLimitPerMin?.toString() || "",
        rateLimitPerDay: config.rateLimitPerDay?.toString() || "",
        description: config.description || "",
        category: config.category || "",
        icon: config.icon || "",
        enabled: config.enabled,
        isDefault: config.isDefault,
      });
      setTab("basic");
    } else {
      setForm(emptyForm);
      setTab("basic");
    }
  }, [config, open]);

  // When service changes (and we're creating), reset credentials to empty fields
  // matching the new service template
  const serviceMeta = useMemo(() => getServiceMeta(form.service), [form.service]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateCred = (key: string, value: string) => {
    setForm(prev => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: value },
    }));
  };

  const addCredField = () => {
    const key = prompt("Credential field name (e.g. apiKey):");
    if (!key) return;
    if (form.credentials[key] !== undefined) {
      toast.error("Field already exists");
      return;
    }
    setForm(prev => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: "" },
    }));
  };

  const removeCredField = (key: string) => {
    setForm(prev => {
      const next = { ...prev.credentials };
      delete next[key];
      return { ...prev, credentials: next };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      setTab("basic");
      return;
    }
    if (!form.service) {
      toast.error("Service category is required");
      setTab("basic");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        service: form.service,
        name: form.name.trim(),
        provider: form.provider.trim() || null,
        baseUrl: form.baseUrl.trim() || null,
        webhookUrl: form.webhookUrl.trim() || null,
        environment: form.environment,
        credentials: form.credentials,
        rateLimitPerMin: form.rateLimitPerMin ? parseInt(form.rateLimitPerMin, 10) : null,
        rateLimitPerDay: form.rateLimitPerDay ? parseInt(form.rateLimitPerDay, 10) : null,
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        icon: form.icon.trim() || null,
        enabled: form.enabled,
        isDefault: form.isDefault,
      };

      const url = config
        ? `/api/admin/api-configs/${config.id}`
        : "/api/admin/api-configs";
      const method = config ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      toast.success(config ? "API configuration updated" : "API configuration created");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {config ? `Edit: ${config.name}` : "Add New API Configuration"}
          </DialogTitle>
          <DialogDescription>
            {config
              ? `Modify credentials, environment, rate limits, and settings for this ${getServiceMeta(config.service).label} integration.`
              : "Configure a new external service integration. Choose a service category to see relevant credential fields."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="creds">
              <Key className="h-3.5 w-3.5 mr-1.5" /> Credentials
            </TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-3 pr-1 -mr-1">
            {/* ----- Basic tab ----- */}
            <TabsContent value="basic" className="mt-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="service">Service Category <span className="text-rose-500">*</span></Label>
                  <Select value={form.service} onValueChange={(v) => update("service", v)}>
                    <SelectTrigger id="service">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map(s => {
                        const m = getServiceMeta(s);
                        const Icon = m.icon;
                        return (
                          <SelectItem key={s} value={s}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {m.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="e.g. Payment Provider Production"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="provider">Provider</Label>
                  <Input
                    id="provider"
                    placeholder="e.g. provider_name, sms_api"
                    value={form.provider}
                    onChange={(e) => update("provider", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="environment">Environment</Label>
                  <Select value={form.environment} onValueChange={(v) => update("environment", v)}>
                    <SelectTrigger id="environment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox / Test</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.example.com/v1"
                  value={form.baseUrl}
                  onChange={(e) => update("baseUrl", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="webhookUrl">Webhook URL (optional)</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://gaexpay.com/api/webhooks/provider"
                  value={form.webhookUrl}
                  onChange={(e) => update("webhookUrl", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What this API is used for..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category (UI grouping)</Label>
                  <Input
                    id="category"
                    placeholder="e.g. Payment Processing"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="icon">Icon name (optional)</Label>
                  <Input
                    id="icon"
                    placeholder="lucide icon name e.g. credit-card"
                    value={form.icon}
                    onChange={(e) => update("icon", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(v) => update("enabled", v)}
                    id="enabled"
                  />
                  <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isDefault}
                    onCheckedChange={(v) => update("isDefault", v)}
                    id="default"
                  />
                  <Label htmlFor="default" className="cursor-pointer flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" /> Default for {serviceMeta.label}
                  </Label>
                </div>
              </div>
            </TabsContent>

            {/* ----- Credentials tab ----- */}
            <TabsContent value="creds" className="mt-0 space-y-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-start gap-2">
                  <Key className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Credentials for {serviceMeta.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {serviceMeta.description}. Fields are encrypted at rest. Values are never logged in plaintext — only masked versions appear in API logs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Template fields from service meta */}
              {serviceMeta.credentialFields.map((field) => (
                <CredentialField
                  key={field.key}
                  fieldKey={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  type={field.type}
                  value={form.credentials[field.key] || ""}
                  showSecret={!!showSecrets[field.key]}
                  onToggleShow={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                  onChange={(v) => updateCred(field.key, v)}
                  isTemplate
                />
              ))}

              {/* Additional custom fields */}
              {Object.keys(form.credentials)
                .filter(k => !serviceMeta.credentialFields.find(f => f.key === k))
                .map((key) => (
                  <CredentialField
                    key={key}
                    fieldKey={key}
                    label={key}
                    value={form.credentials[key] || ""}
                    showSecret={!!showSecrets[key]}
                    onToggleShow={() => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))}
                    onChange={(v) => updateCred(key, v)}
                    onRemove={() => removeCredField(key)}
                  />
                ))}

              <Button variant="outline" size="sm" onClick={addCredField} className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Custom Field
              </Button>
            </TabsContent>

            {/* ----- Advanced tab ----- */}
            <TabsContent value="advanced" className="mt-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rateMin">Rate Limit / minute</Label>
                  <Input
                    id="rateMin"
                    type="number"
                    placeholder="100"
                    value={form.rateLimitPerMin}
                    onChange={(e) => update("rateLimitPerMin", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rateDay">Rate Limit / day</Label>
                  <Input
                    id="rateDay"
                    type="number"
                    placeholder="10000"
                    value={form.rateLimitPerDay}
                    onChange={(e) => update("rateLimitPerDay", e.target.value)}
                  />
                </div>
              </div>

              {config && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Danger Zone</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                        Deleting this API configuration will also delete all of its API logs. This cannot be undone.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                        onClick={() => {
                          onClose();
                          // The parent handles delete via the list view's delete button;
                          // for the modal we just close.
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete from list view
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {config && (
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-xs">
                  <p className="font-medium text-foreground">Monitoring Stats</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Total requests:</span>{" "}
                      <span className="font-medium tabular-nums">{(config.totalRequests ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed:</span>{" "}
                      <span className="font-medium tabular-nums text-rose-600">{(config.failedRequests ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last used:</span>{" "}
                      <span className="font-medium">{config.lastUsedAt ? new Date(config.lastUsedAt).toLocaleString() : "never"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last error:</span>{" "}
                      <span className="font-medium">{config.lastErrorAt ? new Date(config.lastErrorAt).toLocaleString() : "—"}</span>
                    </div>
                  </div>
                  {config.lastError && (
                    <div className="rounded bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-700 dark:text-rose-400 break-all">
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      {config.lastError}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-3 mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {config ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Single credential input ----------
function CredentialField({
  fieldKey, label, placeholder, type = "text", value, showSecret,
  onToggleShow, onChange, onRemove, isTemplate,
}: {
  fieldKey: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
  value: string;
  showSecret: boolean;
  onToggleShow: () => void;
  onChange: (v: string) => void;
  onRemove?: () => void;
  isTemplate?: boolean;
}) {
  const isSecret = type === "password";
  const displayType = isSecret && !showSecret ? "password" : "text";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={`cred-${fieldKey}`} className="text-xs">
          {label}
          {!isTemplate && (
            <Badge variant="outline" className="ml-1.5 text-[9px] h-3.5 px-1">custom</Badge>
          )}
        </Label>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-muted-foreground hover:text-rose-600 transition-colors"
            title="Remove field"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="relative">
        <Input
          id={`cred-${fieldKey}`}
          type={displayType}
          placeholder={placeholder || `Enter ${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={isSecret ? "pr-9" : ""}
        />
        {isSecret && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
