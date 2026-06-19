"use client";

import {
  LayoutDashboard, Wallet, SendHorizontal, ArrowLeftRight, CreditCard,
  QrCode, BarChart3, ShieldCheck, Settings, LifeBuoy, Users, Gift,
  PiggyBank, Wallet2, CalendarClock, Store, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type View } from "@/lib/store";
import { Logo } from "./logo";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV: { section: string; items: { id: View; label: string; icon: any }[] }[] = [
  { section: "Main", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "wallets", label: "Wallets", icon: Wallet },
    { id: "send", label: "Send & Receive", icon: SendHorizontal },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "cards", label: "Cards", icon: CreditCard },
    { id: "pay", label: "Pay & Bills", icon: QrCode },
    { id: "savings", label: "Savings Goals", icon: PiggyBank },
    { id: "budgets", label: "Budgets", icon: Wallet2 },
    { id: "scheduled", label: "Scheduled", icon: CalendarClock },
    { id: "exchange", label: "Exchange", icon: ArrowLeftRight },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "statement", label: "Statements", icon: FileText },
  ]},
  { section: "Business", items: [
    { id: "merchant", label: "Merchant Dashboard", icon: Store },
  ]},
  { section: "Account", items: [
    { id: "kyc", label: "Identity (KYC)", icon: ShieldCheck },
    { id: "referral", label: "Referral & Rewards", icon: Gift },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "support", label: "Support", icon: LifeBuoy },
  ]},
  { section: "Platform", items: [
    { id: "admin", label: "Admin Console", icon: Users },
  ]},
];

export function MobileNav() {
  const { view, setView } = useApp();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-5">
        <Logo />
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
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
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
