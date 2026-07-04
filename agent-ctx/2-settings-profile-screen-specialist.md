# Task 2 — Settings & Profile Screen Specialist

## Goal
Remove the black "N" mock overlay from the Settings screen, make "Change Photo" actually upload, persist every toggle to the DB, fix the cut-off Phone field, and eliminate all hardcoded mock data.

## Work Log
- **Black "N" overlay investigation**: Searched all of `src/components/gaexpay/` for any element rendering a black circle with "N" — zero matches in app code. Inspected `node_modules/next/dist/server/config-shared.d.ts` and confirmed the culprit is **Next.js 16's built-in dev indicator** (default position `bottom-left` — matches the screenshot). Disabled it via `devIndicators: false` in `next.config.ts`.
- **Schema**: Added 4 new User columns (`soundEnabled`, `vibrateEnabled`, `quietHoursEnabled`, `notificationVolume`) to `prisma/schema.prisma`; ran `bun run db:push` (synced + Prisma client regenerated).
- **API `/api/me`**: Added a `PATCH` handler for editable profile fields + `avatarUrl` (validated as `data:image/*` or `https://` URL, max 2 MB; empty/null clears). Added `avatar` to the `GET` select.
- **API `/api/settings` (NEW)**: `GET` returns the full settings blob; `PATCH` accepts any subset of 13 fields with strict whitelists (booleans / bounded ints / short strings). Unknown fields are silently ignored.
- **`settings-view.tsx` (full rewrite)**: Removed all mocks; every value flows from `/api/me`, `/api/settings`, or `/api/devices`. "Change Photo" opens a hidden `<input type="file">`, reads as data URL, instant preview, PATCH on success with rollback on failure. Save Changes PATCHes `/api/me` with spinner. Every toggle (MFA, biometric, push/email/SMS, sound, vibrate, quiet hours, volume, 2FA method, language, currency, theme) optimistically PATCHes the right endpoint. Devices tab "Revoke" actually calls `DELETE /api/devices`. Wrapped the whole panel in `pb-28 sm:pb-8` so the mobile bottom nav / FAB never obscures the last field. Replaced all `any` types with explicit `UserAccount` / `SettingsBlob` / `DeviceRow` interfaces.

## Files Edited
1. `next.config.ts` — `devIndicators: false`.
2. `prisma/schema.prisma` — 4 new columns.
3. `src/app/api/me/route.ts` — added PATCH + exposed avatar.
4. `src/app/api/settings/route.ts` — NEW route (GET + PATCH).
5. `src/components/gaexpay/views/settings-view.tsx` — full rewrite.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `curl GET /api/settings` → 200 with all 13 fields.
- `curl PATCH /api/settings {pushNotif:false}` → 200, persisted.
- `curl PATCH /api/me {firstName:"TestEdit", avatarUrl:"https://..."}` → 200, persisted.
- `curl PATCH /api/me {avatarUrl:""}` → 200, cleared.
- Demo user reset to `firstName:"Alex"`, empty avatar, `pushNotif:true` after testing.
- `tail dev.log` → clean compiles + 200 responses only.

## What the black "N" overlay turned out to be
Next.js 16's built-in dev indicator badge — a small black circular badge with the Next.js "N" logo, default position `bottom-left` (per `node_modules/next/dist/server/config-shared.d.ts`). Not an in-app element. Disabled via `devIndicators: false` in `next.config.ts`. The change takes effect on the next dev server restart.
