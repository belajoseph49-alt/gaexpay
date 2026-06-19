# Task 22-A — Real Database-Backed Crypto Wallets

**Agent**: Senior Backend Engineer (Crypto Wallets DB Migration)
**Task ID**: 22-A
**Scope**: Replace hardcoded `DEMO_CRYPTO_WALLETS` array with real DB-backed crypto wallets; make cashout/swap/trade routes check real `Wallet` balances and use atomic `db.$transaction` blocks.

## Context Reviewed
- `prisma/schema.prisma` — `Wallet` model already supports any currency code; `@@unique([userId, currency, type])` lets us store crypto wallets of `type="crypto"` per (user, currency) without colliding with fiat wallets of `type="primary"`.
- `src/lib/gaexpay.ts` — `DEMO_USER_ID = "cmqk4on7w0000l54pde5vpp0q"`.
- `src/lib/coingecko.ts` — `getCryptoRates()` (60s in-memory cache, single-flight) returns `{ rates, priceMap }`; `FIAT_USD_RATE` provides the static USD-per-fiat table for currencies CoinGecko doesn't natively return (XAF, XOF, UGX, …).
- Previous agent context (`/agent-ctx/20-C-crypto-cashout.md`, `20-A-real-crypto-buy-sell.md`) confirmed the cashout/swap/trade routes were using in-memory `DEMO_CRYPTO_BALANCES` maps and a hardcoded `DEMO_CRYPTO_WALLETS` array — neither reflected in the `Wallet` table.

## Deliverables

### 1. `prisma/seed-crypto-wallets.ts` — idempotent seed script
- Creates 8 crypto `Wallet` rows for the demo user: BTC (0.04582), ETH (1.2847), USDT (2850.50), USDC (1240.00), BNB (3.582), SOL (12.45), PI (1850.0), TRX (4580.0).
- Each wallet: `userId=DEMO_USER_ID`, `currency=crypto code`, `balance=amount`, `ledgerBalance=amount`, `type="crypto"`, `label="Crypto Wallet"`, `isDefault=false`, `status="active"`.
- Uses `findFirst` per `(userId, currency, type="crypto")` before `create` — re-running is a no-op (no duplicates, no overwrites).
- Ran successfully: `bun run prisma/seed-crypto-wallets.ts` → 8 wallets created on first run; all 8 marked "✓ exists" on the second run.

### 2. `src/app/api/crypto/wallets/route.ts` — fully rewritten
- Removed `DEMO_CRYPTO_WALLETS` array and `NGN_PER_USD` constant entirely.
- Queries `db.wallet.findMany({ where: { userId: DEMO_USER_ID, type: "crypto" } })`.
- **Self-bootstrapping**: if the DB has no crypto wallets for the demo user, the route seeds them inline via `createMany` on the first GET request — so the system is always populated even on a fresh DB.
- For each wallet, fetches the real price from `getCryptoRates()` (60s CoinGecko cache).
- Generates a **deterministic deposit address** per crypto using `SHA-256(userId + ":" + currency)`, formatted with the correct per-chain prefix:
  - BTC → `bc1q…` (38 hex chars)
  - ETH / USDT / USDC / DAI / BUSD / MATIC → `0x…` (40 hex chars)
  - BNB → `bnb1…`, SOL → 44-char base58-ish, TRX → `T…` (33 uppercase hex), PI → `pi_network_…` (12 hex chars), XRP → `r…`, LTC → `ltc1q…`, ADA → `addr1q…`, DOT → 46-char
- Same input always produces the same address (stable across reloads).
- Computes `valueUSD = balance × realPrice` and `valueNGN = valueUSD × FIAT_USD_RATE.NGN`.
- Returns the same shape as before: `{ wallets: [...], totalValueUSD, totalValueNGN, source: "CoinGecko" }` (backward-compatible).

