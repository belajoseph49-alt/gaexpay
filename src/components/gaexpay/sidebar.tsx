"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Wallet, SendHorizontal, ArrowLeftRight, CreditCard,
  QrCode, BarChart3, ShieldCheck, Shield, Settings, LifeBuoy, Users, Gift,
  Sparkles, PiggyBank, Wallet2, CalendarClock, Store, FileText, Trophy,
  Calendar, MapPin, Bitcoin, Repeat, Globe, DollarSign, AtSign, Banknote,
  Building2, Briefcase, Landmark, Code2, UserCheck, Receipt, Crown,
  Network, ShoppingBag, MessageSquare, Lock, Coins, Radio, Bell, Link2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type View } from "@/lib/store";
import { Logo } from "./logo";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { hasPermission, isAdmin as isAdminRole } from "@/lib/rbac";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";

// ---- Types -----------------------------------------------------------------

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  role: string;
  permissions: string[];
  kycStatus: string;
  kycTier: number;
}

interface AuthMeResponse {
  user: AuthUser;
}

interface FeatureFlagsResponse {
  flags: Record<string, { key: string; name: string; description: string | null; category: string }>;
  accountType: string;
  role: string;
}

// ---- Nav item definition --------------------------------------------------

interface NavItem {
  id: View;
  label: string;
  labelKey: string;
  icon: any;
  badge?: string;
  featureFlag?: string;
  permission?: string;
  accountTypes?: string[];
  roles?: string[];
}

interface NavGroup {
  section: string;
  sectionKey: string;
  items: NavItem[];
}

