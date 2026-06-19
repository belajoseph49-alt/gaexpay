"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SendHorizontal, ArrowDownToLine, ArrowUpFromLine, QrCode, Search, UserPlus,
  Smartphone, Landmark, Wallet as WalletIcon, Check, ShieldCheck, ChevronRight,
  ChevronLeft, Loader2, Copy, Share2, Repeat, Contact as ContactIcon,
  Users, UserCheck, Phone, Mail, Plus, Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES, MOBILE_MONEY_PROVIDERS, BANKS } from "@/lib/gaexpay";
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

export function SendView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Send & Receive</h1>
        <p className="text-sm text-muted-foreground">Transfer money instantly, request payments, top up or withdraw</p>
      </div>
      <Tabs defaultValue="send">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="send"><SendHorizontal className="h-4 w-4 mr-1.5" /> Send</TabsTrigger>
          <TabsTrigger value="request"><ArrowDownToLine className="h-4 w-4 mr-1.5" /> Request</TabsTrigger>
          <TabsTrigger value="topup"><ArrowDownToLine className="h-4 w-4 mr-1.5" /> Top Up</TabsTrigger>
          <TabsTrigger value="withdraw"><ArrowUpFromLine className="h-4 w-4 mr-1.5" /> Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value="send" className="mt-4"><SendFlow /></TabsContent>
        <TabsContent value="request" className="mt-4"><RequestFlow /></TabsContent>
        <TabsContent value="topup" className="mt-4"><TopUpFlow /></TabsContent>
        <TabsContent value="withdraw" className="mt-4"><WithdrawFlow /></TabsContent>
      </Tabs>
    </div>
  );
}

