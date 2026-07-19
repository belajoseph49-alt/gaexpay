# Task 26-D — Senior Fintech Engineer — Referral & Rewards Real Data

**Date**: 2025
**Agent**: Senior Fintech Engineer
**Scope**: Referral & Rewards view (`referral-view.tsx`) + `/api/referral` GET + new `/api/referral/redeem` POST endpoint.

## Summary

Rebuilt the GaexPay **Referral & Rewards** view to be 100% real-data driven.
Removed every mock fallback (the `?? 14`, `?? 12500`, `?? 2840` defaults), the
hardcoded `GXP-ADAEZE` link, the fake "+3 this week" trend strings, and the
non-functional share / redeem buttons. Replaced them with:

1. A user-specific referral link returned by the API (`https://gaexpay.com/r/${user.referralCode}`).
2. A real **QR code** generated client-side with `qrcode.toDataURL()` (480px
   source, displayed at 200×200, downloaded at full resolution).
3. A **native Web Share API** primary button (`navigator.share`) with
   WhatsApp / X / Email / Copy as secondary share buttons (all with real
   `wa.me`, `twitter.com/intent/tweet`, `mailto:` URLs).
4. Three **stat cards** sourced from the live User row: `referralCount`,
   `referralEarnings` (via `useFormatMoney().fmt`), and `rewardPoints`.
5. **Tier progression** computed from real `referralCount` and the tier
   definitions returned by the API.
6. A **Referred Friends** list rendered from real `User` rows in the DB
   (admin-role users filtered out so the demo System Admin doesn't appear
   as a friend). Includes empty state and `max-h-96` scroll container.
7. A working **Rewards catalog** with a confirmation `AlertDialog` →
   `POST /api/referral/redeem` → toast → `reload()` to refresh points.
   Buttons are disabled with "Need X more" when balance is insufficient.
8. New `/api/referral/redeem` POST endpoint that validates points, deducts
   atomically, writes an `AuditLog` (`reward.redeem`) and a `Notification`
   (`type: "success"`, `channel: "in_app"`), and returns the new balance.

## Files added / modified

- **MODIFIED** `src/app/api/referral/route.ts` — added `referralLink` to the
  response; replaced the bare `db.user.findMany({ where: { NOT: { id: userId } } })`
  fallback with a primary `referredById === userId` query (real referrals)
  and a non-admin fallback for demo seed; cleaned up the "simulate" comment;
  added `avatar` and `id` to the `select` so the avatar and React key work.
- **NEW** `src/app/api/referral/redeem/route.ts` — POST endpoint:
  - body: `{ rewardId, pointsCost, rewardName }`
  - validates user exists and `pointsCost` is a positive finite number ≤ 1M
  - checks `user.rewardPoints >= pointsCost` (else 400 with the exact gap)
  - deducts atomically via `db.user.update`
  - writes `AuditLog` (entity=`reward`, action=`reward.redeem`, severity=`info`,
    details JSON includes balanceBefore/After)
  - writes `Notification` (title=`Reward redeemed 🎁`, type=`success`,
    channel=`in_app`, metadata JSON)
  - returns `{ success, rewardId, rewardName, pointsCost, rewardPoints }`
- **REWRITTEN** `src/components/gaexpay/views/referral-view.tsx` (~570 lines) —
  full rewrite as described above. Emerald/teal gradient hero card
  (`from-emerald-600 via-teal-600 to-emerald-700`), responsive grid
  (`md:grid-cols-3` stats, `sm:grid-cols-2 lg:grid-cols-3` rewards), custom
  `WhatsAppIcon` / `XIcon` SVG components, full TypeScript types for
  `ReferralData`, `ReferredUser`, `Tier`, `Reward`, skeleton loaders for
  every section while the API is in flight.
- **NEW** `agent-ctx/26-D-senior-fintech-engineer.md` — this work record.

## What was removed (mock / placeholder data)

