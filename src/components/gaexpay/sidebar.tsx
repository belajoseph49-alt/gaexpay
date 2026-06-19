"use client";

import {
  LayoutDashboard, Wallet, SendHorizontal, ArrowLeftRight, CreditCard,
  QrCode, BarChart3, ShieldCheck, Settings, LifeBuoy, Users, Gift,
  Sparkles, PiggyBank, Wallet2, CalendarClock, Store,
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
      { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
      { id: "cards", label: "Cards", icon: CreditCard },
      { id: "pay", label: "Pay & Bills", icon: QrCode },
      { id: "savings", label: "Savings Goals", icon: PiggyBank },
      { id: "budgets", label: "Budgets", icon: Wallet2 },
      { id: "scheduled", label: "Scheduled", icon: CalendarClock },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    section: "Business",
    items: [
      { id: "merchant", label: "Merchant Dashboard", icon: Store, badge: "Pro" },
    ],
  },
  {
    section: "Account",
    items: [
      { id: "kyc", label: "Identity (KYC)", icon: ShieldCheck },
      { id: "referral", label: "Referral & Rewards", icon: Gift },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    section: "Platform",
    items: [
      { id: "admin", label: "Admin Console", icon: Users, badge: "Admin" },
    ],
  },
];

export function Sidebar() {
  const { view, setView } = useApp();
  return (
    <aside className="hidden lg:flex h-full w-64 flex-col border-r bg-sidebar/80 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b px-5">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "" : "group-hover:scale-110 transition-transform")} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant={active ? "secondary" : "outline"} className="h-5 text-[10px] px-1.5">
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
      <div className="border-t p-3">
        <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3.5 ring-1 ring-primary/20">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">GaexPay Pro</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2.5">Unlock higher limits, zero fees & priority support.</p>
          <button
            onClick={() => setView("referral")}
            className="w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold py-2 hover:opacity-90 transition"
          >
            Upgrade now
          </button>
        </div>
      </div>
    </aside>
  );
}