### 3. `src/app/api/crypto/cashout/route.ts` — checks real balance + atomic
- Removed `DEMO_CRYPTO_BALANCES` in-memory map and `DEMO_CRYPTO_CODES` constant.
- POST handler wraps all wallet reads + writes + transaction records in `db.$transaction(async (tx) => { … })`:
  1. Re-fetch the crypto wallet inside the transaction (serializable isolation on SQLite); return `400 "Insufficient {crypto} balance (available: X)"` if `balance < amount`, or `400 "You don't have a {crypto} wallet to cash out from"` if missing.
  2. Decrement the crypto wallet by `numericAmount`.
  3. Find-or-create the destination fiat wallet.
  4. Credit the fiat wallet by `fiatCredited`.
  5. Create paired debit + credit `Transaction` records, pre-generating both references so each one's metadata includes the other's `pairedTxRef`.
- Custom `HttpError` class lets the transaction throw an HTTP status that the outer catch translates into the proper JSON 4xx response (and rolls back the transaction).
- Notifications are written **outside** the transaction so a notification failure can't roll back a successful cashout.
- GET quote endpoint now reads `availableBalance` from the DB instead of the old in-memory constant.

### 4. `src/app/api/crypto/swap/route.ts` — checks real balance + atomic
- POST handler wraps everything in `db.$transaction`:
  1. Re-fetch the `fromCrypto` wallet; return `400 "Insufficient {from} balance (available: X)"` if `balance < amount`, or `400 "You don't have a {from} wallet to swap from"` if missing.
  2. Find-or-create the `toCrypto` wallet (so swapping into a crypto the user doesn't yet hold works seamlessly).
  3. Decrement the source wallet by `amount`, credit the destination wallet by `convertedAmount` (after 0.3% swap fee + network fee).
  4. Create the exchange `Transaction` record with full metadata (`fromWalletId`, `toWalletId`, `remainingFromBalance`, `newToBalance`, real CoinGecko prices).
- Returns the new `remainingFromBalance` and `newToBalance` in the response for instant UI updates.
- GET quote endpoint unchanged (price-only, no balance check needed).

### 5. `src/app/api/crypto/trade/route.ts` — checks real balance + atomic
- POST handler wraps everything in `db.$transaction`:
  1. Find-or-create the fiat wallet (primary) AND the crypto wallet (`type="crypto"`).
  2. **BUY**: check `fiatWallet.balance >= totalFiat` (base + 1.5% fee), return `400 "Insufficient {fiat} balance (available: X, required: Y)"` if not. Debit fiat by `totalFiat`, credit crypto by `totalCrypto`.
  3. **SELL**: check `cryptoWallet.balance >= totalCrypto`, return `400 "Insufficient {crypto} balance (available: X, required: Y)"` if not. Debit crypto by `totalCrypto`, credit fiat by `totalFiat` (after 1.0% fee).
  4. Create the exchange `Transaction` record with `fiatBalanceAfter`, `cryptoBalanceAfter`, both `walletId`s in metadata.
- GET quote endpoint now also returns live `availableFiatBalance` and `availableCryptoBalance` from the DB so the UI's "available to trade" reflects prior trades.

## Verification

### Lint
```
$ bun run lint
$ eslint .
```
→ **0 errors, 0 warnings** (exit 0).

### Seed script (idempotency verified)
```
$ bun run prisma/seed-crypto-wallets.ts
Seeding crypto wallets for demo user cmqk4on7w0000l54pde5vpp0q
  BTC   + created (balance: 0.04582)
  ETH   + created (balance: 1.2847)
  USDT  + created (balance: 2850.5)
  USDC  + created (balance: 1240)
  BNB   + created (balance: 3.582)
  SOL   + created (balance: 12.45)
  PI    + created (balance: 1850)
  TRX   + created (balance: 4580)
Done. 8 crypto wallets present for demo user.
```
Second run: all 8 marked "✓ exists".

### End-to-end API tests (against live dev server on port 3000)

| Endpoint | Input | Result |
|---|---|---|
| `GET /api/crypto/wallets` | — | 200: 8 wallets, real CoinGecko prices, deterministic addresses, USD+NGN portfolio values |
| `POST /api/crypto/cashout` | `{BTC→NGN, 1.0}` | **400** `{"error":"Insufficient BTC balance (available: 0.04582)"}` |
| `POST /api/crypto/cashout` | `{BTC→NGN, 0.001}` | 200: `cryptoDebited: 0.001, fiatCredited: 84098.90 NGN, remainingCryptoBalance: 0.04482` |
| `GET /api/crypto/cashout?crypto=BTC&fiat=NGN` | — | 200: `availableBalance: 0.04482` (live DB balance) |
| `POST /api/crypto/swap` | `{BTC→ETH, 100}` | **400** `{"error":"Insufficient BTC balance (available: 0.04482)"}` |
| `POST /api/crypto/swap` | `{BTC→ETH, 0.001}` | 200: `convertedAmount: 0.0368651 ETH, remainingFromBalance: 0.04382, newToBalance: 1.3215651` |
| `POST /api/crypto/swap` | `{XRP→BTC, 10}` | **400** `{"error":"You don't have a XRP wallet to swap from"}` |
| `POST /api/crypto/trade` | `{buy BTC, 100 BTC, NGN}` | **400** `{"error":"Insufficient NGN balance (available: 1276206.66, required: 8621285561)"}` |
| `POST /api/crypto/trade` | `{sell BTC, 100 BTC, NGN}` | **400** `{"error":"Insufficient BTC balance (available: 0.04382, required: 100)"}` |
| `POST /api/crypto/trade` | `{buy BTC, 100000 NGN, NGN}` | 200: `totalFiat: 101500, totalCrypto: 0.0011773, fiatBalanceAfter: 1174706.66, cryptoBalanceAfter: 0.0449973` |
| `POST /api/crypto/trade` | `{sell BTC, 0.001 BTC, NGN}` | 200: `totalCrypto: 0.001, totalFiat: 84089.39, fiatBalanceAfter: 1258796.04, cryptoBalanceAfter: 0.0439973` |
| `GET /api/crypto/trade?crypto=BTC&fiat=NGN` | — | 200: now includes `availableFiatBalance: 1258796.04` + `availableCryptoBalance: 0.0439973` from DB |

Re-calling `GET /api/crypto/wallets` after the trades confirms BTC balance = `0.04399731861776107` and ETH balance = `1.321565102067428` — exactly the post-trade/post-swap values persisted in the DB.

### Dev log
- No 500 errors, no compile errors, no warnings across any crypto route during testing.
- All requests returned either 200 (success) or 400 (validation error — by design).

## Stage Summary

- **Files created**: 1 — `prisma/seed-crypto-wallets.ts`
- **Files rewritten**: 4 — `src/app/api/crypto/wallets/route.ts`, `src/app/api/crypto/cashout/route.ts`, `src/app/api/crypto/swap/route.ts`, `src/app/api/crypto/trade/route.ts`
- **Behavior change**: All 4 crypto APIs now read + write the `Wallet` table instead of relying on hardcoded constants or in-memory maps. Cashout/swap/trade are atomic via `db.$transaction`, with descriptive 4xx errors on insufficient balance and auto-creation of missing destination wallets (fiat wallet on cashout, toCrypto wallet on swap, both wallets on trade).
- **DB state**: Demo user now has 8 crypto `Wallet` rows (`type="crypto"`) persisted alongside the existing 8 fiat wallets.
- **Backward compatibility**: All response shapes are backward-compatible (only additive new fields like `remainingFromBalance`, `newToBalance`, `fiatBalanceAfter`, `cryptoBalanceAfter`, `availableFiatBalance`, `availableCryptoBalance`) — no frontend changes required.
- **Resilience**: A failure anywhere inside the transaction rolls back the entire operation — no orphan debits, no missing credits, no half-completed swaps.
