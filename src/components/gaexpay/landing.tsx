"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight, Shield, Zap, Globe, Smartphone, CreditCard, QrCode,
  Users, Star, Fingerprint, Sparkles, TrendingUp, Wallet,
  SendHorizontal, Coins, Lock, FileCheck, BadgeCheck,
  Twitter, Github, Linkedin, Instagram, ChevronRight, Check, ArrowDownToLine,
} from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { CURRENCIES } from "@/lib/gaexpay";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

// Rotating "live" transactions used in the hero ticker.
const LIVE_TX = [
  { name: "Amaka ●●●●", action: "sent to", target: "Tunde ●●●●", amount: "₦45,000", tone: "success" as const },
  { name: "Kwame ●●●●", action: "exchanged", target: "NGN → GHS", amount: "₦120,000", tone: "info" as const },
  { name: "Fatima ●●●●", action: "paid", target: "DSTV bill", amount: "₦12,500", tone: "danger" as const },
  { name: "David ●●●●", action: "received from", target: "Salary", amount: "₦850,000", tone: "success" as const },
  { name: "Aisha ●●●●", action: "bought", target: "USDC", amount: "₦60,000", tone: "warning" as const },
  { name: "Emeka ●●●●", action: "topped up", target: "MTN airtime", amount: "₦3,200", tone: "info" as const },
  { name: "Zainab ●●●●", action: "saved to", target: "Holiday Fund", amount: "₦25,000", tone: "success" as const },
  { name: "Yusuf ●●●●", action: "scanned QR at", target: "The Place", amount: "₦6,700", tone: "danger" as const },
];

const TONE_CLASS: Record<"success" | "info" | "warning" | "danger", string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-teal-600 dark:text-teal-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
};

function LiveActivityTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LIVE_TX.length), 2800);
    return () => clearInterval(t);
  }, []);
  const tx = LIVE_TX[idx];
  return (
    <div className="mt-7 flex items-center justify-center lg:justify-start">
      <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/70 px-4 py-2.5 shadow-premium-sm backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="text-[13px] text-muted-foreground"
          >
            <span className="font-semibold text-foreground">{tx.name}</span> {tx.action}{" "}
            <span className="font-semibold text-foreground">{tx.target}</span>{" "}
            <span className={`font-semibold tabular-nums ${TONE_CLASS[tx.tone]}`}>{tx.amount}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TrustStrip() {
  const stats = [
    { value: "$2.4B+", label: "Transferred" },
    { value: "180+", label: "Countries" },
    { value: "30+", label: "Currencies" },
    { value: "99.99%", label: "Uptime" },
  ];
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.08 }}
          className="rounded-2xl border border-border/60 bg-card/60 px-3 py-3 text-center backdrop-blur-sm transition hover:border-primary/30 hover:bg-card"
        >
          <div className="text-lg font-bold tracking-tight text-foreground sm:text-xl tabular-nums">{s.value}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

