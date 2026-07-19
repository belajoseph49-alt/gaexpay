# Task phaseA — Database Foundation: PostgreSQL + Decimal + Ledger

**Agent**: Database Foundation — PostgreSQL + Decimal + Ledger
**Task ID**: phaseA
**Scope**: Prepare the Prisma schema for PostgreSQL migration while keeping SQLite working for dev. Add a double-entry ledger (accounts/entries/balances), idempotency, refresh-token, and session tables to both schemas. Ship a typed ledger engine. Document all production env vars.

## Context Reviewed
- `prisma/schema.prisma` — existing SQLite dev schema, 23 models, `Float` everywhere for monetary fields, no composite indexes on `Transaction`.
- `src/lib/db.ts` — global PrismaClient with `PRISMA_CACHE_VERSION` bump-on-schema-change pattern (must be bumped when models are added so the dev server picks up the regenerated client).
- `package.json` — `prisma`/`@prisma/client` v6.11+ installed; `bun run db:push` → `prisma db push`.
- Worklog tail (`/home/z/my-project/worklog.md`) — confirmed Task 22-A already moved crypto wallets/swap/trade/cashout onto `db.$transaction` blocks; the ledger engine shipped here is the natural next primitive for those flows.

## Deliverables

### 1. `prisma/schema.postgres.prisma` (NEW)
Full PostgreSQL mirror of the SQLite schema with the following upgrades:
- `datasource db { provider = "postgresql"; url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }`.
- All **monetary** `Float` fields upgraded to `Decimal @db.Decimal(18, 4)`:
  - `User.referralEarnings`
  - `Wallet.balance`, `Wallet.ledgerBalance`
  - `Transaction.amount`, `Transaction.fee`
  - `Card.balance`, `Card.limit`, `Card.spending`
  - `Merchant.volume`
  - `SavingsGoal.targetAmount`, `SavingsGoal.currentAmount`, `SavingsGoal.autoSaveAmount`
  - `SavingsContribution.amount`
  - `Budget.limit`, `Budget.spent`
  - `ScheduledTransfer.amount`
  - `FeeConfig.feeValue`, `FeeConfig.fixedFee`, `FeeConfig.minFee`, `FeeConfig.maxFee`, `FeeConfig.minAmount`, `FeeConfig.maxAmount`
  - `LedgerEntry.debit`, `LedgerEntry.credit`, `LedgerBalance.balance`
- **Non-monetary** floats kept as `Float`:
  - `Transaction.riskScore` (0–1 risk signal)
  - `ExchangeRate.rate`, `ExchangeRate.buy`, `ExchangeRate.sell` (FX rates)
  - `Merchant.rating` (0–5 average)
  - `AdminMetric.value` (generic metric)
  - `Budget.alertThreshold` (percentage 0–100)
  - `Webhook.successRate` (percentage 0–100)
- Added composite `@@index` declarations on the most common query paths:
  - `Transaction`: `(userId, createdAt)`, `(senderId)`, `(status, createdAt)`, `(type, createdAt)`, `(currency, createdAt)`, `(reference)`
  - Plus secondary indexes on `Wallet`, `Card`, `Beneficiary`, `KycDocument`, `Notification`, `SupportTicket`, `SupportMessage`, `AuditLog`, `Device`, `Merchant`, `Biller`, `SavingsGoal`, `SavingsContribution`, `Budget`, `ScheduledTransfer`, `Dispute`, `BusinessProfile`, `ApiConfig`, `ApiLog`, `FeatureFlag`, `SystemSetting`, `FeeConfig`, `Achievement`, `UserAchievement`, `DeveloperApp`, `DeveloperApiKey`, `Webhook`, `User`.

### 2. `prisma/schema.prisma` (EDITED — additive only)
Appended 6 new models at the end (SQLite keeps `Float` for ledger amounts; PostgreSQL mirror uses `Decimal`):
- `LedgerAccount` — `{ id, userId?, walletId?, type, currency, code @unique, createdAt, updatedAt }` + relations to entries and balance. Indexes on `userId`, `(type, currency)`, `walletId`.
- `LedgerEntry` — `{ id, accountId, transactionId?, debit, credit, currency, createdAt }`. Indexes on `(accountId, createdAt)`, `transactionId`.
- `LedgerBalance` — `{ id, accountId @unique, currency, balance, updatedAt }`. Index on `currency`.
- `IdempotencyRecord` — `{ id, key @unique, userId, endpoint, requestBody, responseHash, statusCode, createdAt, expiresAt }`. Indexes on `key`, `userId`, `expiresAt`.
- `RefreshToken` — `{ id, userId, token @unique, rotatedFrom?, revokedAt?, createdAt, expiresAt }`. Indexes on `userId`, `token`, `rotatedFrom`.
- `Session` — `{ id, userId, jti @unique, deviceFingerprint?, ipAddress?, userAgent?, createdAt, expiresAt, revokedAt? }`. Indexes on `userId`, `jti`, `expiresAt`.

No existing model was touched — change is purely additive.

### 3. `src/lib/ledger.ts` (NEW — ledger engine)
Typed double-entry primitives. All writes are designed to be called inside a `db.$transaction` block; the `tx` argument is typed as `Parameters<Parameters<typeof db.$transaction>[0]>[0]` so callers get full autocomplete on the transaction client.

