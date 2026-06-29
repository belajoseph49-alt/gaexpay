"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Building2, ArrowLeftRight, Wallet, Coins,
  Percent, ShoppingBag, Bell, FileText, Shield, AlertTriangle, BarChart3,
  Lock, Boxes, ScrollText, ShieldCheck,
  FileCheck, Landmark, Settings, Mail, Gauge, UserCheck, Globe, Activity,
  CreditCard, PiggyBank, CalendarClock, Bitcoin, TrendingUp,
  Store, Gift, Trophy, Headphones, Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { OverviewSection } from "./admin-panel/section-overview";
import { UsersSection } from "./admin-panel/section-users";
import { BusinessesSection } from "./admin-panel/section-businesses";
import { TransactionsSection } from "./admin-panel/section-transactions";
import { WalletsSection } from "./admin-panel/section-wallets";
import { CurrenciesSection } from "./admin-panel/section-currencies";
import { FeesSection } from "./admin-panel/section-fees";
import { ProductsSection } from "./admin-panel/section-products";
import { NotificationsSection } from "./admin-panel/section-notifications";
import { ContentSection } from "./admin-panel/section-content";
import { RolesSection } from "./admin-panel/section-roles";
import { DisputesSection } from "./admin-panel/section-disputes";
import { ReportsSection } from "./admin-panel/section-reports";
import { SecuritySection } from "./admin-panel/section-security";
import { FeaturesSection } from "./admin-panel/section-features";
import { AuditSection } from "./admin-panel/section-audit";
import { AmlSection } from "./admin-panel/section-aml";
import { TreasurySection } from "./admin-panel/section-treasury";
import { SystemSettingsSection } from "./admin-panel/section-system-settings";
import { TemplatesSection } from "./admin-panel/section-templates";
import { LimitsSection } from "./admin-panel/section-limits";
import { KycReviewSection } from "./admin-panel/section-kyc-review";
import { CorridorsSection } from "./admin-panel/section-corridors";
import { AnalyticsSection } from "./admin-panel/section-analytics";
import { CardsSection } from "./admin-panel/section-cards";
import { SavingsSection } from "./admin-panel/section-savings";
import { ScheduledSection } from "./admin-panel/section-scheduled";
import { CryptoSection } from "./admin-panel/section-crypto";
import { ExchangeRatesSection } from "./admin-panel/section-exchange-rates";
import { MerchantsSection } from "./admin-panel/section-merchants";
import { ReferralSection } from "./admin-panel/section-referral";
import { AchievementsSection } from "./admin-panel/section-achievements";
import { SupportSection } from "./admin-panel/section-support";
import { DeveloperPortalSection } from "./admin-panel/section-developer-portal";

export type AdminSection =
  | "overview" | "users" | "businesses" | "transactions" | "wallets"
  | "currencies" | "fees" | "products" | "notifications" | "content"
  | "roles" | "disputes" | "reports" | "security" | "features" | "audit"
  | "aml" | "treasury" | "system-settings" | "templates" | "limits"
  | "kyc-review" | "corridors" | "analytics"
  | "cards" | "savings" | "scheduled" | "crypto" | "exchange-rates"
  | "merchants" | "referral" | "achievements" | "support" | "developer-portal";

