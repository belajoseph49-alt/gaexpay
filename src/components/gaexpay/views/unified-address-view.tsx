"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign, Mail, Phone, Hash, Copy, Check, Share2, Download, QrCode,
  Bitcoin, Smartphone, Landmark, Link as LinkIcon, Wallet as WalletIcon,
  Search, ChevronRight, ShieldCheck, Sparkles, ArrowDownToLine, RefreshCw,
  MessageCircle, Twitter, Send, Loader2, BadgeCheck, Zap, Globe2, Lock,
  TrendingUp, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useFetch } from "@/hooks/use-fetch";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

// ---- Types ---------------------------------------------------------------

type CryptoAddress = {
  code: string;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  address: string;
  network: string;
  memo?: string;
};

type AddressItem = {
  value: string;
  label: string;
  description: string;
  shareable: boolean;
};

type PaymentMethod = {
  id: string;
  name: string;
  description: string;
  fee: string;
  time: string;
  icon: string;
  accent: string;
  supports: string[];
  providers?: string[];
  coins?: string[];
};

type IncomingTx = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  fee: number;
  type: string;
  method: string | null;
  description: string;
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
};

type ResolveResult = {
  found: boolean;
  identifier: string;
  detectedType?: string;
  matchedField?: string;
  message?: string;
  profile?: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    initials: string;
    avatar: string | null;
    username: string | null;
    atHandle: string;
    emailMasked: string;
    phoneMasked: string;
    country: string;
    city: string | null;
    kycStatus: string;
    kycTier: number;
    verified: boolean;
    status: string;
    isSelf: boolean;
  };
  supportedMethods?: { id: string; name: string; fee: string; time: string }[];
};

// ---- Accent color map (kept local so the linter doesn't complain) --------

const ACCENT: Record<string, { bg: string; text: string; ring: string }> = {
  emerald: { bg: "bg-violet-500/15", text: "text-violet-500", ring: "ring-violet-500/30" },
  sky: { bg: "bg-sky-500/15", text: "text-sky-500", ring: "ring-sky-500/30" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-500", ring: "ring-amber-500/30" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-500", ring: "ring-violet-500/30" },
  teal: { bg: "bg-purple-500/15", text: "text-purple-500", ring: "ring-purple-500/30" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-500", ring: "ring-rose-500/30" },
};

function MethodIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "wallet": return <WalletIcon className={className} />;
    case "landmark": return <Landmark className={className} />;
    case "smartphone": return <Smartphone className={className} />;
    case "bitcoin": return <Bitcoin className={className} />;
    case "qr": return <QrCode className={className} />;
    case "link": return <LinkIcon className={className} />;
    default: return <WalletIcon className={className} />;
  }
}

// ---- Component -----------------------------------------------------------

export function UnifiedAddressView() {
  const { t } = useTranslation();
  const { data, loading, reload } = useFetch<any>("/api/unified-address");

  return (
    <div className="space-y-6">
      <HeaderStrip onReload={reload} loading={loading} />

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : !data ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Unable to load your unified address.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={reload}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
          </Button>
        </Card>
      ) : (
        <>
          <HeroCard data={data} />
          <AddressCardsGrid addresses={data.addresses} />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <QrCodeSection data={data} />
            <RecipientLookup addressData={data} />
          </div>
          <CryptoAddressesSection addresses={data.cryptoAddresses} />
          <PaymentMethodsGrid methods={data.supportedPaymentMethods} />
          <HowItWorks />
          <RecentIncoming incoming={data.recentIncoming} stats={data.stats} />
        </>
      )}
    </div>
  );
}

// ---- Header --------------------------------------------------------------

function HeaderStrip({ onReload, loading }: { onReload: () => void; loading: boolean }) {
  const { t } = useTranslation();
  const { setView } = useApp();
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("unifiedAddress.title")}</h1>
          <Badge className="bg-violet-500/15 text-violet-500 border-violet-500/30 hover:bg-violet-500/20">
            <AtSign className="h-3 w-3 mr-1" /> Universal
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          One identifier. <span className="text-foreground font-medium">All payment types</span> — crypto, fiat, mobile money & bank.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onReload} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
        <Button size="sm" onClick={() => setView("send")}>
          <Send className="h-4 w-4 mr-1.5" /> Send Money
        </Button>
      </div>
    </div>
  );
}