// ---- Nav catalog -----------------------------------------------------------
const NAV: NavGroup[] = [
  {
    section: "Main",
    sectionKey: "nav.main",
    items: [
      { id: "dashboard", label: "Dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, accountTypes: ["personal"] },
      { id: "business-dashboard", label: "Business Dashboard", labelKey: "nav.businessDashboard", icon: Building2, accountTypes: ["business"] },
      { id: "wallets", label: "Wallets", labelKey: "nav.wallets", icon: Wallet },
      { id: "send", label: "Send & Receive", labelKey: "nav.sendReceive", icon: SendHorizontal },
      { id: "international", label: "International Transfer", labelKey: "nav.internationalTransfer", icon: Globe, featureFlag: "international_transfer" },
      { id: "unified-address", label: "My Payment Address", labelKey: "nav.myPaymentAddress", icon: AtSign },
      { id: "transactions", label: "Transactions", labelKey: "nav.transactions", icon: ArrowLeftRight },
      { id: "cards", label: "Cards", labelKey: "nav.cards", icon: CreditCard, featureFlag: "virtual_cards" },
      { id: "pay", label: "Pay & Bills", labelKey: "nav.payBills", icon: QrCode, featureFlag: "qr_payments" },
      { id: "marketplace", label: "Marketplace", labelKey: "nav.marketplace", icon: ShoppingBag, badge: "New" },
      { id: "savings", label: "Savings Goals", labelKey: "nav.savingsGoals", icon: PiggyBank, accountTypes: ["personal"], featureFlag: "savings_goals" },
      { id: "savings-challenges", label: "Savings Challenges", labelKey: "nav.savingsChallenges", icon: Trophy, badge: "New", accountTypes: ["personal"] },
      { id: "budgets", label: "Budgets", labelKey: "nav.budgets", icon: Wallet2, accountTypes: ["personal"], featureFlag: "budgets" },
      { id: "scheduled", label: "Scheduled", labelKey: "nav.scheduled", icon: CalendarClock, featureFlag: "scheduled_transfers" },
      { id: "calendar", label: "Calendar", labelKey: "nav.calendar", icon: Calendar },
      { id: "exchange", label: "Exchange", labelKey: "nav.exchange", icon: Repeat },
      { id: "crypto", label: "Crypto Wallets", labelKey: "nav.cryptoWallets", icon: Bitcoin, featureFlag: "crypto_trading" },
      { id: "crypto-swap", label: "Crypto Swap", labelKey: "nav.cryptoSwap", icon: Repeat, featureFlag: "crypto_trading" },
      { id: "crypto-trade", label: "Buy / Sell Crypto", labelKey: "nav.buySellCrypto", icon: DollarSign, featureFlag: "crypto_trading" },
      { id: "crypto-cashout", label: "Crypto → Fiat", labelKey: "nav.cryptoToFiat", icon: Banknote, featureFlag: "crypto_trading" },
      { id: "analytics", label: "Analytics", labelKey: "nav.analytics", icon: BarChart3, featureFlag: "analytics" },
      { id: "spending-map", label: "Spending Map", labelKey: "nav.spendingMap", icon: MapPin, featureFlag: "spending_map" },
      { id: "statement", label: "Statements", labelKey: "nav.statements", icon: FileText },
    ],
  },
  {
    section: "Business",
    sectionKey: "nav.business",
    items: [
      { id: "team", label: "Team", labelKey: "nav.team", icon: Users, accountTypes: ["business"] },
      { id: "invoices", label: "Invoices", labelKey: "nav.invoices", icon: FileText, accountTypes: ["business"] },
      { id: "payroll", label: "Payroll", labelKey: "nav.payroll", icon: Banknote, accountTypes: ["business"] },
      { id: "merchant", label: "Merchant Dashboard", labelKey: "nav.merchantDashboard", icon: Store, badge: "Pro", featureFlag: "merchant_dashboard" },
      { id: "business-pro", label: "Business Pro", labelKey: "nav.businessPro", icon: Briefcase, badge: "Pro", featureFlag: "business_pro" },
      { id: "treasury", label: "Treasury", labelKey: "nav.treasury", icon: Landmark, badge: "L4", featureFlag: "treasury" },
    ],
  },
  {
    section: "Community",
    sectionKey: "nav.community",
    items: [
      { id: "social", label: "Social", labelKey: "nav.social", icon: Users, featureFlag: "social" },
      { id: "messaging", label: "Messages", labelKey: "nav.messages", icon: MessageSquare, featureFlag: "messaging" },
      { id: "live", label: "Live", labelKey: "nav.live", icon: Radio, featureFlag: "live_streaming" },
    ],
  },
  {
    section: "Crypto & Finance",
    sectionKey: "nav.cryptoFinance",
    items: [
      { id: "staking", label: "Staking", labelKey: "nav.staking", icon: Lock, featureFlag: "staking" },
      { id: "gaex-token", label: "GAEX Token", labelKey: "nav.gaexToken", icon: Coins, badge: "NEW", featureFlag: "gaex_token" },
    ],
  },
  {
    section: "Commerce",
    sectionKey: "nav.commerce",
    items: [
      { id: "seller-dashboard", label: "Seller Dashboard", labelKey: "nav.sellerDashboard", icon: Store, featureFlag: "seller_dashboard" },
      { id: "notifications", label: "Notifications", labelKey: "nav.notifications", icon: Bell },
      { id: "cash-links", label: "Cash Links", labelKey: "nav.cashLinks", icon: Link2, featureFlag: "cash_links" },
      { id: "virtual-accounts", label: "Virtual Accounts", labelKey: "nav.virtualAccounts", icon: Building2, featureFlag: "virtual_accounts" },
      { id: "hold-earn", label: "Hold & Earn", labelKey: "nav.holdEarn", icon: Sparkles, badge: "2%", featureFlag: "hold_earn" },
    ],
  },
  {
    section: "Account",
    sectionKey: "nav.account",
    items: [
      { id: "kyc", label: "Identity (KYC)", labelKey: "nav.identity", icon: ShieldCheck, accountTypes: ["personal"] },
      { id: "kyb", label: "Identity (KYB)", labelKey: "misc.kycBusiness", icon: ShieldCheck, accountTypes: ["business"] },
      { id: "security", label: "Security Center", labelKey: "nav.securityCenter", icon: Shield },
      { id: "achievements", label: "Achievements", labelKey: "nav.achievements", icon: Trophy, accountTypes: ["personal"] },
      { id: "referral", label: "Referral & Rewards", labelKey: "nav.referral", icon: Gift },
      { id: "settings", label: "Settings", labelKey: "nav.settings", icon: Settings },
      { id: "support", label: "Support", labelKey: "nav.support", icon: LifeBuoy },
    ],
  },
  {
    section: "Platform",
    sectionKey: "nav.platform",
    items: [
      { id: "admin-panel", label: "Admin Panel", labelKey: "nav.adminPanel", icon: Crown, badge: "Admin", roles: ["super_admin", "admin"] },
      { id: "api-management", label: "API Management", labelKey: "nav.apiManagement", icon: Network, badge: "Dev", roles: ["super_admin", "admin"], permission: "api.view" },
      { id: "enterprise-admin", label: "Enterprise Admin", labelKey: "nav.enterpriseAdmin", icon: Building2, badge: "L4", roles: ["super_admin", "admin"], featureFlag: "enterprise_admin" },
      { id: "compliance", label: "AML & Compliance", labelKey: "nav.amlCompliance", icon: ShieldCheck, badge: "L4", roles: ["super_admin", "admin", "kyc_manager"], featureFlag: "aml_compliance" },
      { id: "developer", label: "Developer Portal", labelKey: "nav.developerPortal", icon: Code2, featureFlag: "developer_portal" },
    ],
  },
];

// ---- Sidebar ---------------------------------------------------------------

export function Sidebar() {
  const { view, setView } = useApp();
  const { t } = useTranslation();
  const { data: meData, loading: meLoading } = useFetch<AuthMeResponse>("/api/auth/me");
  const { data: featureData } = useFetch<FeatureFlagsResponse>("/api/features");

  const user = meData?.user;
  const accountType = user?.accountType ?? "personal";
  const role = user?.role ?? "user";
  const permissions = user?.permissions ?? [];
  const flags = featureData?.flags ?? {};

  const filteredNav = useMemo(() => {
    return NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.accountTypes && !item.accountTypes.includes(accountType)) return false;
        if (item.roles && !item.roles.includes(role)) return false;
        if (item.permission && !hasPermission(permissions, item.permission)) return false;
        if (item.featureFlag && featureData && !(item.featureFlag in flags)) return false;
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  }, [accountType, role, permissions, flags, featureData]);

  return (
    <aside className="hidden lg:flex h-full w-[264px] flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-2xl">
      {/* Logo header */}
      <div className="flex h-[64px] shrink-0 items-center border-b border-sidebar-border/60 px-5">
        <Logo />
      </div>

      {/* Account-type badge — premium, minimal */}
      {user && (
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2 ring-1 ring-border/40">
            <div
              className={cn(
                "grid h-7 w-7 place-items-center rounded-lg",
                accountType === "business"
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-primary/10 text-primary",
              )}
            >
              {accountType === "business" ? (
                <Building2 className="h-3.5 w-3.5" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold leading-tight truncate">
                {accountType === "business" ? t("topbar.businessAccount") : t("topbar.personalAccount")}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize leading-tight mt-0.5">
                {role === "user" ? t("topbar.standardUser") : role.replace(/_/g, " ")}
              </p>
            </div>
            {isAdminRole(role) && (
              <Badge className="bg-rose-500/15 text-rose-600 border-0 text-[9px] px-1.5 font-semibold">
                {t("topbar.admin")}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 no-scrollbar">
        {meLoading ? (
          <div className="space-y-1.5 px-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          filteredNav.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {t(group.sectionKey)}
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
                        "group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                      )}
                      <Icon className={cn(
                        "h-[17px] w-[17px] shrink-0 transition-transform duration-200",
                        active ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105",
                      )} />
                      <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
                      {item.badge && (
                        <Badge
                          variant={active ? "secondary" : "outline"}
                          className="h-[18px] text-[9px] px-1.5 font-semibold shrink-0 border-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Pro upgrade card — refined, premium */}
      <div className="shrink-0 border-t border-sidebar-border/60 p-3">
        <button
          onClick={() => setView("referral")}
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary/12 via-primary/4 to-transparent p-4 text-left ring-1 ring-primary/15 transition-all duration-300 hover:ring-primary/30 hover:shadow-premium-glow"
        >
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/12 blur-2xl transition-opacity group-hover:opacity-150" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[13px] font-semibold">{t("topbar.gaxpayPro")}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              {t("topbar.upgradeDesc")}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              {t("topbar.upgradeNow")}
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      </div>
    </aside>
  );
}
