# Task 23-A — Senior Security Engineer — Auth, Validation, Rate Limiting

**Task ID**: 23-A
**Agent**: Senior Security Engineer
**Scope**: Authentication, authorization, password hashing, JWT sessions, input validation, rate limiting, error sanitization, security headers.

## Context Reviewed
- `src/lib/gaexpay.ts` — exports `DEMO_USER_ID = "cmqk4on7w0000l54pde5vpp0q"`, used as the hardcoded principal across 39 API routes.
- `prisma/schema.prisma` — `User.passwordHash` field exists but was never populated or used.
- `package.json` — `zod@4.0.2` and `next-auth@4.24.11` are installed; `zod` was unused.
- `src/lib/db.ts` — exports `db` (PrismaClient).
- Critical money-moving routes identified: `transfer`, `crypto/trade`, `crypto/cashout`, `crypto/swap`.

## Deliverables

### 1. `src/lib/auth.ts` — Password hashing + JWT tokens
- Uses Node built-in `crypto.scrypt` (no bcrypt/argon2 dep).
- Parameters: N=2^15, r=8, p=1, keylen=32, `maxmem=64MB` (bumped from the 32MB default because some OpenSSL builds reject the exact default — Bun in particular).
- `hashPassword(plain): Promise<string>` — returns `saltHex:hashHex` (16-byte salt + 32-byte derived key, both hex). Per-password salt defeats rainbow tables.
- `verifyPassword(plain, stored): Promise<boolean>` — constant-time comparison via `crypto.timingSafeEqual`; never throws (malformed `stored` → false).
- `generateToken(userId): string` — JWT-shaped HMAC-SHA256-signed token (`header.payload.sig`, base64url). 7-day TTL. Compatible with any standard JWT parser using the same secret.
- `verifyToken(token): { userId } | null` — recomputes the HMAC in constant time, checks expiry, never throws.
- Secret source: `process.env.GAEXPAY_JWT_SECRET`. In production, if missing/too short, THROWS (loud failure rather than signing with a public value). In dev, falls back to `"dev-secret-change-in-production"`.
- Re-exports `DEMO_USER_ID` for one-stop auth imports.

### 2. `src/lib/api-auth.ts` — API auth middleware
- `getAuthUserId(req): string | null` — auth precedence:
  1. `Authorization: Bearer <token>` — verified via `verifyToken`. In production, an invalid token = null (rejected).
  2. `x-gxp-user` header — dev mode ONLY, regex-validated.
  3. `DEMO_USER_ID` fallback — dev mode ONLY.
  4. In production: returns `null` (→ 401) if no valid token.
- `requireAuth(req): AuthResult` — discriminated union `{ userId } | { error: NextResponse }` for one-liner auth in route handlers.
- `getClientIdentifier(req, userId?)` — for rate-limit keying. Prefers authenticated user (`user:<id>`), then `x-forwarded-for` first hop, then `x-real-ip`, then `"anonymous"`.

### 3. `src/lib/validations.ts` — Zod schemas
- Primitives: `amountSchema` (positive, ≤1e9), `currencySchema` (3 uppercase letters), `referenceSchema` (alphanumeric via regex, ≤20 chars — `z.string().alphanumeric()` was removed in zod v4), `emailSchema`, `phoneSchema` (E.164 `+\d{10,15}`), `noteSchema`, `recipientSchema`.
- Composed: `transferSchema`, `tradeSchema`, `cashoutSchema`, `swapSchema` (added — was missing from the original spec but the swap route needs validation too).
- Type exports: `TransferInput`, `TradeInput`, `CashoutInput`, `SwapInput`.
- `formatZodError(err): string` — returns `"Invalid <path>: <message>"` for the first issue, keeping responses compact.

