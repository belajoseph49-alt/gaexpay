"use client";

import { useMemo } from "react";
import {
  LayoutDashboard, Wallet, SendHorizontal, ArrowLeftRight, CreditCard,
  QrCode, BarChart3, ShieldCheck, Shield, Settings, LifeBuoy, Users, Gift,
  PiggyBank, Wallet2, CalendarClock, Store, FileText, Trophy, Calendar,
  MapPin, Bitcoin, Repeat, Globe, DollarSign, AtSign, Banknote, Building2,
  Briefcase, Landmark, Code2, UserCheck, Crown, Network, ShoppingBag,
  MessageSquare, Lock, Coins, Radio, Bell, Link2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type View } from "@/lib/store";
import { Logo } from "./logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFetch } from "@/hooks/use-fetch";
import { hasPermission } from "@/lib/rbac";
import { Skeleton } from "@/components/ui/skeleton";

// ---- Types (mirror sidebar.tsx) -------------------------------------------

interface AuthUser {
  accountType: string;
  role: string;
  permissions: string[];
}

interface NavItem {
  id: View;
  label: string;
  icon: any;
  badge?: string;
  featureFlag?: string;
  permission?: string;
  accountTypes?: string[];
  roles?: string[];
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    section: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, accountTypes: ["personal"] },
      { id: "business-dashboard", label: "Business Dashboard", icon: Building2, accountTypes: ["business"] },
      { id: "wallets", label: "Wallets", icon: Wallet },
      { id: "send", label: "Send & Receive", icon: SendHorizontal },
      { id: "international", label: "International Transfer", icon: Globe, featureFlag: "international_transfer" },
      { id: "unified-address", label: "My Payment Address", icon: AtSign },
      { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
      { id: "cards", label: "Cards", icon: CreditCard, featureFlag: "virtual_cards" },
      { id: "pay", label: "Pay & Bills", icon: QrCode, featureFlag: "qr_payments" },
      { id: "marketplace", label: "Marketplace", icon: ShoppingBag, badge: "New" },
      { id: "savings", label: "Savings Goals", icon: PiggyBank, accountTypes: ["personal"], featureFlag: "savings_goals" },
      { id: "savings-challenges", label: "Savings Challenges", icon: Trophy, badge: "New", accountTypes: ["personal"] },
      { id: "budgets", label: "Budgets", icon: Wallet2, accountTypes: ["personal"], featureFlag: "budgets" },
      { id: "scheduled", label: "Scheduled", icon: CalendarClock, featureFlag: "scheduled_transfers" },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "exchange", label: "Exchange", icon: Repeat },
      { id: "crypto", label: "Crypto Wallets", icon: Bitcoin, featureFlag: "crypto_trading" },
      { id: "crypto-swap", label: "Crypto Swap", icon: Repeat, featureFlag: "crypto_trading" },
      { id: "crypto-trade", label: "Buy / Sell Crypto", icon: DollarSign, featureFlag: "crypto_trading" },
      { id: "crypto-cashout", label: "Crypto → Fiat", icon: Banknote, featureFlag: "crypto_trading" },
      { id: "analytics", label: "Analytics", icon: BarChart3, featureFlag: "analytics" },
      { id: "spending-map", label: "Spending Map", icon: MapPin, featureFlag: "spending_map" },
      { id: "statement", label: "Statements", icon: FileText },
    ],
  },
  {
    section: "Business",
    items: [
      { id: "team", label: "Team", icon: Users, accountTypes: ["business"] },
      { id: "invoices", label: "Invoices", icon: FileText, accountTypes: ["business"] },
      { id: "payroll", label: "Payroll", icon: Banknote, accountTypes: ["business"] },
      { id: "merchant", label: "Merchant Dashboard", icon: Store, badge: "Pro", featureFlag: "merchant_dashboard" },
      { id: "business-pro", label: "Business Pro", icon: Briefcase, badge: "Pro", featureFlag: "business_pro" },
      { id: "treasury", label: "Treasury", icon: Landmark, badge: "L4", featureFlag: "treasury" },
    ],
  },
  {
    section: "Community",
    items: [
      { id: "social", label: "Social", icon: Users, featureFlag: "social" },
      { id: "messaging", label: "Messages", icon: MessageSquare, featureFlag: "messaging" },
      { id: "gaex-chat", label: "GaexChat", icon: MessageSquare, badge: "New" },
      { id: "live", label: "Live", icon: Radio, featureFlag: "live_streaming" },
    ],
  },
  {
    section: "Crypto & Finance",
    items: [
      { id: "staking", label: "Staking", icon: Lock, featureFlag: "staking" },
      { id: "gaex-token", label: "GAEX Token", icon: Coins, badge: "NEW", featureFlag: "gaex_token" },
    ],
  },
  {
    section: "Commerce",
    items: [
      { id: "seller-dashboard", label: "Seller Dashboard", icon: Store, featureFlag: "seller_dashboard" },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "cash-links", label: "Cash Links", icon: Link2, featureFlag: "cash_links" },
      { id: "virtual-accounts", label: "Virtual Accounts", icon: Building2, featureFlag: "virtual_accounts" },
      { id: "hold-earn", label: "Hold & Earn", icon: Sparkles, badge: "2%", featureFlag: "hold_earn" },
    ],
  },
  {
    section: "Account",
    items: [
      { id: "kyc", label: "Identity (KYC)", icon: ShieldCheck, accountTypes: ["personal"] },
      { id: "kyb", label: "Identity (KYB)", icon: ShieldCheck, accountTypes: ["business"] },
      { id: "security", label: "Security Center", icon: Shield },
      { id: "achievements", label: "Achievements", icon: Trophy, accountTypes: ["personal"] },
      { id: "referral", label: "Referral & Rewards", icon: Gift },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    section: "Platform",
    items: [
      { id: "admin-panel", label: "Admin Panel", icon: Crown, badge: "Admin", roles: ["super_admin", "admin"] },
      { id: "api-management", label: "API Management", icon: Network, badge: "Dev", roles: ["super_admin", "admin"], permission: "api.view" },
      { id: "enterprise-admin", label: "Enterprise Admin", icon: Building2, badge: "L4", roles: ["super_admin", "admin"], featureFlag: "enterprise_admin" },
      { id: "compliance", label: "AML & Compliance", icon: ShieldCheck, badge: "L4", roles: ["super_admin", "admin", "kyc_manager"], featureFlag: "aml_compliance" },
      { id: "developer", label: "Developer Portal", icon: Code2, featureFlag: "developer_portal" },
    ],
  },
];

export function MobileNav({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { view, setView } = useApp();
  const { data: meData, loading: meLoading } = useFetch<{ user: AuthUser }>("/api/auth/me");
  const { data: featureData } = useFetch<{ flags: Record<string, unknown> }>("/api/features");

  const user = meData?.user;
  const accountType = user?.accountType ?? "personal";
  const role = user?.role ?? "user";
  const permissions = user?.permissions ?? [];
  const hasFeatureData = !!featureData;
  const flags = featureData?.flags ?? {};

  const filteredNav = useMemo(() => {
    return NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.accountTypes && !item.accountTypes.includes(accountType)) return false;
        if (item.roles && !item.roles.includes(role)) return false;
        if (item.permission && !hasPermission(permissions, item.permission)) return false;
        if (item.featureFlag && hasFeatureData && !(item.featureFlag in flags)) return false;
        return true;
      }),
    })).filter((g) => g.items.length > 0);
  }, [accountType, role, permissions, flags, hasFeatureData]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
        {meLoading ? (
          <div className="space-y-2 px-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          filteredNav.map((group) => (
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
                      onClick={() => { setView(item.id); onNavigate?.(); }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full border border-current/30 px-1.5 py-0 text-[9px] font-semibold opacity-80">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
