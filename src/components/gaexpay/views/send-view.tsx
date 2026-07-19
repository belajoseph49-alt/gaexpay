"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SendHorizontal, ArrowDownToLine, ArrowUpFromLine, QrCode, Search, UserPlus,
  Smartphone, Landmark, Wallet as WalletIcon, Check, ShieldCheck, ChevronRight,
  ChevronLeft, Loader2, Copy, Share2, Repeat, Contact as ContactIcon,
  Users, UserCheck, Phone, Mail, Plus, Info, MessageSquare, Bitcoin, Globe, CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES, MOBILE_MONEY_PROVIDERS, getSupportedPaymentMethods } from "@/lib/gaexpay";
import { useApp } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Confetti } from "@/components/gaexpay/confetti";
import { useContacts, type DeviceContact } from "@/hooks/use-contacts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

const METHODS = [
  { id: "wallet", label: "GaexPay", icon: WalletIcon, fee: "Free · Instant" },
  { id: "bank", label: "Bank", icon: Landmark, fee: "0.5% · max ₦5K" },
  { id: "momo", label: "Mobile Money", icon: Smartphone, fee: "1.0% · instant" },
  { id: "crypto", label: "Crypto", icon: Bitcoin, fee: "On-chain" },
];

export function SendView() {
  const { t } = useTranslation();
  const [activeFlow, setActiveFlow] = useState<string | null>(null);

  if (activeFlow) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setActiveFlow(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {activeFlow === "send" && t("send.actions.send", { defaultValue: "Send Money" })}
            {activeFlow === "request" && t("send.actions.request", { defaultValue: "Request Money" })}
            {activeFlow === "topup" && t("send.actions.topup", { defaultValue: "Top Up Wallet" })}
            {activeFlow === "withdraw" && t("send.actions.withdraw", { defaultValue: "Withdraw Funds" })}
          </h1>
        </div>
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
          {activeFlow === "send" && <SendFlow />}
          {activeFlow === "request" && <RequestFlow />}
          {activeFlow === "topup" && <TopUpFlow />}
          {activeFlow === "withdraw" && <WithdrawFlow />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("send.title", { defaultValue: "Action Hub" })}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("send.subtitle", { defaultValue: "All your quick actions in one centralized space" })}
        </p>
      </div>
      <div className="grid w-full grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <button onClick={() => setActiveFlow("send")} className="relative flex flex-col items-center justify-center p-4 sm:p-5 border border-border/40 bg-card rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-sm transition-all overflow-hidden group text-left w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-[1px] mb-3 shadow-sm">
            <div className="h-full w-full bg-card rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors">
              <SendHorizontal className="h-5 w-5 text-blue-500 group-hover:text-white transition-colors" />
            </div>
          </div>
          <span className="font-semibold text-foreground text-sm">{t("send.actions.send", { defaultValue: "Envoyer" })}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/50">{t("send.fees.send", { defaultValue: "Frais : 0% - 1%" })}</span>
        </button>
        
        <button onClick={() => setActiveFlow("request")} className="relative flex flex-col items-center justify-center p-4 sm:p-5 border border-border/40 bg-card rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:shadow-sm transition-all overflow-hidden group text-left w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-[1px] mb-3 shadow-sm">
            <div className="h-full w-full bg-card rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors">
              <ArrowDownToLine className="h-5 w-5 text-emerald-500 group-hover:text-white transition-colors" />
            </div>
          </div>
          <span className="font-semibold text-foreground text-sm">{t("send.actions.request", { defaultValue: "Demander" })}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/50">{t("send.fees.request", { defaultValue: "Gratuit" })}</span>
        </button>

        <button onClick={() => setActiveFlow("topup")} className="relative flex flex-col items-center justify-center p-4 sm:p-5 border border-border/40 bg-card rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-sm transition-all overflow-hidden group text-left w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-[1px] mb-3 shadow-sm">
            <div className="h-full w-full bg-card rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors">
              <ArrowDownToLine className="h-5 w-5 text-amber-500 group-hover:text-white transition-colors" />
            </div>
          </div>
          <span className="font-semibold text-foreground text-sm">{t("send.actions.topup", { defaultValue: "Recharger" })}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/50">{t("send.fees.topup", { defaultValue: "Frais : 0% - 1.5%" })}</span>
        </button>

        <button onClick={() => setActiveFlow("withdraw")} className="relative flex flex-col items-center justify-center p-4 sm:p-5 border border-border/40 bg-card rounded-2xl hover:border-rose-500/50 hover:bg-rose-500/10 hover:shadow-sm transition-all overflow-hidden group text-left w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-400/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-400 to-red-500 p-[1px] mb-3 shadow-sm">
            <div className="h-full w-full bg-card rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors">
              <ArrowUpFromLine className="h-5 w-5 text-rose-500 group-hover:text-white transition-colors" />
            </div>
          </div>
          <span className="font-semibold text-foreground text-sm">{t("send.actions.withdraw", { defaultValue: "Retirer" })}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/50">{t("send.fees.withdraw", { defaultValue: "Frais : 1% - 2%" })}</span>
        </button>

        <button onClick={() => useApp.getState().setView("pay")} className="relative flex flex-col items-center justify-center p-4 sm:p-5 border border-border/40 bg-card rounded-2xl hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 hover:shadow-sm transition-all overflow-hidden group text-left w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 p-[1px] mb-3 shadow-sm">
            <div className="h-full w-full bg-card rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors">
              <QrCode className="h-5 w-5 text-fuchsia-500 group-hover:text-white transition-colors" />
            </div>
          </div>
          <span className="font-semibold text-foreground text-sm">{t("send.actions.scan", { defaultValue: "Scanner" })}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/50">{t("send.fees.scan", { defaultValue: "Rapide & Sûr" })}</span>
        </button>

        <button onClick={() => useApp.getState().setView("cards")} className="relative flex flex-col items-center justify-center p-4 sm:p-5 border border-border/40 bg-card rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:shadow-sm transition-all overflow-hidden group text-left w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 p-[1px] mb-3 shadow-sm">
            <div className="h-full w-full bg-card rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors">
              <CreditCard className="h-5 w-5 text-indigo-500 group-hover:text-white transition-colors" />
            </div>
          </div>
          <span className="font-semibold text-foreground text-sm">{t("send.actions.cards", { defaultValue: "Cartes" })}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/50">{t("send.fees.cards", { defaultValue: "Virtuelle & Physique" })}</span>
        </button>
      </div>
    </div>
  );
}

