# Task 9-b — Dashboard UI Polish Specialist

## Objective
Polish GaexPay dashboard to premium Revolut/Wise level: gradient hero card, premium quick actions, refined wallet cards, polished cash flow chart, clean activity list.

## File Edited
- `src/components/gaexpay/views/dashboard-view.tsx` (full rewrite)

## Preserved Functionality (NOT BROKEN)
- `useFetch` for: `/api/wallets`, `/api/transactions?limit=8`, `/api/me`, `/api/savings-goals`, `/api/budgets`, `/api/insights`
- `useFormatMoney()` hook (`fmt` used throughout for currency conversion)
- `useApp()` — `setView` (send/pay/wallets/transactions/savings/budgets/analytics/cards/kyc), `setSendPrefill` (Top Up prefill), `userCurrency`
- Eye toggle balance hide/show (`AnimatedNumber`)
- Recharts area + pie charts (Cash Flow + Spending by Category)
- Helper widgets: `DashboardSavingsPreview`, `DashboardBudgetsPreview`, `FinancialHealthWidget`

## Key Changes
1. **Hero balance card** — full-width `rounded-3xl`, gradient `from-emerald-600 via-teal-600 to-emerald-700`, 3 blurred decorative orbs, greeting inside card, `text-4xl sm:text-5xl` balance, eye toggle top-right, action chips as `rounded-full bg-white/15 backdrop-blur` pills, amber "Verify Identity" chip if unverified.
2. **Quick actions** — 4 buttons (Send / Pay QR / Top Up / Bills), vertical layout, `h-12 w-12 rounded-2xl` gradient icon containers (emerald/violet/amber/sky), `hover:bg-muted/50 active:scale-95`.
3. **My Wallets** — horizontal scroll on mobile (`scrollbar-none`), vertical on desktop, flag emoji + currency code + balance + currency name + 30-day net change %, left-edge gradient accent bar, `hover:-translate-y-0.5 hover:shadow-md`.
4. **Cash Flow chart** — 7D/30D/90D pill selector with dynamic `periodDays`, gradient fill, styled tooltip, income/spending summary row below.
5. **Recent Activity** — max 5 items, type-based icon colors (transfer=emerald, payment=violet, bill=amber, airtime=sky, withdrawal=rose, fee=slate), border-b separators, "View all N transactions →" footer.
6. **Layout polish** — consistent `space-y-6`, all cards `rounded-2xl`, `tabular-nums` everywhere, framer-motion staggered entrance (0/0.05/0.1/0.15/0.2/0.25/0.3s).

## Removed (cleanup)
- Unused imports: `useEffect`, `Download`, `TrendingDown`, `Smartphone`, `Zap`, `Gift`, `Avatar`, `AvatarFallback`.
- Reduced quick actions from 6 → 4 per spec (Airtime & Rewards accessible via sidebar nav).

## Verification
- `bun run lint` → exit 0, 0 errors.
- `dev.log` tail: all 6 dashboard API endpoints return 200 OK, no runtime errors after change.
- Compile successful (`✓ Compiled in 490ms` then `✓ Compiled in 0ms` on subsequent renders).