Exports:
- `ensureUserLedgerAccount(userId, currency)` — get-or-create a `user-wallet` account; deterministic code `WALLET-{userId}-{currency}`.
- `ensureFeeAccount(currency)` — get-or-create a `fee-revenue` account; deterministic code `FEE-{currency}`.
- `ensureSystemAccount(type, currency, code)` — get-or-create `treasury`/`tax`/`suspense`/`float` accounts.
- `postEntry(tx, params)` — append one `LedgerEntry` row inside a transaction.
- `postTransfer(tx, opts)` — append a balanced two-leg debit+credit pair and assert balance; throws if `amount <= 0`.
- `assertBalanced(entries)` — verify `Σ(debit) === Σ(credit)` within a 1e-4 tolerance; throws `Ledger imbalance: debit=X credit=Y` on failure.
- `getAccountBalance(accountId, currency)` — derived balance `Σ(credit) - Σ(debit)`; positive = account holds money.

### 4. `src/lib/db.ts` (EDITED)
Bumped `PRISMA_CACHE_VERSION` from `v2-systemsetting-2026-06` to `v3-ledger-2026-07`. The dev server's cached `PrismaClient` is discarded on next request and replaced with a fresh client generated from the new schema (which knows about the 6 new models). No manual server restart required.

### 5. `.env.example` (NEW)
Production env template documenting:
- `DATABASE_URL` + `DIRECT_URL` (PostgreSQL), with a commented-out SQLite dev override.
- Security: `GAEXPAY_JWT_SECRET`, `GAEXPAY_ENC_KEY` (AES-256-GCM), `GXP_CARD_KEK` (card number KEK).
- Auth: `GXP_ALLOW_DEV_AUTH=false` (never true in prod), `GXP_ACCESS_TOKEN_TTL=900`, `GXP_REFRESH_TOKEN_TTL=604800`.
- SMTP (LWS Mail): `SMTP_HOST/PORT/USER/PASS/FROM`.
- `REDIS_URL` (rate limiting).
- OAuth: `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_APP_ID/SECRET`.
- `GXP_ALLOWED_ORIGINS` (CORS).
- `SENTRY_DSN`.

### 6. `.gitignore` (EDITED)
- Added `db/custom.db` and `db/custom.db-journal` — the SQLite dev DB is now archived (production uses PostgreSQL).
- Added `!.env.example` so the template stays tracked even though `.env*` is ignored.

## Verification

### `bun run db:push`
```
$ prisma db push
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "custom.db" at "file:/home/z/my-project/db/custom.db"
🚀  Your database is now in sync with your Prisma schema. Done in 42ms
Running generate... ✔ Generated Prisma Client (v6.19.2) to ./node_modules/@prisma/client in 324ms
```

### `bun run lint`
```
$ eslint .
```
Exit 0 — **0 errors, 0 warnings**.

### End-to-end ledger verification (against live SQLite DB)
- All 6 new tables created (initial row counts all 0).
- `ensureFeeAccount("NGN")` → created `FEE-NGN` (id `cmr2xaok40000owe0zki908k1`).
- `ensureUserLedgerAccount("verify-user-1", "NGN")` → created `WALLET-verify-user-1-NGN` (id `cmr2xaok70001owe0aoneltpk`).
- `postTransfer({ from: FEE-NGN, to: WALLET-verify-user-1-NGN, amount: 250.5, currency: NGN })` inside `db.$transaction` → posted both legs atomically.
- `getAccountBalance` returned `250.5` for the user (credit) and `-250.5` for the fee account (debit) — mathematically correct.
- `assertBalanced` correctly threw on imbalanced entries and accepted balanced ones.

## Notes for Downstream Agents
- The ledger engine is **not yet wired into** any existing API route (transfer/cashout/swap/trade). Those flows still mutate `Wallet.balance` directly. A future task should layer `postTransfer`/`postEntry` calls into each `db.$transaction` block so the ledger becomes the system of record (with `Wallet.balance` as a denormalized cache).
- The PostgreSQL schema is a **mirror**, not the runtime schema. The Next.js runtime still loads `prisma/schema.prisma` (SQLite). To switch to PostgreSQL in production: copy `schema.postgres.prisma` → `schema.prisma`, set `DATABASE_URL`/`DIRECT_URL`, run `prisma migrate deploy`.
- The 1e-4 tolerance in `assertBalanced` is for SQLite `Float` rounding; in PostgreSQL with `Decimal(18,4)` the tolerance is effectively unused (the values are exact to 4 decimal places).
- `LedgerBalance` is provided as a denormalized cache table but the engine does not yet maintain it; `getAccountBalance` always reads from `LedgerEntry`. A future task can add a trigger/maintenance job to keep `LedgerBalance` in sync for fast reads.

## Stage Summary
- **Files created (3)**: `prisma/schema.postgres.prisma`, `src/lib/ledger.ts`, `.env.example`.
- **Files edited (3)**: `prisma/schema.prisma` (+6 models, additive), `src/lib/db.ts` (cache version bump), `.gitignore` (archive SQLite + track `.env.example`).
- **Database**: SQLite dev DB has 6 new tables; no existing table touched. PostgreSQL mirror ready for production migration with `Decimal(18,4)` precision on all monetary fields + composite indexes on hot Transaction query paths.
- **Lint**: 0 errors, 0 warnings.
- **db:push**: succeeded; Prisma Client regenerated.
- **End-to-end**: ledger engine creates accounts idempotently, posts balanced transfers inside a transaction, computes correct derived balances, and rejects imbalanced entries.
