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
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";

// ---- Types (mirror sidebar.tsx) -------------------------------------------

interface AuthUser {
  accountType: string;
  role: string;
  permissions: string[];
}

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

const NAV: NavGroup[] = [
  {
    section: "Main",
    sectionKey: "nav.main",
    items: [
      { id: "dashboard", label: "Dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, accountTypes: ["personal"] },
      { id: "business-dashboard", label: "Business Dashboard", labelKey: "nav.businessDashboard", icon: Building2, accountTypes: ["business"] },
      { id: "wallets", label: "Wallets", labelKey: "nav.wallets", icon: Wallet },
      { id: "send", label: "Action Hub", labelKey: "nav.sendReceive", icon: SendHorizontal },
      { id: "transactions", label: "Transactions", labelKey: "nav.transactions", icon: ArrowLeftRight },
      { id: "marketplace", label: "Marketplace", labelKey: "nav.marketplace", icon: ShoppingBag, badge: "New" },
      { id: "analytics", label: "Analytics", labelKey: "nav.analytics", icon: BarChart3, featureFlag: "analytics" },
    ],
  },
  {
    section: "Business",
    sectionKey: "nav.business",
    items: [
      { id: "team", label: "Team", labelKey: "nav.team", icon: Users, accountTypes: ["business"] },
      { id: "invoices", label: "Invoices", labelKey: "nav.invoices", icon: FileText, accountTypes: ["business"] },
      { id: "payroll", label: "Payroll", labelKey: "nav.payroll", icon: Banknote, accountTypes: ["business"] },
    ],
  },
  {
    section: "Community",
    items: [
      { id: "social", label: "Social", icon: Users },
      { id: "messaging", label: "Messages", icon: MessageSquare },
      { id: "live", label: "Live", icon: Radio },
    ],
  },
  {
    section: "Crypto & Finance",
    items: [
      { id: "staking", label: "Staking", icon: Lock },
      { id: "gaex-token", label: "GAEX Token", icon: Coins, badge: "NEW" },
    ],
  },
  {
    section: "Commerce",
    items: [
      { id: "seller-dashboard", label: "Seller Dashboard", icon: Store },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    section: "Account",
    sectionKey: "nav.account",
    items: [
      { id: "kyc", label: "Identity (KYC)", labelKey: "nav.identity", icon: ShieldCheck, accountTypes: ["personal"] },
      { id: "kyb", label: "Identity (KYB)", labelKey: "misc.kycBusiness", icon: ShieldCheck, accountTypes: ["business"] },
      { id: "security", label: "Security Center", labelKey: "nav.securityCenter", icon: Shield },
      { id: "settings", label: "Settings", labelKey: "nav.settings", icon: Settings },
      { id: "support", label: "Support", labelKey: "nav.support", icon: LifeBuoy },
    ],
  },
  {
    section: "Platform",
    sectionKey: "nav.platform",
    items: [
      { id: "admin", label: "Admin Console", labelKey: "nav.adminConsole", icon: Users, badge: "Admin", roles: ["super_admin", "admin"] },
      { id: "api-management", label: "API & Webhooks", labelKey: "nav.apiWebhooks", icon: Network, badge: "Dev", roles: ["super_admin", "admin", "developer"] },
      { id: "compliance", label: "AML & Compliance", labelKey: "nav.amlCompliance", icon: ShieldCheck, badge: "L4", roles: ["super_admin", "admin", "kyc_manager"] },
      { id: "developer", label: "Developer Portal", labelKey: "nav.developerPortal", icon: Code2 },
    ],
  },
];

export function MobileNav({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { t } = useTranslation();
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
    <div className="flex h-full flex-col bg-background/95 backdrop-blur-3xl">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 px-5 bg-background/50">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-6 no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
        {meLoading ? (
          <div className="space-y-3 px-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[14px]" />
            ))}
          </div>
        ) : (
          filteredNav.map((group) => (
            <div key={group.section} className="mb-6">
              <p className="px-4 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                {t(group.sectionKey, { defaultValue: group.section }).toUpperCase()}
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
                        "group flex w-full items-center gap-3.5 rounded-[16px] px-4 py-3 text-sm font-semibold transition-all duration-300",
                        active
                          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:scale-[1.02]",
                      )}
                    >
                      <div className={cn("grid h-7 w-7 place-items-center rounded-[10px] transition-colors", active ? "bg-primary/20" : "bg-transparent group-hover:bg-muted/80")}>
                        <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                      </div>
                      <span className="flex-1 text-left truncate">{t(item.labelKey, { defaultValue: item.label })}</span>
                      {item.badge && (
                        <Badge
                          variant={active ? "secondary" : "outline"}
                          className="ml-auto h-[18px] text-[9px] px-1.5 font-semibold border-0 uppercase tracking-widest"
                        >
                          {t(`badge.${item.badge.toLowerCase()}`, { defaultValue: item.badge })}
                        </Badge>
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
