# Task 20-C — Crypto-to-Fiat Cashout (Instant Conversion)

**Agent**: Senior DeFi Engineer (Crypto-to-Fiat Cashout)
**Task ID**: 20-C
**Scope**: Instant crypto→fiat conversion with REAL CoinGecko prices, paid directly into the user's fiat wallet

## Deliverables

### 1. Backend — `src/app/api/crypto/cashout/route.ts` (~290 LOC)

**POST `/api/crypto/cashout`** — body `{ crypto, fiatCurrency, amount }`

- Validates: crypto must be one of the 8 wallet cryptos (BTC/ETH/USDT/USDC/BNB/SOL/PI/TRX); fiat must be in `FIAT_USD_RATE` (32 currencies incl. NGN/USD/EUR/GBP/GHS/KES/XAF/XOF/ZAR/...); amount > 0; amount ≤ available balance.
- Fetches REAL prices from `getCryptoRates()` (shared CoinGecko cache, 60s TTL, single-flight).
- `marketRate = directFiatPrice ?? cryptoPriceUSD × fiatPerUsd` (CoinGecko direct price for NGN/EUR/GBP/GHS/KES/ZAR/USD; USD × static fallback for XAF/XOF/UGX/ETB/etc).
- **Fee model**: 1.0% cashout fee charged IN CRYPTO (`feeCrypto = amount × 0.01`). The remaining 99% (`cryptoConverted = amount − feeCrypto`) gets converted to fiat at the real CoinGecko rate. So `fiatCredited = cryptoConverted × realRate`. The user receives the FULL market value of the converted (post-fee) crypto — fee is fully taken in crypto.
- **Two transactions** persisted:
  1. Debit crypto wallet — `type="exchange"`, `direction="debit"`, `currency=crypto`, `amount=numericAmount`, `method="wallet"`, `provider="gaexpay-cashout"`, `description="Cashed out {amount} {crypto} to {fiat}"`, `fee=feeCrypto`, `category="investment"`, full metadata JSON with `kind:"crypto-cashout", direction:"debit"`.
  2. Credit fiat wallet — `type="exchange"`, `direction="credit"`, `currency=fiat`, `amount=fiatCredited`, `fee=0`, `method="wallet"`, `provider="gaexpay-cashout"`, `description="Received from {crypto} cashout"`, paired with the debit ref. Fiat wallet is created on the fly if missing (so XOF/XAF cashouts work without pre-existing wallets).
- **Notification**: "Crypto cashout completed — Cashed out {amount} {crypto} → {fiatCredited} {fiat} (1.0% fee in crypto)."
- Returns: `{ success, reference, debitReference, creditReference, crypto, fiatCurrency, amount, cryptoDebited, cryptoConverted, fiatCredited, fee, feeCrypto, feeFiatValue, feePct, rate (gross market), netRate (after fee), cryptoPriceUSD, fiatPerUsd, remainingCryptoBalance, completedAt, source:"CoinGecko" }`.

**GET `/api/crypto/cashout?crypto=BTC&fiat=NGN`** — quote-only endpoint returning `{ marketRate, netRate, cryptoPriceUSD, fiatPerUsd, feePct, availableBalance, change24h, source:"CoinGecko" }`. Used by the UI's live preview (60s polling).

### 2. Frontend — `src/components/gaexpay/views/crypto-cashout-view.tsx` (~880 LOC)

- **Header**: title "Crypto → Fiat Cashout" + "Live · CoinGecko" badge + "1.0% fee · in crypto" badge.
- **Live price ticker**: top 6 cryptos by market cap (skip stablecoins), real CoinGecko prices + 24h % change, click to select. The active crypto is highlighted with "SELECTED" badge and emerald ring.
- **Hero card** (dark gradient `slate-900 → emerald-950` with emerald/teal glow blobs): "Instant Crypto → Fiat" title with Banknote icon, subtitle, and live rate display showing `1 BTC = ₦85,054,001 NGN` (real CoinGecko) + `≈ $62,524.00 USD` + 24h % change. AnimatedNumber on the rate.
- **Conversion form** (same dark gradient card):
  - **From section**: crypto selector button (icon + code + chevron), amount input (huge tabular-nums), live USD value, MAX button, balance + USD value footer.
  - **Animated swap arrow** (rotates 360° while submitting) — clicking opens crypto picker.
  - **To section**: fiat selector button (flag + code + chevron), auto-calculated converted amount (AnimatedNumber with AnimatePresence transitions on value change), currency name.
  - **Live rate display**: `1 BTC = 85,054,001 NGN` with rotating RefreshCw icon + "CoinGecko · 60s" label.
  - **Fee breakdown**: You send / Cashout fee (1.0%) / Crypto converted / Live rate / You receive.
  - **Insufficient balance warning** (AnimatePresence): red callout if `amount > walletBalance`.
  - **"Cash Out Now" button**: gradient emerald→teal, shows "Cash Out 0.001 BTC → NGN" or "Enter an amount" / "Insufficient balance" states, AnimatePresence loading spinner.
  - **Security note**: emerald-tinted callout about instant settlement + AES-256 + 2FA.
