# Task 19-B — Subagent (Security Center)

## What I built
- **API route** `src/app/api/security/overview/route.ts` (GET) — comprehensive Security Center overview endpoint.
- **View** `src/components/gaexpay/views/security-view.tsx` — full Security Center UI.
- Wired `"security"` into `src/lib/store.ts` View union, `app-shell.tsx`, `sidebar.tsx`, and `mobile-nav.tsx` (under "Account" section, between KYC and Achievements) using the `Shield` lucide icon.

## API contract (`/api/security/overview`)
Returns JSON with:
- `score` (0-100) + `grade` (A/B/C/D/F)
- `breakdown[]` — 6 weighted components (MFA 20, Biometric 15, Password age 15, Trusted devices 10, Fraud 20, KYC tier 20)
- `encryption` — AES-256-GCM, TLS 1.3, E2E, key rotation, HSM vault
- `compliance` — PCI-DSS L1, AML (FATF/NFIU), GDPR, ISO 27001, SOC 2 Type II
- `devices.list`, `devices.total/active/trusted`
- `blockedLoginAttempts` (count of `suspicious_login_blocked` audit logs in last 30d)
- `fraudAlerts.list/total/recent` (recent = last 30 days)
- `securityEvents[]` — last 12 audit logs where entity ∈ {security, auth (for demo user)}
- `recommendations[]` — dynamically generated based on posture (enable MFA / biometric / change pwd / upgrade KYC / review devices / review fraud)
- `lastLoginAt`, `lastPasswordChange`, `passwordAgeDays`, `mfaEnabled`, `biometricEnabled`, `twoFactorMethod`, `kycTier`

## UI sections (in order)
1. Header — "Security Center" + Refresh button
2. Hero gradient card — large circular SVG gauge (220px) with animated ring + grade letter + score /100; right column: title copy, encryption pills, 4 quick-stat pills (Active Devices / Blocked Logins / Fraud Alerts / KYC Tier)
3. Score Breakdown — 6 cards each showing label, points/max, status badge (pass/warn/fail), Progress bar
4. Protection Layers grid — 6 feature cards (E2E Encryption, 2FA, Biometric, PCI-DSS, AML, AI Fraud Detection) with active/disabled badges + card-lift hover
5. Two-column: Active Devices (with revoke button calling DELETE /api/devices?id=...) | Security Activity timeline (12 events with vertical timeline rail, severity badges)
6. Two-column: Fraud Alerts (risk-score bar + amount) | Recommendations (severity-colored cards with action links)
7. Account meta cards — Last Login / Password Age / 2FA Method / Encrypted Channel
8. Compliance footer — PCI-DSS / AML / GDPR / ISO 27001 / SOC 2 certifications

## Design system adherence
- Emerald/teal accent gradient hero (changes color by grade: emerald A → teal B → amber C → orange D → rose F)
- Framer Motion entrance animations (opacity/y) on every section
- `AnimatedNumber` used for the score + stat pills
- Skeleton loading state mirroring the final layout
- Responsive `lg:grid-cols-2` / `lg:grid-cols-3` / `lg:grid-cols-4` patterns
- Card-lift hover (`hover:-translate-y-0.5 hover:shadow-md`)
- `max-h-[420px] overflow-y-auto` for long lists
- All lucide-react icons, no custom SVG except the score gauge

## Verification
- ✅ `bun run lint` — 0 errors, 0 warnings
- ✅ `GET /api/security/overview` — HTTP 200, ~40ms render, score=88 grade=B
- ✅ Dev log clean (no runtime errors, Fast Refresh stable)
- ✅ Pre-existing routes still 200 (wallets, transactions, me, etc.)

## Files touched
- `src/app/api/security/overview/route.ts` (NEW, ~340 LOC)
- `src/components/gaexpay/views/security-view.tsx` (NEW, ~620 LOC)
- `src/lib/store.ts` — added `"security"` to View union
- `src/components/gaexpay/app-shell.tsx` — import + views map entry
- `src/components/gaexpay/sidebar.tsx` — added Shield import + nav item under Account
- `src/components/gaexpay/mobile-nav.tsx` — added Shield import + nav item under Account
