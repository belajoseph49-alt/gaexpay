# Task 15-c — Mobile Data & Airtime Purchase Specialist

## Task
Add a "Data" tab to the Pay view, enhance the existing basic Airtime tab
with carrier selection + phone-number network auto-detection + real
processing + receipts + recent-history, and back both with new
`/api/airtime` and `/api/data` API routes that debit the user's wallet
atomically.

## Work Log

### 1. Shared carrier + bundle catalog (`src/lib/carriers.ts` — new)
- `Carrier` interface + `CARRIERS[]` roster: 8 carriers covering the
  four launch markets (Nigeria: MTN, Airtel, Glo, 9mobile; Cameroon:
  Orange, Nexttel, MTN; Ghana: Vodafone, MTN; Kenya: Safaricom, Airtel).
  Each carrier has `id`, `name`, `color`, `textColor`, `countries[]`,
  `currency`, `tagline`.
- `detectNetwork(phone)` — Nigerian prefix detector covering all major
  MNP-resistant prefixes (MTN: 0803/0806/0703/0706/0813/0816/0810/0814/
  0903/0906/0913/0916; Airtel: 0802/0808/0708/0812/0701/0901/0902/0904/
  0912; Glo: 0805/0807/0705/0811/0815/0905/0915; 9mobile: 0809/0817/0818/
  0908/0909). Normalises E.164 (`+234...` or `234...`) to local form
  before matching.
- `normalizePhone()` → E.164, `isValidPhone()` → NG 11-digit, NG 13-digit
  (234...), or generic 10-15 digit.
- `DataBundle` interface + `DATA_BUNDLES[]` — 9 base plans × 8 carriers
  = 72 bundles, each with a unique id (`{carrier}-{sizeMB}mb-{validity}`).
  Plans: Daily 100MB ₦100 / 350MB ₦200 / 1GB ₦350; Weekly 2GB ₦500 /
  5GB ₦1,500; Monthly 10GB ₦3,500 / 25GB ₦6,500 / 75GB ₦15,000 /
  100GB ₦19,000. Tagged ("Popular", "Best value", "Mega").
- Helpers: `getCarrier()`, `getBundle()`, `bundlesByNetwork()`,
  `customBundlePrice(sizeMB)` (₦0.45/MB, floor ₦50, rounded to nearest
  ₦10), `formatDataSize(sizeMB)` (e.g. "1.5 GB", "350 MB").

