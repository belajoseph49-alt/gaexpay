# Task 26-C — Accounting Traceability System (Double-Entry Ledger + Back-Office)

**Agent**: Senior Accounting Systems Engineer
**Task ID**: 26-C
**Date**: 2025

## Objective

Build a complete accounting & traceability subsystem on top of the existing
`Transaction` + `AuditLog` models so every payment has:
- A **double-entry bookkeeping** representation (debit/credit account pairs).
- Full **reference tracking** (audit trail + notifications + disputes +
  scheduled-transfer link + wallet impact + risk assessment) for any tx.
- A **back-office admin module** for daily reconciliation, ledger browsing,
  per-transaction tracing, and report generation.
- Properly-emitted audit logs (`payment_initiated` + `payment_completed`)
  from the generic merchant payment endpoint.

## Scope (files added/modified)

1. **NEW** `src/app/api/accounting/route.ts` — `GET /api/accounting` ledger API
2. **NEW** `src/app/api/accounting/trace/[reference]/route.ts` — `GET /api/accounting/trace/[reference]`
3. **NEW** `src/app/api/accounting/reconciliation/route.ts` — `GET /api/accounting/reconciliation`
4. **NEW** `src/components/gaexpay/views/accounting-view.tsx` — 4-tab back-office UI (~1700 lines)
5. **MODIFIED** `src/lib/store.ts` — added `"accounting"` to `View` union
6. **MODIFIED** `src/components/gaexpay/app-shell.tsx` — registered `<AccountingView />`
7. **MODIFIED** `src/components/gaexpay/sidebar.tsx` — added `BookOpen`-icon entry under "Platform"
8. **MODIFIED** `src/components/gaexpay/mobile-nav.tsx` — same entry for mobile
9. **MODIFIED** `src/app/api/pay-merchant/route.ts` — emits two new audit logs
   (`payment_initiated` + `payment_completed`) alongside the existing `merchant_pay`
   log, with full IP / userAgent / counterparty / amount / fee metadata.

## API contracts

### `GET /api/accounting?from=&to=&type=&currency=&status=&limit=`

Returns:
```ts
{
  range: { from: string, to: string };
  entries: Array<{
    reference, date, type, description, direction,
    debitAccount, creditAccount,    // double-entry mapping
    amount, fee, currency, status,
    counterparty, counterpartyAccount, counterpartyBank,
    method, provider, category,
    riskScore, fraudFlag,
    completedAt, metadata,
    auditTrail: Array<{ id, action, actor, severity, timestamp, details }>
  }>;
  summary: {
    totalDebit, totalCredit, totalFees,
    netFlow: totalCredit - totalDebit,
    transactionCount,
    byType: Record<string, number>,
    byStatus: Record<string, number>,
    byCurrency: Record<string, number>
  }
}
```

Default date range: last 30 days. `to` is stretched to end-of-day so the upper
bound is inclusive. Audit logs are fetched once in parallel with the
transactions and indexed by `entityId` for O(1) attachment to each entry.

**Double-entry mapping rule**: For a debit-direction tx the user wallet is
debited (asset outflow) and the counterparty is credited. For a credit-direction
tx (inflow) the counterparty is debited and the user wallet is credited. The
"User Wallet {currency}" account label is a synthetic account name — it maps
1:1 to the user's wallet row in that currency (no separate LedgerAccount table
was added; the schema already models Wallet + Transaction).

### `GET /api/accounting/trace/[reference]`

Returns the COMPLETE trace of a single transaction:
```ts
{
  transaction: { ...all Transaction fields, metadata parsed },
  timeline: Array<{ id, action, actor, severity, source, timestamp, details }>,
  auditTrail: Array<{ id, action, actor, severity, ip, userAgent, details, timestamp }>,
  notifications: Array<{ id, title, message, type, channel, isRead, timestamp }>,
  supportTickets: Array<{ id, subject, category, priority, status, createdAt }>,
  disputes: Array<{ id, reason, description, status, priority, resolution, createdAt, resolvedAt }>,
  scheduledTransfer: { id, frequency, nextRunAt, lastRunAt, totalRuns, status } | null,
  walletImpact: {
    currency, before, after, delta, feeApplied, direction,
    wallets: Array<{ id, label, type, currentBalance, ledgerBalance }>
  },
  riskAssessment: { riskScore, fraudFlag, tier, recommendation }
}
```

**Timeline construction**: audit logs + notifications + disputes +
scheduled-transfer link + synthetic `transaction_initiated` /
`transaction_completed` / `transaction_failed` events (added only when no
real audit log of that phase exists). All events sorted chronologically.

