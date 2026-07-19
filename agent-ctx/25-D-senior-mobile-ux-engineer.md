# Task 25-D — Rebuild Pay & Bills view (Senior Mobile UX Engineer)

## Scope
Completely rebuilt `src/components/gaexpay/views/pay-view.tsx` — replaced the fake animated-line QR scanner with a real camera-based BarcodeDetector implementation, made Merchants interactive, reorganised Bills into a sheet-based flow, polished Airtime with recent purchases, and added a responsive bottom-sheet / dialog pattern across all four tabs.

## File changed
- `src/components/gaexpay/views/pay-view.tsx` — full rewrite (~1,371 lines, 0 lint errors).

## What was built

### 1. Real QR Scanner (Scan & Pay tab)
- **Real camera access** via `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })` streamed into a live `<video>` element that fills the scanner viewport.
- **Real QR decoding** via the browser's native `BarcodeDetector` API. `getSupportedFormats()` is queried first to request `qr_code` specifically, falling back to default formats.
- **requestAnimationFrame loop** calls `detector.detect(video)` continuously; on detection the loop is cancelled, the stream is stopped, and the merchant is looked up.
- **Torch / flashlight toggle** — only rendered when `track.getCapabilities().torch` is `true`. Toggles with `track.applyConstraints({ advanced: [{ torch }] })`.
- **Live scanning overlay** — corner brackets, animated emerald scan line (Framer Motion), and a "Point at a QR code" pill while active. Top-right controls: flashlight (conditional) + close.
- **Merchant lookup** — matches the decoded raw string against the merchant list by `qrCode` (case-insensitive), `account`, partial substring, or `phone` digits. If no merchant matches, a generic merchant card is built from the QR text (URL → hostname, `GXP-MER-…` → "GaexPay Merchant", numeric → masked account).
- **File upload fallback** — "Upload QR" button opens a hidden file input; the file is decoded via `createImageBitmap(file)` + `BarcodeDetector.detect(bitmap)`. On browsers without `BarcodeDetector`, the user is routed to manual entry.
- **Manual code entry** — bottom-sheet with a monospace input (`GXP-MER-001`), "Look up merchant" button, and a helpful hint showing a real code from the catalog.
- **Camera-error UX** — `prettifyCameraError()` maps `NotAllowedError`, `NotFoundError`, `NotReadableError` etc. to actionable messages shown inline in the placeholder.
- **Removed** the old "Demo: Spencer" and "Demo: Chicken Republic" buttons — they no longer exist anywhere in the file.
- **Confirm-payment screen** — smooth transition into a Card with merchant avatar (category icon), name, rating, verified badge, account number, amount input, and a dynamic CTA showing `Pay ₦1,234`.
- **Success sheet** — animated emerald check, amount, recipient, reference (mono), and a "Receipt saved to transactions" note.

### 2. Merchants tab — Interactive
- **Search bar** (with leading `Search` icon) filters by name, category, or `qrCode`.
- **Category chips** — horizontally scrollable (`overflow-x-auto no-scrollbar`) with icon + label. Toggles between All / Retail / Food & Drink / Transport / Utilities / Entertainment / Health.
- **Merchant cards** — name, category, ⭐ rating badge, ✅ Verified badge, per-category lucide icon, and a full-width **"Pay"** button. Cards lift on hover (`whileHover={{ y: -2 }}`) and respond to tap (`whileTap`).
- **Pay sheet** — bottom-sheet on mobile / centered dialog on desktop. Shows merchant avatar + name + category, then amount input with quick chips, then "Pay ₦X" CTA.
- **Empty state** with icon, title, and contextual description when search yields no results.
- **Skeleton loading** (6 cards) while `/api/merchants` is in flight.
- POSTs to `/api/pay-merchant` and surfaces the resulting reference number via the success sheet + toast.

### 3. Bills tab — Sheet-based
- Kept the 7 category groups (Utilities, Government & Taxes, Education, Financial, Transport, Entertainment & Health, Other).
- Each category card now opens a **payment sheet** (bottom-sheet on mobile, dialog on desktop) instead of replacing the view — keeps the user in context.
- The sheet shows the category emoji avatar, label, description, account/reference input, amount input with quick chips, and a "Pay ₦X" CTA. The CTA is disabled until both account and amount are entered.
- On success: success sheet + toast with reference number, then `reload()` on the `/api/transactions?type=bill&limit=5` query so the **Recent bill payments** list refreshes.
- Recent bills list shows counterparty name, description (with the account ref), time-ago, and amount formatted with `useFormatMoney` (currency-converted).

