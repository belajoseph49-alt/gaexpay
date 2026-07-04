"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AiAssistant } from "./ai-assistant";
import { useApp } from "@/lib/store";
import { DashboardView } from "./views/dashboard-view";
import { WalletsView } from "./views/wallets-view";
import { SendView } from "./views/send-view";
import { TransactionsView } from "./views/transactions-view";
import { InternationalTransferView } from "./views/international-transfer-view";
import { UnifiedAddressView } from "./views/unified-address-view";
import { CardsView } from "./views/cards-view";
import { PayView } from "./views/pay-view";
import { SavingsView } from "./views/savings-view";
import { BudgetsView } from "./views/budgets-view";
import { ScheduledView } from "./views/scheduled-view";
import { AnalyticsView } from "./views/analytics-view";
import { CalendarView } from "./views/calendar-view";
import { SpendingMapView } from "./views/spending-map-view";
import { ExchangeView } from "./views/exchange-view";
import { CryptoView } from "./views/crypto-view";
import { CryptoSwapView } from "./views/crypto-swap-view";
import { CryptoTradeView } from "./views/crypto-trade-view";
import { CryptoCashoutView } from "./views/crypto-cashout-view";
import { StatementView } from "./views/statement-view";
import { AchievementsView } from "./views/achievements-view";
import { MerchantQRView } from "./views/merchant-qr-view";
import { KycView } from "./views/kyc-view";
import { KybView } from "./views/kyb-view";
import { BusinessDashboardView } from "./views/business-dashboard-view";
import { TeamView } from "./views/team-view";
import { InvoicesView } from "./views/invoices-view";
import { PayrollView } from "./views/payroll-view";
import { AdminPanelView } from "./views/admin-panel-view";
import { ApiManagementView } from "./views/api-management-view";
import { SecurityView } from "./views/security-view";
import { SettingsView } from "./views/settings-view";
import { SupportView } from "./views/support-view";
import { AdminView } from "./views/admin-view";
import { EnterpriseAdminView } from "./views/enterprise-admin-view";
import { ComplianceView } from "./views/compliance-view";
import { TreasuryView } from "./views/treasury-view";
import { DeveloperPortalView } from "./views/developer-portal-view";
import { ReferralView } from "./views/referral-view";
import { MarketplaceView } from "./views/marketplace-view";
import { WalletDetailView } from "./views/wallet-detail-view";
import { MerchantView } from "./views/merchant-view";
import { BusinessProView } from "./views/business-pro-view";
import { CommandPalette } from "./command-palette";
import { AchievementMonitor } from "./achievement-monitor";
import { OnboardingTour } from "./onboarding-tour";
import { InstallPrompt } from "./install-prompt";
import { CurrencyPicker } from "./currency-picker";
import { LanguagePicker } from "./language-picker";
import { motion, AnimatePresence } from "framer-motion";
import { hydratePreferencesFromStorage } from "@/lib/store";
import { SocialView } from "./views/social-view";
import { MessagingView } from "./views/messaging-view";
import { LiveView } from "./views/live-view";
import { StakingView } from "./views/staking-view";
import { GaexTokenView } from "./views/gaex-token-view";
import { SellerDashboardView } from "./views/seller-dashboard-view";
import { NotificationsView } from "./views/notifications-view";
import { AccountingView } from "./views/accounting-view";

export function AppShell() {
  const { view, userCurrency, setUserCurrency, currencyPickerOpen, setCurrencyPickerOpen } = useApp();

  // On first mount, hydrate currency + language from localStorage so the
  // already-applied preference is restored without a flash of the default.
  useEffect(() => {
    if (typeof window !== "undefined") {
      hydratePreferencesFromStorage();
      // Don't auto-open currency picker — default to USD
      const stored = localStorage.getItem("gxp_default_currency");
      if (!stored) {
        localStorage.setItem("gxp_default_currency", "USD");
      }
    }
  }, [setCurrencyPickerOpen]);

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    "business-dashboard": <BusinessDashboardView />,
    wallets: <WalletsView />,
    "wallet-detail": <WalletDetailView />,
    send: <SendView />,
    international: <InternationalTransferView />,
    "unified-address": <UnifiedAddressView />,
    transactions: <TransactionsView />,
    cards: <CardsView />,
    pay: <PayView />,
    savings: <SavingsView />,
    budgets: <BudgetsView />,
    scheduled: <ScheduledView />,
    analytics: <AnalyticsView />,
    calendar: <CalendarView />,
    "spending-map": <SpendingMapView />,
    exchange: <ExchangeView />,
    crypto: <CryptoView />,
    "crypto-swap": <CryptoSwapView />,
    "crypto-trade": <CryptoTradeView />,
    "crypto-cashout": <CryptoCashoutView />,
    statement: <StatementView />,
    achievements: <AchievementsView />,
    merchant: <MerchantView />,
    "merchant-qr": <MerchantQRView />,
    "business-pro": <BusinessProView />,
    team: <TeamView />,
    invoices: <InvoicesView />,
    payroll: <PayrollView />,
    kyc: <KycView />,
    kyb: <KybView />,
    security: <SecurityView />,
    settings: <SettingsView />,
    support: <SupportView />,
    admin: <AdminView />,
    "admin-panel": <AdminPanelView />,
    "api-management": <ApiManagementView />,
    "enterprise-admin": <EnterpriseAdminView />,
    compliance: <ComplianceView />,
    treasury: <TreasuryView />,
    developer: <DeveloperPortalView />,
    referral: <ReferralView />,
    marketplace: <MarketplaceView />,
    social: <SocialView />,
    messaging: <MessagingView />,
    live: <LiveView />,
    staking: <StakingView />,
    "gaex-token": <GaexTokenView />,
    "seller-dashboard": <SellerDashboardView />,
    notifications: <NotificationsView />,
    accounting: <AccountingView />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background mesh-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="mx-auto max-w-7xl px-4 py-6 lg:px-8"
            >
              {views[view] || <DashboardView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AiAssistant />
      <CommandPalette />
      <AchievementMonitor />
      <OnboardingTour />
      <InstallPrompt />
      <CurrencyPicker open={currencyPickerOpen} onSelect={setUserCurrency} current={userCurrency} />
      <LanguagePicker />
    </div>
  );
}
