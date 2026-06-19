"use client";

import {
  LayoutDashboard, Wallet, SendHorizontal, ArrowLeftRight, CreditCard,
  QrCode, BarChart3, ShieldCheck, Shield, Settings, LifeBuoy, Users, Gift,
  Sparkles, PiggyBank, Wallet2, CalendarClock, Store, ArrowLeftRight as Exchange, FileText, Trophy, Calendar, MapPin, Bitcoin, Repeat, Globe, DollarSign, AtSign, Banknote, Building2, Briefcase, Landmark, Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type View } from "@/lib/store";
import { Logo } from "./logo";
import { Badge } from "@/components/ui/badge";

const NAV: { section: string; items: { id: View; label: string; icon: any; badge?: string }[] }[] = [
  {
    section: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "wallets", label: "Wallets", icon: Wallet },
      { id: "send", label: "Send & Receive", icon: SendHorizontal },
      { id: "international", label: "International Transfer", icon: Globe },
      { id: "unified-address", label: "My Payment Address", icon: AtSign },
      { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
      { id: "cards", label: "Cards", icon: CreditCard },
      { id: "pay", label: "Pay & Bills", icon: QrCode },
      { id: "savings", label: "Savings Goals", icon: PiggyBank },
      { id: "budgets", label: "Budgets", icon: Wallet2 },
      { id: "scheduled", label: "Scheduled", icon: CalendarClock },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "exchange", label: "Exchange", icon: Exchange },
      { id: "crypto", label: "Crypto Wallets", icon: Bitcoin },
      { id: "crypto-swap", label: "Crypto Swap", icon: Repeat },
      { id: "crypto-trade", label: "Buy / Sell Crypto", icon: DollarSign },
      { id: "crypto-cashout", label: "Crypto → Fiat", icon: Banknote },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "spending-map", label: "Spending Map", icon: MapPin },
      { id: "statement", label: "Statements", icon: FileText },
    ],
  },
  {
    section: "Business",
    items: [
      { id: "merchant", label: "Merchant Dashboard", icon: Store, badge: "Pro" },
      { id: "business-pro", label: "Business Pro", icon: Briefcase, badge: "Pro" },
    ],
  },
  {
    section: "Account",
    items: [
      { id: "kyc", label: "Identity (KYC)", icon: ShieldCheck },
      { id: "security", label: "Security Center", icon: Shield },
      { id: "achievements", label: "Achievements", icon: Trophy },
      { id: "referral", label: "Referral & Rewards", icon: Gift },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    section: "Platform",
    items: [
      { id: "admin", label: "Admin Console", icon: Users, badge: "Admin" },
      { id: "enterprise-admin", label: "Enterprise Admin", icon: Building2, badge: "L4" },
      { id: "compliance", label: "AML & Compliance", icon: ShieldCheck, badge: "L4" },
      { id: "treasury", label: "Treasury", icon: Landmark, badge: "L4" },
      { id: "developer", label: "Developer Portal", icon: Code2 },
    ],
  },
];

export function Sidebar() {
  const { view, setView } = useApp();
  return (
    <aside className="hidden lg:flex h-full w-[260px] flex-col border-r border-sidebar-border bg-sidebar/60 backdrop-blur-2xl">
      {/* Logo header */}
      <div className="flex h-[60px] shrink-0 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 no-scrollbar">
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-foreground/80" />
                    )}
                    <Icon className={cn(
                      "h-[17px] w-[17px] shrink-0 transition-transform duration-200",
                      active ? "" : "group-hover:scale-110",
                    )} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant={active ? "secondary" : "outline"}
                        className="h-[18px] text-[9px] px-1.5 font-semibold shrink-0"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pro upgrade card */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-3.5 ring-1 ring-primary/15">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/10 blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[13px] font-semibold">GaexPay Pro</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
              Unlock higher limits, zero fees & priority support.
            </p>
            <button
              onClick={() => setView("referral")}
              className="w-full rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold py-1.5 hover:opacity-90 transition"
            >
              Upgrade now
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
