"use client";

import { motion } from "framer-motion";
import {
  ArrowRight, Shield, Zap, Globe, Smartphone, CreditCard, QrCode,
  Users, Star, Fingerprint, Sparkles, TrendingUp, Wallet,
  SendHorizontal, Coins, Lock, FileCheck, BadgeCheck,
  Twitter, Github, Linkedin, Instagram,
} from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CURRENCIES } from "@/lib/gaexpay";

export function Landing({ onEnter, onSignup }: { onEnter: () => void; onSignup: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#security" className="hover:text-foreground transition">Security</a>
            <a href="#platforms" className="hover:text-foreground transition">Platforms</a>
            <a href="#pi-network" className="hover:text-foreground transition">Pi Network</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={onEnter}>Sign in</Button>
            <Button size="sm" onClick={onSignup}>Get Started <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 mesh-bg" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Badge className="mb-4 bg-primary/10 text-primary border-0 hover:bg-primary/15">
                  <Sparkles className="h-3 w-3 mr-1" /> Now with AI-powered assistant
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Borderless money,<br />
                  <span className="gradient-text">built for Africa.</span>
                </h1>
                <p className="mt-5 text-lg text-muted-foreground max-w-lg">
                  Send, spend, save and exchange across 9+ currencies. Instant mobile money,
                  bank transfers, QR payments and virtual cards — all in one beautiful wallet.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button size="lg" onClick={onSignup} className="rounded-full">
                    Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" onClick={onEnter}>
                    Sign In / Live Demo
                  </Button>
                </div>
                <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-2">
                      {["A", "K", "F", "T"].map((n) => (
                        <div key={n} className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary ring-2 ring-background">
                          {n}
                        </div>
                      ))}
                    </div>
                    <span>2M+ users</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                    <span>4.9 rating</span>
                  </div>
                </div>
              </motion.div>

              {/* Phone mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: 4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                className="relative mx-auto"
              >
                <div className="relative w-72 rounded-[2.5rem] border-8 border-slate-900 bg-slate-900 p-3 shadow-2xl dark:border-slate-800">
                  <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
                  <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs text-white/70">Total Balance</span>
                      <Wallet className="h-4 w-4" />
                    </div>
                    <p className="text-3xl font-bold tabular-nums">₦845,230.55</p>
                    <p className="text-xs text-white/70 mt-1">≈ $548.21 USD</p>
                    <div className="mt-6 grid grid-cols-4 gap-2">
                      {[SendHorizontal, QrCode, ArrowRight, CreditCard].map((Icon, i) => (
                        <div key={i} className="grid h-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
                          <Icon className="h-4 w-4" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      {[["Spencer Supermarket", "-₦12,400"], ["Chinedu Eze", "+₦25,000"], ["Ikeja Electric", "-₦18,500"]].map(([n, a]) => (
                        <div key={n} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-xs backdrop-blur">
                          <span>{n}</span>
                          <span className="font-semibold">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Floating card */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -right-6 top-20 hidden sm:block"
                >
                  <div className="w-44 rounded-xl bg-gradient-to-br from-slate-800 to-black p-3 text-white shadow-xl">
                    <div className="flex justify-between text-[10px] text-white/60"><span>VISA</span><span>Virtual</span></div>
                    <p className="mt-3 font-mono text-sm tracking-wider">4827 •••• 9012</p>
                    <p className="mt-1 text-[10px]">ADAEZE OKONKWO</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Currencies strip / Stats bar */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
              Trusted across 30+ currencies worldwide
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {CURRENCIES.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition"
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="tabular-nums">{c.code}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything you need to move money
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete financial toolkit designed for individuals and businesses across Africa and beyond.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: "Instant Transfers", desc: "Send & receive money in seconds. GaexPay-to-GaexPay is always free.", color: "from-emerald-500 to-teal-600" },
              { icon: Smartphone, title: "Mobile Money", desc: "MTN MoMo, Orange, Airtel, Moov & M-PESA integrated natively.", color: "from-amber-500 to-orange-600" },
              { icon: CreditCard, title: "Virtual & Physical Cards", desc: "Issue a Visa/Mastercard instantly. Spend globally online & offline.", color: "from-violet-500 to-purple-600" },
              { icon: QrCode, title: "QR Payments", desc: "Scan to pay at millions of merchants. No cash, no cards needed.", color: "from-fuchsia-500 to-pink-600" },
              { icon: Globe, title: "Multi-Currency", desc: "Hold 9+ currencies with live exchange rates. Convert at the tap.", color: "from-sky-500 to-cyan-600" },
              { icon: TrendingUp, title: "Analytics & Insights", desc: "Track spending, set budgets and understand your money flow.", color: "from-rose-500 to-red-600" },
              { icon: Shield, title: "Bank-Grade Security", desc: "End-to-end encryption, 2FA, biometric login & AI fraud detection.", color: "from-slate-600 to-slate-800" },
              { icon: Users, title: "Referral Rewards", desc: "Earn ₦500 for every friend. Climb tiers for bigger bonuses.", color: "from-lime-500 to-green-600" },
              { icon: Coins, title: "Pi Network Integration", desc: "Connect your Pi account. Swap Pi for fiat and stablecoins instantly.", color: "from-violet-500 to-fuchsia-600" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="group rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${f.color} grid place-items-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mt-4">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="bg-muted/30 border-y">
          <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              {/* Left visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-8 grid place-items-center min-h-[320px] lg:p-12"
              >
                <div className="absolute inset-0 mesh-bg rounded-3xl opacity-60" />
                <div className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/30">
                  <Shield className="h-16 w-16 text-white" />
                </div>
                <div className="absolute right-6 top-6 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                  🔒 AES-256
                </div>
                <div className="absolute bottom-6 left-6 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                  ✓ PCI-DSS L1
                </div>
              </motion.div>

              {/* Right content */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Security</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Your money is protected, always.
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  We use the same encryption trusted by global banks, with added layers of intelligence working around the clock.
                </p>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {[
                    { icon: Lock, title: "256-bit encryption", desc: "AES-256 end-to-end on every transaction.", color: "bg-emerald-500" },
                    { icon: Fingerprint, title: "Biometric auth", desc: "Face ID, Touch ID & fingerprint unlock.", color: "bg-violet-500" },
                    { icon: FileCheck, title: "PCI-DSS compliant", desc: "Level 1 certified payment infrastructure.", color: "bg-amber-500" },
                    { icon: BadgeCheck, title: "Regulated & licensed", desc: "AML & KYC compliant, CBN licensed operator.", color: "bg-sky-500" },
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
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${s.color} text-white shadow-md`}>
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
        <section id="platforms" className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Cross-Platform</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Available everywhere you are
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Mobile, web, desktop — synced in real time across all your devices.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Smartphone, title: "iOS & Android", desc: "Native apps with offline sync & biometrics", color: "from-emerald-500 to-teal-600" },
              { icon: Globe, title: "Web App", desc: "Full-featured wallet in your browser", color: "from-sky-500 to-cyan-600" },
              { icon: CreditCard, title: "Desktop", desc: "Windows, macOS & Linux native experience", color: "from-violet-500 to-purple-600" },
              { icon: Users, title: "Admin Console", desc: "Complete operations & compliance suite", color: "from-amber-500 to-orange-600" },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="group rounded-2xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className={`mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br ${p.color} grid place-items-center shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mt-4 font-semibold">{p.title}</h3>
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
        <section id="pi-network" className="bg-muted/30 border-y">
          <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="order-2 lg:order-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  <span className="text-sm font-bold">π</span> Pi Network
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Bring your Pi to life.
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Connect your Pi Network account and turn your mined Pi into spendable value. Swap, send and spend — all from one wallet.
                </p>
                <div className="mt-8 grid gap-4">
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
                        className="flex items-start gap-3 rounded-2xl border bg-card p-4"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
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
                  className="mt-8 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg transition hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-xl"
                >
                  Connect Pi Account <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative order-1 grid min-h-[320px] place-items-center rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-8 lg:order-2 lg:p-12"
              >
                <div className="absolute inset-0 mesh-bg rounded-3xl opacity-60" />
                <div className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-2xl shadow-violet-500/30">
                  <span className="text-6xl font-bold text-white">π</span>
                </div>
                <div className="absolute right-6 top-6 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                  🟣 Pi Mainnet
                </div>
                <div className="absolute bottom-6 left-6 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur tabular-nums">
                  Live: 1 π ≈ $47.35
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 py-20 lg:py-28">
            {/* Decorative orbs */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-1/3 top-1/4 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative mx-auto max-w-3xl px-6 text-center text-white"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Ready to take control of your money?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
                Join 2 million+ people using GaexPay across Africa. Open an account in 2 minutes — no paperwork.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={onSignup}
                  className="h-12 w-full rounded-full bg-white px-8 font-semibold text-emerald-700 shadow-lg transition hover:bg-white/90 active:scale-95 sm:h-14 sm:w-auto"
                >
                  Open Free Account <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onEnter}
                  className="h-12 w-full rounded-full border border-white/30 bg-transparent px-8 text-white backdrop-blur transition hover:bg-white/10 hover:text-white sm:h-14 sm:w-auto"
                >
                  Talk to Sales
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                Borderless digital wallet built for Africa and the world. Send, spend and save across 30+ currencies.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {[Twitter, Github, Linkedin, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="grid h-9 w-9 place-items-center rounded-full border text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
                <p className="mb-4 text-sm font-semibold">{col.title}</p>
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
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
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
