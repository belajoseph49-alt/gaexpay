# Task 26-F — Notifications System Overhaul

**Agent**: Senior Frontend Engineer
**Date**: 2026-06-19
**Scope**: Fix the entire notifications system — real-time updates, mobile/desktop display, per-notification mark-as-read, filtering, dedicated notifications view.

---

## Summary

Replaced the broken, narrow-scroll-area notifications popover with a fully-featured notification system: a polished popover panel on desktop, a near-fullscreen experience on mobile, and a new dedicated Notifications view. All filters, individual mark-as-read, deletion, real-time polling, and navigation to `actionUrl` now work end-to-end.

## Files Changed

### Backend
- **`src/app/api/notifications/route.ts`** — Rewrote GET / PATCH and added DELETE
  - GET now accepts `?filter=unread|type:<t>|bills`, `?type=<t>`, `?limit=<n>` (default 30, max 100)
  - PATCH supports both `{ markAllRead: true }` and `{ id, isRead }` for individual updates (validated)
  - **New** DELETE `?id=xxx` removes a single notification (with ownership check)
  - "bills" pseudo-filter matches title/message ILIKE `%bill%` OR metadata kind = bill/bills/bill-payment
  - **Note**: SQLite doesn't support `mode: "insensitive"` — removed it; `contains` already uses case-insensitive LIKE

### Shared lib (new)
- **`src/lib/notifications.ts`** — New shared helpers file
  - `NOTIF_ICONS`, `NOTIF_COLORS` — icon + Tailwind color class maps per type
  - `getNotifIcon()`, `getNotifColor()` — accessor helpers
  - `actionUrlToView()` — converts an `actionUrl` like `"/crypto-trade"` to a navigable `View`
  - `NOTIF_FILTERS` — shared filter-tab definitions (All | Unread | Transactions | Security | Bills | Promo)
  - `filterToQuery()` — builds the API query string for a given filter id

### State / Navigation
- **`src/lib/store.ts`** — Added `"notifications"` to the `View` union
- **`src/components/gaexpay/app-shell.tsx`** — Registered `NotificationsView` in the views map
- **`src/components/gaexpay/sidebar.tsx`** — Added `{ id: "notifications", label: "Notifications", icon: Bell }` under "Account"
- **`src/components/gaexpay/mobile-nav.tsx`** — Same entry added under "Account"

### Topbar (responsive bell behavior)
- **`src/components/gaexpay/topbar.tsx`** — Bell button behavior now depends on viewport:
  - **Desktop (≥1024px)**: opens a wider popover (`w-[min(92vw,420px)]`) that auto-reloads on open
  - **Mobile (<1024px)**: navigates to the full `notifications` view (no popover)
  - Bell badge uses `data.unread` from `/api/notifications?limit=1` (lighter payload)
  - Added `aria-label="Notifications"` for accessibility
  - Media-query subscription keeps the layout reactive to viewport resize

### Notifications panel (popover content)
- **`src/components/gaexpay/notifications-panel.tsx`** — Full rewrite
  - Replaced `ScrollArea` with plain `div` + `overflow-y-auto` + `WebkitOverflowScrolling: touch` (ScrollArea was unreliable on mobile)
  - Each notification now individually marks itself as read on click (optimistic update + PATCH single)
  - Clicking a notification navigates to its `actionUrl` via `actionUrlToView()` (was hardcoded to `transactions`)
  - Added **filter chips** row: All | Unread | Transactions | Security | Bills | Promo
  - Added **"View all notifications"** button at the bottom → navigates to full view
  - 30s polling refresh while the popover is open
  - "Mark all read" button disabled when unread count is 0