function SendFlow() {
  const { t } = useTranslation();
  const { data: contactsData } = useFetch<any>("/api/contacts");
  const { data: wData } = useFetch<{ wallets: any[] }>("/api/wallets");
  const { data: meData } = useFetch<any>("/api/auth/me");
  
  const {
    deviceContacts, loading: contactsLoading, supported: contactsSupported,
    pickContacts, checkMembership, addManualContact,
  } = useContacts();
  const [step, setStep] = useState(0);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [recipient, setRecipient] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [method, setMethod] = useState("wallet");
  const [provider, setProvider] = useState("mtn");
  const [note, setNote] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  
  // Specific fields for different methods
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingCode, setRoutingCode] = useState("");
  
  const [cryptoNetwork, setCryptoNetwork] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  
  const [momoCountryCode, setMomoCountryCode] = useState("+225");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [checkedContacts, setCheckedContacts] = useState<any>(null);
  const [checkingContacts, setCheckingContacts] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "gaexpay" | "beneficiaries" | "recent">("gaexpay");

  const beneficiaries = contactsData?.beneficiaries ?? [];
  const gaexpayMembers = contactsData?.gaexpayMembers ?? [];
  const recentRecipients = contactsData?.recentRecipients ?? [];
  const wallets = wData?.wallets ?? [];

  const filteredBeneficiaries = search
    ? beneficiaries.filter((b: any) =>
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.account?.toLowerCase().includes(search.toLowerCase()) ||
        b.bank?.toLowerCase().includes(search.toLowerCase()))
    : beneficiaries;

  const filteredMembers = search
    ? gaexpayMembers.filter((m: any) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        m.phone?.includes(search) ||
        m.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.username?.toLowerCase().includes(search.toLowerCase()))
    : gaexpayMembers;

  const filteredRecent = search
    ? recentRecipients.filter((r: any) =>
        r.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.account?.includes(search))
    : recentRecipients;

  const filteredDeviceContacts = search
    ? deviceContacts.filter((c: DeviceContact) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase()))
    : deviceContacts;

  const handlePickContacts = async () => {
    const contacts = await pickContacts();
    if (contacts.length === 0) {
      if (!contactsSupported) {
        toast.info("Contact picker not supported on this browser. Use manual entry below.");
        setShowManualAdd(true);
      }
      return;
    }
    setCheckingContacts(true);
    const result = await checkMembership(contacts);
    setCheckedContacts(result);
    setCheckingContacts(false);
    toast.success(`${result.memberCount} of ${result.totalChecked} contacts are on GaexPay!`);
    setActiveTab("contacts");
  };

  const handleManualAdd = () => {
    if (!manualName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!manualPhone.trim() && !manualEmail.trim()) {
      toast.error("Please enter a phone or email");
      return;
    }
    addManualContact({ name: manualName.trim(), phone: manualPhone.trim() || undefined, email: manualEmail.trim() || undefined });
    setManualName(""); setManualPhone(""); setManualEmail("");
    setShowManualAdd(false);
    toast.success("Contact added");
  };

  useEffect(() => {
    if (deviceContacts.length > 0 && !checkedContacts) {
      setCheckingContacts(true);
      checkMembership(deviceContacts).then((result) => {
        setCheckedContacts(result);
        setCheckingContacts(false);
      });
    }
  }, [deviceContacts, checkedContacts, checkMembership]);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: Number(amount), 
          currency, 
          recipient, 
          method, 
          provider, 
          note,
          bankDetails: method === "bank" ? { bankName, accountNumber, routingCode } : undefined,
          cryptoDetails: method === "crypto" ? { network: cryptoNetwork, address: cryptoAddress } : undefined,
          momoDetails: method === "momo" ? { countryCode: momoCountryCode } : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(data.transaction);
        setStep(4);
      } else {
        toast.error(data.error || "Transfer failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setRecipient(null); setAmount(""); setNote(""); setOtp(""); setDone(null);
  };

  const selectRecipient = (r: any) => {
    setRecipient(r);
    setMethod(r.method || r.type || "wallet");
    setStep(1);
  };

  const quickAmounts = ["USD", "EUR", "GBP", "CAD"].includes(currency)
    ? [
        { label: "10", value: 10 },
        { label: "50", value: 50 },
        { label: "100", value: 100 },
        { label: "250", value: 250 },
      ]
    : [
        { label: "1K", value: 1000 },
        { label: "5K", value: 5000 },
        { label: "10K", value: 10000 },
        { label: "25K", value: 25000 },
      ];
  const availableBalance = wallets.find((w) => w.currency === currency)?.balance ?? 0;

  const fee =
    method === "bank" ? Math.min(Number(amount || 0) * 0.005, 5000) :
    method === "momo" ? Number(amount || 0) * 0.01 :
    0;
  const total = Number(amount || 0) + fee;

  return (
    <Card className="mx-auto max-w-2xl p-4 sm:p-6 border-border/60 shadow-premium-sm flex flex-col min-h-[600px] relative">
      {/* Balance Indicator at top */}
      <div className="mb-4 rounded-xl bg-muted/40 p-4 border border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <WalletIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("savings.currentBalance", { defaultValue: "Current Balance" })}</p>
            <p className="font-semibold">{formatMoney(availableBalance, currency)}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Recipient */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h3 className="font-semibold mb-1">{t("send.recipient")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("send.selectContact")}
            </p>

            {/* Recent recipients horizontal scroll */}
            {recentRecipients.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent</p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {recentRecipients.slice(0, 8).map((r: any, i: number) => {
                    const initials = r.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "?";
                    return (
                      <button
                        key={i}
                        onClick={() => selectRecipient({
                          name: r.name,
                          account: r.account,
                          bank: r.bank,
                          type: r.method,
                          method: r.method,
                          provider: r.provider,
                        })}
                        className="group flex flex-col items-center gap-1 shrink-0"
                      >
                        <Avatar className="h-12 w-12 ring-2 ring-border group-hover:ring-primary/40 transition">
                          <AvatarFallback className="bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-muted-foreground max-w-[56px] truncate">
                          {r.name?.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Smart Search Field */}
            <div className="relative mb-4 group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="Search @username, phone, or email..."
                className="pl-10 pr-24 rounded-xl h-12 bg-muted/30 border-border/60 focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                  onClick={handlePickContacts}
                  disabled={contactsLoading}
                  title="Import Contacts"
                >
                  {contactsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ContactIcon className="h-4 w-4" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowManualAdd(!showManualAdd)}
                  title="Add New Beneficiary"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Manual add form */}
            <AnimatePresence>
              {showManualAdd && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 overflow-hidden"
                >
                  <p className="text-xs font-medium text-primary">Add New Beneficiary</p>
                  <Input
                    placeholder="Full name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="rounded-xl bg-background"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Phone"
                        className="pl-9 rounded-xl bg-background"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Email"
                        className="pl-9 rounded-xl bg-background"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowManualAdd(false)}>Cancel</Button>
                    <Button size="sm" className="rounded-xl" onClick={handleManualAdd}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Save & Use
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Source tabs */}
            <div className="mb-3 flex gap-1.5 flex-wrap">
              {[
                { id: "gaexpay", label: "GaexPay", icon: UserCheck, count: filteredMembers.length },
                { id: "contacts", label: "Contacts", icon: ContactIcon, count: checkedContacts ? checkedContacts.totalChecked : deviceContacts.length },
                { id: "beneficiaries", label: "Saved", icon: Users, count: filteredBeneficiaries.length },
                { id: "recent", label: "Recent", icon: Repeat, count: filteredRecent.length },
              ].map((tb) => {
                const Icon = tb.icon;
                const isActive = activeTab === tb.id;
                return (
                  <button
                    key={tb.id}
                    onClick={() => setActiveTab(tb.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tb.label}
                    {tb.count > 0 && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20",
                      )}>
                        {tb.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content per tab */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
              {/* GaexPay Members */}
              {activeTab === "gaexpay" && (
                <>
                  {filteredMembers.length === 0 && !contactsData && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                  {filteredMembers.length === 0 && contactsData && (
                    <div className="grid place-items-center py-8 text-center">
                      <UserCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No GaexPay members found</p>
                      <p className="text-xs text-muted-foreground mt-1">Invite friends to join GaexPay!</p>
                    </div>
                  )}
                  {filteredMembers.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => selectRecipient({
                        name: `${m.firstName} ${m.lastName}`,
                        account: m.phone,
                        bank: "GaexPay",
                        type: "gaexpay",
                        method: "wallet",
                        gaexpayUserId: m.id,
                      })}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
                          {m.firstName[0]}{m.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{m.firstName} {m.lastName}</p>
                          {m.kycStatus === "verified" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[9px] shrink-0">
                              <Check className="h-2.5 w-2.5 mr-0.5" /> KYC
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.username ? `@${m.username}` : m.phone}
                        </p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0 shrink-0">
                        <WalletIcon className="h-3 w-3 mr-0.5" /> Instant
                      </Badge>
                    </button>
                  ))}
                </>
              )}

              {/* Device Contacts */}
              {activeTab === "contacts" && (
                <>
                  {checkingContacts && (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Checking GaexPay membership...</p>
                    </div>
                  )}
                  {!checkingContacts && deviceContacts.length === 0 && (
                    <div className="grid place-items-center py-8 text-center">
                      <ContactIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No contacts imported yet</p>
                      <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={handlePickContacts}>
                        <ContactIcon className="h-4 w-4 mr-1.5" /> Import Contacts
                      </Button>
                    </div>
                  )}
                  {checkedContacts?.members?.map((mc: any) => (
                    <button
                      key={mc.gaexpayUser.id}
                      onClick={() => selectRecipient({
                        name: mc.contactName,
                        account: mc.gaexpayUser.phone,
                        bank: "GaexPay",
                        type: "gaexpay",
                        method: "wallet",
                        gaexpayUserId: mc.gaexpayUser.id,
                      })}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
                          {mc.contactName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{mc.contactName}</p>
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[9px] shrink-0">
                            <UserCheck className="h-2.5 w-2.5 mr-0.5" /> GaexPay
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{mc.phone || mc.email}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0 shrink-0">
                        <WalletIcon className="h-3 w-3 mr-0.5" /> Instant
                      </Badge>
                    </button>
                  ))}
                  {checkedContacts?.nonMembers?.filter((nmc: any) =>
                    !search || nmc.name?.toLowerCase().includes(search.toLowerCase()) || nmc.phone?.includes(search)
                  ).map((nmc: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => selectRecipient({
                        name: nmc.name,
                        account: nmc.phone || nmc.email,
                        bank: nmc.phone ? "Mobile Money" : "Email",
                        type: nmc.phone ? "momo" : "email",
                        method: nmc.phone ? "momo" : "wallet",
                      })}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                          {nmc.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{nmc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{nmc.phone || nmc.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {nmc.phone ? <Smartphone className="h-3 w-3 mr-0.5" /> : <Mail className="h-3 w-3 mr-0.5" />}
                        {nmc.phone ? "MoMo" : "Invite"}
                      </Badge>
                    </button>
                  ))}
                  {!checkedContacts && filteredDeviceContacts.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => selectRecipient({
                        name: c.name,
                        account: c.phone || c.email,
                        bank: c.phone ? "Mobile Money" : "Email",
                        type: c.phone ? "momo" : "email",
                        method: c.phone ? "momo" : "wallet",
                      })}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                          {c.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.phone || c.email}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Saved Beneficiaries */}
              {activeTab === "beneficiaries" && (
                <>
                  {filteredBeneficiaries.length === 0 && contactsData && (
                    <div className="grid place-items-center py-8 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No saved beneficiaries yet</p>
                    </div>
                  )}
                  {filteredBeneficiaries.length === 0 && !contactsData && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                  {filteredBeneficiaries.map((b: any) => (
                    <button
                      key={b.id}
                      onClick={() => selectRecipient(b)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={cn(
                          "text-xs font-semibold",
                          b.isGaexpayMember ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary",
                        )}>
                          {b.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{b.name}</p>
                          {b.isGaexpayMember && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[9px] shrink-0">
                              <UserCheck className="h-2.5 w-2.5 mr-0.5" /> GaexPay
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{b.account} · {b.bank || b.type}</p>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px] shrink-0">{b.type}</Badge>
                    </button>
                  ))}
                </>
              )}

              {/* Recent Recipients */}
              {activeTab === "recent" && (
                <>
                  {filteredRecent.length === 0 && contactsData && (
                    <div className="grid place-items-center py-8 text-center">
                      <Repeat className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No recent recipients</p>
                    </div>
                  )}
                  {filteredRecent.map((r: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => selectRecipient({
                        name: r.name,
                        account: r.account,
                        bank: r.bank,
                        type: r.method,
                        method: r.method,
                        provider: r.provider,
                      })}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                          {r.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.account || r.bank} · {r.method}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px] shrink-0">
                        <Repeat className="h-3 w-3 mr-0.5" /> Again
                      </Badge>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Info banner */}
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-xs text-primary">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>GaexPay members</strong> get instant, free transfers. For others, choose Bank Transfer or Mobile Money — fees apply.
              </span>
            </div>
          </motion.div>
        )}

        {/* Step 1: Amount */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
            {/* Method selector — horizontal scroll */}
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">Method</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {METHODS.filter(m => getSupportedPaymentMethods(meData?.user?.country).includes(m.id)).map((m) => {
                  const Icon = m.icon;
                  const isActive = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "group flex min-w-[120px] flex-col gap-1.5 rounded-2xl border p-3 text-left transition shrink-0",
                        isActive
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30",
                      )}
                    >
                      <div className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl transition",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{t(`send.methods.${m.id}`, { defaultValue: m.label })}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.id === "bank" ? t("send.feeValue.bank", { defaultValue: `0.5% · max ${symbol}5K`, symbol: symbol }) :
                           m.id === "momo" ? t("send.feeValue.momo", { defaultValue: "1.0% · instant" }) :
                           m.id === "wallet" ? t("send.feeValue.wallet", { defaultValue: "Free · Instant" }) :
                           m.id === "crypto" ? t("send.feeValue.crypto", { defaultValue: "On-chain" }) :
                           m.fee}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider picker for MoMo */}
            {method === "momo" && (
              <div className="mb-5 space-y-4">
                <div>
                  <Label className="text-xs">Country</Label>
                  <Select value={momoCountryCode} onValueChange={setMomoCountryCode}>
                    <SelectTrigger className="rounded-xl bg-background mt-1.5 h-10 border-border/60">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="+225">🇨🇮 Côte d'Ivoire (+225)</SelectItem>
                      <SelectItem value="+237">🇨🇲 Cameroon (+237)</SelectItem>
                      <SelectItem value="+228">🇹🇬 Togo (+228)</SelectItem>
                      <SelectItem value="+221">🇸🇳 Senegal (+221)</SelectItem>
                      <SelectItem value="+234">🇳🇬 Nigeria (+234)</SelectItem>
                      <SelectItem value="+233">🇬🇭 Ghana (+233)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Provider</Label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {MOBILE_MONEY_PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition overflow-hidden group",
                          provider === p.id 
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm" 
                            : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        {/* Subtle background glow from provider color */}
                        <div 
                          className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300" 
                          style={{ backgroundColor: p.color }} 
                        />
                        
                        <Avatar className="h-10 w-10 shrink-0 shadow-sm border border-border/40">
                          <AvatarImage src={`/logos/${p.id}.png`} alt={p.name} className="object-cover bg-white" />
                          <AvatarFallback style={{ backgroundColor: p.color, color: p.textColor }} className="text-xs font-bold tracking-wider">
                            {p.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <span className="text-[10px] font-semibold text-center leading-tight z-10">{p.name}</span>
                        
                        {provider === p.id && (
                          <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Additional details for Bank */}
            {method === "bank" && (
              <div className="mb-5 space-y-3">
                <Label className="text-xs font-semibold">Bank Details</Label>
                <Input placeholder="Bank Name" className="rounded-xl bg-background h-10 border-border/60" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                <Input placeholder="Account Number (IBAN/RIB)" className="rounded-xl bg-background h-10 border-border/60" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                <Input placeholder="Routing / Sort Code" className="rounded-xl bg-background h-10 border-border/60" value={routingCode} onChange={(e) => setRoutingCode(e.target.value)} />
              </div>
            )}

            {/* Additional details for Crypto */}
            {method === "crypto" && (
              <div className="mb-5 space-y-3">
                <Label className="text-xs font-semibold">Blockchain Network</Label>
                <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                  <SelectTrigger className="rounded-xl bg-background h-10 border-border/60">
                    <SelectValue placeholder="Select Network" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="erc20">Ethereum (ERC20)</SelectItem>
                    <SelectItem value="trc20">Tron (TRC20)</SelectItem>
                    <SelectItem value="bep20">BNB Smart Chain (BEP20)</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="pi-network">Pi Network</SelectItem>
                  </SelectContent>
                </Select>
                
                <Label className="text-xs font-semibold mt-2 block">Wallet Address</Label>
                <div className="flex gap-2">
                  <Input placeholder="0x... or Address" className="rounded-xl bg-background flex-1 h-10 border-border/60" value={cryptoAddress} onChange={(e) => setCryptoAddress(e.target.value)} />
                  <Button variant="outline" size="icon" className="rounded-xl shrink-0 h-10 w-10 border-border/60 text-primary">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Large amount display */}
            <div className="mb-4">
              <div className="flex items-center rounded-2xl border border-border/80 bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-12 border-0 bg-transparent shadow-none hover:bg-muted/50 rounded-xl font-medium focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code} className="rounded-lg">{c.flag} {c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <div className="h-8 w-px bg-border/80 mx-1 shrink-0" />
                
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 border-0 bg-transparent text-2xl sm:text-3xl font-bold tabular-nums text-right shadow-none focus-visible:ring-0 h-14 pr-4"
                />
              </div>
            </div>

            {/* Quick amount chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts.map((qa) => (
                <button
                  key={qa.value}
                  onClick={() => setAmount(String(qa.value))}
                  className="rounded-xl border border-border/60 bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {symbol}{qa.label}
                </button>
              ))}
              <button
                onClick={() => setAmount(String(Math.floor(availableBalance)))}
                className="rounded-xl border border-border/60 bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                Max
              </button>
            </div>

            {/* Pushed to bottom */}
            <div className="mt-auto pt-6 space-y-4">
              {/* Note field */}
              <div className="space-y-2">
                <Label className="text-xs">Note (optional)</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What's this for?"
                    className="pl-9 rounded-xl h-10"
                  />
                </div>
              </div>

              {/* Recipient summary card (moved to bottom) */}
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
                      {recipient?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{recipient?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {recipient?.account || recipient?.bank}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(0)}
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  Change
                </button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setStep(0)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!amount || Number(amount) <= 0}
                  className="flex-1 rounded-xl h-12 shadow-premium-sm"
                >
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
            <h3 className="font-semibold mb-1">Review transfer</h3>
            <p className="text-sm text-muted-foreground mb-4">Please confirm the details below</p>

            {/* Amount Summary */}
            <div className="flex flex-col items-center justify-center py-6">
              <p className="text-xs text-muted-foreground mb-1">Sending</p>
              <p className="text-4xl font-bold tabular-nums">{formatMoney(Number(amount), currency)}</p>
            </div>

            {/* Push details to bottom */}
            <div className="mt-auto space-y-4 pt-6">
              {/* Recipient summary card */}
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
                    {recipient?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{recipient?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {recipient?.account || recipient?.bank}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-[10px] shrink-0">
                  {method === "momo" ? "Mobile Money" : method === "bank" ? "Bank" : method === "crypto" ? "Crypto" : "GaexPay"}
                </Badge>
              </div>

              {/* Fee breakdown */}
              <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
                <BreakdownRow label="Amount" value={formatMoney(Number(amount), currency)} />
                <BreakdownRow
                  label="Fee"
                  value={fee === 0 ? "Free" : formatMoney(fee, currency)}
                  hint={method === "wallet" ? "GaexPay member" : method === "bank" ? "0.5% · capped" : method === "momo" ? "1.0%" : "On-chain"}
                />
                <div className="border-t border-border/60 pt-3">
                  <BreakdownRow label="Total" value={formatMoney(total, currency)} bold />
                </div>
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Protected by GaexPay Buyer Protection & end-to-end encryption.
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setStep(1)} disabled={loading}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button className="flex-1 rounded-xl h-12 shadow-premium-sm" onClick={() => setStep(3)}>
                  Confirm & Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: OTP */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Verify it's you</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the 6-digit code sent to your registered phone & email
              </p>
            </div>

            <div className="my-6 flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Didn't get a code? <button className="text-primary font-medium">Resend in 0:42</button>
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Demo: enter any 6 digits to continue
            </p>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={submit}
                disabled={otp.length < 6 || loading}
                className="flex-1 rounded-xl h-12 shadow-premium-sm"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending...</>
                  : "Confirm Transfer"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && done && (
          <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Confetti trigger={true} />
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white pulse-glow"
              >
                <Check className="h-8 w-8" strokeWidth={3} />
              </motion.div>
              <h3 className="text-xl font-bold">Transfer Successful!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatMoney(Number(amount), currency)} sent to {recipient?.name}
              </p>
            </div>

            <div className="my-5 space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
              <BreakdownRow label="Reference" value={done.reference} />
              <BreakdownRow label="Recipient" value={recipient?.name} />
              <BreakdownRow label="Amount" value={formatMoney(Number(amount), currency)} />
              <BreakdownRow label="Fee" value={formatMoney(done.fee, currency)} />
              <BreakdownRow label="Date" value={new Date(done.completedAt).toLocaleString()} />
              <BreakdownRow label="Status" value="Completed" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11"
                onClick={() => { navigator.clipboard?.writeText(done.reference); toast.success("Reference copied"); }}
              >
                <Copy className="h-4 w-4 mr-1.5" /> Copy Ref
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl h-11">
                <Share2 className="h-4 w-4 mr-1.5" /> Share
              </Button>
              <Button className="flex-1 rounded-xl h-11 shadow-premium-sm" onClick={reset}>
                <Repeat className="h-4 w-4 mr-1.5" /> Send Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function BreakdownRow({ label, value, hint, bold }: { label: string; value?: string; hint?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className={cn("text-xs", bold ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
        {hint && <p className="text-[10px] text-muted-foreground/80">{hint}</p>}
      </div>
      <span className={cn("text-sm tabular-nums text-right", bold ? "font-bold text-lg" : "font-medium")}>{value || "—"}</span>
    </div>
  );
}

function RequestFlow() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");

  const generate = () => {
    setLink(`https://gaexpay.com/pay/req/${currency}${amount}-${Date.now().toString(36)}`);
    toast.success("Payment request link generated");
  };

  return (
    <Card className="mx-auto max-w-2xl p-4 sm:p-6 border-border/60 shadow-premium-sm">
      <h3 className="font-semibold text-base sm:text-lg">Request Money</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 mb-4">
        Generate a payment link or QR code to receive funds
      </p>

      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 sm:p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-20 sm:w-24 h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 border-0 bg-transparent text-3xl sm:text-4xl font-bold tabular-nums text-center focus-visible:ring-0 h-12"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label className="text-xs">Note for payer</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Dinner split, rent contribution"
          className="rounded-xl h-10"
        />
      </div>

      <Button className="mt-4 w-full h-12 rounded-xl shadow-premium-sm" onClick={generate}>
        Generate Request Link
      </Button>

      {link && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
            <QrCode className="h-7 w-7 text-primary shrink-0" />
            <Input readOnly value={link} className="border-0 bg-transparent text-xs" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { navigator.clipboard?.writeText(link); toast.success("Link copied"); }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="h-9 rounded-xl"><Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
            <Button variant="outline" size="sm" className="h-9 rounded-xl"><Share2 className="h-3.5 w-3.5 mr-1" /> Email</Button>
            <Button variant="outline" size="sm" className="h-9 rounded-xl"><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function TopUpFlow() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("");
  const [cryptoCoin, setCryptoCoin] = useState("USDT");
  const [cryptoNetwork, setCryptoNetwork] = useState("trc20");
  const { data: meData } = useFetch<any>("/api/auth/me");
  const { symbol, currency } = useFormatMoney();

  const generatedAddress = cryptoCoin === "USDT" && cryptoNetwork === "trc20" ? "TFEj9kP7..." : 
                           cryptoCoin === "USDT" && cryptoNetwork === "erc20" ? "0x892a..." :
                           cryptoCoin === "BTC" ? "1A1zP1..." : "0x...";

  const supportedMethods = getSupportedPaymentMethods(meData?.user?.country);

  const handleTopUp = async () => {
    if (!selectedMethod) return;

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (selectedMethod === "momo" && (!phone || !provider)) {
      toast.error("Please enter phone and select provider");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/wallets/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method: selectedMethod, currency, phone, provider }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to initialize top-up");
      
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.success(data.message || "Top-up initiated");
        setSelectedMethod(null);
        setAmount("");
        setPhone("");
        setProvider("");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl p-4 sm:p-6 border-border/60 shadow-premium-sm">
      <h3 className="font-semibold text-base sm:text-lg">Top Up Wallet</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 mb-6">
        Add funds from card, bank or mobile money
      </p>

      <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
        {[
          { icon: Landmark, title: "Bank Transfer", desc: "Free · Instant", color: "bg-emerald-500/15 text-emerald-600", method: "bank" },
          { icon: Smartphone, title: "Mobile Money", desc: "MTN, Orange, Airtel", color: "bg-amber-500/15 text-amber-600", method: "momo" },
          { icon: WalletIcon, title: "Debit Card", desc: "Visa, Mastercard", color: "bg-teal-500/15 text-teal-600", method: "card" },
          { icon: Bitcoin, title: "Crypto Deposit", desc: "USDT, BTC, ETH", color: "bg-orange-500/15 text-orange-600", method: "crypto" },
          { icon: Globe, title: "Account Sync (EU/US)", desc: "Global Cards & Bank Sync", color: "bg-blue-500/15 text-blue-600", method: "paypal" },
          { icon: QrCode, title: "Voucher / Code", desc: "Redeem a code", color: "bg-fuchsia-500/15 text-fuchsia-600", method: "voucher" },
        ].filter((m) => supportedMethods.includes(m.method) || m.method === "voucher" || m.method === "paypal").map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMethod === m.method;
          return (
            <div key={m.title} className={cn("flex flex-col gap-2 transition-all", isSelected ? "col-span-full" : "")}>
              <button
                onClick={() => setSelectedMethod(isSelected ? null : m.method)}
                disabled={loading && !isSelected}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border bg-card p-3 sm:p-4 text-left transition shadow-premium-xs",
                  isSelected ? "border-primary bg-primary/5 shadow-premium-sm" : "border-border/60 hover:border-primary/40 hover:bg-muted/30 hover:shadow-premium-sm"
                )}
              >
                <div className={cn("grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-xl shrink-0", m.color)}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">{m.desc}</p>
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition", isSelected ? "rotate-90" : "group-hover:translate-x-0.5")} />
              </button>
              
              {isSelected && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-5 animate-in fade-in zoom-in-95 mt-1">
                  
                  <div className="space-y-2 text-center">
                    <Label className="text-xs font-semibold text-primary">Amount to Top Up</Label>
                    <div className="flex items-center justify-center gap-1 mx-auto max-w-[200px] border-b-2 border-primary/20 focus-within:border-primary transition-colors pb-1">
                      <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">{symbol}</span>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="border-0 bg-transparent text-3xl sm:text-4xl font-bold tabular-nums text-center focus-visible:ring-0 h-12 px-0 w-full"
                        autoFocus
                      />
                    </div>
                  </div>

                  {m.method === "momo" && (
                    <div className="space-y-4 pt-2 border-t border-primary/10">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-primary">Mobile Money Provider</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {["mtn", "orange", "airtel"].map(p => (
                            <button
                              key={p}
                              onClick={() => setProvider(p)}
                              className={cn(
                                "capitalize text-xs font-medium h-10 rounded-xl border transition-colors",
                                provider === p ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/60 hover:bg-muted text-muted-foreground"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-primary">Phone Number</Label>
                        <Input 
                          placeholder="e.g. 0541234567" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="bg-background border-border/60 focus-visible:ring-primary/30 rounded-xl h-11"
                        />
                      </div>
                    </div>
                  )}

                  {m.method === "crypto" && (
                    <div className="space-y-4 pt-2 border-t border-primary/10">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-primary">Coin</Label>
                        <Select value={cryptoCoin} onValueChange={setCryptoCoin}>
                          <SelectTrigger className="rounded-xl h-11 bg-background border-border/60">
                            <SelectValue placeholder="Select coin" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="USDT">USDT (Tether)</SelectItem>
                            <SelectItem value="USDC">USDC (USD Coin)</SelectItem>
                            <SelectItem value="BTC">BTC (Bitcoin)</SelectItem>
                            <SelectItem value="ETH">ETH (Ethereum)</SelectItem>
                            <SelectItem value="PI">PI (Pi Network)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-primary">Network</Label>
                        <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                          <SelectTrigger className="rounded-xl h-11 bg-background border-border/60">
                            <SelectValue placeholder="Select network" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="trc20">TRC20 (Tron)</SelectItem>
                            <SelectItem value="erc20">ERC20 (Ethereum)</SelectItem>
                            <SelectItem value="bep20">BEP20 (Binance Smart Chain)</SelectItem>
                            <SelectItem value="polygon">Polygon</SelectItem>
                            <SelectItem value="solana">Solana</SelectItem>
                            <SelectItem value="pi-network">Pi Network</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-xl border border-border/60 text-center">
                        <QrCode className="h-24 w-24 mx-auto mb-3 text-primary opacity-80" />
                        <p className="text-xs text-muted-foreground mb-1">Your deposit address</p>
                        <p className="text-[11px] font-mono bg-background p-2 rounded-lg border border-border/40 break-all select-all">
                          {cryptoCoin === "USDT" && cryptoNetwork === "trc20" ? "TFEj9kP7N2PcxH1V7mRtye11P1xHwN9jX4" : 
                           (cryptoCoin === "USDT" || cryptoCoin === "USDC" || cryptoCoin === "ETH") && (cryptoNetwork === "erc20" || cryptoNetwork === "bep20" || cryptoNetwork === "polygon") ? "0x892a061801E852DfbCda4E553531FfA386D48Ffc" :
                           cryptoCoin === "BTC" ? "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" :
                           cryptoCoin === "PI" || cryptoNetwork === "pi-network" ? "GAEXPiWalletAddress123ABCxyz987" :
                           cryptoNetwork === "solana" ? "5PzTq3v1P2a2p3GkZ6sJgL4m5fR8a9dFhBcNpWxYyZ" :
                           "0x..." + Math.random().toString(36).slice(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {m.method === "paypal" && (
                    <div className="space-y-4 pt-2 border-t border-primary/10">
                      <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                        <Globe className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Sync your EU/US Account</p>
                        <p className="text-xs text-muted-foreground mb-4">Link your international account to seamlessly deposit funds.</p>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                          Connect Account
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full h-12 rounded-xl shadow-premium-sm font-semibold" 
                    onClick={handleTopUp}
                    disabled={loading || !amount || (m.method === "momo" && (!phone || !provider))}
                  >
                    {loading ? "Processing..." : `Top Up ${symbol}${Number(amount || 0).toLocaleString()}`}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WithdrawFlow() {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const { data: walletData } = useFetch<{ wallets: any[]; totalNGN: number }>("/api/wallets");
  const { data: benData } = useFetch<{ beneficiaries: any[] }>("/api/beneficiaries");
  const { data: meData } = useFetch<any>("/api/auth/me");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<any>(null);

  const wallets = walletData?.wallets ?? [];
  const beneficiaries = benData?.beneficiaries ?? [];
  const defaultWallet = wallets.find((w) => w.isDefault) || wallets[0];
  const availableBalance = defaultWallet?.balance ?? 0;
  const dailyLimit = 5000000;
  const dailyLimitLeft = Math.max(0, dailyLimit - availableBalance * 0.1);

  const supportedMethods = getSupportedPaymentMethods(meData?.user?.country);

  const withdrawalDestinations = beneficiaries.filter((b) => 
    (b.type === "bank" || b.type === "momo") && supportedMethods.includes(b.type)
  );

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (Number(amount) > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/wallets/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          destinationId: destination
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(data.transaction);
        toast.success(`Withdrawal of ${symbol}${Number(amount).toLocaleString()} initiated`);
      } else {
        toast.error(data.error || "Withdrawal failed");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDone(null);
    setAmount("");
    setDestination("");
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-2xl p-4 sm:p-6 border-border/60 shadow-premium-sm">
        <Confetti trigger={true} />
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white pulse-glow"
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.div>
          <h3 className="text-xl font-bold">Withdrawal Successful!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(Number(amount))} sent to your {done.method} account
          </p>
        </div>

        <div className="my-5 space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
          <BreakdownRow label="Reference" value={done.reference} />
          <BreakdownRow label="Destination" value={done.counterpartyName} />
          <BreakdownRow label="Amount" value={fmt(Number(amount))} />
          <BreakdownRow label="Fee" value={fmt(done.fee)} />
          <BreakdownRow label="Date" value={new Date(done.completedAt).toLocaleString()} />
          <BreakdownRow label="Status" value="Processing" />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-11"
            onClick={() => { navigator.clipboard?.writeText(done.reference); toast.success("Reference copied"); }}
          >
            <Copy className="h-4 w-4 mr-1.5" /> Copy Ref
          </Button>
          <Button className="flex-1 rounded-xl h-11 shadow-premium-sm" onClick={reset}>
            <Repeat className="h-4 w-4 mr-1.5" /> New Withdrawal
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl p-4 sm:p-6 border-border/60 shadow-premium-sm">
      <h3 className="font-semibold text-base sm:text-lg">Withdraw Funds</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 mb-4">
        Cash out to bank or mobile money
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4 shadow-premium-xs">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Available</p>
            <p className="text-base sm:text-xl font-bold tabular-nums">{fmt(availableBalance)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4 shadow-premium-xs">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Daily limit left</p>
            <p className="text-base sm:text-xl font-bold tabular-nums">{fmt(dailyLimitLeft)}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Withdraw to</Label>
          {withdrawalDestinations.length > 0 ? (
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                {withdrawalDestinations.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bank || b.type} · {b.account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">No saved bank or mobile money accounts</p>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => useApp.getState().setView("send")}>
                Add beneficiary
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Amount ({userCur})</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-11 rounded-xl text-base sm:text-lg font-semibold"
          />
        </div>
        <Button className="w-full h-12 rounded-xl shadow-premium-sm" onClick={handleWithdraw} disabled={!amount || !destination || loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </Card>
  );
}
