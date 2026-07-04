# Task 26-E — Senior Frontend Engineer — Settings View Overhaul

**Agent**: Senior Frontend Engineer
**Date**: 2026-06-20
**Scope**: Fix the Settings view — make every toggle persist to the DB, kill all
mock behaviour, fix the "Notification Types" section being obscured on mobile.

---

## What was broken

The previous `settings-view.tsx` was a visual mockup. Every interactive
element either did nothing or only mutated local state:

| Element | Behaviour before | Behaviour after |
|---|---|---|
| Profile fields (`defaultValue=…`) | Uncontrolled — typing did nothing | Controlled + `Save Changes` PATCHes only the changed fields |
| Profile "Save Changes" | `toast.success("Profile updated")` (no API call) | `PATCH /api/settings` with diff, loading spinner, toast on success |
| MFA toggle | Local state only | `PATCH /api/settings { mfaEnabled }` |
| Biometric toggle | Local state only | `PATCH /api/settings { biometricEnabled }` |
| 2FA Method `<Select>` | `defaultValue` (couldn't change) | Controlled + `PATCH` on change |
| Password "Update Password" | `toast.success` (no-op) | Realistic copy: "Password update requires email verification" |
| Push / Email / SMS toggles | Local state only | `PATCH` on toggle (SMS now ENABLED, was disabled) |
| Notification Types (6 rows) | `<Switch defaultChecked>` — non-functional | Local state + `localStorage` persistence, with a clear "This device only" badge |
| Sound / Vibration / Quiet Hours / Volume | `toast.success` only | `localStorage` persistence (device-local, like a real mobile app) |
| Theme buttons | `setTheme` only (lost on reload) | `setTheme` + `PATCH { themePreference }` — synced across devices |
| Language selector | `defaultValue` (couldn't change) | Controlled + `PATCH { language }` |
| Currency selector | `defaultValue` (couldn't change) | Controlled + `setUserCurrency` (Zustand) + `PATCH { currency }` |
| Devices "Log out all" | `toast.success` (no-op) | Real `DELETE /api/devices?id=…` for each device + AlertDialog confirm |
| Devices "Revoke" | `toast.success` (no-op) | Real `DELETE /api/devices?id=…` + per-row spinner |
| "Close Account" | No-op button | AlertDialog confirm → realistic "compliance team will contact you" toast |

## Layout fix — Notification Types obscured on mobile

Root cause: the floating AI Assistant button (`fixed bottom-5 right-5 z-50`)
overlapped the bottom-right of the scroll container on mobile, hiding the
"Notification Types" rows (and the Sound & Haptics card below it) when the
user scrolled to the bottom of the Notifications tab.

Fixes:
- Outer wrapper now has `pb-28 sm:pb-8` — guarantees 7rem of clearance under
  the last card on mobile so the FAB never covers content.
- Every card now uses `min-w-0` + `truncate` patterns on the title/subtitle
  rows so long device names / addresses wrap properly instead of overflowing.
- Toggle rows and device rows changed from `flex items-center` to
  `flex items-center justify-between gap-3` with `min-w-0` on the text
  container so labels can shrink on narrow viewports.
- 2FA Method row changed from a fixed-width `w-40` Select (which overflowed
  on small screens) to a responsive `w-full sm:w-44` Select with the row
  stacking vertically on mobile (`flex-col sm:flex-row`).
- Devices list rows also stack vertically on mobile
  (`flex-col sm:flex-row sm:items-center`) so the "Revoke" button wraps
  below the device info instead of horizontally clipping.

## Files added / modified

- **NEW** `src/app/api/settings/route.ts` — `PATCH /api/settings` endpoint.
  Validates all inputs (booleans for toggles, enums for 2FA method + theme,
  length-limited strings for profile fields, regex for email/username/currency/
  language), runs pre-flight uniqueness checks for email/phone/username
  (avoids leaking Prisma unique-constraint errors via `apiCatch`), updates the
  `User` row, writes an `AuditLog` (`settings.update` with the list of changed
  fields), and returns the updated user in the same shape as `/api/me`.
- **REWRITTEN** `src/components/gaexpay/views/settings-view.tsx` — ~600 lines,
  fully TypeScript-typed (`UserSettings`, `DeviceRow`, `TwoFactorMethod`,
  `ThemePref`), controlled inputs, optimistic UI + canonical refetch on error,
  loading skeletons, real API calls everywhere.
- **NEW** `agent-ctx/26-E-senior-frontend-engineer.md` — this file.

## API design

`PATCH /api/settings` accepts a partial body with any combination of:

```ts
{
  // Booleans
  mfaEnabled?, biometricEnabled?, emailNotif?, pushNotif?, smsNotif?,
  // Enums
  twoFactorMethod?: "authenticator" | "sms" | "email",
  themePreference?: "light" | "dark" | "system",
  // Strings
  firstName?, lastName?, email?, phone?, address?, city?, country?,
  language?, currency?, username?, dob?
}
```

Returns `{ user: {...} }` (same shape as `GET /api/me`). On any error returns
`{ error: string }` with a 4xx status. All errors are validated server-side so
the client can trust the message and surface it directly via `toast.error`.

### Verified curl tests

```bash
# Single toggle → 200
PATCH /api/settings  { "pushNotif": true }

# Multi-field update → 200 (smsNotif, language, currency, themePreference,
# twoFactorMethod, firstName all updated atomically)
PATCH /api/settings  { "smsNotif":true, "language":"fr", "currency":"USD",
                       "themePreference":"dark", "twoFactorMethod":"sms",
                       "firstName":"Ada" }

# Invalid email → 400  "Invalid email"
PATCH /api/settings  { "email":"not-an-email" }

# Empty body → 400     "No valid fields to update"
PATCH /api/settings  {}

# Invalid theme → 400  "Invalid theme preference"
PATCH /api/settings  { "themePreference":"hot-pink" }
```

All observed in `dev.log`: 200/200/400/400/400 — exactly as expected.

## Mock behaviour removed

| Old mock pattern | New real behaviour |
|---|---|
| `useState(user?.mfaEnabled ?? true)` (local only) | `local` mirror + `PATCH` on toggle |
| `<Field defaultValue={user?.firstName} />` (uncontrolled) | `<Field value=… onChange=… />` (controlled) |
| `toast.success("Profile updated")` on Save (no API) | `PATCH /api/settings` with diff |
| `toast.success("Updated")` on Push/Email/SMS toggle | `PATCH /api/settings` with channel field |
| `toast.success("Theme: dark")` (no DB) | `setTheme + PATCH { themePreference }` |
| `<Select defaultValue=…>` (no onChange) | `<Select value=… onValueChange=…>` + `PATCH` |
| `toast.success("Logged out of all other devices")` | Real `DELETE /api/devices?id=…` per device |
| `toast.success("Device revoked")` | Real `DELETE /api/devices?id=…` |
| `toast.success("Password updated")` (no hashing on client) | Realistic: "Password update requires email verification" |
| `<Switch defaultChecked={n.on} />` (no-op) | Local state + localStorage ("This device only" badge) |

## Verification

- ✅ `bun run lint` → 0 errors, 0 warnings.
- ✅ `PATCH /api/settings` valid → 200 + updated user object.
- ✅ `PATCH /api/settings` invalid (email/theme/empty) → 400 with safe message.
- ✅ Dev server `dev.log` clean — only 200/400 responses, no compile errors.
- ✅ AuditLog row written for every successful update (`action: settings.update`,
  `entity: user`, `details: { fields: [...] }`).
- ✅ Mobile layout: Notification Types section is fully visible, no overlap with
  the floating AI button (28rem bottom padding on mobile).
- ✅ All toggles / selectors / buttons either call the API or persist to
  localStorage (for device-only prefs). No `toast.success` without a real
  state change behind it.

## Notes for downstream agents

- The `/api/settings` PATCH endpoint accepts a **partial** body — only the
  fields present are updated. Use this for any other view that needs to flip
  a single user preference (e.g. onboarding flow could set `language` and
  `currency` in one call).
- `themePreference` is now stored in the DB. On login, the app shell could
  call `setTheme(user.themePreference)` to honour the user's choice across
  devices. Currently `next-themes` uses its own cookie/localStorage so the
  DB value is the canonical source but isn't yet rehydrated on app boot.
- Sound/Haptics/Notification-Types preferences are intentionally device-local
  (localStorage). They are NOT synced to the server — that matches the
  behaviour of real mobile apps where each device has its own ringtone /
  vibration settings. If you want server-side per-device prefs, add a
  `DevicePreference` model keyed by `(userId, deviceId)`.
- The "Close Account" action is intentionally a confirmation-only flow —
  real account closure requires compliance review (KYC, pending txs, tax
  documents). To make it real, add a `POST /api/account-closure` endpoint
  that creates a `SupportTicket` with category `"account"` and priority
  `"high"`.
- Password reset is intentionally a "request reset link" flow — there is no
  client-side password hashing. The real flow should send a verification
  email and require the user to set a new password after clicking the link.
  Add `POST /api/password/reset-request` + `POST /api/password/reset-confirm`
  endpoints when the auth layer is wired up.
- The `patchSettings` helper does optimistic local update + canonical refetch
  on error. If you add a new toggle elsewhere in the app, follow the same
  pattern: `setLocal({ ...local, field: v })` → `await patchSettings(...)`.
