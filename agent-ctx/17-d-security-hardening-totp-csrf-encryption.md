# Task 17-d — Security Hardening Specialist (TOTP, CSRF, Encryption)

**Task ID**: 17-d
**Agent**: Security Hardening Specialist
**Scope**: TOTP 2FA (Google Authenticator), AES-256-GCM encryption for sensitive data, CSRF protection, session management, recovery codes.

## Files Created
- `src/lib/totp.ts` — TOTP (RFC 6238) implementation using node:crypto only. Generates 20-byte base32 secrets, otpauth:// URLs, 6-digit codes with ±1 window, and 10 recovery codes (XXXX-XXXX-XXXX format). SHA-256 hashing for recovery code storage.
- `src/lib/crypto.ts` — AES-256-GCM authenticated encryption. scrypt-derived 32-byte key with per-record salt. Format: `salt:iv:authTag:ciphertext` (hex). Includes `encrypt`, `decrypt`, `encryptJSON`, `decryptJSON`, `isEncrypted` helpers. Tamper-detection via GCM auth tag.
- `src/lib/csrf.ts` — Stateless signed CSRF tokens (HMAC-SHA256). Format: `payload.signature`. Constant-time comparison via `timingSafeEqual`. Includes `isCSRFExemptPath` + `isMutationMethod` helpers.
- `src/lib/csrf-client.ts` — Client-side fetch wrapper that auto-attaches `X-CSRF-Token` to mutation requests. Lazy-fetches token from `/api/csrf` on first mutation, caches for page lifetime, auto-retries on 403.
- `src/app/api/csrf/route.ts` — GET endpoint that issues a fresh CSRF token.
- `src/app/api/auth/2fa/setup/route.ts` — POST: generates TOTP secret + QR code (PNG data URL via `qrcode` lib) + 10 recovery codes. Stashes pending secret + hashed recovery codes on user.
- `src/app/api/auth/2fa/verify/route.ts` — POST: verifies a 6-digit TOTP code against the pending secret, promotes 2FA to active, writes audit log + notification.
- `src/app/api/auth/2fa/disable/route.ts` — POST: disables 2FA (requires valid TOTP code OR recovery code). Clears all 2FA fields, writes audit log + notification.
- `src/app/api/auth/login/verify-2fa/route.ts` — POST: completes a 2FA-challenged login. Verifies TOTP code against user's stored secret (or consumes a recovery code), issues JWT + sets gxp_token cookie. Rate-limited 5/min.
- `src/app/api/auth/sessions/route.ts` — GET (list sessions/devices) + DELETE (revoke one session or all others). Marks current session by matching UA + IP.

## Files Edited
- `prisma/schema.prisma` — Added `mfaRecoveryCodes String?` and `mfaPendingSecret String?` to User model.
- `src/middleware.ts` — Added CSRF enforcement for POST/PUT/PATCH/DELETE on `/api/*` (exempting `/api/auth/*` and `/api/csrf`). Switched to `runtime = "nodejs"` (Edge runtime can't load `node:crypto`).
- `src/app/api/auth/login/route.ts` — Returns `{ requires2FA: true, challenge: userId, methods: ["totp","recovery"], email }` instead of issuing a token when the user has 2FA enabled.
- `src/app/api/kyc/submit/route.ts` — Encrypts `documentNumber`, `address`, and `dob` at rest before persisting.
- `src/app/api/kyb/submit/route.ts` — Encrypts `registrationNumber`, `taxId`, `commercialRegistry`, `legalAddress`, and each director/beneficial owner's `idNumber` at rest.
- `src/components/gaexpay/views/security-view.tsx` — Added a full `TwoFactorSection` component: enable flow (QR + secret + recovery codes grid + verify input), disable flow (TOTP or recovery code), status badges, Copy All / Download buttons for recovery codes.
- `src/components/gaexpay/auth-modal.tsx` — Added a `2fa` flow that prompts for a TOTP code (or recovery code) after the login endpoint returns `requires2FA: true`. Tab toggle for TOTP vs recovery code entry.
- `src/components/gaexpay/app-shell.tsx` — Calls `installCSRFetch()` on mount to enable the auto-CSRF fetch wrapper for the whole SPA.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- TOTP end-to-end test (setup → verify → disable) all 200 OK.
- Login flow with 2FA: invalid code → 400, valid code → 200 with JWT + cookie.
- AES-256-GCM: 6 round-trip tests (ASCII, empty, unicode, long, JSON, special chars) + tamper-detection test all pass.
- CSRF: POST without token → 403, POST with valid token → reaches handler.
- Sessions endpoint: lists 3 demo devices with correct `isCurrent` flag.
- Dev log: clean (only the unrelated pre-existing `main.Product` errors from the marketplace module).

## Security Features Added
1. **TOTP 2FA** — RFC 6238 with 30s period, SHA-1, 6 digits, ±1 window. Compatible with Google Authenticator, Authy, 1Password.
2. **Recovery codes** — 10 single-use codes (XXXX-XXXX-XXXX), SHA-256 hashed at rest, consumed on use, low-count warning notification.
3. **2FA login challenge** — Password-verified users with 2FA get `{ requires2FA, challenge, methods }` instead of a token; complete via `/verify-2fa`.
4. **AES-256-GCM encryption** — Used on KYC documentNumber/address/dob and KYB registrationNumber/taxId/commercialRegistry/legalAddress/directors.idNumber/beneficialOwners.idNumber. Per-record salt, scrypt KDF, GCM auth tag.
5. **CSRF protection** — Stateless HMAC-signed tokens enforced in middleware for all `/api/*` mutations except `/api/auth/*` and `/api/csrf`. Client-side fetch wrapper auto-attaches tokens.
6. **Session management** — `/api/auth/sessions` lists devices with current-session flag; DELETE revokes one or all-others.
7. **Audit logs** — Every 2FA enable/disable, login 2FA failed/success, session revoke writes an AuditLog row.
8. **Notifications** — User gets in-app notifications on 2FA enable, 2FA disable, recovery code used (with remaining count).
