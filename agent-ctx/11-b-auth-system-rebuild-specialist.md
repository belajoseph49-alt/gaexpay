# Task 11-b — Auth System Rebuild Specialist

## Summary
Rebuilt the complete GaexPay auth system from scratch. Previous auth was a `sessionStorage("gxp_entered")` hack with no real auth.

## What was built
- 7 auth API endpoints under `/api/auth/*` (signup, login, logout, me, forgot-password, reset-password, demo)
- `auth-modal.tsx` — beautiful tabbed modal with personal/business account type selector, password strength meter, forgot-password flow, demo login
- `auth-client.ts` — client localStorage auth helpers
- Updated `api-auth.ts` so all existing APIs accept the `gxp_token` cookie
- Real auth gating in `page.tsx` via `/api/auth/me` (NO dev fallback)
- Topbar avatar dropdown: Settings, Identity (KYC/KYB), Sign out

## Prisma additions
- `User.resetToken String?` and `User.resetTokenExpiry DateTime?` (password reset)
- `User.accountType` and `User.permissions` already existed (Agent A)
- `BusinessProfile` model already existed (Agent A)

## Files created
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/demo/route.ts`
- `src/lib/auth-client.ts`
- `src/components/gaexpay/auth-modal.tsx`

## Files edited
- `prisma/schema.prisma` (resetToken fields)
- `src/lib/api-auth.ts` (cookie support in getAuthUserId)
- `src/components/gaexpay/landing.tsx` (onSignup prop)
- `src/app/page.tsx` (real auth gating)
- `src/components/gaexpay/topbar.tsx` (avatar dropdown)

## Gotchas for future agents
1. **Turbopack caches `@prisma/client` in `.next/dev/node_modules/@prisma/client-*/`**. After `bun run db:generate` (or schema changes), the running dev server may still hold the stale client. Fix: clear `.next/dev/node_modules/@prisma` AND restart the dev server (it doesn't auto-detect Prisma client changes).
2. **Dev server dies between bash tool calls** unless started with `setsid` + detached via `(... & )` subshell. Use:
   ```bash
   ( setsid ./node_modules/.bin/next dev -p 3000 > dev.log 2>&1 < /dev/null & ) ; sleep 12
   ```
3. **`BusinessProfile` uses `legalCountry`/`legalCity`** (not `country`/`city`). Watch out for this when querying.
4. **`/api/auth/me` has NO dev fallback** by design — it's the source of truth for real auth. Other API routes still have the demo fallback in dev via `getAuthUserId`.
5. **Cookie is named `gxp_token`**, httpOnly, sameSite=lax, secure in prod, 7-day maxAge.

## Test users created (in dev DB)
- `test@test.com` / password changed via reset-password flow (was `Test1234`, now `NewPass123`)
- `biz@test.com` / `Test1234` — business account with TestCorp BusinessProfile
- Demo user (`demo@gaexpay.com`) accessible via `/api/auth/demo`