- **Summary card** (right side): You send / Rate (live) / Fee (1.0%) / You receive / Total conversion (crypto → fiat, both colored) / Net rate (after fee, emerald) / Remaining {crypto} balance.
- **Live rate card**: crypto/fiat pair header with 24h badge, AnimatedNumber for live price (fiat + USD), 4 stat tiles (24h change / market cap / 24h volume / cashout fee).
- **Your {crypto} wallet card**: balance + USD value with AnimatedNumber.
- **Recent cashouts**: max-h-96 scrollable list (no-scrollbar) of cashout transactions (filters `/api/transactions?type=exchange` for `metadata.kind==="crypto-cashout" && direction==="debit"`), each row shows crypto→fiat arrow, ref prefix, time ago, − crypto (red) + + fiat (green). Empty state with ArrowDownToLine icon.
- **Asset Picker Dialog**: crypto tab shows all 8 user wallets with balance, USD value, price, 24h change; fiat tab shows 8 fiat currencies (NGN/USD/EUR/GBP/GHS/KES/XAF/XOF) with flag, name, symbol.
- **Success Dialog**: spring-animated CheckCircle2, "Cashout Complete", conversion summary (crypto → fiat with arrow), full receipt (reference, debit ref, credit ref, market rate, crypto price, fee in crypto + fiat value, crypto debited, crypto converted, fiat received, remaining balance, completed timestamp, "CoinGecko (live)" source), New cashout + Done buttons. Triggers Confetti.

### 3. Navigation wiring

- `src/lib/store.ts`: added `"crypto-cashout"` to the `View` union immediately after `"crypto-trade"`.
- `src/components/gaexpay/app-shell.tsx`: imported `CryptoCashoutView`, added `"crypto-cashout": <CryptoCashoutView />` entry in the views map.
- `src/components/gaexpay/sidebar.tsx`: imported `Banknote` from lucide-react; added `{ id: "crypto-cashout", label: "Crypto → Fiat", icon: Banknote }` immediately after "Buy / Sell Crypto".
- `src/components/gaexpay/mobile-nav.tsx`: same Banknote import + nav entry after "Buy / Sell Crypto".

## Verification

### Lint
- `bun run lint` → **0 errors, 0 warnings** (exit 0).

### API endpoints (verified against live dev server)
- `GET /api/crypto/cashout?crypto=BTC&fiat=NGN` → 200: `marketRate: 85054001, netRate: 84138416.01, cryptoPriceUSD: 62475, fiatPerUsd: 1535, feePct: 1, availableBalance: 0.04382, change24h: -2.81, source: "CoinGecko"`.
- `POST /api/crypto/cashout { BTC→NGN, 0.001 }` → 200: `cryptoDebited: 0.001, cryptoConverted: 0.00099, fiatCredited: 84489.38 NGN, feeCrypto: 0.00001 BTC, feeFiatValue: 853.43 NGN, rate: 85342809, netRate: 84489380.91, remainingCryptoBalance: 0.04382`.
- `POST /api/crypto/cashout { USDT→XOF, 50 }` → 200: `cryptoDebited: 50, cryptoConverted: 49.5, fiatCredited: 29596.51 XOF, feeCrypto: 0.5 USDT, rate: 597.91, source: "CoinGecko"`. (XOF wallet auto-created on the fly with the credited balance — verified via `GET /api/wallets` showing the new XOF wallet at 29,596.51.)
- `POST /api/crypto/cashout { BTC→NGN, 999 }` → 400 `Insufficient BTC balance (available: 0.04482)`.
- `POST /api/crypto/cashout { XRP→NGN, 10 }` → 400 `You don't have a XRP wallet to cash out from`.
- `GET /api/wallets` after cashouts → NGN wallet increased by ₦84,489.38, XOF wallet created with CFA 29,596.51.

