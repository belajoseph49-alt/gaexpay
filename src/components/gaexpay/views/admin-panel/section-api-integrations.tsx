"use client";

/**
 * section-api-integrations.tsx
 *
 * Admin section: API & Integrations — manage third-party OAuth and messaging
 * credentials for Google, Facebook, and WhatsApp Business.
 *
 * Each card reads its keys from /api/admin/system-settings (category
 * `integrations`) and persists changes via PATCH on the same endpoint.
 * The Google / Facebook "Test" buttons open the OAuth start URL in a new
 * tab to verify the credentials work end-to-end. The WhatsApp "Test" button
 * POSTs to /api/admin/integrations/whatsapp-test which sends a real test
 * message via the Graph API.
 */

import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound, Save, RefreshCw, ExternalLink, Loader2, Eye, EyeOff,
  CheckCircle2, XCircle, MessageCircle,
} from "lucide-react";
import { SectionHeader, LoadingGrid, apiAction, showError } from "./shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type IntegrationsSettings = Record<string, string>;

// Mask helper — replaces the middle of a secret with ••• for display.
function maskSecret(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "•".repeat(Math.max(8, value.length - 8)) + value.slice(-4);
}

export function ApiIntegrationsSection() {
  const { data, loading, reload } = useFetch<{ settings: Record<string, IntegrationsSettings> }>(
    "/api/admin/system-settings",
  );
  const [draft, setDraft] = useState<IntegrationsSettings>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [whatsappTesting, setWhatsappTesting] = useState(false);

  // Sync draft from server data once available.
  useEffect(() => {
    if (data?.settings?.integrations) {
      setDraft({ ...data.settings.integrations });
    }
  }, [data]);

  function setVal(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function saveCard(cardId: string, keys: string[]) {
    setSaving((s) => ({ ...s, [cardId]: true }));
    const updates: Record<string, string> = {};
    for (const k of keys) {
      // Only save if the user has actually edited the field — we don't want
      // to overwrite a stored secret with the masked display value.
      const val = draft[k];
      if (val !== undefined && !val.includes("•")) {
        updates[k] = val;
      }
    }
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      setSaving((s) => ({ ...s, [cardId]: false }));
      return;
    }
    const r = await apiAction(
      "/api/admin/system-settings",
      "PATCH",
      { updates },
      `${cardId} settings saved`,
    );
    if (!r.ok) showError(r.error || "Failed");
    setSaving((s) => ({ ...s, [cardId]: false }));
    if (r.ok) reload();
  }

  async function testWhatsapp() {
    if (whatsappTesting) return;
    setWhatsappTesting(true);
    try {
      const res = await fetch("/api/admin/integrations/whatsapp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        const msg = data?.error || `HTTP ${res.status}`;
        toast.error(`WhatsApp test failed: ${msg}`);
      } else {
        toast.success("WhatsApp test message sent successfully");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    } finally {
      setWhatsappTesting(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="API & Integrations" description="OAuth + WhatsApp credentials" icon={KeyRound} />
        <LoadingGrid count={3} className="grid-cols-1 lg:grid-cols-2" />
      </div>
    );
  }

  const googleRedirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/google/callback`
      : "/api/auth/google/callback";
  const facebookRedirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/facebook/callback`
      : "/api/auth/facebook/callback";

  // For convenience: status badge for each card based on whether the
  // primary credential is set.
  const googleConfigured = !!(draft.google_client_id && draft.google_client_secret);
  const facebookConfigured = !!(draft.facebook_app_id && draft.facebook_app_secret);
  const whatsappConfigured = !!(
    draft.whatsapp_access_token && draft.whatsapp_phone_number_id
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="API & Integrations"
        description="OAuth providers and WhatsApp Business credentials — stored as system settings"
        icon={KeyRound}
        actions={
          <Button size="sm" variant="outline" onClick={reload}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------- GOOGLE ---------- */}
        <Card className="p-5">
          <CardHeader
            title="Google OAuth"
            subtitle="Sign in with Google"
            icon={<GoogleIcon className="h-4 w-4" />}
            iconColor="bg-white border border-input text-[#4285F4]"
            configured={googleConfigured}
          />
          <div className="space-y-3">
            <SecretField
              label="Client ID"
              value={draft.google_client_id ?? ""}
              onChange={(v) => setVal("google_client_id", v)}
              placeholder="xxxxx.apps.googleusercontent.com"
              masked={false}
            />
            <SecretField
              label="Client Secret"
              value={draft.google_client_secret ?? ""}
              onChange={(v) => setVal("google_client_secret", v)}
              placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
              masked
            />
            <ReadonlyField label="Redirect URI" value={googleRedirectUri} />
          </div>
          <CardActions
            saving={saving.google ?? false}
            onSave={() => saveCard("google", ["google_client_id", "google_client_secret", "google_redirect_uri"])}
            onTest={() => {
              // Save the redirect URI to system settings first (so the OAuth
              // handler can read it back if needed), then open the start URL.
              setVal("google_redirect_uri", googleRedirectUri);
              void saveCard("google", ["google_redirect_uri"]);
              window.open("/api/auth/google", "_blank", "noopener,noreferrer");
            }}
            testLabel="Test"
          />
        </Card>

        {/* ---------- FACEBOOK ---------- */}
        <Card className="p-5">
          <CardHeader
            title="Facebook OAuth"
            subtitle="Sign in with Facebook"
            icon={<FacebookIcon className="h-4 w-4" />}
            iconColor="bg-[#1877F2] text-white"
            configured={facebookConfigured}
          />
          <div className="space-y-3">
            <SecretField
              label="App ID"
              value={draft.facebook_app_id ?? ""}
              onChange={(v) => setVal("facebook_app_id", v)}
              placeholder="1234567890123456"
              masked={false}
            />
            <SecretField
              label="App Secret"
              value={draft.facebook_app_secret ?? ""}
              onChange={(v) => setVal("facebook_app_secret", v)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              masked
            />
            <ReadonlyField label="Redirect URI" value={facebookRedirectUri} />
          </div>
          <CardActions
            saving={saving.facebook ?? false}
            onSave={() => saveCard("facebook", ["facebook_app_id", "facebook_app_secret", "facebook_redirect_uri"])}
            onTest={() => {
              setVal("facebook_redirect_uri", facebookRedirectUri);
              void saveCard("facebook", ["facebook_redirect_uri"]);
              window.open("/api/auth/facebook", "_blank", "noopener,noreferrer");
            }}
            testLabel="Test"
          />
        </Card>

        {/* ---------- WHATSAPP BUSINESS ---------- */}
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            title="WhatsApp Business"
            subtitle="Send transactional + marketing messages via the Cloud API"
            icon={<MessageCircle className="h-4 w-4" />}
            iconColor="bg-[#25D366] text-white"
            configured={whatsappConfigured}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <SecretField
              label="Access Token"
              value={draft.whatsapp_access_token ?? ""}
              onChange={(v) => setVal("whatsapp_access_token", v)}
              placeholder="EAAG…"
              masked
            />
            <SecretField
              label="Phone Number ID"
              value={draft.whatsapp_phone_number_id ?? ""}
              onChange={(v) => setVal("whatsapp_phone_number_id", v)}
              placeholder="123456789012345"
              masked={false}
            />
            <SecretField
              label="Business Account ID"
              value={draft.whatsapp_business_account_id ?? ""}
              onChange={(v) => setVal("whatsapp_business_account_id", v)}
              placeholder="123456789012345"
              masked={false}
            />
            <SecretField
              label="Webhook Secret"
              value={draft.whatsapp_webhook_secret ?? ""}
              onChange={(v) => setVal("whatsapp_webhook_secret", v)}
              placeholder="whsec_xxxxxxxxxxxx"
              masked
            />
          </div>
          <CardActions
            saving={saving.whatsapp ?? false}
            onSave={() =>
              saveCard("whatsapp", [
                "whatsapp_access_token",
                "whatsapp_phone_number_id",
                "whatsapp_business_account_id",
                "whatsapp_webhook_secret",
              ])
            }
            onTest={testWhatsapp}
            testLabel="Send test message"
            testing={whatsappTesting}
          />
        </Card>
      </div>

      {/* Helpful reminder */}
      <Card className="p-4">
        <div className="flex items-start gap-3 text-xs text-muted-foreground">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="space-y-1 leading-relaxed">
            <p>
              <strong className="text-foreground">OAuth redirect URIs</strong> — register the exact URLs above
              in your Google Cloud Console (APIs & Services → Credentials → Authorized redirect URIs) and
              Facebook for Developers (App Settings → Advanced → OAuth redirect URIs).
            </p>
            <p>
              <strong className="text-foreground">Secrets</strong> are stored in the SystemSetting table as
              plain text. For production, rotate the database encryption key regularly and restrict admin
              access via RBAC.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small inline icons — same as auth-modal.tsx, duplicated to keep the admin
// section self-contained.
// ---------------------------------------------------------------------------
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function CardHeader({
  title, subtitle, icon, iconColor, configured,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  configured: boolean;
}) {
  return (
    <header className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg", iconColor)}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Badge variant="outline" className={cn(
        "text-[10px] gap-1",
        configured
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          : "bg-muted/40 text-muted-foreground border-border",
      )}>
        {configured ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {configured ? "Configured" : "Not configured"}
      </Badge>
    </header>
  );
}

function SecretField({
  label, value, onChange, placeholder, masked,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  masked: boolean;
}) {
  const [show, setShow] = useState(false);
  // Display the masked version when the field is a secret and the user hasn't
  // started editing. Once they type, we show the real value.
  const [editing, setEditing] = useState(false);
  const displayValue = masked && !editing && value ? maskSecret(value) : value;
  const isCurrentlyMasked = masked && !editing && value;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={masked && !show ? "password" : "text"}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            setEditing(true);
            onChange(e.target.value);
          }}
          onFocus={() => {
            // If the user focuses a masked secret, reveal it so they can see
            // what they're editing. They can re-hide with the eye toggle.
            if (isCurrentlyMasked) setShow(true);
          }}
          className={cn(
            "h-10 rounded-lg pr-9 text-sm",
            isCurrentlyMasked && "font-mono tracking-wider",
          )}
        />
        {masked && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted"
            aria-label={show ? "Hide" : "Show"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex h-10 items-center gap-1.5 rounded-lg border border-input bg-muted/40 px-3">
        <code className="flex-1 truncate text-xs text-muted-foreground">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="rounded-md p-1 text-xs font-medium text-primary transition hover:bg-primary/10"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function CardActions({
  saving, onSave, onTest, testLabel, testing,
}: {
  saving: boolean;
  onSave: () => void;
  onTest: () => void;
  testLabel: string;
  testing?: boolean;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={onTest} disabled={testing}>
        {testing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1.5" />}
        {testLabel}
      </Button>
      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
