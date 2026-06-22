"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Save, RefreshCw, Building2, Wrench, UserPlus, Gauge, Palette, Boxes,
} from "lucide-react";
import { LANGUAGES, CURRENCIES, COUNTRIES } from "@/lib/gaexpay";
import { SectionHeader, LoadingGrid, apiAction, showError } from "./shared";

const TIMEZONES = ["Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Casablanca", "UTC", "America/New_York", "Europe/London"];

export function SystemSettingsSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/system-settings");
  const [saving, setSaving] = useState(false);

  // Local editable copy
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  if (data && Object.keys(draft).length === 0 && data.settings) {
    setDraft(JSON.parse(JSON.stringify(data.settings)));
  }

  function setVal(group: string, key: string, value: string) {
    setDraft((d) => ({ ...d, [group]: { ...(d[group] ?? {}), [key]: value } }));
  }

  async function save(group: string) {
    setSaving(true);
    const updates = draft[group];
    // Convert known-boolean values back from string
    const normalized: Record<string, unknown> = { ...updates };
    if (normalized["maintenance.enabled"] !== undefined) normalized["maintenance.enabled"] = normalized["maintenance.enabled"] === "true";
    if (normalized["registration.allowNewSignups"] !== undefined) normalized["registration.allowNewSignups"] = normalized["registration.allowNewSignups"] === "true";
    if (normalized["registration.requireEmailVerification"] !== undefined) normalized["registration.requireEmailVerification"] = normalized["registration.requireEmailVerification"] === "true";

    const r = await apiAction("/api/admin/system-settings", "PATCH", { updates: normalized }, `${group} settings saved`);
    if (!r.ok) showError(r.error || "Failed");
    setSaving(false);
    if (r.ok) reload();
  }

  if (loading || !data || Object.keys(draft).length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader title="System Settings" description="Platform configuration" icon={Settings} />
        <LoadingGrid count={3} className="grid-cols-1 lg:grid-cols-2" />
      </div>
    );
  }

  const general = draft["general"] ?? {};
  const maintenance = draft["maintenance"] ?? {};
  const registration = draft["registration"] ?? {};
  const limits = draft["limits"] ?? {};
  const branding = draft["branding"] ?? {};

  return (
    <div className="space-y-4">
      <SectionHeader
        title="System Settings"
        description="Platform configuration — general, maintenance, registration, limits & branding"
        icon={Settings}
        actions={<Button size="sm" variant="outline" onClick={reload}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* General */}
        <Card className="p-5">
          <header className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-500/15 text-slate-600"><Building2 className="h-4 w-4" /></div>
            <div>
              <h3 className="font-semibold">General</h3>
              <p className="text-xs text-muted-foreground">Platform identity</p>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform Name" className="col-span-2">
              <Input value={general["general.platformName"] ?? ""} onChange={(e) => setVal("general", "general.platformName", e.target.value)} />
            </Field>
            <Field label="Support Email">
              <Input type="email" value={general["general.supportEmail"] ?? ""} onChange={(e) => setVal("general", "general.supportEmail", e.target.value)} />
            </Field>
            <Field label="Support Phone">
              <Input value={general["general.supportPhone"] ?? ""} onChange={(e) => setVal("general", "general.supportPhone", e.target.value)} />
            </Field>
            <Field label="Default Language">
              <SelectInput value={general["general.defaultLanguage"] ?? "en"} onChange={(v) => setVal("general", "general.defaultLanguage", v)} options={LANGUAGES.map((l) => ({ value: l.code, label: `${l.flag} ${l.name}` }))} />
            </Field>
            <Field label="Default Currency">
              <SelectInput value={general["general.defaultCurrency"] ?? "NGN"} onChange={(v) => setVal("general", "general.defaultCurrency", v)} options={CURRENCIES.slice(0, 12).map((c) => ({ value: c.code, label: `${c.flag} ${c.code} — ${c.name}` }))} />
            </Field>
            <Field label="Timezone" className="col-span-2">
              <SelectInput value={general["general.timezone"] ?? "Africa/Lagos"} onChange={(v) => setVal("general", "general.timezone", v)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
            </Field>
          </div>
          <SaveRow onSave={() => save("general")} saving={saving} />
        </Card>

        {/* Maintenance */}
        <Card className="p-5">
          <header className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-amber-600"><Wrench className="h-4 w-4" /></div>
            <div>
              <h3 className="font-semibold">Maintenance</h3>
              <p className="text-xs text-muted-foreground">Maintenance mode & schedule</p>
            </div>
          </header>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Disable user access while updating</p>
              </div>
              <Switch
                checked={maintenance["maintenance.enabled"] === "true"}
                onCheckedChange={(v) => setVal("maintenance", "maintenance.enabled", String(v))}
              />
            </div>
            <Field label="Maintenance Message">
              <Input value={maintenance["maintenance.message"] ?? ""} onChange={(e) => setVal("maintenance", "maintenance.message", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Window Start">
                <Input type="datetime-local" value={maintenance["maintenance.windowStart"] ?? ""} onChange={(e) => setVal("maintenance", "maintenance.windowStart", e.target.value)} />
              </Field>
              <Field label="Window End">
                <Input type="datetime-local" value={maintenance["maintenance.windowEnd"] ?? ""} onChange={(e) => setVal("maintenance", "maintenance.windowEnd", e.target.value)} />
              </Field>
            </div>
          </div>
          <SaveRow onSave={() => save("maintenance")} saving={saving} />
        </Card>

        {/* Registration */}
        <Card className="p-5">
          <header className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600"><UserPlus className="h-4 w-4" /></div>
            <div>
              <h3 className="font-semibold">Registration</h3>
              <p className="text-xs text-muted-foreground">Signups & verification</p>
            </div>
          </header>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Allow New Signups</p>
                <p className="text-xs text-muted-foreground">Enable account registration</p>
              </div>
              <Switch
                checked={registration["registration.allowNewSignups"] === "true"}
                onCheckedChange={(v) => setVal("registration", "registration.allowNewSignups", String(v))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Require Email Verification</p>
                <p className="text-xs text-muted-foreground">Send OTP on signup</p>
              </div>
              <Switch
                checked={registration["registration.requireEmailVerification"] === "true"}
                onCheckedChange={(v) => setVal("registration", "registration.requireEmailVerification", String(v))}
              />
            </div>
            <Field label="Allowed Countries (comma-separated codes)">
              <Input
                value={parseCountries(registration["registration.allowedCountries"])}
                onChange={(e) => setVal("registration", "registration.allowedCountries", JSON.stringify(e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)))}
                placeholder="NG, GH, CI, …"
              />
            </Field>
            <div className="flex flex-wrap gap-1">
              {parseCountriesArr(registration["registration.allowedCountries"]).map((c: string) => (
                <Badge key={c} variant="outline" className="text-[10px] font-mono">
                  {COUNTRIES.find((cc) => cc.code === c)?.flag ?? "🌍"} {c}
                </Badge>
              ))}
            </div>
          </div>
          <SaveRow onSave={() => save("registration")} saving={saving} />
        </Card>

        {/* Limits */}
        <Card className="p-5">
          <header className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500/15 text-orange-600"><Gauge className="h-4 w-4" /></div>
            <div>
              <h3 className="font-semibold">Default Limits</h3>
              <p className="text-xs text-muted-foreground">Platform-wide defaults (overridden by KYC tier)</p>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default Daily Transfer (NGN)">
              <Input type="number" value={limits["limits.defaultDailyTransfer"] ?? 0} onChange={(e) => setVal("limits", "limits.defaultDailyTransfer", e.target.value)} />
            </Field>
            <Field label="Default Monthly Limit (NGN)">
              <Input type="number" value={limits["limits.defaultMonthlyLimit"] ?? 0} onChange={(e) => setVal("limits", "limits.defaultMonthlyLimit", e.target.value)} />
            </Field>
            <Field label="Max Wallets per User" className="col-span-2">
              <Input type="number" value={limits["limits.maxWalletCountPerUser"] ?? 5} onChange={(e) => setVal("limits", "limits.maxWalletCountPerUser", e.target.value)} />
            </Field>
          </div>
          <SaveRow onSave={() => save("limits")} saving={saving} />
        </Card>

        {/* Branding */}
        <Card className="p-5 lg:col-span-2">
          <header className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-pink-500/15 text-pink-600"><Palette className="h-4 w-4" /></div>
            <div>
              <h3 className="font-semibold">Branding</h3>
              <p className="text-xs text-muted-foreground">Logo & color theme</p>
            </div>
          </header>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Logo URL" className="col-span-2 lg:col-span-2">
              <Input value={branding["branding.logoUrl"] ?? ""} onChange={(e) => setVal("branding", "branding.logoUrl", e.target.value)} />
            </Field>
            <Field label="Preview">
              <div className="grid h-10 place-items-center rounded-lg border bg-muted/40">
                {branding["branding.logoUrl"] ? (
                  <img src={branding["branding.logoUrl"]} alt="logo" className="h-7 object-contain" />
                ) : <span className="text-xs text-muted-foreground">No logo</span>}
              </div>
            </Field>
            <Field label="Primary Color">
              <div className="flex gap-2">
                <input type="color" value={branding["branding.primaryColor"] ?? "#10b981"} onChange={(e) => setVal("branding", "branding.primaryColor", e.target.value)} className="h-9 w-12 rounded-md border bg-transparent cursor-pointer" />
                <Input value={branding["branding.primaryColor"] ?? ""} onChange={(e) => setVal("branding", "branding.primaryColor", e.target.value)} />
              </div>
            </Field>
            <Field label="Secondary Color">
              <div className="flex gap-2">
                <input type="color" value={branding["branding.secondaryColor"] ?? "#0ea5e9"} onChange={(e) => setVal("branding", "branding.secondaryColor", e.target.value)} className="h-9 w-12 rounded-md border bg-transparent cursor-pointer" />
                <Input value={branding["branding.secondaryColor"] ?? ""} onChange={(e) => setVal("branding", "branding.secondaryColor", e.target.value)} />
              </div>
            </Field>
          </div>
          <SaveRow onSave={() => save("branding")} saving={saving} />
        </Card>

        {/* Features shortcut */}
        <Card className="p-5 lg:col-span-2">
          <header className="flex items-center gap-2 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/15 text-indigo-600"><Boxes className="h-4 w-4" /></div>
            <div>
              <h3 className="font-semibold">Feature Flags</h3>
              <p className="text-xs text-muted-foreground">Manage which platform modules are visible</p>
            </div>
          </header>
          <p className="text-sm text-muted-foreground">
            Feature flags are managed in <Badge variant="outline" className="text-[10px]">Modules & Features</Badge> under the Configuration section.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SaveRow({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="mt-4 flex justify-end">
      <Button size="sm" onClick={onSave} disabled={saving}>
        <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function parseCountries(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join(", ") : raw;
  } catch { return raw; }
}
function parseCountriesArr(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