### 2. `/api/airtime/route.ts` — POST + GET (new)
- POST: validates phone format, network support, amount > 0 / ≤ 1e9,
  currency 3-letter. `db.$transaction` re-fetches the wallet (so
  concurrent purchases can't double-spend), checks balance, debits,
  writes a Transaction record (`type: "airtime"`, `method: "airtime"`,
  `provider: <carrier id>`, `counterpartyAccount: <normalizedPhone>`,
  metadata JSON with `kind: "airtime"`, network, phone, amount,
  `detectedNetwork`, `networkMatched`, `walletBalanceAfter`), writes
  an AuditLog (action `airtime.purchase`), creates a Notification.
  Returns `{ success, transaction, receipt }` with full receipt
  (transactionId, reference, amount, network, networkName, networkColor,
  phoneNumber, detectedNetwork, networkMatched, date, newBalance).
- GET: returns last 10 airtime purchases + the carrier list (so the
  client can render the picker without an extra round-trip).
- Hardening: `getAuthUserId` (401 in production), `rateLimitSensitive`
  (10/min), all errors via `apiCatch` (no internals leaked).

### 3. `/api/data/route.ts` — POST + GET (new)
- POST: validates phone + network, then resolves the bundle:
  - `bundleId` path → catalog plan, must belong to the selected
    carrier (else 400).
  - `customMB` path → priced via `customBundlePrice()`, must be > 0
    and ≤ 1,000,000 MB.
  Computes expiry from validity (daily +1d, weekly +7d, monthly +30d).
  Atomic wallet debit + Transaction (`type: "data"`, metadata with
  `kind: "data"`, bundleId, bundleName, dataSizeMB, dataSizeLabel,
  validity, expiry ISO, detectedNetwork, networkMatched) + AuditLog
  (action `data.purchase`) + Notification. Receipt includes bundle
  name, data size, validity, expiry date, new balance.
- GET: last 10 data purchases + carriers + bundles grouped by network
  + flat bundle list.

### 4. `/api/data/bundles/route.ts` — GET (new)
- Standalone discovery endpoint returning `{ bundles, carriers,
  bundleList }` — shape-compatible with the `bundles` field on
  `GET /api/data` so clients can consume either with the same code.

### 5. `pay-view.tsx` — Data tab + rewritten AirtimePay + new DataPay
- TabsList widened from 4 → 5 columns (`grid-cols-2 sm:grid-cols-5`),
  added `<TabsTrigger value="data"><Wifi /> Data</TabsTrigger>` and
  `<TabsContent value="data"><DataPay /></TabsContent>`.
- `QrPay`, `MerchantsPay`, `BillsPay` preserved verbatim.
- **AirtimePay (rewrite):**
  - Horizontal-scroll `CarrierChip` row — colored circle with the
    carrier's first letter, name below, ring-2 + bg-primary/5 when
    selected.
  - Phone input with Phone icon prefix + live "Detected: MTN" badge.
    Auto-selects network on phone change unless the user has manually
    overridden the picker; shows a "Use detected" quick-action when
    there's a mismatch.
  - 6 quick-amount pills (₦100/₦200/₦500/₦1000/₦2000/₦5000) with
    active highlight, plus a custom amount input with currency symbol
    prefix.
  - "Get 2% bonus airtime" notice.
  - Real `POST /api/airtime` with loading state ("Purchasing
    airtime..."), full receipt card with branded spring-animated
    success check, transaction ID, network badge, phone, amount, fee
    ("Free"), date, new balance (emerald), mismatch warning when
    applicable.
  - Below the form: `RecentPurchases` card with last 5 airtime txs
    (max-h-96 overflow-y-auto), each showing carrier-colored avatar,
    network name, phone, amount (rose −), relative time.
- **DataPay (new):**
  - Same carrier picker + phone auto-detect as AirtimePay.
  - Bundles/Custom mode toggle (segmented control).
  - Bundles grid grouped by validity (Daily/Weekly/Monthly) — each
    `BundleCard` shows carrier avatar, validity label, data size
    (formatted), price in user's currency, optional marketing tag.
    Selected card has primary ring + bg-primary/5.
  - Custom mode: MB input with live size preview ("1.5 GB"), quick
    chips (500/1GB/2GB/5GB/10GB), estimated-price row.
  - Total-amount summary row + "Buy Data · {amount}" button with
    Framer Motion loading state.
  - Success receipt shows bundle name, data size, validity, expiry
    date, amount, new balance, branded Wifi icon.
  - Recent Data Purchases list below.
- Shared helpers in the same file: `CarrierChip`, `BundleCard`,
  `ReceiptRow` (label/value with bold/accent/mono variants),
  `RecentPurchases` (reusable last-5 card with skeleton/empty states),
  `safeParseMeta` (defensive JSON.parse for tx metadata),
  `bundlesByNetworkFallback` (static fallback if `/api/data` hasn't
  loaded yet), `timeAgoShort` (compact relative time).

### 6. Verification
- `bun run lint` → **0 errors, 0 warnings**.
- Dev server compiles cleanly (no runtime errors in dev.log).
- Runtime tests via curl all pass:
  - `GET /api/airtime` → 200 (returns last 10 airtime txs + 8 carriers)
  - `GET /api/data` → 200 (returns last 10 data txs + carriers + 72
    bundles grouped by network)
  - `GET /api/data/bundles` → 200 (returns 8 networks × 9 bundles)
  - `POST /api/airtime` {phone:"08031234567", network:"mtn",
    amount:200} → 200, deducted ₦200 from wallet, created tx with
    provider="mtn", counterpartyAccount="+2348031234567",
    detectedNetwork="mtn", networkMatched=true
  - `POST /api/data` {phone:"08021234567", network:"airtel",
    bundleId:"airtel-10240mb-monthly"} → 200, deducted ₦3,500,
    expiry = today + 30 days
  - `POST /api/data` {phone:"08051234567", network:"glo",
    customMB:1500} → 200, deducted ₦680 (1500 × 0.45 = 675 → rounded
    to ₦680), dataSizeLabel="1.5 GB"
  - `POST /api/airtime` with invalid phone → 400 "Invalid phone number
    format"
  - `POST /api/airtime` with unknown network → 400 "Unsupported
    network. Supported: MTN, Airtel, Glo, 9mobile, Orange, Nexttel,
    Vodafone, Safaricom"

## Stage Summary
- **Files created (4):** `src/lib/carriers.ts`,
  `src/app/api/airtime/route.ts`, `src/app/api/data/route.ts`,
  `src/app/api/data/bundles/route.ts`.
- **Files edited (1):** `src/components/gaexpay/views/pay-view.tsx`
  (added Data tab, rewrote AirtimePay, added DataPay + shared helpers).
- **Features added:**
  1. New "Data" tab in the Pay view with full mobile-data bundle
     purchase flow (catalog bundles + custom size, real atomic wallet
     debit, full receipt with expiry).
  2. Enhanced Airtime tab — 8 carrier chips with brand colors,
     phone-number network auto-detection with mismatch warning, quick
     amounts + custom amount, real atomic processing, success receipt
     with all details, last-5 recent purchases list.
  3. New `/api/airtime` (POST + GET) and `/api/data` (POST + GET)
     endpoints with full validation, rate limiting, atomic db
     transactions, audit logs, and notifications.
  4. Standalone `/api/data/bundles` discovery endpoint.
  5. Shared `src/lib/carriers.ts` used by both client and server for
     single-source-of-truth carrier + bundle definitions.
- **No existing features removed** — QrPay, MerchantsPay, BillsPay all
  preserved verbatim. **No new npm packages installed.**
- **App stats:** 5 tabs in Pay view (was 4), 3 new API routes (47 → 50
  total), 1 new shared lib module.
