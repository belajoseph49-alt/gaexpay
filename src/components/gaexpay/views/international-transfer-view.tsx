"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Globe2, Search, Landmark, Smartphone, Wallet as WalletIcon,
  Check, ChevronRight, ChevronLeft, Loader2, Copy, Share2,
  Repeat, RefreshCw, ArrowRight, Zap, Clock, TrendingUp, Lock, Banknote,
  Phone, User, Sparkles, AlertTriangle, ExternalLink, MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  COUNTRIES, BANKS, MOBILE_MONEY_PROVIDERS, CURRENCIES, CURRENCY_SYMBOL,
  formatMoney, timeAgo,
} from "@/lib/gaexpay";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { Confetti } from "@/components/gaexpay/confetti";
import { useFetch } from "@/hooks/use-fetch";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

// ---- Types --------------------------------------------------------------

type Method = "bank" | "momo" | "wallet";

type Quote = {
  from: string;
  to: string;
  amount: number;
  midRate: number;
  exchangeRate: number;
  marginPct: number;
  convertedAmount: number;
  fee: {
    amount: number;
    amountUsd: number;
    pct: number;
    flatUsd: number;
    note: string;
  };
  total: number;
  totalUsd: number;
  delivery: { label: string; instant: boolean; minHours: number; maxHours: number };
  method: string;
  timestamp: string;
};

type TransferResult = {
  success: boolean;
  reference: string;
  transfer: {
    reference: string;
    recipientName: string;
    recipientAccount: string;
    recipientBank: string;
    recipientCountry: { code: string; name: string; flag: string; currency: string; phonePrefix: string };
    senderCountry: { code: string; name: string; flag: string; currency: string };
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    midRate: number;
    exchangeRate: number;
    marginPct: number;
    convertedAmount: number;
    fee: { amount: number; amountUsd: number; pct: number; flatUsd: number; note: string };
    total: number;
    totalUsd: number;
    method: string;
    provider: string | null;
    purpose: string;
    note: string;
    delivery: { label: string; instant: boolean; minHours: number; maxHours: number };
    status: string;
    createdAt: string;
  };
};

const PURPOSES = [
  { id: "family", label: "Family Support", icon: "👨‍👩‍👧" },
  { id: "business", label: "Business Payment", icon: "💼" },
  { id: "education", label: "Education / Tuition", icon: "🎓" },
  { id: "investment", label: "Investment", icon: "📈" },
  { id: "salary", label: "Salary / Payroll", icon: "💰" },
  { id: "rent", label: "Rent / Property", icon: "🏠" },
  { id: "medical", label: "Medical", icon: "⚕️" },
  { id: "other", label: "Other", icon: "📦" },
];

const STEPS = ["Recipient", "Amount", "Review", "Done"];

const METHOD_META: Record<Method, { label: string; icon: any; gradient: string; delivery: string; feeNote: string }> = {
  bank: {
    label: "Bank Transfer",
    icon: Landmark,
    gradient: "from-violet-500 to-purple-600",
    delivery: "1–3 business days",
    feeNote: "1.5% + $5 · max $50",
  },
  momo: {
    label: "Mobile Money",
    icon: Smartphone,
    gradient: "from-amber-500 to-orange-600",
    delivery: "Instant · within minutes",
    feeNote: "1% + $0.50 · max $20",
  },
  wallet: {
    label: "GaexPay Wallet",
    icon: WalletIcon,
    gradient: "from-violet-500 to-purple-600",
    delivery: "Instant · within minutes",
    feeNote: "0.5% + $0.25",
  },
};

// ---- Helper: filter banks by country heuristic --------------------------