### 4. `src/lib/rate-limit.ts` — In-memory sliding-window limiter
- `Map<string, number[]>` of request timestamps per identifier.
- Sliding window: on each check, drop timestamps older than `windowMs` ago, then compare `fresh.length < limit`.
- `checkRateLimit` (read-only) + `recordRateLimit` (mutating) split for testability; `rateLimit` is the convenience check+record.
- Periodic GC every 5 minutes evicts empty buckets (`setInterval.unref()` so it doesn't keep the event loop alive).
- Pre-baked policies:
  - `GENERAL_LIMIT` — 100 / 15 min / identifier
  - `SENSITIVE_LIMIT` — 10 / 1 min / identifier (used by transfer, trade, cashout, swap)
  - `AUTH_LIMIT` — 5 / 1 min / identifier (for future login/OTP endpoints)
- Convenience wrappers: `rateLimitGeneral`, `rateLimitSensitive`, `rateLimitAuth`.

### 5. `src/lib/api-error.ts` — Error sanitization
- `apiError(message, status)` — clean JSON error response. Message is sent verbatim; callers must ensure no internals.
- `apiRateLimited(retryAfterMs)` — 429 with `Retry-After` header (rounded up to seconds per HTTP spec).
- `apiCatch(e: unknown)` — logs the full error server-side via `console.error`, then returns a generic 500 to the client. Special cases:
  - ZodError (has `issues` array) → 400 with first issue's path
  - HTTP-shaped errors (`{ status, message }`) — only allows 4xx statuses; 5xx always gets the generic message to prevent internal leakage.
- NEVER exposes `String(e)`, `e.message`, or stack traces to the client.

### 6. `src/middleware.ts` — Security headers
- Runs on every response (HTML, API JSON, RSC payloads).
- Headers attached:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.coingecko.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-XSS-Protection: 1; mode=block`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- Matcher excludes `_next/static`, `_next/image`, and the static PWA assets (icons, manifest, screenshots) to keep hot-reload fast.
- Verified live via `curl -I`: all 7 headers present on both `/` and `/api/*` responses.
- Note: Next.js 16 prints a deprecation warning suggesting `src/proxy.ts` over `src/middleware.ts`. The `middleware.ts` convention still works (just deprecated) and the spec required `src/middleware.ts`; kept as-is.

### 7. Critical API routes hardened

All four money-moving endpoints now:
- Reject unauthenticated requests in production (401).
- Validate input via zod (400 on bad shape/values).
- Apply the sensitive rate limit (429 after 10 req/min/identifier).
- Wrap all DB writes in `db.$transaction` for atomicity.
- Re-fetch wallets INSIDE the transaction (serializable isolation) before balance checks — prevents race-condition double-spends.
- Surface `HttpError` messages (4xx only) via `apiError`, all other errors via `apiCatch` (generic 500).
- Audit log written (transfer route writes `AuditLog` row with user, action, IP, user-agent).

#### `src/app/api/transfer/route.ts`
- Replaced `DEMO_USER_ID` with `getAuthUserId(req)`.
- Validates body with `transferSchema` (amount > 0 & ≤1e9, 3-letter currency, valid method enum, recipient name+account required, note ≤200 chars).
- Computes fee (bank: 0.5% capped at 5000, momo: 1%, wallet: 0).
- Inside `db.$transaction`: re-fetches wallet, checks `balance < amount + fee`, atomically decrements balance, creates Transaction record, creates AuditLog.
- Notification created outside the financial transaction (so a notification failure can't roll back the actual transfer).
- Response includes `walletBalanceAfter` so the UI can update without a refetch.

#### `src/app/api/crypto/trade/route.ts`
- Replaced `DEMO_USER_ID` with `getAuthUserId(req)` (both POST and GET).
- Validates body with `tradeSchema` (action enum, alphanumeric crypto 2-10 chars, 3-letter fiat, positive amount ≤1e9, amountType enum).
- Allow-lists crypto against `CRYPTOCURRENCIES` and fiat against `FIAT_USD_RATE`.
- Real CoinGecko prices, fee math (buy: 1.5%, sell: 1.0%), all wallet mutations in `db.$transaction`.
- GET (quote-only) also requires auth now — was previously anonymous, which leaked live wallet balances.

#### `src/app/api/crypto/cashout/route.ts`
- Replaced `DEMO_USER_ID` with `getAuthUserId(req)` (both POST and GET).
- Validates body with `cashoutSchema` (crypto 2-10 alphanumeric, 3-letter fiat, positive amount ≤1e9).
- 1% fee in crypto; user receives full market value of (amount − fee) in fiat.
- Inside `db.$transaction`: re-fetches crypto wallet, checks balance, decrements crypto, finds-or-creates fiat wallet, increments fiat, creates paired debit/credit Transaction records.
- GET (quote-only) also requires auth.

#### `src/app/api/crypto/swap/route.ts`
- Replaced `DEMO_USER_ID` with `getAuthUserId(req)` (both POST and GET).
- Validates body with `swapSchema` (fromCrypto/toCrypto 2-10 alphanumeric, positive amount ≤1e9).
- Rejects same-coin swaps.
- 0.3% swap fee + per-crypto network fee in USD.
- Inside `db.$transaction`: re-fetches source wallet, checks balance, debits source, finds-or-creates destination wallet, credits destination, creates Transaction record.
- GET (quote-only) also requires auth.

### 8. `.env` updated
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
GAEXPAY_JWT_SECRET=change-this-in-production-use-32-char-random-string
```
(The secret is intentionally a placeholder — production deploys must override it via the platform's secret manager. The `getSecret()` helper in `auth.ts` rejects secrets <16 chars in production.)

## Verification

### Lint
```
$ bun run lint
$ eslint .
```
**0 errors, 0 warnings.**

### Auth utility end-to-end test (Bun script)
- `hashPassword` produces `saltHex:hashHex` ✓
- `verifyPassword(correct)` → true ✓
- `verifyPassword(wrong)` → false ✓
- `generateToken` produces JWT-shaped 3-part string ✓
- `verifyToken(valid)` → `{ userId }` ✓
- `verifyToken(tampered)` → null ✓
- `verifyToken("garbage")` → null ✓

### Live API verification (curl against port 3000)
| Test | Expected | Got |
|------|----------|-----|
| `POST /api/transfer` valid body | 200 | 200 |
| `POST /api/transfer` negative amount | 400 | 400 |
| `POST /api/transfer` bad currency | 400 | 400 |
| `POST /api/transfer` bad method enum | 400 | 400 |
| `POST /api/transfer` amount > 1e9 | 400 | 400 |
| `POST /api/transfer` missing recipient | 400 | 400 |
| `POST /api/transfer` × 12 rapid | 429 after 10 | 429 after 10 ✓ |
| `POST /api/crypto/trade` BUY | 200 | 200 |
| `POST /api/crypto/trade` negative amount | 400 | 400 |
| `POST /api/crypto/cashout` valid | 200 | 200 |
| `POST /api/crypto/cashout` 9999 BTC | 400 "Insufficient" | 400 "Insufficient BTC balance" ✓ |
| `POST /api/crypto/swap` USDT→BTC | 200 | 200 |

### Security headers (curl -I)
All 7 security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, X-XSS-Protection, Permissions-Policy) are present on every response, both for HTML (`/`) and API JSON (`/api/me`).

### Dev log
- No errors, no runtime exceptions.
- Next.js 16 prints one deprecation warning suggesting `src/proxy.ts` over `src/middleware.ts` — `middleware.ts` still works, kept per spec.

## Stage Summary
- **Files created**: 6
  - `src/lib/auth.ts` — scrypt hashing + HMAC-SHA256 JWT tokens
  - `src/lib/api-auth.ts` — `getAuthUserId`, `requireAuth`, `getClientIdentifier`
  - `src/lib/validations.ts` — zod schemas + `formatZodError`
  - `src/lib/rate-limit.ts` — sliding-window in-memory limiter + 3 pre-baked policies
  - `src/lib/api-error.ts` — `apiError`, `apiRateLimited`, `apiCatch` (sanitized)
  - `src/middleware.ts` — security headers on every response
- **Files modified**: 5
  - `src/app/api/transfer/route.ts` — auth + validation + rate limit + transaction + audit log
  - `src/app/api/crypto/trade/route.ts` — auth + validation + rate limit + sanitized errors
  - `src/app/api/crypto/cashout/route.ts` — auth + validation + rate limit + sanitized errors
  - `src/app/api/crypto/swap/route.ts` — auth + validation + rate limit + sanitized errors
  - `.env` — added `GAEXPAY_JWT_SECRET`
- **Demo-mode compatibility**: In `NODE_ENV !== "production"`, requests without a Bearer token still resolve to `DEMO_USER_ID` so the seeded SPA continues to work during the migration to real NextAuth. In production, every protected endpoint returns 401 without a valid token.
- **What's NOT in scope** (deferred to a follow-up task):
  - Login/registration endpoints that actually call `hashPassword` and `generateToken` — the primitives are ready, the route doesn't exist yet.
  - Migrating the remaining 35 API routes off `DEMO_USER_ID` (transfer + 3 crypto routes are done; the rest are read-only and lower-risk).
  - NextAuth v4 wiring (the package is installed; we chose the lighter-weight custom JWT path because NextAuth requires a database adapter and the existing User model is already shaped for it).
  - Nonce-based CSP (current CSP uses `'unsafe-inline'` for scripts — needed for Next.js hydration; a follow-up should ship nonces).