### Notifications view (new full-page center)
- **`src/components/gaexpay/views/notifications-view.tsx`** — New ~500-line view
  - **Filter tabs** with count badges: All | Unread | Transactions | Security | Bills | Promo
  - **Notification cards** with icon chip, title, message, timestamp (relative), unread dot, "Tap to view" hint
  - **Click** → mark as read (optimistic) + navigate to `actionUrl`
  - **Mark all as read** button (visible only when unread > 0)
  - **Delete per notification**:
    - Desktop: hover-revealed trash button (with confirm-on-toast)
    - Mobile: swipe-left gesture (Framer Motion `drag="x"`) revealing a destructive red background; release past 80px threshold deletes
  - **Empty state**: "You're all caught up!" with a green checkmark icon, plus contextual sub-message for filtered empty
  - **Real-time**: polls `/api/notifications` every 30s (both the active list and the count for every filter tab)
  - Optimistic UI on every mutation (mark-read, delete) — reverts on error
  - Skeletons during initial load
  - Mobile back chevron in header
  - Footer hint: "Auto-refreshes every 30 seconds · N items"
  - Framer Motion `AnimatePresence` with `popLayout` for smooth add/remove animations

## Bug Fixes (vs the old implementation)

| Old behavior | New behavior |
|---|---|
| Every notification click went to `transactions` | Click navigates to `actionUrl` (or no-op if not set) |
| Only "mark all read" — no per-item | Per-item mark-as-read on click + "mark all" button |
| `ScrollArea` broke on mobile | Plain `div` + `overflow-y-auto` + touch smoothing |
| Narrow `w-80` popover | `w-[min(92vw,420px)]` popover on desktop, full view on mobile |
| No filter UI in panel | Filter chips row in panel + filter tabs in full view |
| No way to delete | DELETE API + swipe-to-delete (mobile) + hover button (desktop) |
| No real-time updates | 30s polling in both panel and full view |
| Mobile bell opened cramped popover | Mobile bell navigates to full notifications view |
| Empty state was a generic Bell icon | Empty state is "You're all caught up!" with green checkmark |

## API Verification (curl-tested)

```bash
GET  /api/notifications?filter=unread&limit=10      → 200 ✅
GET  /api/notifications?filter=type:transaction     → 200 ✅
GET  /api/notifications?filter=type:security        → 200 ✅
GET  /api/notifications?filter=bills                → 200 ✅ (1 result: "Bill due reminder")
GET  /api/notifications?type=promo                  → 200 ✅ (legacy shortcut works)
GET  /api/notifications?limit=2                     → 200 ✅
PATCH /api/notifications { id, isRead: false }      → 200 ✅ (individual mark-read)
PATCH /api/notifications { markAllRead: true }      → 200 ✅ (mark-all-read still works)
DELETE /api/notifications?id=<nonexistent>          → 404 ✅ (correct ownership check)
```

## Existing Notification-Creating APIs (verified unchanged)

- ✅ `/api/transfer` — creates `type: "transaction"` notification
- ✅ `/api/pay-merchant` — creates `type: "transaction"` notification
- ✅ `/api/crypto/trade` — creates `type: "transaction"` notification
- ✅ `/api/crypto/cashout` — creates `type: "transaction"` notification with `actionUrl: "/transactions"`
- ✅ `/api/crypto/swap` — creates `type: "transaction"` notification
- ✅ `/api/budgets` — creates `type: "warning"` notifications for budget thresholds
- ✅ `/api/international-transfer` — creates `type: "transaction"` notification with `actionUrl`
- ✅ Achievement unlocks (client-side via `AchievementMonitor`) — still trigger notification UI

None of these were modified; their existing patterns continue to work with the new GET/PATCH/DELETE API.

## Lint & Runtime

- ✅ `bun run lint` — 0 errors, 0 warnings
- ✅ Dev server compiles cleanly
- ✅ All API endpoints respond 200 (except intentional 404 for non-existent DELETE)
- ✅ No runtime errors in dev.log after the SQLite `mode: "insensitive"` fix

## Design Notes

- Stuck with the established emerald/teal palette — destructive red only for the swipe-delete background and the unread badge (already used `bg-destructive` per existing topbar convention)
- Filter tab pills use `bg-muted/50` container with `bg-background` active state — matches the existing `Tabs` component visual language
- Unread cards get a subtle `ring-1 ring-primary/30 bg-primary/[0.03]` to draw the eye without being noisy
- Card hover reveals action buttons on desktop, swipe gesture on mobile — same UX as iOS Mail / Android Gmail
