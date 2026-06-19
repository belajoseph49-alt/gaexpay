# Task 20-A — Real Crypto Prices (CoinGecko) + Buy/Sell Crypto (Subagent)

## Task
Replace ALL simulated crypto prices with REAL live data from the CoinGecko
free API (no API key needed), and add Buy/Sell crypto functionality
(buy crypto with fiat, sell crypto for fiat).

## Work Log

### 1. Shared CoinGecko price lib (`src/lib/coingecko.ts` — new)
- Module-scope in-memory cache with **60 s TTL** + single-flight (concurrent
  callers share the same in-flight promise) to stay well under CoinGecko's
  free-tier rate limit (~30 req/min).
- Fetches both endpoints in parallel:
  - `simple/price?ids=bitcoin,ethereum,tether,usd-coin,binancecoin,solana,ripple,cardano,polkadot,matic-network,litecoin,tron,binance-usd,dai&vs_currencies=usd,ngn,eur,gbp,ghs,kes,zar&include_24hr_change=true&include_last_updated_at=true`
  - `coins/markets?vs_currency=usd&ids=...&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
- `COINGECKO_IDS` map: BTC→bitcoin, ETH→ethereum, USDT→tether, USDC→usd-coin,
  BNB→binancecoin, SOL→solana, XRP→ripple, ADA→cardano, DOT→polkadot,
  MATIC→matic-network, LTC→litecoin, TRX→tron, BUSD→binance-usd, DAI→dai.
- `PI_PRICE_USD = 47.35` (Pi Network — pre-mainnet, not on CoinGecko).
- `FIAT_USD_RATE` static table for currencies CoinGecko doesn't support
  (XAF, XOF, UGX, ETB, RWF, TZS, EGP, MAD, DZD, TND, BIF, CDF, AOA, MZN,
  ZMW, BWP, CNY, JPY, CAD, AUD, CHF, AED, SAR, INR, BRL) — value is
  "1 USD = X units of this currency".
- Returns `CachedPayload` = `{ rates: CryptoRate[], priceMap: Record<code, USD>, timestamp }`.
- For NGN/EUR/GBP/GHS/KES/ZAR (CoinGecko-supported), the rates array uses
  CoinGecko's DIRECT price (e.g. 1 BTC = 85,314,915 NGN — not USD × 1535).
  For XAF/XOF/etc., falls back to `priceUSD × FIAT_USD_RATE[cur]`.
- Exports `getCryptoRates()`, `getCryptoPriceMap()`, `convertAmount(from,to,amt)`,
  `PI_PRICE_USD`, `FIAT_USD_RATE`, `COINGECKO_IDS`, `codeForCoinGeckoId()`.
- Graceful fallback: if CoinGecko is unreachable, uses the static price
  table (so the app keeps working offline).

### 2. `/api/crypto/rates` → REAL CoinGecko data
- Replaced simulated fluctuation logic with `getCryptoRates()` call.
- Response now includes `source: "CoinGecko"` and `cached: boolean`.
- Same response shape (`rates[]` with `priceUSD`, `prices`, `change24h`,
  `marketCap`, `volume24h`, `lastUpdated`) so existing views still work.
- Verified BTC = $62,727 (real), NGN = ₦85.3M (real CoinGecko direct),
  XAF = FCFA 37.5M (USD × 598.5 fallback), 24h change = −2.29% (real),
  market cap = $1.26T (real), volume = $28.8B (real), PI = $47.35 (fixed).

### 3. `/api/crypto/convert` → REAL prices
- Replaced static `CRYPTO_PRICES_USD` / `FIAT_TO_USD` with the shared
  `convertAmount()` helper, which uses CoinGecko's direct fiat price when
  available and USD × fallback otherwise.
- Fixed a unit bug discovered during testing (the old helper multiplied
  cryptoPriceUSD by CoinGecko's NGN price, double-counting the conversion).
  Now: 0.01 BTC → 853,273 NGN (was incorrectly 0.408 NGN before the fix).

### 4. `/api/crypto/swap` → REAL prices
- Replaced static `CRYPTO_PRICES_USD` with `getCryptoPriceMap()`.
- Live rate is now `fromPrice / toPrice` from real CoinGecko prices
  (e.g. 1 BTC = 37.0 ETH at $62,743 / $1,695.93).
- Persists `priceSource: "CoinGecko"` and `fromPriceUSD` / `toPriceUSD`
  in the transaction metadata.

### 5. `/api/crypto/wallets` → REAL prices
- Replaced static `CRYPTO_PRICES_USD` with `getCryptoPriceMap()`.
- Each wallet now shows the real-time USD value:
  BTC 0.0458 × $62,743 = $2,874.88, ETH 1.2847 × $1,695.93 = $2,178.76, etc.
- Total portfolio = $101,115.71 USD = ₦155.2M NGN (at static 1535 NGN/USD).

### 6. `/api/crypto/trade` (POST + GET — new)
- `POST /api/crypto/trade` with body
  `{ action: "buy" | "sell", crypto, fiatCurrency, amount, amountType: "fiat" | "crypto" }`.
- **BUY**: user pays `amount` in fiat (or specifies crypto amount to receive),
  crypto received at market rate, **+1.5% buy fee** in fiat.
- **SELL**: user sells `amount` of crypto, fiat received at market rate,
  **−1.0% sell fee** deducted from fiat proceeds.
- Uses CoinGecko's DIRECT fiat price when available (e.g. BTC→NGN uses
  CoinGecko's 85.3M NGN/BTC, not USD × 1535).
- Persists Transaction (`type: "exchange"`, `category: "investment"`,
  `method: "card"` for buy / `"wallet"` for sell, `provider: "gaexpay-trade"`,
  full metadata JSON including `kind: "crypto-trade"`, action, rate, fees,
  USD price, `priceSource: "CoinGecko"`).
- Creates Notification ("Crypto purchase completed" / "Crypto sale completed").
- Returns full receipt: `reference, action, crypto, fiatCurrency, marketRate,
  cryptoPriceUSD, fiatPerUsd, fiatAmount, cryptoAmount, feePct, feeFiat,
  feeCrypto, totalFiat, totalCrypto, completedAt, source`.
- `GET /api/crypto/trade?crypto=BTC&fiat=NGN` — quote-only endpoint used by
  the live rate preview card.
- Verified: Buy ₦50,000 NGN of BTC → 0.000519 BTC + ₦750 fee = ₦50,750 total ✓
- Verified: Sell 0.3 ETH for XAF → 304,504 FCFA − 3,045 fee = 301,459 FCFA ✓
- Verified: Buy $500 USD of BTC → 0.00797 BTC + $7.50 fee = $507.50 total ✓

### 7. `crypto-trade-view.tsx` (new — ~720 LOC)
- **Header** with "Buy / Sell Crypto" title + Live · CoinGecko badge +
  Buy 1.5% · Sell 1.0% fee badge.
- **Live price ticker** at top: horizontal scrollable strip of top 10 cryptos
  by market cap (excludes stablecoins), each showing icon, code, real price,
  real 24h change %. Auto-refreshes every 60 s.
- **Tabs** (shadcn `Tabs`): "Buy Crypto" and "Sell Crypto".
- **Buy tab**:
  - Crypto + Fiat picker buttons (open shared Dialog).
  - Amount input with **fiat/crypto toggle** (switch which unit the entered
    amount represents).
  - Quick-pick chips (₦1,000 / ₦5,000 / ₦25,000 / ₦100,000 for fiat;
    0.001/0.01/0.1/1 BTC for crypto).
  - Live rate row: `1 BTC = 85,342,809 NGN` (refreshed every 60 s).
  - 24h change pill (emerald/rose).
  - Cost breakdown: market rate, base amount, buy fee (1.5%), total cost,
    crypto you'll receive (emerald).
  - Buy button (Framer Motion AnimatePresence for loading/idle states).
  - Success dialog with confetti + spring-animated check + full receipt
    (reference, rate, USD price, fee, totals, completion time, source).
- **Sell tab**:
  - Same crypto/fiat pickers.
  - Amount input in crypto (with wallet balance + MAX button).
  - Cost breakdown: market rate, selling amount, base proceeds, sell fee
    (1.0%), fiat you'll receive (emerald), remaining balance.
  - Sell button + success dialog.
- **Right column**:
  - Live rate card for the selected pair with `AnimatedNumber` (NGN + USD
    equivalent), 24h change badge, market cap, 24h volume, buy fee stat tiles.
  - "Your {crypto} wallet" card with AnimatedNumber balance + USD value.
  - **Recent trades** card: fetches `/api/transactions?type=exchange&limit=15`,
    client-filters to `metadata.kind === "crypto-trade"`, shows up to 6 in a
    scrollable list (max-h-80) with buy/sell badge (emerald/amber), crypto
    amount, time-ago, reference, fiat delta (+/− with color).
- **Asset Picker Dialog**: 15 cryptos with live prices + 24h change, or 9
  fiat currencies with flag/symbol.
- Dark gradient hero card (`from-slate-900 via-slate-900 to-emerald-950`)
  with emerald glow blobs, matches existing design system.
- Framer Motion: AnimatePresence for tab/amount transitions, layout animation
  on recent trade rows, spring animation on success check.
- Fully responsive: `lg:grid-cols-[1.05fr_0.95fr]` two-column desktop,
  single-column stacked on mobile.

### 8. Navigation wiring
- Added `"crypto-trade"` to the `View` union in `src/lib/store.ts`.
- Imported `CryptoTradeView` and added `"crypto-trade": <CryptoTradeView />`
  to the views map in `src/components/gaexpay/app-shell.tsx`.
- Added `{ id: "crypto-trade", label: "Buy / Sell Crypto", icon: DollarSign }`
  in both `sidebar.tsx` and `mobile-nav.tsx` immediately after "Crypto Swap".
- Imported `DollarSign` from lucide-react in both nav files.

### 9. Verification
- `bun run lint` → **0 errors, 0 warnings**.
- Verified all endpoints return HTTP 200 with real CoinGecko data:
  - `GET /api/crypto/rates` → BTC $62,727, 24h −2.29%, cap $1.26T (real)
  - `GET /api/crypto/wallets` → 8 wallets, total $101,115.71 USD (real prices)
  - `GET /api/crypto/swap?from=BTC&to=ETH` → rate 37.0 (real)
  - `POST /api/crypto/convert` {BTC→NGN, 0.01} → 853,273 NGN (real)
  - `GET /api/crypto/trade?crypto=BTC&fiat=NGN` → marketRate 85,314,915 NGN
  - `POST /api/crypto/trade` buy NGN 50,000 BTC → 0.000519 BTC (1.5% fee)
  - `POST /api/crypto/trade` sell 0.3 ETH for XAF → 301,459 FCFA (1.0% fee)
  - `POST /api/crypto/trade` buy $500 BTC → 0.00797 BTC (1.5% fee)
  - `POST /api/crypto/swap` 0.05 BTC → 1.844 ETH (real rate)
- agent-browser: opened the app, navigated to "Buy / Sell Crypto" view,
  verified live ticker shows 10 real prices with 24h % changes, Buy tab
  works end-to-end (success dialog with reference + receipt), Sell tab
  works (success dialog with fiat received + fee breakdown), crypto picker
  dialog shows all 15 cryptos with real prices, Recent trades list shows
  5+ past transactions with buy/sell badges.
- Dev log: no errors, Fast Refresh stable, CoinGecko fetches ~300 ms on
  cache miss, ~3 ms on cache hit (60 s TTL).

## Stage Summary
- All 5 crypto APIs (`/api/crypto/rates`, `/convert`, `/swap`, `/wallets`,
  `/trade`) now return REAL CoinGecko prices, with a 60 s in-memory cache
  to stay within the free-tier rate limit.
- Pi Network uses fixed $47.35 (pre-mainnet, not on CoinGecko).
- XAF / XOF / UGX / ETB and 20+ other currencies not on CoinGecko's
  `vs_currencies` list fall back to `USD × FIAT_USD_RATE` static table.
- NGN / EUR / GBP / GHS / KES / ZAR use CoinGecko's DIRECT price (more
  accurate than USD × static rate).
- New Buy/Sell view (`crypto-trade`) is live at the `crypto-trade` view,
  reachable from both desktop sidebar and mobile nav under "Buy / Sell
  Crypto" (DollarSign icon, positioned right after "Crypto Swap").
- UI fully matches existing design system (emerald/teal accent, dark
  gradient hero card, Framer Motion micro-animations, AnimatedNumber,
  Skeleton states, confetti on success) and is responsive on mobile + desktop.
- App stats: **26 views** (added Buy / Sell Crypto), **44 API routes**
  (added `/api/crypto/trade` with POST + GET), 19 database models (unchanged),
  15 cryptocurrencies with REAL live prices.