// We don't have explicit country→bank mapping in BANKS, so we show all and
// let user pick. We also surface a "popular for this country" set first.
const COUNTRY_POPULAR_BANKS: Record<string, string[]> = {
  NG: ["Access Bank", "GTBank", "Zenith Bank", "UBA", "First Bank", "Kuda Bank", "Opay", "PalmPay"],
  GH: ["GCB Bank", "Absa Bank Ghana", "Stanbic Bank Ghana", "CalBank", "ADB Bank"],
  KE: ["KCB Bank", "Equity Bank Kenya", "Co-op Bank Kenya", "NCBA Bank", "I&M Bank"],
  ZA: ["FNB", "ABSA", "Nedbank", "Capitec Bank", "Standard Bank SA"],
  EG: ["CIB Egypt", "National Bank of Egypt", "QNB Alahli", "Banque Misr"],
  MA: ["Attijariwafa Bank", "Banque Populaire", "BMCE Bank", "CIH Bank"],
  CM: ["Afriland First Bank", "BICEC", "SCB Cameroun", "Société Générale Cameroun", "UBC"],
  CI: ["Société Générale CI", "BICICI", "Ecobank CI", "Banque Atlantique CI", "Coris Bank"],
  SN: ["Société Générale Sénégal", "CBAO", "Banque Atlantique Sénégal", "Ecobank Sénégal"],
  UG: ["Stanbic Bank Uganda", "Centenary Bank", "DFCU Bank", "Bank of Africa Uganda"],
  TZ: ["CRDB Bank", "NMB Bank", "NBC Bank", "Exim Bank Tanzania"],
  ET: ["Commercial Bank of Ethiopia", "Dashen Bank", "Awash Bank", "Bank of Abyssinia"],
  RW: ["Bank of Kigali", "I&M Bank Rwanda", "Equity Bank Rwanda", "Cogebanque"],
  US: ["Citibank", "JPMorgan Chase", "Bank of America", "Wells Fargo"],
  GB: ["HSBC", "Barclays", "Standard Chartered"],
  EU: ["BNP Paribas", "Deutsche Bank", "Société Générale"],
  CN: ["Industrial and Commercial Bank of China (ICBC)"],
  AE: ["Citibank", "HSBC"],
  SA: ["Citibank", "HSBC"],
  CA: ["Citibank", "HSBC"],
  AU: ["HSBC"],
  CH: ["HSBC", "Deutsche Bank"],
  JP: ["HSBC"],
  IN: ["HSBC"],
  BR: ["HSBC"],
};

function popularBanksForCountry(code: string): string[] {
  return COUNTRY_POPULAR_BANKS[code] ?? [];
}

function providerListForCountry(code: string) {
  return MOBILE_MONEY_PROVIDERS.filter((p) => p.countries.includes(code));
}

function getCountry(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

function getCurrencyMeta(code: string) {
  return CURRENCIES.find((c) => c.code === code);
}

// ---- Component -----------------------------------------------------------

export function InternationalTransferView() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <HeaderStrip />
      <Wizard />
      <RecentInternationalTransfers />
    </div>
  );
}

// ---- Header -------------------------------------------------------------

function HeaderStrip() {
  const { t } = useTranslation();
  const { setView } = useApp();
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("international.title")}</h1>
          <Badge className="bg-violet-500/15 text-violet-500 border-violet-500/30 hover:bg-violet-500/20">
            <Globe className="h-3 w-3 mr-1" /> Cross-Border
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Send money to <span className="text-foreground font-medium">200+ countries</span> via bank, mobile money or GaexPay wallet.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setView("exchange")}>
          <TrendingUp className="h-4 w-4 mr-1.5" /> Live Rates
        </Button>
        <Button variant="outline" size="sm" onClick={() => setView("send")}>
          <Repeat className="h-4 w-4 mr-1.5" /> Local Transfer
        </Button>
      </div>
    </div>
  );
}

// ---- Wizard -------------------------------------------------------------