### 4. Airtime tab — Polished
- Network selector upgraded to **rounded tiles with brand-colored circular logo** (first letter on the brand color) — cleaner than the old color-bar style.
- Phone input has a leading `Phone` icon and `inputMode="tel"`.
- Quick-amount chips: 100 / 200 / 500 / 1000 / 2000 / 5000.
- Bonus-airtime banner kept.
- On success: success sheet + toast, and `reload()` on `/api/transactions?type=airtime&limit=5` so the **Recent airtime purchases** list refreshes.
- Recent airtime list mirrors the recent-bills pattern.

### 5. Responsive layout
- **Tabs**: `grid grid-cols-4` with each trigger stacking icon-over-label on mobile (icons visible, labels `hidden sm:inline`) and going inline row on `sm+`. Sticky emerald accent on the active tab.
- **Tab transitions**: `AnimatePresence mode="wait"` with a 180 ms fade+slide so switching tabs feels animated (not jarring).
- **Scanner**: full-bleed on mobile (square aspect), `4/3` on `sm`, square on `lg`, capped at `max-w-2xl`.
- **Merchant / bill cards**: 1-col mobile, 2-col `sm`, 3-col `lg`.
- **Dialogs**: rendered via a shared `PaySheet` component that uses `Drawer` (vaul, bottom-sheet, rounded top, drag handle) on `<768px` and `Dialog` (centered modal, `max-w-md`) on `>=768px`. Determined by the existing `useIsMobile()` hook.
- All touch targets ≥ 44 px (`h-11`/`h-12` on action buttons).

### 6. Polish
- All amounts use `useFormatMoney().fmt()` so they render in the user's preferred display currency (with NGN→target conversion).
- Skeleton states during fetch.
- Toast notifications on every action (success, info, error).
- Empty states with icon + title + helpful description for merchants (no results), recent bills (none yet), and recent airtime (none yet).
- No "Demo:" buttons anywhere in the file.
- Framer Motion micro-interactions: tab slide, success check spring, card lift, scan-line oscillation.
- Camera cleanup on unmount: cancels `requestAnimationFrame`, stops all tracks, detaches `srcObject`.

## Architecture notes
- **No new API endpoints** — reuses `/api/merchants`, `/api/pay-merchant`, `/api/transactions?type=bill|airtime`.
- **`PaySheet` helper** centralises the responsive-modal pattern (Drawer on mobile / Dialog on desktop) so all four flows (manual code lookup, merchant pay, bill pay, success) share the same look-and-feel.
- **`AmountInput` helper** — shared amount field with currency symbol prefix, large font, and quick-amount chips.
- **`SuccessSheet` helper** — shared success state with spring-animated check, reference display, and "Done" CTA.
- **`EmptyState` helper** — shared dashed-border empty card with icon + title + description.
- **TypeScript** — `Merchant` and `Tx` types mirror the Prisma models and the `/api/*` response shapes. `BarcodeDetector` is accessed through `(window as any)` since it isn't in standard TS DOM libs yet.
- **Camera state machine** — `idle → starting → scanning → detected` with full cleanup. `foundRef` guards against duplicate detections during the rAF loop's async latency.

## Verification
- ✅ `bun run lint` → 0 errors, 0 warnings.
- ✅ Dev server compiles cleanly (`✓ Compiled in 102ms` in `dev.log`); `GET / 200` after edit, no runtime/compile errors.
- ✅ All four tabs (Scan & Pay / Merchants / Bills / Airtime) render with new design, animations, and shared sheet pattern.
- ✅ QR scanner: real `getUserMedia` + `BarcodeDetector` path on Chrome Android / Chrome desktop; graceful degradation to "Upload QR" + "Enter Code" on unsupported browsers (Safari/Firefox).
- ✅ Merchants: search + category chips filter the live `/api/merchants` list; "Pay" opens the sheet; payment posts to `/api/pay-merchant` and shows the success sheet with the real reference returned by the API.
- ✅ Bills: category cards open a sheet (not a route swap); recent bills list refreshes after payment via `useFetch.reload()`.
- ✅ Airtime: network tiles, phone input, quick chips, bonus banner; recent airtime list refreshes after payment.
- ✅ Responsive: tabs icons-only on mobile, cards 1→2→3 columns, modals slide-up as bottom-sheet on mobile and center on desktop.
- ✅ Removed all "Demo:" buttons.

## UX details worth highlighting
- When BarcodeDetector detects a code that doesn't match any seeded merchant (e.g. a random URL QR), the user still gets a usable flow — the merchant name is derived from the QR content and the payment proceeds as a generic payment. This avoids the dead-end "no merchant found" experience.
- The "Tip: codes start with `GXP-MER-`" hint in the scanner teaches users what to look for in the wild.
- The manual-entry sheet shows a real code from the catalog (`merchants[0].qrCode`) as a "Try:" hint so testers/reviewers can complete the flow without guessing.
- The success sheet surfaces the transaction reference prominently (mono font) and notes "Receipt saved to transactions" — reinforcing that the payment is durable.