### UI (agent-browser end-to-end test)
- Navigated to "Crypto → Fiat" view from both sidebar and mobile nav — view renders with header, ticker, hero, conversion form, summary, wallet card, recent cashouts.
- Live ticker shows 6 real CoinGecko prices: BTC $62,596 -2.81%, ETH $1,694.43 -3.09%, BNB $574.22 -2.58%, XRP $1.12 -4.56%, SOL $68.27 -4.75%, TRX $0.3203 -0.14%.
- Hero card shows live rate "1 BTC = ₦85,054,001.00 NGN · ≈ $62,524.00 USD · 24h -2.92%".
- MAX button sets amount to current wallet balance.
- Clicked "Cash Out 0.001 BTC → NGN" → success dialog appeared with full receipt: 0.001 BTC → ₦84,203.46, ref GXPMQKMT02A3RCU, market rate 1 BTC = 85,054,001 NGN, fee 0.00001 BTC (≈ ₦850.54), crypto converted 0.00099 BTC, fiat received ₦84,203.46, remaining balance 0.04382 BTC, source CoinGecko (live).
- Asset picker dialogs render correctly: crypto picker shows all 8 wallets with balances + USD values + live prices + 24h %; fiat picker shows 8 fiat currencies (NGN/USD/EUR/GBP/GHS/KES/XAF/XOF).
- Recent cashouts list shows real entries: BTC→NGN 1m ago (ref GXPMQKMT02, -0.001 BTC, +₦84,203.46), USDT→XOF 3m ago (ref GXPMQKMQF0, -50 USDT, +CFA29,596.51), BTC→NGN 7m ago (ref GXPMQKMM45, -0.001 BTC, +₦84,489.38).
- Dashboard Recent Activity feed shows the paired cashout transactions (debit + credit) with proper labels: "GaexPay Cashout → NGN Exchange · 1m Ago -₿0.0010" and "GaexPay Cashout ← BTC Exchange · 1m Ago +₦84,203.46".

### Dev log
- No runtime errors. Endpoints return 200/400 cleanly. CoinGecko cache hit ~3ms, miss ~300ms (60s TTL working correctly).

## Stage Summary
- New crypto cashout feature is live and reachable from both desktop sidebar and mobile nav under "Crypto → Fiat" (Banknote icon, positioned right after "Buy / Sell Crypto").
- Backend POST `/api/crypto/cashout` executes a real-time crypto→fiat conversion at CoinGecko prices: 1.0% fee charged IN CRYPTO, the remaining 99% is converted to fiat at the live market rate and credited to the user's fiat wallet (auto-created if missing for XOF/XAF/etc). Persists paired debit + credit Transactions (type=exchange, provider=gaexpay-cashout) + a Notification.
- Frontend view (`crypto-cashout-view.tsx`) renders: dark-gradient hero card with live CoinGecko rate, conversion form with crypto selector / amount input / MAX button / animated swap arrow / fiat selector / live rate display / fee breakdown / "Cash Out Now" CTA, side-by-side summary card with net rate + remaining balance + total conversion, live rate card with AnimatedNumber + 24h change + market cap + volume, user wallet card with balance + USD value, recent cashouts list (max-h-96 scrollable), live ticker showing top 6 cryptos with real prices and 24h %, asset picker dialogs (8 cryptos + 8 fiats), success dialog with full receipt + Confetti + spring-animated check.
- All math verified end-to-end: 0.001 BTC × 85,054,001 NGN = 85,054 NGN gross → minus 1% fee (0.00001 BTC ≈ ₦850.54) → 0.00099 BTC × 85,054,001 = 84,203.46 NGN net received ✓.
- No regressions: ESLint clean (0 errors, 0 warnings), dev server compiles cleanly, all pre-existing routes still serve 200.
- App stats: 28 views (added Crypto Cashout), 48 API routes (added `/api/crypto/cashout` POST + GET), 19 database models (unchanged), 8 cryptos with REAL CoinGecko prices instant-convertible to 8 fiat currencies.
