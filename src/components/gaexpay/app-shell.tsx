"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AiAssistant } from "./ai-assistant";
import { useApp } from "@/lib/store";
import { DashboardView } from "./views/dashboard-view";
import { WalletsView } from "./views/wallets-view";
import { SendView } from "./views/send-view";
import { TransactionsView } from "./views/transactions-view";
import { InternationalTransferView } from "./views/international-transfer-view";
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
import { StatementView } from "./views/statement-view";
import { AchievementsView } from "./views/achievements-view";
import { MerchantQRView } from "./views/merchant-qr-view";
import { KycView } from "./views/kyc-view";
import { SecurityView } from "./views/security-view";
import { SettingsView } from "./views/settings-view";
import { SupportView } from "./views/support-view";
import { AdminView } from "./views/admin-view";
import { ReferralView } from "./views/referral-view";
import { WalletDetailView } from "./views/wallet-detail-view";
import { MerchantView } from "./views/merchant-view";
import { CommandPalette } from "./command-palette";
import { AchievementMonitor } from "./achievement-monitor";
import { OnboardingTour } from "./onboarding-tour";
import { motion, AnimatePresence } from "framer-motion";

export function AppShell() {
  const { view } = useApp();

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    wallets: <WalletsView />,
    "wallet-detail": <WalletDetailView />,
    send: <SendView />,
    international: <InternationalTransferView />,
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
    statement: <StatementView />,
    achievements: <AchievementsView />,
    merchant: <MerchantView />,
    "merchant-qr": <MerchantQRView />,
    kyc: <KycView />,
    security: <SecurityView />,
    settings: <SettingsView />,
    support: <SupportView />,
    admin: <AdminView />,
    referral: <ReferralView />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background mesh-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
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
    </div>
  );
}
