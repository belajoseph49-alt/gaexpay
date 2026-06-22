# Task 13-a — Admin Panel — Financial Operations Sections Specialist

## Scope
Add 5 new admin sections (Cards, Savings & Budgets, Scheduled Transfers, Crypto, Exchange Rates) with full RBAC-protected API routes.

## What Was Built

### API Routes (5 files)
- `src/app/api/admin/cards/route.ts` — GET (list with user, filters q/status/type) + PATCH (freeze/unfreeze/block/adjust_limit/delete)
- `src/app/api/admin/savings/route.ts` — GET (tab=goals|budgets) + PATCH (adjust_goal/adjust_budget/delete_goal/delete_budget)
- `src/app/api/admin/scheduled/route.ts` — GET (filters q/status/frequency) + PATCH (pause/resume/cancel/execute)
- `src/app/api/admin/crypto/route.ts` — GET (tab=wallets|trades|swaps|settings) + PATCH (toggle_coin|settings)
- `src/app/api/admin/exchange-rates/route.ts` — GET (all pairs with auto/manual source + deviation) + PATCH (update/toggle_auto/refresh)

### UI Sections (5 files)
- `src/components/gaexpay/views/admin-panel/section-cards.tsx` — CardsSection
- `src/components/gaexpay/views/admin-panel/section-savings.tsx` — SavingsSection (2 tabs)
- `src/components/gaexpay/views/admin-panel/section-scheduled.tsx` — ScheduledSection
- `src/components/gaexpay/views/admin-panel/section-crypto.tsx` — CryptoSection (4 tabs incl Settings)
- `src/components/gaexpay/views/admin-panel/section-exchange-rates.tsx` — ExchangeRatesSection

### Wiring
- `src/components/gaexpay/views/admin-panel-view.tsx` — added imports, AdminSection type, new "Financial" NAV_GROUP with 5 items, conditional renders.
- `src/lib/rbac.ts` — added 14 new permissions (cards.*, savings.*, scheduled.*, crypto.*, exchange_rates.*) + extended financial_manager role.

## Key Implementation Notes
- **SavingsGoal, Budget, ScheduledTransfer models have no `user` Prisma relation** in schema.prisma — only a `userId` field. Workaround: fetch records first, batch-load users via separate `db.user.findMany({ where: { id: { in: userIds } } })`, merge with a Map, then JS-side search filtering.
- **Crypto wallets are stored as Wallet records** where currency ∈ CRYPTOCURRENCIES codes (no separate CryptoWallet model). Joined with CRYPTO_META for network/name/icon.
- **Crypto trades & swaps are stored in Transaction model** with provider="gaexpay-trade" / "gaexpay-swap" and metadata JSON containing kind/action/from/to/rate/convertedAmount.
- **Crypto settings** (min_trade_amount, max_trade_amount, swap_fee_override) stored in AdminMetric table under category="crypto_settings". Supported coins toggle reuses category="currency" AdminMetric rows (same mechanism as Currencies section).
- **Exchange rates refresh** calls `getCryptoRates()` from `src/lib/coingecko.ts` + uses `FIAT_USD_RATE` table for non-CoinGecko fiats, then upserts USD-base pairs for all supported crypto + fiat.

## Verification
- `bun run lint` → 0 errors
- All 5 endpoints return HTTP 200 with real DB data (verified via curl with admin bearer token):
  - cards: 14 records
  - savings goals: 31 records, budgets: 12 records
  - scheduled: 14 records
  - crypto wallets: 16 records
  - exchange-rates: 11 pairs
- Mutation smoke tests passed (card freeze/unfreeze, rate toggle auto/manual) — all reverted after testing.
- Dev server stable, no runtime errors for my endpoints in dev.log.

## Other Notes
- The admin-panel-view.tsx was concurrently updated by another agent (added Compliance + Platform groups with AML, Treasury, System Settings, Templates, Limits, KYC Review, Corridors, Analytics sections). My MultiEdit on the original file was lost, so I re-applied my changes against the latest version. Final nav structure has 29 sections total: Dashboard(1) + Operations(5) + Compliance(3) + Financial(5) + Configuration(6) + Platform(5) + Administration(4).
- Some other agents' endpoints (system-settings, templates, limits, corridors) return 500 due to a missing `db.systemSetting` Prisma model — that's outside my task scope and not my responsibility.