**Wallet before/after computation**: pulls every transaction in the same
currency for the same user, sums the signed deltas (credits positive, debits
negative, fees subtracted from debit side) up to (but excluding) the traced
tx, then adds the tx's own signed delta if its status is "completed".

**Risk tier**: `critical` (fraudFlag or score ≥ 70) → `high` (≥ 70) →
`medium` (≥ 40) → `low`. Each tier has a recommendation string used by the
UI for compliance officers.

**Notification/support/dispute matching**: matched by `tx.reference`
appearing in the row's text/metadata fields (notifications) or subject
(support tickets), and by `transactionId OR transactionRef` (disputes).

**Scheduled-transfer match**: matches on `userId + amount + currency +
recipientName === counterpartyName` (ordered by most recent).

### `GET /api/accounting/reconciliation?date=YYYY-MM-DD` (or `?from=&to=`)

Returns the daily reconciliation report:
```ts
{
  range, generatedAt,
  totals: {
    transactionCount, completedCount,
    totalVolume, totalFees,
    failedCount, failedAmount,
    refundedCount, refundedAmount,
    disputedCount,
    creditVolume, debitVolume,
    netSettlement,            // creditVolume - debitVolume
    unreconciledCount
  },
  volumeByCurrency, volumeByType, volumeByStatus,
  feesByCurrency, feesByType,
  walletTotalsByCurrency: Array<{ currency, balance, ledgerBalance, walletCount }>,
  wallets: Array<{ id, currency, balance, ledgerBalance, label, type }>,
  disputes: Array<{ id, transactionRef, reason, status, priority, createdAt }>,
  unreconciled: Array<{ reference, amount, currency, type, description, createdAt }>,
  reconciliationHealth,       // 100 - (failed + unreconciled) / total * 100
  isBalanced                  // unreconciledCount === 0 && failedCount === 0
}
```

**Unreconciled detection**: a completed transaction is "unreconciled" if no
`AuditLog` row exists with `entity="transaction"` and `entityId = tx.id`.
This is computed by pulling all transaction-scoped audit logs for the user
in the date range, indexing them by `entityId`, then scanning each completed
tx.

## Front-end (accounting-view.tsx)

### Tabs
- **Ledger** — date-range picker + 3 filter dropdowns (type, currency, status)
  + free-text search. Summary cards (Debit / Credit / Fees / Net Flow / Count),
  full double-entry table (Date, Reference, Type, Description, Debit Account,
  Credit Account, Amount, Fee, Status, fraud flag icon). Clicking any row
  switches to the Trace tab pre-filled with that reference. Export-CSV button
  dumps the filtered view. Below the table: three breakdown cards
  (By Type / By Status / By Currency) with mini progress bars.
- **Trace** — search-by-reference input → calls
  `/api/accounting/trace/[reference]`. Renders:
  - Hero card with reference, description, amount, fee, counterparty, method,
    provider, category, timestamps.
  - Risk Assessment card (score /100, tier badge, fraud flag, recommendation,
    colored progress bar).
  - Wallet Impact card (Before / Delta / After triple, current wallets list
    in the same currency).
  - **Event Timeline** with colored dots per source (audit=sky, notification=
    violet, dispute=rose, scheduled=amber, system=muted), severity badges,
    expandable JSON details per event.
  - 4 related-record cards (Audit Trail, Notifications, Disputes, Support
    Tickets) in a 2-column grid, each scrollable.
  - Linked Scheduled Transfer card (only shown if `scheduledTransfer != null`).
- **Reconciliation** — single date picker. Health banner (balanced / pending),
  4 KPI cards (Volume / Fees / Failed / Net Settlement), 3 breakdown cards
  (by Currency / Type / Status), wallet-totals table (with CSV export),
  unreconciled list, disputes list, "Mark as reconciled" button (toast +
  refresh).
- **Reports** — period picker (Today / 7 days / 30 days) + report-type picker
  (Revenue / Volume / Compliance). Computes report client-side from the
  ledger response:
  - **Revenue**: total fees, fees by type (bar chart with progress bars), fees
    by currency (3-column grid of cards). CSV export.
  - **Volume**: total volume, currency/type breakdowns with tx counts. CSV
    export.
  - **Compliance**: flagged (fraud / risk≥70), high-risk (40-69), failed,
    avg risk score, plus a scrollable list of flagged transactions with
    risk badge + status badge. CSV export.