export function Landing({ onEnter, onSignup }: { onEnter: () => void; onSignup: () => void }) {
  const [activeMockTab, setActiveMockTab] = useState<"wallet" | "card" | "qr" | "ai">("wallet");
  const [cardFrozen, setCardFrozen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header — premium glass */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">{t("landing.features")}</a>
            <a href="#security" className="transition hover:text-foreground">{t("landing.security")}</a>
            <a href="#platforms" className="transition hover:text-foreground">{t("landing.platforms")}</a>
            <a href="#pi-network" className="transition hover:text-foreground">{t("landing.piNetwork")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl" onClick={onEnter}>{t("landing.signIn")}</Button>
            <Button size="sm" className="rounded-xl shadow-premium-sm" onClick={onSignup}>{t("landing.getStarted")} <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — clean, airy, emerald accent */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 mesh-bg" />
          <div className="relative mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-6"
              >
                <Badge className="mb-5 bg-primary/10 text-primary border-0 hover:bg-primary/15 rounded-full px-3 py-1">
                  <Sparkles className="h-3 w-3 mr-1.5" /> {t("landing.aiPowered")}
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
                  {t("landing.heroTitle1")}<br />
                  <span className="gradient-text">{t("landing.heroTitle2")}</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  {t("landing.heroSubtitle")}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button size="lg" onClick={onSignup} className="rounded-xl shadow-premium-md h-12 px-6">
                    {t("landing.getStartedFree")} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-xl h-12 px-6" onClick={onEnter}>
                    {t("landing.signInLiveDemo")}
                  </Button>
                </div>
                {/* Social proof */}
                <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {["A", "K", "F", "T"].map((n) => (
                        <div key={n} className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ring-2 ring-background">
                          {n}
                        </div>
                      ))}
                    </div>
                    <span>{t("landing.users")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                    <span>{t("landing.rating")}</span>
                  </div>
                </div>
                {/* Live activity */}
                <LiveActivityTicker />
                {/* Trust stats */}
                <TrustStrip />
              </motion.div>

              {/* Interactive Phone mockup & Tab switcher */}
              <div className="lg:col-span-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Vertical Tab Switcher (Floating Glass Dock) */}
                <div className="flex sm:flex-col gap-2 p-1.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-premium-sm order-2 sm:order-1 max-w-full overflow-x-auto no-scrollbar">
                  {[
                    { id: "wallet", label: t("nav.wallets"), icon: Wallet },
                    { id: "card", label: t("nav.cards"), icon: CreditCard },
                    { id: "qr", label: t("common.scan"), icon: QrCode },
                    { id: "ai", label: "Gaxie AI", icon: Sparkles },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeMockTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveMockTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition shrink-0",
                          active
                            ? "bg-primary text-primary-foreground shadow-premium-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden md:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Phone shell */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="relative order-1 sm:order-2 shrink-0"
                >
                  {/* Floating badge top-left */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -left-12 bottom-16 z-20 hidden md:block"
                  >
                    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-3 py-2 shadow-premium-md backdrop-blur-sm">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                        <Shield className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold leading-tight">Protected</p>
                        <p className="text-[9px] text-muted-foreground leading-tight">AES-256 SECURE</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Main phone frame */}
                  <div className="relative w-[285px] h-[580px] rounded-[3rem] border-[8px] border-slate-900 bg-slate-900 p-2.5 shadow-premium-xl dark:border-slate-800 flex flex-col">
                    {/* Speaker notch */}
                    <div className="absolute left-1/2 top-0 h-4.5 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-900 dark:bg-slate-800 z-30 flex items-center justify-center">
                      <div className="w-10 h-1 rounded-full bg-slate-800 dark:bg-slate-700" />
                    </div>

                    {/* Simulated Screen Container */}
                    <div className="relative flex-1 rounded-[2.5rem] bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden flex flex-col p-4 pt-11 text-white select-none">
                      {/* Ambient screen glow */}
                      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

                      <AnimatePresence mode="wait">
                        {activeMockTab === "wallet" && (
                          <motion.div
                            key="wallet"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.25 }}
                            className="flex-1 flex flex-col gap-4"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-[10px] text-white/50 block font-medium uppercase tracking-wider">{t("landing.totalBalance")}</span>
                                <span className="text-2xl font-bold tabular-nums tracking-tight">₦845,230.55</span>
                              </div>
                              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                                <Wallet className="h-4 w-4 text-emerald-400" />
                              </div>
                            </div>

                            {/* Simulated Quick Actions Grid */}
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: t("common.send"), icon: SendHorizontal },
                                { label: t("common.scan"), icon: QrCode },
                                { label: t("common.topUp"), icon: ArrowDownToLine },
                                { label: t("nav.cards"), icon: CreditCard },
                              ].map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                  <div key={idx} className="flex flex-col items-center gap-1">
                                    <div className="h-10 w-full rounded-xl bg-white/5 border border-white/5 flex items-center justify-center transition hover:bg-white/15 cursor-pointer">
                                      <Icon className="h-4 w-4 text-white/80" />
                                    </div>
                                    <span className="text-[9px] text-white/60 font-medium">{item.label}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Simulated Recent Transactions */}
                            <div className="flex-1 flex flex-col min-h-0">
                              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">{t("business.recentTransactions")}</span>
                              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                                {[
                                  { name: "Spencer Supermarket", amount: "-₦12,400", time: "10 mins ago", type: "debit" },
                                  { name: "Chinedu Eze", amount: "+₦25,000", time: "1 hour ago", type: "credit" },
                                  { name: "Ikeja Electric", amount: "-₦18,500", time: "3 hours ago", type: "debit" },
                                  { name: "Fatima Bello", amount: "-₦5,000", time: "Yesterday", type: "debit" },
                                ].map((tx, idx) => (
                                  <div key={idx} className="flex justify-between items-center rounded-xl bg-white/5 border border-white/5 px-3 py-2 text-[11px] backdrop-blur-sm">
                                    <div>
                                      <span className="font-semibold block truncate max-w-[130px]">{tx.name}</span>
                                      <span className="text-[9px] text-white/40">{tx.time}</span>
                                    </div>
                                    <span className={cn(
                                      "font-bold tabular-nums px-2 py-0.5 rounded-md",
                                      tx.type === "credit" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                    )}>
                                      {tx.amount}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {activeMockTab === "card" && (
                          <motion.div
                            key="card"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.25 }}
                            className="flex-1 flex flex-col gap-6"
                          >
                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{t("nav.cards")}</span>

                            {/* 3D Glassmorphic Card Mockup */}
                            <motion.div
                              whileHover={{ y: -4, rotateY: 10 }}
                              className={cn(
                                "h-36 rounded-2xl p-4 flex flex-col justify-between shadow-premium-lg border transition duration-300 relative overflow-hidden",
                                cardFrozen
                                  ? "bg-slate-800/80 border-slate-700/60 opacity-60"
                                  : "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-800 border-white/10"
                              )}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] tracking-widest text-white/60 block font-semibold">VISA</span>
                                  <span className="text-[8px] text-white/40 uppercase font-medium">PLATINUM</span>
                                </div>
                                <div className="h-6 w-9 rounded bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                  <div className="h-4 w-6 rounded bg-gradient-to-r from-amber-400 to-amber-200 opacity-80" />
                                </div>
                              </div>

                              <div className="font-mono text-sm tracking-widest text-center my-3">
                                4827 •••• •••• 9012
                              </div>

                              <div className="flex justify-between items-end text-[9px]">
                                <div>
                                  <span className="text-[7px] text-white/40 block">CARDHOLDER</span>
                                  <span className="font-bold">ADAEZE OKONKWO</span>
                                </div>
                                <span className="font-mono font-semibold">12/28</span>
                              </div>
                            </motion.div>

                            {/* Card Control Buttons */}
                            <div className="space-y-2">
                              <button
                                onClick={() => setCardFrozen(!cardFrozen)}
                                className={cn(
                                  "w-full h-10 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                                  cardFrozen
                                    ? "bg-emerald-500 text-white"
                                    : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                                )}
                              >
                                <Lock className="h-3.5 w-3.5" />
                                {cardFrozen ? "Unfreeze Card" : "Freeze Card"}
                              </button>

                              <div className="flex justify-between items-center rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-xs">
                                <span className="text-white/60">Spending Limit</span>
                                <span className="font-bold tabular-nums">₦500,000 / mo</span>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {activeMockTab === "qr" && (
                          <motion.div
                            key="qr"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.25 }}
                            className="flex-1 flex flex-col items-center gap-6 text-center"
                          >
                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider self-start">{t("common.scan")}</span>

                            {/* QR Scanner Container */}
                            <div className="relative w-44 h-44 rounded-2xl border-2 border-emerald-500/30 bg-black/40 p-3 shadow-inner flex items-center justify-center overflow-hidden">
                              {/* Scan Corners */}
                              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl-lg" />
                              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr-lg" />
                              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl-lg" />
                              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br-lg" />

                              {/* Scanline Animation */}
                              <div className="absolute w-full h-[2px] bg-emerald-400 left-0 animate-scan z-10 opacity-75 shadow-[0_0_8px_oklch(0.62_0.14_162)]" />

                              {/* Glow QR Placeholder */}
                              <div className="w-32 h-32 bg-white/10 rounded-xl flex items-center justify-center p-2 relative">
                                <QrCode className="w-full h-full text-emerald-400/90" />
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-white">Merchant QR Scanner</p>
                              <p className="text-[10px] text-white/60 mt-1 max-w-[200px]">Scan a payment code at any registered local store to pay instantly.</p>
                            </div>
                          </motion.div>
                        )}

                        {activeMockTab === "ai" && (
                          <motion.div
                            key="ai"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.25 }}
                            className="flex-1 flex flex-col justify-between"
                          >
                            <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                              <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              </div>
                              <span className="text-xs font-bold">Gaxie AI Assistant</span>
                            </div>

                            {/* Chat Thread Container */}
                            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar py-2 text-[10px]">
                              <div className="flex justify-end">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl rounded-br-md px-3 py-2 max-w-[80%] shadow-premium-xs">
                                  Can I swap my Pi coins for Naira?
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="bg-white/10 border border-white/5 rounded-2xl rounded-bl-md px-3 py-2 max-w-[85%] shadow-premium-xs">
                                  <span className="font-bold text-amber-400 block mb-0.5">GAXIE</span>
                                  Yes! 🚀 You can swap Pi instantly in the app at the current rate of 1 π ≈ ₦47.35. Would you like to connect your wallet?
                                </div>
                              </div>
                            </div>

                            {/* Input box */}
                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 p-1 rounded-xl">
                              <div className="flex-1 text-[10px] text-white/40 px-2">Type a message...</div>
                              <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                                <SendHorizontal className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* Currencies strip — refined */}
        <section className="border-y border-border/40 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Trusted across 30+ currencies worldwide
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              {CURRENCIES.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="tabular-nums">{c.code}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features — premium cards, soft icon tiles */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything you need to move money
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              A complete financial toolkit designed for individuals and businesses across Africa and beyond.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: "Instant Transfers", desc: "Action Hub lets you send & receive money in seconds. GaexPay-to-GaexPay is always free.", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
              { icon: Smartphone, title: "Mobile Money", desc: "MTN MoMo, Orange, Airtel, Moov & M-PESA integrated natively.", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
              { icon: CreditCard, title: "Virtual & Physical Cards", desc: "Issue a Visa/Mastercard instantly. Spend globally online & offline.", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
              { icon: QrCode, title: "QR Payments", desc: "Scan to pay at millions of merchants. No cash, no cards needed.", tone: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" },
              { icon: Globe, title: "Multi-Currency", desc: "Hold 9+ currencies with live exchange rates. Convert at the tap.", tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
              { icon: TrendingUp, title: "Analytics & Insights", desc: "Track spending, set budgets and understand your money flow.", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
              { icon: Shield, title: "Bank-Grade Security", desc: "End-to-end encryption, 2FA, biometric login & AI fraud detection.", tone: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
              { icon: Users, title: "Referral Rewards", desc: "Earn ₦500 for every friend. Climb tiers for bigger bonuses.", tone: "bg-lime-500/10 text-lime-600 dark:text-lime-400" },
              { icon: Coins, title: "Pi Network Integration", desc: "Connect your Pi account. Swap Pi for fiat and stablecoins instantly.", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className="group rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-premium-md hover:-translate-y-1"
                >
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${f.tone} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Security — calm, premium */}
        <section id="security" className="border-y border-border/40 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
                className="relative grid min-h-[340px] place-items-center rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/8 via-primary/4 to-transparent p-8 lg:p-12"
              >
                <div className="absolute inset-0 mesh-bg rounded-3xl opacity-60" />
                <div className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-premium-lg ring-8 ring-emerald-500/10">
                  <Shield className="h-16 w-16 text-white" strokeWidth={1.8} />
                </div>
                <div className="absolute right-6 top-6 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium shadow-premium-sm backdrop-blur">
                  🔒 AES-256
                </div>
                <div className="absolute bottom-6 left-6 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium shadow-premium-sm backdrop-blur">
                  ✓ PCI-DSS L1
                </div>
              </motion.div>

              {/* Right content */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Security</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Your money is protected, always.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  We use the same encryption trusted by global banks, with added layers of intelligence working around the clock.
                </p>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {[
                    { icon: Lock, title: "256-bit encryption", desc: "AES-256 end-to-end on every transaction.", tone: "bg-emerald-500" },
                    { icon: Fingerprint, title: "Biometric auth", desc: "Face ID, Touch ID & fingerprint unlock.", tone: "bg-violet-500" },
                    { icon: FileCheck, title: "PCI-DSS compliant", desc: "Level 1 certified payment infrastructure.", tone: "bg-amber-500" },
                    { icon: BadgeCheck, title: "Regulated & licensed", desc: "AML & KYC compliant, CBN licensed operator.", tone: "bg-teal-500" },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <motion.div
                        key={s.title}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.08 }}
                        className="flex items-start gap-3"
                      >
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.tone} text-white shadow-premium-sm`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{s.title}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section id="platforms" className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Cross-Platform</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Available everywhere you are
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Mobile, web, desktop — synced in real time across all your devices.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Smartphone, title: "iOS & Android", desc: "Native apps with offline sync & biometrics", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
              { icon: Globe, title: "Web App", desc: "Full-featured wallet in your browser", tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
              { icon: CreditCard, title: "Desktop", desc: "Windows, macOS & Linux native experience", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
              { icon: Users, title: "Admin Console", desc: "Complete operations & compliance suite", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="group rounded-2xl border border-border/60 bg-card p-6 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-premium-md hover:-translate-y-1"
                >
                  <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${p.tone} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Available
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Pi Network */}
        <section id="pi-network" className="border-y border-border/40 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="order-2 lg:order-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
                  <span className="text-sm font-bold">π</span> Pi Network
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Bring your Pi to life.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Connect your Pi Network account and turn your mined Pi into spendable value. Swap, send and spend — all from one wallet.
                </p>
                <div className="mt-8 grid gap-3">
                  {[
                    { icon: Coins, title: "Instant Pi swaps", desc: "Convert Pi to NGN, USD, USDT and 9+ currencies at live rates." },
                    { icon: SendHorizontal, title: "Send Pi to anyone", desc: "P2P transfers to any GaexPay user — free and instant." },
                    { icon: Shield, title: "Verified & secure", desc: "Wallet-to-wallet connection. We never touch your private keys." },
                  ].map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.div
                        key={f.title}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.08 }}
                        className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/30 hover:shadow-premium-sm"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-premium-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{f.title}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">{f.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <Button
                  size="lg"
                  onClick={onSignup}
                  className="mt-8 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-premium-md transition hover:shadow-premium-lg h-12 px-6"
                >
                  Connect Pi Account <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
                className="relative order-1 grid min-h-[340px] place-items-center rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/8 to-fuchsia-500/4 p-8 lg:order-2 lg:p-12"
              >
                <div className="absolute inset-0 mesh-bg rounded-3xl opacity-60" />
                <div className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-premium-lg ring-8 ring-violet-500/10">
                  <span className="text-6xl font-bold text-white">π</span>
                </div>
                <div className="absolute right-6 top-6 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium shadow-premium-sm backdrop-blur">
                  🟣 Pi Mainnet
                </div>
                <div className="absolute bottom-6 left-6 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium shadow-premium-sm backdrop-blur tabular-nums">
                  Live: 1 π ≈ $47.35
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA — emerald gradient, airy */}
        <section className="px-4 pt-20 pb-20 lg:px-8 lg:pt-28 lg:pb-28">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 py-20 lg:py-28 shadow-premium-xl">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-1/3 top-1/4 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="relative mx-auto max-w-3xl px-6 text-center text-white"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Ready to take control of your money?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
                Join 2 million+ people using GaexPay across Africa. Open an account in 2 minutes — no paperwork.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={onSignup}
                  className="h-12 w-full rounded-xl bg-white px-8 font-semibold text-emerald-700 shadow-premium-md transition hover:bg-white/90 active:scale-95 sm:h-14 sm:w-auto"
                >
                  Open Free Account <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onEnter}
                  className="h-12 w-full rounded-xl border border-white/30 bg-transparent px-8 text-white backdrop-blur transition hover:bg-white/10 hover:text-white sm:h-14 sm:w-auto"
                >
                  Talk to Sales
                </Button>
              </div>
              {/* Trust line */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/70">
                {["No paperwork", "2-minute setup", "CBN licensed", "Free to start"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer — premium, clean */}
      <footer className="mt-auto border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Borderless digital wallet built for Africa and the world. Send, spend and save across 30+ currencies.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {[Twitter, Github, Linkedin, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-primary/30 hover:bg-muted hover:text-foreground"
                    aria-label="Social link"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: "Product", links: ["Wallets", "Cards", "Transfers", "QR Payments", "Mobile Money"] },
              { title: "Company", links: ["About", "Careers", "Blog", "Press", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Compliance", "Licenses"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="mb-4 text-sm font-semibold tracking-tight">{col.title}</p>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-foreground">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">© 2025 GaexPay Inc. All rights reserved. Licensed by CBN.</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-foreground">Privacy</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-foreground">Terms</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-foreground">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