function SendFlow() {
  const { data: contactsData, reload: reloadContacts } = useFetch<any>("/api/contacts");
  const { data: wData } = useFetch<{ wallets: any[] }>("/api/wallets");
  const {
    deviceContacts, loading: contactsLoading, supported: contactsSupported,
    pickContacts, checkMembership, addManualContact,
  } = useContacts();
  const [step, setStep] = useState(0);
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

  // Filter logic
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

  // Handle picking device contacts
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

  // Handle manual contact add
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

  // Check device contacts for membership
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
        body: JSON.stringify({ amount: Number(amount), currency, recipient, method, provider, note }),
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

  return (
    <Card className="mx-auto max-w-2xl p-6">
      {/* Steps indicator */}
      <div className="mb-6 flex items-center justify-between">
        {["Recipient", "Amount", "Review", "Verify"].map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition",
              i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground",
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("ml-2 hidden sm:inline text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < 3 && <div className={cn("mx-2 h-0.5 flex-1 rounded", i < step ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Recipient — NEW DESIGN */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h3 className="font-semibold mb-1">Who are you sending to?</h3>
            <p className="text-sm text-muted-foreground mb-4">Pick from contacts, GaexPay members, or enter new details</p>

            {/* Action buttons row */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              {/* Access phone contacts */}
              <Button
                variant="outline"
                className="h-12"
                onClick={handlePickContacts}
                disabled={contactsLoading}
                suppressHydrationWarning
              >
                <span className="flex items-center justify-center" suppressHydrationWarning>
                  <Loader2 className={cn("h-4 w-4 mr-2", contactsLoading ? "animate-spin" : "hidden")} />
                  <ContactIcon className={cn("h-4 w-4 mr-2", contactsLoading ? "hidden" : "")} />
                  Contacts
                </span>
              </Button>

              {/* New recipient */}
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setShowManualAdd(!showManualAdd)}
                suppressHydrationWarning
              >
                <span className="flex items-center justify-center" suppressHydrationWarning>
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Recipient
                </span>
              </Button>
            </div>

            {/* Manual add form */}
            {showManualAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 rounded-lg border bg-muted/30 p-4 space-y-3"
              >
                <p className="text-xs font-medium text-muted-foreground">Enter recipient details manually</p>
                <Input placeholder="Full name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Phone" className="pl-9" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Email" className="pl-9" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowManualAdd(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleManualAdd}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Contact
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email, account..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Tabs: GaexPay Members | Contacts | Saved | Recent */}
            <div className="mb-3 flex gap-1.5 flex-wrap">
              {[
                { id: "gaexpay", label: "GaexPay", icon: UserCheck, count: filteredMembers.length },
                { id: "contacts", label: "Contacts", icon: ContactIcon, count: checkedContacts ? checkedContacts.totalChecked : deviceContacts.length },
                { id: "beneficiaries", label: "Saved", icon: Users, count: filteredBeneficiaries.length },
                { id: "recent", label: "Recent", icon: Repeat, count: filteredRecent.length },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                      isActive ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    {t.count > 0 && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20",
                      )}>
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content per tab */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>

              {/* GaexPay Members tab */}
              {activeTab === "gaexpay" && (
                <>
                  {filteredMembers.length === 0 && !contactsData && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
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
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
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

              {/* Device Contacts tab */}
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
                      <Button size="sm" variant="outline" className="mt-3" onClick={handlePickContacts}>
                        <ContactIcon className="h-4 w-4 mr-1.5" /> Import Contacts
                      </Button>
                    </div>
                  )}
                  {/* Show contacts that are GaexPay members first */}
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
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
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
                  {/* Non-member contacts */}
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
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
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
                  {/* Device contacts not yet checked */}
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
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
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

              {/* Saved Beneficiaries tab */}
              {activeTab === "beneficiaries" && (
                <>
                  {filteredBeneficiaries.length === 0 && contactsData && (
                    <div className="grid place-items-center py-8 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No saved beneficiaries yet</p>
                    </div>
                  )}
                  {filteredBeneficiaries.length === 0 && !contactsData && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
                  {filteredBeneficiaries.map((b: any) => (
                    <button
                      key={b.id}
                      onClick={() => selectRecipient(b)}
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
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

              {/* Recent Recipients tab */}
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
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
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

            {/* Payment method info */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>GaexPay members</strong> get instant, free transfers. For others, choose Bank Transfer or Mobile Money — fees apply.
              </span>
            </div>
          </motion.div>
        )}

        {/* Step 1: Amount */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h3 className="font-semibold mb-1">Enter amount</h3>
            <p className="text-sm text-muted-foreground mb-4">Sending to {recipient?.name}</p>

            {method === "momo" && (
              <div className="mb-4">
                <Label className="text-xs">Provider</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {MOBILE_MONEY_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs transition",
                        provider === p.id ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted",
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

            <div className="rounded-2xl border bg-muted/30 p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 border-0 bg-transparent text-3xl font-bold tabular-nums text-center focus-visible:ring-0"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Available: {formatMoney(wallets.find((w) => w.currency === currency)?.balance ?? 0, currency)}
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              {[5000, 10000, 25000, 50000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="flex-1 rounded-lg border py-1.5 text-xs font-medium hover:bg-muted transition"
                >
                  ₦{v.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-xs">Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this for?" />
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={!amount || Number(amount) <= 0} className="flex-1">
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h3 className="font-semibold mb-1">Review transfer</h3>
            <p className="text-sm text-muted-foreground mb-4">Please confirm the details below</p>

            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <Row label="Recipient" value={recipient?.name} />
              <Row label="Account" value={recipient?.account || recipient?.bank} />
              <Row label="Method" value={method === "momo" ? `Mobile Money · ${provider.toUpperCase()}` : method === "bank" ? "Bank Transfer" : "GaexPay Wallet"} />
              <Row label="Amount" value={formatMoney(Number(amount), currency)} />
              <Row label="Fee" value={method === "bank" ? formatMoney(Math.min(Number(amount) * 0.005, 5000), currency) : method === "momo" ? formatMoney(Number(amount) * 0.01, currency) : "Free"} />
              <div className="border-t pt-3">
                <Row label="Total" value={formatMoney(Number(amount) + (method === "bank" ? Math.min(Number(amount) * 0.005, 5000) : method === "momo" ? Number(amount) * 0.01 : 0), currency)} bold />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Protected by GaexPay Buyer Protection & end-to-end encryption.
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">Confirm & Continue</Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: OTP */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold">Verify it's you</h3>
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
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={submit} disabled={otp.length < 6 || loading} className="flex-1">
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending...</> : "Confirm Transfer"}
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

            <div className="my-5 space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
              <Row label="Reference" value={done.reference} />
              <Row label="Recipient" value={recipient?.name} />
              <Row label="Amount" value={formatMoney(Number(amount), currency)} />
              <Row label="Fee" value={formatMoney(done.fee, currency)} />
              <Row label="Date" value={new Date(done.completedAt).toLocaleString()} />
              <Row label="Status" value="Completed" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard?.writeText(done.reference); toast.success("Reference copied"); }}>
                <Copy className="h-4 w-4 mr-1.5" /> Copy Ref
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="h-4 w-4 mr-1.5" /> Share
              </Button>
              <Button className="flex-1" onClick={reset}>
                <Repeat className="h-4 w-4 mr-1.5" /> Send Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", bold ? "font-bold" : "font-medium")}>{value || "—"}</span>
    </div>
  );
}

function RequestFlow() {
  const { data: wData } = useFetch<{ wallets: any[] }>("/api/wallets");
  const wallets = wData?.wallets ?? [];
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");

  const generate = () => {
    setLink(`https://gaexpay.com/pay/req/${currency}${amount}-${Date.now().toString(36)}`);
    toast.success("Payment request link generated");
  };

  return (
    <Card className="mx-auto max-w-2xl p-6">
      <h3 className="font-semibold mb-1">Request Money</h3>
      <p className="text-sm text-muted-foreground mb-4">Generate a payment link or QR code to receive funds</p>

      <div className="rounded-2xl border bg-muted/30 p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 border-0 bg-transparent text-3xl font-bold tabular-nums text-center focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label className="text-xs">Note for payer</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Dinner split, rent contribution" />
      </div>

      <Button className="mt-4 w-full" onClick={generate}>Generate Request Link</Button>

      {link && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
            <QrCode className="h-8 w-8 text-primary shrink-0" />
            <Input readOnly value={link} className="border-0 bg-transparent text-xs" />
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(link); toast.success("Link copied"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm"><Share2 className="h-4 w-4 mr-1" /> WhatsApp</Button>
            <Button variant="outline" size="sm"><Share2 className="h-4 w-4 mr-1" /> Email</Button>
            <Button variant="outline" size="sm"><Copy className="h-4 w-4 mr-1" /> Copy</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function TopUpFlow() {
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <h3 className="font-semibold mb-1">Top Up Wallet</h3>
      <p className="text-sm text-muted-foreground mb-4">Add funds from card, bank or mobile money</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { icon: Landmark, title: "Bank Transfer", desc: "Free · Instant", color: "bg-emerald-500/15 text-emerald-500" },
          { icon: Smartphone, title: "Mobile Money", desc: "MTN, Orange, Airtel", color: "bg-amber-500/15 text-amber-500" },
          { icon: WalletIcon, title: "Debit Card", desc: "Visa, Mastercard", color: "bg-violet-500/15 text-violet-500" },
          { icon: QrCode, title: "Voucher / Code", desc: "Redeem a code", color: "bg-sky-500/15 text-sky-500" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.title} className="flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/30">
              <div className={cn("grid h-11 w-11 place-items-center rounded-lg", m.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function WithdrawFlow() {
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <h3 className="font-semibold mb-1">Withdraw Funds</h3>
      <p className="text-sm text-muted-foreground mb-4">Cash out to bank or mobile money agent</p>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-xl font-bold tabular-nums">₦845,230.55</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Daily limit left</p>
            <p className="text-xl font-bold tabular-nums">₦4,200,000</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Withdraw to</Label>
          <Select defaultValue="bank">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bank">Access Bank · 0123456789</SelectItem>
              <SelectItem value="gtb">GTBank · 9876543210</SelectItem>
              <SelectItem value="momo">MTN MoMo · +2348012345678</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input type="number" placeholder="0.00" className="text-lg font-semibold" />
        </div>
        <Button className="w-full">Continue</Button>
      </div>
    </Card>
  );
}