### Design system
- Emerald/teal accent (matches Treasury/Compliance views), dark-theme first.
- Cards use the shared `card-lift` class for hover elevation.
- Tables wrapped in `max-h-[600px] overflow-y-auto` so the ledger stays
  scrollable on long ranges.
- Skeleton states for every async tab.
- Sonner toasts for CSV exports + reconciliation actions.

## pay-merchant audit-log changes

The existing `/api/pay-merchant/route.ts` emitted one audit log per payment
with action `merchant_pay`. The task asked for two additional audit logs:

1. **`payment_initiated`** — emitted immediately after the `Transaction` row
   is created (before the notification). `actor: "user"`. Captures IP +
   userAgent + counterparty + amount + currency + type + method + category.
2. **`payment_completed`** — emitted after the notification is queued.
   `actor: "system"`. Captures the same fields plus `status: "completed"`,
   `fee`, and `completedAt` ISO timestamp.

The original `merchant_pay` audit log is kept for backward compatibility
with any downstream tooling that queries by that action name — so each
payment now produces 3 audit rows: initiated → completed → merchant_pay.

Verified by:
```bash
curl -X POST /api/pay-merchant ... → ref GXPMQM3YEFX9A33
curl /api/accounting/trace/GXPMQM3YEFX9A33
# timeline:
#   payment_initiated by user
#   payment_completed by system
#   merchant_pay by user
```

## Verification

- ✅ `bun run lint` → 0 errors, 0 warnings.
- ✅ Dev server compiles cleanly; only one transient error during development
  (SQLite doesn't support `mode: "insensitive"` on `StringFilter` — fixed by
  removing the mode flag and using a direct equality match since references
  are uppercase alphanumeric and case-sensitive matching is correct).
- ✅ `GET /api/accounting?from=2024-01-01&to=2026-12-31&limit=2` → 200,
  returns entries + summary with `totalDebit`, `totalCredit`, `totalFees`,
  `netFlow`, `transactionCount`, `byType`, `byStatus`, `byCurrency`.
- ✅ `GET /api/accounting/trace/GXPMQM3KDGYRTM7` → 200, returns
  `{ transaction, timeline, auditTrail, notifications, supportTickets,
  disputes, scheduledTransfer, walletImpact, riskAssessment }`.
- ✅ `GET /api/accounting/reconciliation?date=2026-06-20` → 200, returns
  totals + wallet totals across 16 currencies + reconciliationHealth: 100,
  isBalanced: true.
- ✅ `POST /api/pay-merchant` → 200, creates a transaction with 3 audit logs
  (payment_initiated, payment_completed, merchant_pay).
- ✅ Trace endpoint shows the new audit logs in the timeline immediately.

## Notes for downstream agents

- The accounting ledger is a **derived view** — there is no separate
  LedgerEntry table. The double-entry mapping is computed in the API from
  `Transaction.direction + currency + counterpartyName`. If you add a new
  transaction-creating flow, ensure it sets `direction` correctly (credit for
  inflows, debit for outflows) and emits at least one `entity="transaction"`
  audit log so the tx appears as reconciled.
- The reconciliation "unreconciled" check only looks at `AuditLog` rows
  where `entity = "transaction"` and `entityId = tx.id`. If you create a
  transaction outside of `/api/pay-merchant` (e.g., `/api/transfer`,
  `/api/scheduled-transfers`, `/api/exchange`), make sure those routes also
  emit at least one such audit log — otherwise the tx will show as
  unreconciled in the daily report. (Most existing routes already do —
  `transfer.create`, `scheduled_transfer.execute`, `exchange.create`,
  `international_transfer` — but worth double-checking if you add new ones.)
- The Trace tab's `walletImpact.before/after` is computed by replaying ALL
  transactions in the same currency for the user, ordered by `createdAt`.
  This is O(N) per trace request — fine for the demo dataset (~150 txs)
  but should be cached or materialised into a WalletBalanceSnapshot table
  for production scale (>10k txs/user).
- The "Mark as reconciled" button on the Reconciliation tab currently just
  shows a toast and refreshes — it does NOT persist reconciliation state.
  To make it real, add a `Reconciliation` table (`userId, date, status,
  reconciledBy, reconciledAt, notes`) and a `POST /api/accounting/reconciliation`
  endpoint that writes a row keyed by `(userId, date)`.
- The Reports tab uses the same `/api/accounting` endpoint (with
  `limit=2000`) and computes the report client-side. If you need larger
  ranges, add server-side aggregation endpoints (e.g.
  `/api/accounting/report?type=revenue&period=monthly`).