interface NavItem {
  id: AdminSection;
  label: string;
  icon: any;
  description: string;
  color: string;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Dashboard",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, description: "Platform KPIs & charts", color: "bg-sky-500/15 text-sky-500" },
    ],
  },
  {
    group: "Operations",
    items: [
      { id: "users", label: "Users", icon: Users, description: "Manage user accounts", color: "bg-violet-500/15 text-violet-500" },
      { id: "businesses", label: "Businesses", icon: Building2, description: "KYB verification", color: "bg-violet-500/15 text-violet-500" },
      { id: "transactions", label: "Transactions", icon: ArrowLeftRight, description: "All platform transactions", color: "bg-amber-500/15 text-amber-500" },
      { id: "wallets", label: "Wallets", icon: Wallet, description: "Adjust & freeze wallets", color: "bg-purple-500/15 text-purple-500" },
      { id: "disputes", label: "Disputes", icon: AlertTriangle, description: "Resolution center", color: "bg-rose-500/15 text-rose-500" },
    ],
  },
  {
    group: "Compliance",
    items: [
      { id: "aml", label: "AML & Compliance", icon: FileCheck, description: "Anti-money laundering rules", color: "bg-red-500/15 text-red-500" },
      { id: "kyc-review", label: "KYC Review", icon: UserCheck, description: "Identity verification queue", color: "bg-violet-500/15 text-violet-500" },
      { id: "limits", label: "Limits & Tiers", icon: Gauge, description: "KYC tier limits", color: "bg-orange-500/15 text-orange-500" },
    ],
  },
  {
    group: "Financial",
    items: [
      { id: "cards", label: "Cards", icon: CreditCard, description: "User card management", color: "bg-indigo-500/15 text-indigo-500" },
      { id: "savings", label: "Savings & Budgets", icon: PiggyBank, description: "User savings goals & budgets", color: "bg-violet-500/15 text-violet-500" },
      { id: "scheduled", label: "Scheduled Transfers", icon: CalendarClock, description: "Recurring & scheduled transfers", color: "bg-amber-500/15 text-amber-500" },
      { id: "crypto", label: "Crypto", icon: Bitcoin, description: "Crypto wallets & trading", color: "bg-orange-500/15 text-orange-500" },
      { id: "exchange-rates", label: "Exchange Rates", icon: TrendingUp, description: "Manual & auto rates", color: "bg-purple-500/15 text-purple-500" },
    ],
  },
  {
    group: "Configuration",
    items: [
      { id: "currencies", label: "Currencies", icon: Coins, description: "Fiat & crypto + rates", color: "bg-purple-500/15 text-purple-500" },
      { id: "fees", label: "Fees & Commission", icon: Percent, description: "Fee configs", color: "bg-orange-500/15 text-orange-500" },
      { id: "products", label: "Products & Services", icon: ShoppingBag, description: "Billers & merchants", color: "bg-pink-500/15 text-pink-500" },
      { id: "notifications", label: "Notifications", icon: Bell, description: "Broadcast & templates", color: "bg-blue-500/15 text-blue-500" },
      { id: "content", label: "Content", icon: FileText, description: "Landing, emails, legal", color: "bg-lime-500/15 text-lime-500" },
      { id: "features", label: "Modules & Features", icon: Boxes, description: "Feature flags", color: "bg-indigo-500/15 text-indigo-500" },
    ],
  },
  {
    group: "Platform",
    items: [
      { id: "system-settings", label: "System Settings", icon: Settings, description: "Platform configuration", color: "bg-slate-500/15 text-slate-500" },
      { id: "templates", label: "Templates", icon: Mail, description: "Email, SMS & push templates", color: "bg-indigo-500/15 text-indigo-500" },
      { id: "corridors", label: "Transfer Corridors", icon: Globe, description: "International transfer routes", color: "bg-purple-500/15 text-purple-500" },
      { id: "analytics", label: "Platform Analytics", icon: Activity, description: "Deep-dive metrics", color: "bg-purple-500/15 text-purple-500" },
      { id: "treasury", label: "Treasury", icon: Landmark, description: "Platform liquidity & reserves", color: "bg-purple-500/15 text-purple-500" },
    ],
  },
  {
    group: "Administration",
    items: [
      { id: "roles", label: "Roles & Permissions", icon: Shield, description: "RBAC matrix", color: "bg-fuchsia-500/15 text-fuchsia-500" },
      { id: "security", label: "Security", icon: Lock, description: "Logins, fraud rules", color: "bg-red-500/15 text-red-500" },
      { id: "reports", label: "Reports", icon: BarChart3, description: "Analytics & exports", color: "bg-green-500/15 text-green-500" },
      { id: "audit", label: "Audit Log", icon: ScrollText, description: "Admin action trail", color: "bg-yellow-500/15 text-yellow-500" },
    ],
  },
  {
    group: "Services",
    items: [
      { id: "merchants", label: "Merchants", icon: Store, description: "Merchant approvals & QR codes", color: "bg-violet-500/15 text-violet-500" },
      { id: "referral", label: "Referral & Rewards", icon: Gift, description: "Referral program & reward points", color: "bg-pink-500/15 text-pink-500" },
      { id: "achievements", label: "Achievements", icon: Trophy, description: "Badges & gamification", color: "bg-yellow-500/15 text-yellow-500" },
      { id: "support", label: "Support Tickets", icon: Headphones, description: "Customer support center", color: "bg-blue-500/15 text-blue-500" },
      { id: "developer-portal", label: "Developer Portal", icon: Code2, description: "API keys & webhooks", color: "bg-slate-500/15 text-slate-500" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function AdminPanelView() {
  const [section, setSection] = useState<AdminSection>("overview");
  const current = ALL_ITEMS.find((i) => i.id === section);

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent border border-rose-500/15 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Comprehensive platform management · {ALL_ITEMS.length} sections</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-rose-500/15 text-rose-600 border-0">
            <Lock className="h-3 w-3 mr-1" /> Admin Access
          </Badge>
          <Badge variant="outline" className="text-[10px]">v2.1</Badge>
        </div>
      </div>

      <div className="flex gap-4 lg:gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-[240px] shrink-0 flex-col rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="border-b border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sections</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 max-h-[calc(100vh-260px)] no-scrollbar">
            {NAV_GROUPS.map((g) => (
              <div key={g.group} className="mb-3">
                <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{g.group}</p>
                <div className="space-y-0.5">
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSection(item.id)}
                        title={item.description}
                        className={cn(
                          "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-all",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <div className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md transition",
                          active ? "bg-primary-foreground/15" : item.color,
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex-1 truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Mobile section selector */}
          <div className="lg:hidden mb-4">
            <Select value={section} onValueChange={(v) => setSection(v as AdminSection)}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  {current && <current.icon className="h-4 w-4" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {NAV_GROUPS.map((g) => (
                  <div key={g.group}>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{g.group}</p>
                    {g.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {section === "overview" && <OverviewSection />}
            {section === "users" && <UsersSection />}
            {section === "businesses" && <BusinessesSection />}
            {section === "transactions" && <TransactionsSection />}
            {section === "wallets" && <WalletsSection />}
            {section === "currencies" && <CurrenciesSection />}
            {section === "fees" && <FeesSection />}
            {section === "products" && <ProductsSection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "content" && <ContentSection />}
            {section === "roles" && <RolesSection />}
            {section === "disputes" && <DisputesSection />}
            {section === "reports" && <ReportsSection />}
            {section === "security" && <SecuritySection />}
            {section === "features" && <FeaturesSection />}
            {section === "audit" && <AuditSection />}
            {section === "aml" && <AmlSection />}
            {section === "treasury" && <TreasurySection />}
            {section === "system-settings" && <SystemSettingsSection />}
            {section === "templates" && <TemplatesSection />}
            {section === "limits" && <LimitsSection />}
            {section === "kyc-review" && <KycReviewSection />}
            {section === "corridors" && <CorridorsSection />}
            {section === "analytics" && <AnalyticsSection />}
            {section === "cards" && <CardsSection />}
            {section === "savings" && <SavingsSection />}
            {section === "scheduled" && <ScheduledSection />}
            {section === "crypto" && <CryptoSection />}
            {section === "exchange-rates" && <ExchangeRatesSection />}
            {section === "merchants" && <MerchantsSection />}
            {section === "referral" && <ReferralSection />}
            {section === "achievements" && <AchievementsSection />}
            {section === "support" && <SupportSection />}
            {section === "developer-portal" && <DeveloperPortalSection />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