function Wizard() {
  const [step, setStep] = useState(0);

  // Step 1 — recipient
  const [recipientCountry, setRecipientCountry] = useState<string>("NG");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientBank, setRecipientBank] = useState<string>("");
  const [method, setMethod] = useState<Method>("bank");
  const [provider, setProvider] = useState<string>("");

  // Step 2 — amount
  const [amount, setAmount] = useState<string>("");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("NGN");
  const [purpose, setPurpose] = useState<string>("family");
  const [note, setNote] = useState("");

  // Quote + submit
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState<TransferResult["transfer"] | null>(null);

  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  // Auto-set to-currency when recipient country changes
  useEffect(() => {
    const c = getCountry(recipientCountry);
    if (c) {
      setToCurrency(c.currency);
      // Pre-select a bank for the country
      const pop = popularBanksForCountry(c.code);
      if (pop.length > 0) setRecipientBank(pop[0]);
      // Pre-select a provider if momo is supported
      const provs = providerListForCountry(c.code);
      if (provs.length > 0) setProvider(provs[0].id);
    }
  }, [recipientCountry]);

  // Pre-fill sender currency from default sender country (NG)
  useEffect(() => {
    const senderC = getCountry("NG");
    if (senderC) setFromCurrency(senderC.currency);
  }, []);

  // Fetch a live quote whenever relevant inputs change
  const amt = Number(amount) || 0;
  const fetchQuote = useCallback(async () => {
    if (amt <= 0 || !fromCurrency || !toCurrency) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const url = `/api/international-transfer?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}&amount=${amt}&method=${method}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("quote failed");
      const data: Quote = await res.json();
      setQuote(data);
    } catch {
      // silently ignore — UI will fall back to offline calc
    } finally {
      setQuoteLoading(false);
    }
  }, [amt, fromCurrency, toCurrency, method]);

  useEffect(() => {
    const t = setTimeout(() => { void fetchQuote(); }, 250);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  // Auto-refresh quote every 30s while amount > 0
  useEffect(() => {
    if (amt <= 0) return;
    const id = setInterval(() => { void fetchQuote(); }, 30000);
    return () => clearInterval(id);
  }, [amt, fetchQuote]);

  const submit = async () => {
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/international-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientAccount,
          recipientBank,
          recipientCountry,
          senderCountry: "NG",
          amount: amt,
          fromCurrency,
          toCurrency,
          method,
          provider,
          note,
          purpose,
        }),
      });
      const data: TransferResult = await res.json();
      if (data.success && data.transfer) {
        setResult(data.transfer);
        setStep(3);
        toast.success("International transfer submitted", {
          description: `Reference ${data.transfer.reference}`,
        });
      } else {
        toast.error((data as any).error || "Transfer failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setRecipientName("");
    setRecipientAccount("");
    setRecipientBank("");
    setAmount("");
    setNote("");
    setResult(null);
    setQuote(null);
    setPurpose("family");
  };

  // Step validity
  const step0Valid = useMemo(() => {
    if (!recipientName.trim()) return false;
    if (!recipientAccount.trim()) return false;
    if (method === "bank" && !recipientBank) return false;
    if (method === "momo" && !provider) return false;
    return true;
  }, [recipientName, recipientAccount, recipientBank, provider, method]);

  const step1Valid = useMemo(() => amt > 0 && !!fromCurrency && !!toCurrency, [amt, fromCurrency, toCurrency]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      {/* Main wizard card */}
      <Card className="overflow-hidden p-0">
        {/* Stepper header */}
        <div className="border-b bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold transition",
                    i < step
                      ? "bg-violet-500 text-white"
                      : i === step
                        ? "bg-violet-500 text-white ring-4 ring-violet-500/20"
                        : "bg-muted text-muted-foreground",
                  )}>
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={cn(
                    "hidden sm:inline text-xs font-medium",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("mx-3 h-0.5 flex-1 rounded transition", i < step ? "bg-violet-500" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {/* Step 0 — Recipient */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="font-semibold">Recipient details</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Choose destination country, then enter recipient info.
                  </p>
                </div>

                {/* Country selector */}
                <div>
                  <Label className="text-xs text-muted-foreground">Destination country</Label>
                  <button
                    onClick={() => setCountryPickerOpen(true)}
                    className="mt-1.5 flex w-full items-center gap-3 rounded-xl border bg-muted/30 p-3 text-left transition hover:border-violet-500/40 hover:bg-muted/50"
                  >
                    <span className="text-2xl leading-none">{getCountry(recipientCountry)?.flag ?? "🏳️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {getCountry(recipientCountry)?.name ?? "Select country"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getCountry(recipientCountry)?.currency ?? ""} · {getCountry(recipientCountry)?.phonePrefix ?? ""}
                      </p>
                    </div>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Method selector */}
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery method</Label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {(Object.keys(METHOD_META) as Method[]).map((m) => {
                      const meta = METHOD_META[m];
                      const Icon = meta.icon;
                      const active = method === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setMethod(m)}
                          className={cn(
                            "relative flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition",
                            active
                              ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20"
                              : "hover:bg-muted/40",
                          )}
                        >
                          <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white", meta.gradient)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-medium leading-tight">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {METHOD_META[method].delivery} · {METHOD_META[method].feeNote}
                  </p>
                </div>

                {/* Recipient name */}
                <div>
                  <Label htmlFor="rname" className="text-xs text-muted-foreground">Recipient full name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rname"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Aminata Diallo"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Account / phone number */}
                <div>
                  <Label htmlFor="racc" className="text-xs text-muted-foreground">
                    {method === "bank" ? "Account number / IBAN" : method === "momo" ? "Mobile money phone" : "GaexPay wallet ID / username"}
                  </Label>
                  <div className="relative mt-1.5">
                    {method === "momo" ? (
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                      id="racc"
                      value={recipientAccount}
                      onChange={(e) => setRecipientAccount(e.target.value)}
                      placeholder={
                        method === "bank"
                          ? "Enter account number or IBAN"
                          : method === "momo"
                            ? `${getCountry(recipientCountry)?.phonePrefix ?? "+234"} 801 234 5678`
                            : "@username or wallet ID"
                      }
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Bank / provider selector (conditional) */}
                {method === "bank" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Recipient bank</Label>
                    <Select value={recipientBank} onValueChange={setRecipientBank}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {popularBanksForCountry(recipientCountry).length > 0 && (
                          <>
                            <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Popular in {getCountry(recipientCountry)?.name}</p>
                            {popularBanksForCountry(recipientCountry).map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                            <p className="px-2 py-1 mt-1 text-[10px] font-semibold uppercase text-muted-foreground">All banks</p>
                          </>
                        )}
                        {BANKS.filter((b) => !popularBanksForCountry(recipientCountry).includes(b)).map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {method === "momo" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Mobile money provider</Label>
                    <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {providerListForCountry(recipientCountry).length === 0 && (
                        <p className="col-span-full text-xs text-muted-foreground">
                          No mobile money providers for this country — try Bank Transfer or GaexPay Wallet.
                        </p>
                      )}
                      {providerListForCountry(recipientCountry).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setProvider(p.id)}
                          className={cn(
                            "rounded-lg border p-2 text-center text-xs transition",
                            provider === p.id ? "border-violet-500 ring-2 ring-violet-500/20" : "hover:bg-muted/40",
                          )}
                          style={provider === p.id ? { borderColor: p.color } : {}}
                        >
                          <div className="h-6 w-full rounded mb-1" style={{ background: p.color }} />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setStep(1)}
                    disabled={!step0Valid}
                    className="flex-1"
                  >
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 1 — Amount & Currency */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="font-semibold">Amount & currency</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Sending to {getCountry(recipientCountry)?.flag} {getCountry(recipientCountry)?.name}
                  </p>
                </div>

                {/* You send */}
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">You send</span>
                    <Badge variant="outline" className="text-[10px]">Sender pays</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 border-0 bg-transparent text-3xl font-bold tabular-nums focus-visible:ring-0"
                    />
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger className="w-32 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="mr-1.5">{c.flag}</span>{c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[100, 500, 1000, 5000].map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount(String(v))}
                        className="rounded-md border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-muted transition"
                      >
                        {v.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate strip */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs">
                    <RefreshCw className={cn("h-3 w-3 text-violet-500", quoteLoading && "animate-spin")} />
                    <span className="font-medium tabular-nums">
                      1 {fromCurrency} = {(quote?.exchangeRate ?? 0).toFixed(4)} {toCurrency}
                    </span>
                    <Badge className="bg-violet-500/15 text-violet-500 border-violet-500/30 hover:bg-violet-500/20 text-[10px] h-4 px-1.5">
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                      LIVE
                    </Badge>
                  </div>
                </div>

                {/* They receive */}
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">They receive</span>
                    <Badge variant="outline" className="text-[10px]">Recipient gets</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-3xl font-bold tabular-nums">
                      {quote ? (
                        <AnimatedNumber
                          value={quote.convertedAmount}
                          decimals={2}
                          prefix={CURRENCY_SYMBOL[toCurrency] ?? ""}
                        />
                      ) : (
                        <span className="text-muted-foreground">{CURRENCY_SYMBOL[toCurrency] ?? ""}0.00</span>
                      )}
                    </div>
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger className="w-32 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="mr-1.5">{c.flag}</span>{c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <Label className="text-xs text-muted-foreground">Purpose of transfer</Label>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PURPOSES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPurpose(p.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition",
                          purpose === p.id ? "border-violet-500 bg-violet-500/10" : "hover:bg-muted/40",
                        )}
                      >
                        <span className="text-base">{p.icon}</span>
                        <span className="font-medium leading-tight">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <Label htmlFor="note" className="text-xs text-muted-foreground">Note (optional)</Label>
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What's this for? (visible to recipient)"
                    className="mt-1.5"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={!step1Valid} className="flex-1">
                    Review <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Review */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="font-semibold">Review & confirm</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Please verify all details before sending.
                  </p>
                </div>

                {/* Recipient block */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-violet-500/15 text-violet-500 text-xs font-semibold">
                        {recipientName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{recipientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getCountry(recipientCountry)?.flag} {getCountry(recipientCountry)?.name}
                      </p>
                    </div>
                    <Badge className="bg-violet-500/15 text-violet-500 border-violet-500/30 hover:bg-violet-500/20 capitalize text-[10px]">
                      {METHOD_META[method].label}
                    </Badge>
                  </div>
                  <ReviewRow label={method === "bank" ? "Account / IBAN" : method === "momo" ? "Phone" : "Wallet ID"} value={recipientAccount} />
                  {method === "bank" && <ReviewRow label="Bank" value={recipientBank} />}
                  {method === "momo" && (
                    <ReviewRow
                      label="Provider"
                      value={MOBILE_MONEY_PROVIDERS.find((p) => p.id === provider)?.name ?? provider}
                    />
                  )}
                </div>

                {/* Cost breakdown */}
                <div className="rounded-xl border p-4 space-y-2.5">
                  <ReviewRow
                    label="You send"
                    value={formatMoney(amt, fromCurrency)}
                    bold
                  />
                  <ReviewRow
                    label={`Exchange rate (1 ${fromCurrency} = ${(quote?.exchangeRate ?? 0).toFixed(4)} ${toCurrency})`}
                    value={`-${FX_MARGIN_LABEL}`}
                    muted
                  />
                  <ReviewRow
                    label={`Transfer fee (${quote?.fee.pct ?? 0}% + $${quote?.fee.flatUsd ?? 0})`}
                    value={quote ? `-${formatMoney(quote.fee.amount, fromCurrency)}` : "—"}
                  />
                  <ReviewRow
                    label="FX margin"
                    value={quote ? `${quote.marginPct.toFixed(2)}%` : "—"}
                    muted
                  />
                  <div className="border-t pt-2.5">
                    <ReviewRow
                      label="Total cost"
                      value={quote ? formatMoney(quote.total, fromCurrency) : "—"}
                      bold
                    />
                    <ReviewRow
                      label="≈ in USD"
                      value={quote ? `$${quote.totalUsd.toFixed(2)}` : "—"}
                      muted
                    />
                  </div>
                  <div className="border-t pt-2.5">
                    <ReviewRow
                      label="Recipient receives"
                      value={quote ? formatMoney(quote.convertedAmount, toCurrency) : "—"}
                      bold
                      accent
                    />
                  </div>
                </div>

                {/* Delivery + purpose */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3.5 w-3.5" /> Estimated delivery
                    </div>
                    <p className="text-sm font-semibold">{METHOD_META[method].delivery}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <MapPin className="h-3.5 w-3.5" /> Purpose
                    </div>
                    <p className="text-sm font-semibold capitalize">
                      {PURPOSES.find((p) => p.id === purpose)?.label ?? purpose}
                    </p>
                  </div>
                </div>

                {/* Security note */}
                <div className="flex items-start gap-2.5 rounded-xl bg-violet-500/10 p-3 text-xs text-violet-violet-700 dark:text-violet-400">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Bank-grade encryption</p>
                    <p className="opacity-90">
                      Protected by AES-256-GCM end-to-end encryption, TLS 1.3 transport, and real-time
                      AI fraud detection. Funds are held in segregated accounts.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={submit} disabled={submitLoading} className="flex-1">
                    {submitLoading ? (
                      <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending...</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-1.5" /> Confirm & Send</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Confirmation */}
            {step === 3 && result && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <Confetti trigger={true} />
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-violet-500 text-white pulse-glow"
                  >
                    <Check className="h-8 w-8" strokeWidth={3} />
                  </motion.div>
                  <h3 className="text-xl font-bold">
                    {result.delivery.instant ? "Transfer delivered!" : "Transfer initiated!"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMoney(result.amount, result.fromCurrency)} →{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(result.convertedAmount, result.toCurrency)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    to {result.recipientName} ({result.recipientCountry.flag} {result.recipientCountry.name})
                  </p>
                </div>

                {/* Reference */}
                <div className="rounded-xl border bg-muted/30 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Reference number
                  </p>
                  <p className="font-mono text-lg font-bold tracking-wider">{result.reference}</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px]",
                        result.status === "completed"
                          ? "bg-violet-500/15 text-violet-500 border-violet-500/30"
                          : "bg-amber-500/15 text-amber-500 border-amber-500/30",
                      )}
                    >
                      {result.status === "completed" ? "Completed" : "Pending"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      {result.delivery.label}
                    </Badge>
                  </div>
                </div>

                {/* Receipt */}
                <div className="rounded-xl border p-4 space-y-2 text-sm">
                  <ReviewRow label="Recipient" value={result.recipientName} />
                  <ReviewRow
                    label={result.method === "bank" ? "Account / IBAN" : result.method === "momo" ? "Phone" : "Wallet ID"}
                    value={result.recipientAccount}
                  />
                  {result.method === "bank" && <ReviewRow label="Bank" value={result.recipientBank} />}
                  <ReviewRow label="Method" value={METHOD_META[result.method as Method].label} />
                  <ReviewRow label="You sent" value={formatMoney(result.amount, result.fromCurrency)} />
                  <ReviewRow label="Exchange rate" value={`1 ${result.fromCurrency} = ${result.exchangeRate.toFixed(4)} ${result.toCurrency}`} />
                  <ReviewRow label="Fee" value={formatMoney(result.fee.amount, result.fromCurrency)} />
                  <ReviewRow label="Total cost" value={formatMoney(result.total, result.fromCurrency)} bold />
                  <div className="border-t pt-2">
                    <ReviewRow label="Recipient receives" value={formatMoney(result.convertedAmount, result.toCurrency)} bold accent />
                  </div>
                  <ReviewRow label="Date" value={new Date(result.createdAt).toLocaleString()} />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard?.writeText(result.reference);
                      toast.success("Reference copied");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1.5" /> Copy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const text = `I just sent ${formatMoney(result.amount, result.fromCurrency)} to ${result.recipientName} via GaexPay. Reference: ${result.reference}`;
                      if (navigator.share) {
                        void navigator.share({ title: "GaexPay transfer", text });
                      } else {
                        navigator.clipboard?.writeText(text);
                        toast.success("Details copied to clipboard");
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-1.5" /> Share
                  </Button>
                  <Button onClick={reset}>
                    <Repeat className="h-4 w-4 mr-1.5" /> New
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Right column — live preview / summary */}
      <div className="space-y-4">
        <LiveRateCard
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
          amount={amt}
          method={method}
          quote={quote}
          loading={quoteLoading}
          onRefresh={() => void fetchQuote()}
        />
        <CostBreakdownCard quote={quote} fromCurrency={fromCurrency} toCurrency={toCurrency} amount={amt} method={method} />
        <WhyGaexPayCard />
      </div>

      {/* Country picker dialog */}
      <CountryPickerDialog
        open={countryPickerOpen}
        onOpenChange={setCountryPickerOpen}
        onSelect={(code) => {
          setRecipientCountry(code);
          setCountryPickerOpen(false);
        }}
      />
    </div>
  );
}

const FX_MARGIN_LABEL = "0.80% margin";

// ---- Review row helper --------------------------------------------------

function ReviewRow({
  label, value, bold, muted, accent,
}: { label: string; value?: string; bold?: boolean; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-xs", muted ? "text-muted-foreground/80" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "text-sm text-right truncate",
          bold ? "font-bold" : "font-medium",
          accent ? "text-violet-500" : "",
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// ---- Live rate card ----------------------------------------------------

function LiveRateCard({
  fromCurrency, toCurrency, amount, method, quote, loading, onRefresh,
}: {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  method: Method;
  quote: Quote | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const fromMeta = getCurrencyMeta(fromCurrency);
  const toMeta = getCurrencyMeta(toCurrency);
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Live exchange rate</h3>
          </div>
          <button
            onClick={onRefresh}
            className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted transition"
            aria-label="Refresh rate"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex flex-col items-center">
            <span className="text-2xl">{fromMeta?.flag ?? "🏳️"}</span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">{fromCurrency}</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-violet-500">LIVE</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl">{toMeta?.flag ?? "🏳️"}</span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">{toCurrency}</span>
          </div>
        </div>

        <div className="rounded-xl bg-background/60 p-3 ring-1 ring-border/60">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">1 {fromCurrency} =</span>
            <span className="text-xl font-bold tabular-nums">
              {loading && !quote ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                `${(quote?.exchangeRate ?? 0).toFixed(4)} ${toCurrency}`
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Mid-market: {(quote?.midRate ?? 0).toFixed(4)}</span>
            <span>Margin: {(quote?.marginPct ?? 0).toFixed(2)}%</span>
          </div>
        </div>

        {amount > 0 && quote && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-background/60 p-2 ring-1 ring-border/60">
              <p className="text-[10px] text-muted-foreground">You send</p>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(amount, fromCurrency)}</p>
            </div>
            <div className="rounded-lg bg-violet-500/10 p-2 ring-1 ring-violet-500/30">
              <p className="text-[10px] text-violet-600 dark:text-violet-400">They get</p>
              <p className="text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                {formatMoney(quote.convertedAmount, toCurrency)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Delivery: {METHOD_META[method].delivery}</span>
        </div>
      </div>
    </Card>
  );
}

// ---- Cost breakdown card ----------------------------------------------

function CostBreakdownCard({
  quote, fromCurrency, toCurrency, amount, method,
}: {
  quote: Quote | null;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  method: Method;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Cost breakdown</h3>
        <Badge variant="outline" className="text-[10px]">{METHOD_META[method].label}</Badge>
      </div>

      {!quote || amount <= 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount sent</span>
            <span className="font-medium tabular-nums">{formatMoney(amount, fromCurrency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Transfer fee</span>
            <span className="font-medium tabular-nums text-amber-500">
              +{formatMoney(quote.fee.amount, fromCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">FX margin ({quote.marginPct.toFixed(2)}%)</span>
            <span className="font-medium tabular-nums text-orange-500">
              +{formatMoney((amount * quote.marginPct) / 100, fromCurrency)}
            </span>
          </div>
          <div className="border-t pt-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total cost</span>
              <span className="font-bold tabular-nums text-base">{formatMoney(quote.total, fromCurrency)}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-muted-foreground">≈ in USD</span>
              <span className="text-xs text-muted-foreground tabular-nums">${quote.totalUsd.toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Recipient gets</span>
              <span className="font-bold tabular-nums text-violet-500">{formatMoney(quote.convertedAmount, toCurrency)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Final rate locked at confirmation. GaexPay charges no hidden fees — what you see is what you pay.
        </span>
      </div>
    </Card>
  );
}

// ---- Why GaexPay card -------------------------------------------------

function WhyGaexPayCard() {
  const items = [
    { icon: Globe, title: "200+ countries", desc: "Send anywhere in the world" },
    { icon: Zap, title: "Instant delivery", desc: "MoMo & wallet transfers in minutes" },
    { icon: Lock, title: "Bank-grade security", desc: "AES-256 encryption + AI fraud detection" },
    { icon: TrendingUp, title: "Best rates", desc: "0.8% margin — far below banks' 3-5%" },
  ];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <h3 className="text-sm font-semibold">Why send with GaexPay?</h3>
      </div>
      <div className="space-y-2.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="flex items-start gap-3 group">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-500 transition group-hover:scale-110">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">{it.title}</p>
                <p className="text-[11px] text-muted-foreground">{it.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---- Country picker dialog --------------------------------------------

function CountryPickerDialog({
  open, onOpenChange, onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select destination country</DialogTitle>
          <DialogDescription>
            Choose where you want to send money. We support all 40+ countries and 32 currencies.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search country, code, or currency..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1 no-scrollbar">
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-6">
              No countries match &ldquo;{query}&rdquo;
            </p>
          )}
          {filtered.map((c) => (
            <button
              key={c.code}
              onClick={() => onSelect(c.code)}
              className="flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
            >
              <span className="text-2xl leading-none">{c.flag}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.currency} · {c.code}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Recent international transfers -----------------------------------

function RecentInternationalTransfers() {
  const { data, loading } = useFetch<{ transactions: any[] }>("/api/transactions?type=transfer&limit=15");
  const all = data?.transactions ?? [];
  // Filter to international transfers (those whose metadata includes international: true)
  const intl = useMemo(() => {
    return all.filter((t) => {
      try {
        const meta = t.metadata ? JSON.parse(t.metadata) : {};
        return meta?.international === true;
      } catch {
        return false;
      }
    }).slice(0, 6);
  }, [all]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Recent international transfers</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => (window.location.hash = "#transactions")}>
          View all <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : intl.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Globe2 className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium">No international transfers yet</p>
          <p className="text-xs text-muted-foreground">
            Start your first cross-border transfer above — it takes less than a minute.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
          <AnimatePresence initial={false}>
            {intl.map((t) => {
              const meta = (() => { try { return t.metadata ? JSON.parse(t.metadata) : {}; } catch { return {}; } })();
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/30 transition"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-500 text-lg">
                    {meta?.recipientFlag ?? "🌍"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.counterpartyName ?? "Recipient"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {meta?.recipientCountryName ?? "International"} · {t.method === "momo" ? "Mobile Money" : t.method === "wallet" ? "Wallet" : "Bank"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-rose-500">
                      -{formatMoney(t.amount, t.currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(t.createdAt)}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] ml-1",
                      t.status === "completed"
                        ? "border-violet-500/40 text-violet-500"
                        : t.status === "pending"
                          ? "border-amber-500/40 text-amber-500"
                          : "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {t.status}
                  </Badge>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
