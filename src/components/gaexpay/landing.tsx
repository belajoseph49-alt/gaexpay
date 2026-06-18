"use client";

import { motion } from "framer-motion";
import {
  ArrowRight, Shield, Zap, Globe, Smartphone, CreditCard, QrCode,
  Users, Star, Check, Fingerprint, Sparkles, TrendingUp, Wallet,
  SendHorizontal,
} from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CURRENCIES } from "@/lib/gaexpay";

export function Landing({ onEnter }: { onEnter: () => void }) {
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
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={onEnter}>Sign in</Button>
            <Button size="sm" onClick={onEnter}>Open App <ArrowRight className="h-4 w-4 ml-1" /></Button>
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
                  <Button size="lg" onClick={onEnter} className="rounded-full">
                    Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" onClick={onEnter}>
                    Live Demo
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

        {/* Currencies strip */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <p className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-3">Supported currencies</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {CURRENCIES.map((c) => (
                <div key={c.code} className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="text-lg">{c.flag}</span> {c.code}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-primary/10 text-primary border-0">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to move money</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              A complete financial toolkit designed for individuals and businesses across Africa and beyond.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: "Instant Transfers", desc: "Send & receive money in seconds. GaexPay-to-GaexPay is always free.", color: "from-emerald-500 to-teal-600" },
              { icon: Smartphone, title: "Mobile Money", desc: "MTN MoMo, Orange, Airtel, Moov & M-PESA integrated natively.", color: "from-amber-500 to-orange-600" },
              { icon: CreditCard, title: "Virtual & Physical Cards", desc: "Issue a Visa/Mastercard instantly. Spend globally online & offline.", color: "from-violet-500 to-purple-600" },
              { icon: QrCode, title: "QR Payments", desc: "Scan to pay at millions of merchants. No cash, no cards needed.", color: "from-fuchsia-500 to-pink-600" },
              { icon: Globe, title: "Multi-Currency", desc: "Hold 9+ currencies with live exchange rates. Convert at the tap.", color: "from-sky-500 to-blue-600" },
              { icon: TrendingUp, title: "Analytics & Insights", desc: "Track spending, set budgets and understand your money flow.", color: "from-rose-500 to-red-600" },
              { icon: Shield, title: "Bank-Grade Security", desc: "End-to-end encryption, 2FA, biometric login & AI fraud detection.", color: "from-slate-600 to-slate-800" },
              { icon: Users, title: "Referral Rewards", desc: "Earn ₦500 for every friend. Climb tiers for bigger bonuses.", color: "from-lime-500 to-green-600" },
              { icon: Fingerprint, title: "Biometric Auth", desc: "Face ID, Touch ID & fingerprint. Your money, secured by you.", color: "from-cyan-500 to-teal-600" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group rounded-2xl border bg-card p-6 transition hover:shadow-lg card-lift"
                >
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Badge className="mb-3 bg-rose-500/10 text-rose-600 border-0">Security</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your money is protected, always.</h2>
                <p className="mt-3 text-muted-foreground">
                  We use the same encryption trusted by global banks, with added layers of intelligence.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "End-to-end encryption (AES-256)",
                    "Multi-factor authentication (MFA)",
                    "Biometric login — Face ID & Touch ID",
                    "AI-powered fraud detection in real time",
                    "PCI-DSS Level 1 compliant",
                    "AML & KYC regulatory compliance",
                  ].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </div>
                      <span className="text-sm">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: "Encryption", value: "AES-256" },
                  { icon: Fingerprint, label: "Biometric", value: "Face/Touch ID" },
                  { icon: TrendingUp, label: "Fraud Detection", value: "AI / ML" },
                  { icon: Globe, label: "Compliance", value: "PCI-DSS" },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.label} className="rounded-2xl border bg-card p-6 text-center">
                      <Icon className="mx-auto h-8 w-8 text-primary" />
                      <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
                      <p className="text-lg font-bold">{c.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section id="platforms" className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-primary/10 text-primary border-0">Cross-Platform</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Available everywhere you are</h2>
            <p className="mt-3 text-muted-foreground">Mobile, web, desktop — synced in real time.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Smartphone, title: "iOS & Android", desc: "Native apps with offline sync & biometrics" },
              { icon: Globe, title: "Web App", desc: "Full-featured wallet in your browser" },
              { icon: CreditCard, title: "Desktop", desc: "Windows, macOS & Linux native experience" },
              { icon: Users, title: "Admin Console", desc: "Complete operations & compliance suite" },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-2xl border bg-card p-6 text-center card-lift">
                  <Icon className="mx-auto h-10 w-10 text-primary" />
                  <h3 className="mt-3 font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-10 text-center text-white lg:p-16">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">Ready to take control of your money?</h2>
              <p className="mt-3 text-white/80 max-w-xl mx-auto">
                Join 2 million+ people using GaexPay across Africa. Open an account in 2 minutes — no paperwork.
              </p>
              <Button size="lg" variant="secondary" className="mt-6 rounded-full bg-white text-emerald-700 hover:bg-white/90" onClick={onEnter}>
                Open Free Account <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-3 text-sm text-muted-foreground">Borderless digital wallet built for Africa and the world.</p>
            </div>
            {[
              { title: "Product", links: ["Wallets", "Cards", "Transfers", "QR Payments", "Mobile Money"] },
              { title: "Company", links: ["About", "Careers", "Blog", "Press", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Compliance", "Licenses"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="font-semibold text-sm mb-3">{col.title}</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {col.links.map((l) => <li key={l}><a href="#" className="hover:text-foreground transition">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} GaexPay Inc. All rights reserved. Licensed by CBN.</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>🇳🇬 Nigeria</span>
              <span>·</span>
              <span>🇬🇭 Ghana</span>
              <span>·</span>
              <span>🇰🇪 Kenya</span>
              <span>·</span>
              <span>🌍 +9 more</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