// ---- Hero ----------------------------------------------------------------

function HeroCard({ data }: { data: any }) {
  const { user, shareableLink } = data;
  const [copiedLink, setCopiedLink] = useState(false);

  const copyLink = () => {
    navigator.clipboard?.writeText(shareableLink);
    setCopiedLink(true);
    toast.success("Payment link copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${user.fullName} on GaexPay`,
          text: `Send me money on GaexPay — ${user.atHandle}. Any payment type, instant & free between GaexPay wallets.`,
          url: shareableLink,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
        {/* Glow blobs */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl" />
        <div className="absolute right-32 top-10 h-20 w-20 rounded-full bg-purple-500/10 blur-xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className="bg-violet-500/20 text-violet-violet-300 border-violet-500/40 hover:bg-violet-500/30">
                <Sparkles className="h-3 w-3 mr-1" /> Receives all payment types
              </Badge>
              {user.verified && (
                <Badge className="bg-white/10 text-white border-white/20 backdrop-blur">
                  <BadgeCheck className="h-3 w-3 mr-1 text-cyan-300" /> Verified
                </Badge>
              )}
              <Badge className="bg-white/10 text-white border-white/20 backdrop-blur">
                <ShieldCheck className="h-3 w-3 mr-1 text-violet-violet-300" /> KYC Tier {user.kycTier}
              </Badge>
            </div>

            <p className="text-xs font-medium uppercase tracking-wider text-violet-violet-300/80">
              Your GaexPay tag
            </p>
            <h2 className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight break-all">
              {user.atHandle}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {user.fullName} · {user.city ? `${user.city}, ` : ""}{user.country}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur ring-1 ring-white/15">
                <LinkIcon className="h-4 w-4 text-violet-violet-300 shrink-0" />
                <span className="font-mono text-xs sm:text-sm truncate">{shareableLink}</span>
              </div>
              <Button
                variant="secondary"
                className="bg-white text-slate-900 hover:bg-white/90 shrink-0"
                onClick={copyLink}
              >
                {copiedLink
                  ? <><Check className="h-4 w-4 mr-1.5" /> Copied</>
                  : <><Copy className="h-4 w-4 mr-1.5" /> Copy link</>}
              </Button>
              <Button
                variant="secondary"
                className="bg-violet-500 text-white hover:bg-violet-600 shrink-0 border-0"
                onClick={share}
              >
                <Share2 className="h-4 w-4 mr-1.5" /> Share
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-violet-violet-300" /> Instant · Free between GaexPay wallets</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-purple-300" /> 40 countries · 32 currencies</span>
              <span className="inline-flex items-center gap-1.5"><Bitcoin className="h-3.5 w-3.5 text-amber-300" /> 8 cryptos supported</span>
            </div>
          </div>

          {/* Avatar + at-handle visual */}
          <div className="flex lg:flex-col items-center gap-4 lg:gap-3 lg:pl-6">
            <Avatar className="h-20 w-20 ring-4 ring-violet-500/40 shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-2xl font-bold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-xs text-white/50">Permanent ID</p>
              <p className="font-mono text-sm font-semibold text-white">{user.gaexPayId}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ---- Address Cards Grid --------------------------------------------------

function AddressCardsGrid({ addresses }: { addresses: Record<string, AddressItem> }) {
  const cards = [
    { key: "atHandle", icon: AtSign, accent: "violet" as const, label: "@username" },
    { key: "email", icon: Mail, accent: "sky" as const, label: "Email" },
    { key: "phone", icon: Phone, accent: "amber" as const, label: "Phone" },
    { key: "gaexPayId", icon: Hash, accent: "violet" as const, label: "GaexPay ID" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => {
        const item = addresses[c.key];
        if (!item) return null;
        const Icon = c.icon;
        const accent = ACCENT[c.accent];
        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <AddressCard
              icon={<Icon className="h-5 w-5" />}
              accent={accent}
              label={item.label}
              value={item.value}
              description={item.description}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function AddressCard({
  icon, accent, label, value, description,
}: {
  icon: React.ReactNode;
  accent: { bg: string; text: string; ring: string };
  label: string;
  value: string;
  description: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Card className="group relative overflow-hidden p-5 card-lift h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg ring-1", accent.bg, accent.text, accent.ring)}>
          {icon}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-60 hover:opacity-100 transition"
          onClick={copy}
          aria-label={`Copy ${label}`}
        >
          {copied
            ? <Check className="h-3.5 w-3.5 text-violet-500" />
            : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold break-all leading-tight">{value}</p>
      <p className="mt-auto pt-3 text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}

// ---- QR Code section -----------------------------------------------------

function QrCodeSection({ data }: { data: any }) {
  const { user, qrCode, shareableLink } = data;
  const [showCompact, setShowCompact] = useState(false);

  const download = () => {
    const url = showCompact ? qrCode.compactDataUrl : qrCode.dataUrl;
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaexpay-qr-${user.username}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR code downloaded");
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Pay me on GaexPay — ${user.atHandle}. Send crypto, fiat, mobile money or bank transfer to one address: ${shareableLink}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Pay me on GaexPay — ${user.atHandle}`);
    const body = encodeURIComponent(
      `Hi,\n\nYou can pay me on GaexPay using any of these:\n\n` +
      `• Tag: ${user.atHandle}\n` +
      `• Email: ${user.email}\n` +
      `• Phone: ${user.phone}\n` +
      `• GaexPay ID: ${user.gaexPayId}\n` +
      `• Payment link: ${shareableLink}\n\n` +
      `GaexPay accepts crypto, bank transfer, mobile money & wallet payments to one address.\n\n— ${user.fullName}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareableLink);
    toast.success("Payment link copied");
  };

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <QrCode className="h-4 w-4 text-violet-500" /> Payment QR Code
          </h3>
          <p className="text-xs text-muted-foreground">Scan to pay — works for any payment type</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 text-xs">
          <button
            onClick={() => setShowCompact(false)}
            className={cn(
              "px-2.5 py-1 rounded-md transition",
              !showCompact ? "bg-background shadow-sm font-medium" : "text-muted-foreground",
            )}
          >
            Full link
          </button>
          <button
            onClick={() => setShowCompact(true)}
            className={cn(
              "px-2.5 py-1 rounded-md transition",
              showCompact ? "bg-background shadow-sm font-medium" : "text-muted-foreground",
            )}
          >
            Tag only
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <motion.div
          key={showCompact ? "compact" : "full"}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-violet-500/20"
        >
          {/* qrcode library returns a data URL — no Next/Image optimization needed */}
          <img
            src={showCompact ? qrCode.compactDataUrl : qrCode.dataUrl}
            alt={`QR code for ${user.atHandle}`}
            className="h-52 w-52 sm:h-56 sm:w-56"
          />
        </motion.div>

        <div className="text-center">
          <p className="font-mono text-base font-bold">{user.atHandle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {showCompact ? user.atHandle : shareableLink}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 w-full">
          <Button size="sm" className="flex-1 min-w-[120px]" onClick={download}>
            <Download className="h-4 w-4 mr-1.5" /> Download
          </Button>
          <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={shareWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={shareEmail}>
            <Mail className="h-4 w-4 mr-1.5" /> Email
          </Button>
          <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-1.5" /> Copy link
          </Button>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-violet-700 dark:text-violet-violet-300">
          <Lock className="h-3.5 w-3.5" />
          <span>QR is encoded with your GaexPay payment link — scanning opens a secure payment screen.</span>
        </div>
      </div>
    </Card>
  );
}

// ---- Recipient lookup (uses /api/unified-address/resolve) ----------------

function RecipientLookup({ addressData }: { addressData?: any }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setView, setSendPrefill } = useApp();

  const lookup = async (identifier?: string) => {
    const q = (identifier ?? query).trim();
    if (!q) {
      toast.error("Enter an email, phone, @username or GaexPay ID");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/unified-address/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: q }),
        cache: "no-store",
      });
      const data: ResolveResult = await res.json();
      if (!res.ok) {
        setError(data.message || "Lookup failed");
        return;
      }
      setResult(data);
      if (data.found && data.profile?.isSelf) {
        toast.info("That's you! Try another identifier.");
      } else if (data.found) {
        toast.success(`Found ${data.profile?.fullName}`);
      } else {
        toast.error("No user found for that identifier");
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  // Sample lookup chips — derived from actual user data
  const samples = addressData?.addresses
    ? [
        addressData.addresses.atHandle?.value,
        addressData.addresses.email?.value,
        addressData.addresses.phone?.value,
        addressData.addresses.gaexpayId?.value,
      ].filter(Boolean).slice(0, 4)
    : [];

  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-violet-500" /> Look up a recipient
        </h3>
        <p className="text-xs text-muted-foreground">Resolve any GaexPay address to a profile</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
          placeholder="@username · email · phone · GXP-ID"
          className="font-mono text-sm"
        />
        <Button onClick={() => lookup()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); lookup(s); }}
            className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:bg-muted/70 hover:text-foreground transition"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400"
            >
              {error}
            </motion.div>
          )}

          {result && result.found && result.profile && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                    {result.profile.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold truncate">{result.profile.fullName}</p>
                    {result.profile.verified && (
                      <BadgeCheck className="h-4 w-4 text-purple-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {result.profile.atHandle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.profile.city ? `${result.profile.city}, ` : ""}{result.profile.country}
                    {" · "}KYC Tier {result.profile.kycTier}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-card/50 p-3 text-xs space-y-1.5">
                <Row label="Email" value={result.profile.emailMasked} />
                <Row label="Phone" value={result.profile.phoneMasked} />
                <Row label="Matched by" value={result.matchedField} />
                <Row label="Status" value={
                  <span className={cn(
                    "font-medium",
                    result.profile.status === "active" ? "text-violet-600" : "text-amber-600",
                  )}>
                    {result.profile.status}
                  </span>
                } />
              </div>

              <div className="rounded-lg bg-violet-500/10 p-2.5">
                <p className="text-[11px] font-medium text-violet-violet-700 dark:text-violet-violet-300 mb-1.5">
                  Supports receiving
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.supportedMethods?.map((m) => (
                    <Badge key={m.id} variant="outline" className="text-[10px] py-0">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                size="sm"
                disabled={result.profile.isSelf}
                onClick={() => {
                  setSendPrefill({ recipient: result.profile!.atHandle });
                  setView("send");
                }}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {result.profile.isSelf ? "Cannot pay yourself" : `Send to ${result.profile.firstName}`}
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </motion.div>
          )}

          {result && !result.found && !error && (
            <motion.div
              key="nf"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground"
            >
              <p className="font-medium text-foreground">No match found</p>
              <p className="mt-1">Ask the recipient for their @handle, email, phone or GaexPay ID.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground truncate">{value}</span>
    </div>
  );
}

// ---- Crypto Addresses ----------------------------------------------------

function CryptoAddressesSection({ addresses }: { addresses: CryptoAddress[] }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copy = (addr: CryptoAddress) => {
    navigator.clipboard?.writeText(addr.address);
    setCopiedCode(addr.code);
    toast.success(`${addr.code} address copied`);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-amber-500" /> Crypto Deposit Addresses
          </h3>
          <p className="text-xs text-muted-foreground">Send any crypto to your GaexPay wallet</p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-500/30">
          {addresses.length} coins · {addresses.length} networks
        </Badge>
      </div>

      <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          All crypto sent to any of these addresses arrives in your GaexPay wallet.
          Always verify the network before sending. Cross-chain sends may be lost.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {addresses.map((addr, i) => (
          <motion.div
            key={addr.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className="group rounded-xl border bg-card/50 p-4 transition hover:border-foreground/20 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-8 w-8 place-items-center rounded-lg text-base"
                  style={{ background: `${addr.color}20` }}
                >
                  {addr.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-none">{addr.code}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{addr.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-50 hover:opacity-100"
                onClick={() => copy(addr)}
                aria-label={`Copy ${addr.code} address`}
              >
                {copiedCode === addr.code
                  ? <Check className="h-3 w-3 text-violet-500" />
                  : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="font-mono text-[11px] break-all leading-snug bg-muted/40 rounded px-2 py-1.5">
              {addr.address}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">{addr.network}</p>
            {addr.memo && (
              <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">{addr.memo}</p>
            )}
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ---- Payment methods grid ------------------------------------------------

function PaymentMethodsGrid({ methods }: { methods: PaymentMethod[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Supported Payment Methods</h3>
          <p className="text-xs text-muted-foreground">Every method pays into your unified address</p>
        </div>
        <Badge variant="outline" className="text-violet-600 border-violet-500/30">
          <Sparkles className="h-3 w-3 mr-1" /> {methods.length} methods
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((m, i) => {
          const accent = ACCENT[m.accent] || ACCENT.emerald;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Card className="p-5 card-lift h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1", accent.bg, accent.text, accent.ring)}>
                    <MethodIcon name={m.icon} className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] py-0">
                      <Clock className="h-2.5 w-2.5 mr-0.5" /> {m.time}
                    </Badge>
                  </div>
                </div>
                <h4 className="font-semibold">{m.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>

                {m.providers && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {m.providers.map((p) => (
                      <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                {m.coins && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {m.coins.map((c) => (
                      <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fee</span>
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{m.fee}</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ---- How it works --------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      n: 1,
      icon: AtSign,
      title: "Share your address",
      body: "Send your @handle, email, phone or GaexPay ID — any of them works. Or share your payment link / QR.",
      accent: "violet" as const,
    },
    {
      n: 2,
      icon: WalletIcon,
      title: "Payer picks a method",
      body: "They choose how to pay: GaexPay wallet, bank, mobile money, or crypto. Same address, all methods.",
      accent: "teal" as const,
    },
    {
      n: 3,
      icon: ArrowDownToLine,
      title: "Money arrives instantly",
      body: "Crypto credits to your wallet on confirmation. Fiat & momo arrive within minutes. Bank in 1–3 days.",
      accent: "amber" as const,
    },
  ];

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h3 className="font-semibold">How it works</h3>
        <p className="text-xs text-muted-foreground">One address. Three steps. Every payment type.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const accent = ACCENT[s.accent];
          return (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i }}
              className="relative"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("grid h-10 w-10 place-items-center rounded-lg ring-1 font-bold", accent.bg, accent.text, accent.ring)}>
                  {s.n}
                </div>
                <Icon className={cn("h-5 w-5", accent.text)} />
              </div>
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
              {i < steps.length - 1 && (
                <ChevronRight className="hidden sm:block absolute -right-2 top-4 h-4 w-4 text-muted-foreground/40" />
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ---- Recent incoming payments --------------------------------------------

function RecentIncoming({ incoming, stats }: { incoming: IncomingTx[]; stats: any }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const total = useMemo(
    () => incoming.reduce((sum, t) => sum + (t.currency === "NGN" ? t.amount : 0), 0),
    [incoming],
  );

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-violet-500" /> Recent Incoming Payments
          </h3>
          <p className="text-xs text-muted-foreground">
            {stats.totalIncoming} payments received via your unified address
          </p>
        </div>
        {total > 0 && (
          <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-0">
            <TrendingUp className="h-3 w-3 mr-1" /> {fmt(total)} in NGN
          </Badge>
        )}
      </div>

      {incoming.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ArrowDownToLine className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No incoming payments yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Share your @handle to start receiving.</p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto no-scrollbar -mx-2 px-2">
          <div className="space-y-1">
            {incoming.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(0.04 * i, 0.3) }}
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/40 transition"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0">
                  <ArrowDownToLine className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {t.counterpartyName || t.description}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.method || t.type} · {timeAgo(t.createdAt)} · {t.reference}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                    +{formatMoney(t.amount, t.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">{t.status}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