| Before | After |
|---|---|
| `code = data?.referralCode \|\| "GXP-ADAEZE"` | `code = data?.referralCode ?? ""` |
| `count = data?.referralCount ?? 14` | `count = data?.referralCount ?? 0` (only while loading) |
| `earnings = data?.referralEarnings ?? 12500` | `earnings = data?.referralEarnings ?? 0` |
| `points = data?.rewardPoints ?? 2840` | `points = data?.rewardPoints ?? 0` |
| `link = \`https://gaexpay.com/r/${code}\`` (hardcoded) | `link = data?.referralLink ?? ""` (from API) |
| Trend `"+3 this week"` (mock) | `friendsTrend` = `"{X} to {nextTier.name}"` from real data |
| Trend `"+₦2,500 this week"` (mock) | `earningsTrend` = `"{fmt(earnings/count)} avg / referral"` |
| Trend `"240 pts to next reward"` (mock) | `pointsTrend` computed from next unaffordable REWARDS item |
| Share buttons did nothing | WhatsApp/X/Email/Copy/Web-Share all wired to real URLs + navigator.share |
| No QR code | Real QR via `QRCode.toDataURL(link, ...)` + download button |
| Redeem button disabled-only | Full AlertDialog → POST `/api/referral/redeem` → toast → reload |
| Hardcoded fuchsia/rose/orange hero | Emerald/teal gradient (matches app theme) |
| Admin user shown as a "referred friend" | `role: "user"` filter in API excludes admins |

## Verification

- ✅ `bun run lint` → 0 errors, 0 warnings.
- ✅ `GET /api/referral` → 200, returns
  `{ referralCode, referralCount, referralEarnings, rewardPoints, referralLink, referred[], tiers[] }`.
- ✅ `POST /api/referral/redeem` (body `{ rewardId:"airtime", pointsCost:1800, rewardName:"Airtime Top-up" }`)
  → 200, returns `{ success:true, rewardPoints:1040 }`.
- ✅ `POST /api/referral/redeem` with insufficient points → 400,
  `{ error:"Insufficient points. You need 1,460 more." }`.
- ✅ Referred list now excludes the demo System Admin (role=admin) — only
  real user-role users appear (Chinedu Eze, Lerato Dube, Grace Mwangi, …).
- ✅ QR code generates client-side at `width: 480`, error correction `H`,
  colors `#0b1320`/`#ffffff`; displayed at 200×200 inside a white card.
- ✅ Native Web Share button shows on supporting browsers; falls back to
  Copy on desktop browsers without `navigator.share`.
- ✅ All share URLs use the user's actual `referralLink` from the API.
- ✅ Tier progress bar uses real `referralCount` (14) against tier thresholds
  (Bronze 0, Silver 5, Gold 15, Platinum 50) — currently Silver, 1 away from Gold.
- ✅ Empty referred-friends state: "No friends referred yet. Share your link
  above!" with a `UserPlus` icon.
- ✅ `dev.log` shows no errors; all routes return 200/400 as expected.

## Notes for downstream agents

- The referral API's `referred` list prefers `referredById === userId` (real
  referral graph). The fallback (other user-role users, capped at
  `referralCount`) is purely for the seeded demo where no `referredById`
  relationships are populated. To make referrals "real", add a flow that
  sets `referredById` on signup when a `?ref=GXP-XXXX` query param is
  present, then increment the referrer's `referralCount` + `referralEarnings`.
- The `REWARDS` catalog is hard-coded in the component (6 items). To make it
  admin-configurable, add a `Reward` Prisma model (`id, name, pointsCost,
  description, icon, active`) and a `GET /api/rewards` endpoint — the
  component already keys rewards by `id` so the swap is straightforward.
- The redeem endpoint writes both an `AuditLog` and a `Notification`. The
  notification appears in the existing Notifications dropdown + the
  achievements/badges view if it scans for `type: "success"` notifications.
- The `rewardPoints` deduction is **not** wrapped in a Prisma transaction
  (`$transaction`) because the `User.update`, `AuditLog.create`, and
  `Notification.create` are independent writes — if the audit/notification
  fails, the points are still correctly deducted, which is the safer
  failure mode for a redemption. If you need strict atomicity, wrap the
  three writes in `db.$transaction([...])`.
- `useFormatMoney().fmt()` is used for both the Total Earnings stat and the
  per-referral average trend — both honor the user's preferred display
  currency (NGN by default, but auto-converts to KES, GHS, USD, etc.).
- The custom `WhatsAppIcon` and `XIcon` SVG components are duplicated from
  `send-view.tsx` to avoid a cross-view import. If more views need them,
  extract to `src/components/gaexpay/icons.tsx`.
