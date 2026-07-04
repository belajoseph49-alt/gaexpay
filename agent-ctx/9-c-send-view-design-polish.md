---
Task ID: 9-b
Agent: Dashboard UI Polish Specialist
Task: Polish dashboard to premium Revolut/Wise level — gradient hero card, premium quick actions, refined wallet cards, polished chart, clean activity list.

Work Log:
- Read full existing `dashboard-view.tsx` (600 lines) and `app-shell.tsx` wrapper (page padding handled by shell: `mx-auto max-w-7xl px-4 py-6 lg:px-8`).
- Verified dev.log clean (all API endpoints 200 OK: /api/wallets, /api/me, /api/transactions, /api/savings-goals, /api/budgets, /api/insights).
- Confirmed `useFetch`, `useFormatMoney`, `useApp().setView/setSendPrefill` contracts to preserve.
- Designed new layout: hero card → quick actions → income/expense mini cards → wallets + cash flow → recent activity + spending category → savings + budgets → financial health → cards promo.
- Rewrote file end-to-end (kept all helper functions: `greeting`, `buildDaySeries` (renamed from `build30DaySeries`, now parameterized by `days`), `buildCategoryBreakdown`, `DashboardSavingsPreview`, `DashboardBudgetsPreview`, `FinancialHealthWidget`).
- Removed unused imports (`useEffect`, `Download`, `TrendingDown`, `Smartphone`, `Zap`, `Gift`, `Avatar`, `AvatarFallback`) — quick actions reduced to 4 premium buttons per spec.

Key UI improvements:
1. **Hero balance card**: full-width `rounded-3xl` with `from-emerald-600 via-teal-600 to-emerald-700` gradient, 3 blurred decorative orbs (`bg-white/10 blur-3xl`), greeting moved inside card ("Good morning, {firstName} 👋"), uppercase "Total Balance" label, `text-4xl sm:text-5xl` balance amount with `tabular-nums tracking-tight`, "Across N wallets" subtext, eye toggle (top-right, `text-white/60 hover:text-white`), action chips as `rounded-full bg-white/15 backdrop-blur` pills, amber "Verify Identity" chip when unverified.
2. **Quick actions**: 4 buttons (Send, Pay QR, Top Up, Bills) in `grid-cols-4`, vertical layout, each icon in `h-12 w-12 rounded-2xl bg-gradient-to-br` colored container (emerald/violet/amber/sky), label `text-xs font-medium mt-2`, `hover:bg-muted/50 active:scale-95` tap feedback.
3. **My Wallets**: section header with "View all →" link, horizontal scroll on mobile (`overflow-x-auto scrollbar-none`) / vertical stack on desktop, each card has flag emoji + currency code + balance (top row), currency name + 30-day net change % (green/red, bottom row), left-edge gradient accent bar `w-1 bg-gradient-to-b from-primary/50 to-transparent`, `hover:-translate-y-0.5 hover:shadow-md`.
4. **Cash Flow chart**: 7D/30D/90D pill selector (dynamic `periodDays`), gradient fill under areas via `<linearGradient>`, custom tooltip styling (rounded-lg, popover bg, shadow), income/spending summary row below (`+{income}` green / `-{expense}` red, `text-xs`), `interval` adapts to period length.
5. **Recent Activity**: max 5 items, each row has `h-10 w-10 rounded-full` icon with type-based color (transfer=emerald, payment=violet, bill=amber, airtime=sky, withdrawal=rose, fee=slate), name + type·timeAgo, amount + status, `border-b last:border-0`, "View all N transactions →" footer button.
6. **Overall**: consistent `space-y-6`, all cards `rounded-2xl`, all amounts `tabular-nums`, framer-motion entrance with staggered delays (0/0.05/0.1/0.15/0.2/0.25/0.3s), preserved all data fetching + navigation.

Stage Summary:
- File edited: `src/components/gaexpay/views/dashboard-view.tsx` (full rewrite, ~640 lines → ~620 lines, cleaner structure).
- Lint: `bun run lint` → exit 0, 0 errors.
- Dev log: clean, all 6 dashboard API endpoints returning 200, no runtime errors after change.
- Preserved functionality: `useFetch` for `/api/wallets`, `/api/transactions`, `/api/me`, `/api/savings-goals`, `/api/budgets`, `/api/insights`; `useFormatMoney` hook (`fmt`); `useApp().setView()` navigation to send/pay/wallets/transactions/savings/budgets/analytics/cards/kyc; `setSendPrefill` for Top Up prefill; eye toggle balance hide/show; AnimatedNumber; Recharts area + pie charts.
- No new npm packages added; only existing deps used (framer-motion, lucide-react, recharts, shadcn/ui).

---
Task ID: 9-c
Agent: Send View + Global Design System Polish Specialist
Task: Polish send/receive view, sidebar, topbar, and global design system (buttons, cards, scrollbars, glassmorphism) for premium feel.

Work Log:
- Read worklog + 5 target files: `src/components/gaexpay/views/send-view.tsx` (951 lines), `src/components/gaexpay/sidebar.tsx` (149 lines), `src/components/gaexpay/topbar.tsx` (223 lines), `src/components/ui/button.tsx` (59 lines), `src/app/globals.css` (298 lines).
- **Global button polish** (`src/components/ui/button.tsx`): Added `active:scale-[0.98]` to the `cva` base classes so EVERY button in the entire app gets a subtle tactile press-down animation. One-line change, app-wide impact. The existing `transition-all` already covers the transform transition.
- **Global CSS utilities** (`src/app/globals.css`): Appended 3 new utility classes (verified none already existed):
  * `.card-hover` — premium hover lift + shadow (works in both light & dark themes via `.dark .card-hover:hover` override).
  * `.scrollbar-thin` — thin 6px scrollbar with `--muted` thumb color (uses CSS var, no @apply needed).
  * `.scrollbar-none` — alias for hiding scrollbars on horizontal scroll areas (separate from the existing `.no-scrollbar`).
  * The existing `.glass`, `.gradient-text`, `.no-scrollbar`, `.card-lift`, `.shimmer`, `.pulse-glow`, `.mesh-bg`, `.tabular-nums` classes were left untouched.
- **Sidebar polish** (`src/components/gaexpay/sidebar.tsx`):
  * Nav items: changed from `rounded-[10px]` to `rounded-xl px-3 py-2 text-sm` with `hover:bg-muted/50 transition`.
  * Active item: replaced the bold `bg-primary text-primary-foreground shadow-sm shadow-primary/30` with a softer `bg-primary/10 text-primary font-medium` look (still highly visible, more refined). Removed the colored left indicator bar (no longer needed with the softer pill style).
  * Inactive items: `text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium`.
  * Icons: standardized to `h-4 w-4` (was `h-[17px] w-[17px]`). Active icons get `text-primary`.
  * Added `active:scale-[0.98]` to nav buttons for tactile feedback.
  * Group labels: changed to `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3` (was `font-bold tracking-[0.12em]`).
  * Pro upgrade banner: rewrote with violet gradient — `rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20 p-4`. Added a circular icon container with `Sparkles` (h-4 w-4 text-violet-500). Headline changed from "GaexPay Pro" to "Upgrade to Pro". The "Upgrade now" button is now `rounded-full bg-violet-500 text-white text-xs px-3 py-1.5` with hover (`bg-violet-600`) and active-scale. The `setView("referral")` onClick is preserved.
  * Replaced `no-scrollbar` with `scrollbar-thin` on the nav scroll area for visible-but-subtle scrollbar.
- **Topbar polish** (`src/components/gaexpay/topbar.tsx`):
  * Search bar: changed `rounded-lg` → `rounded-xl`, added `focus:shadow-inner focus:border-primary/40` for subtle inner shadow on focus.
  * All icon buttons (mobile menu, AI assistant, currency switcher, notification bell, account avatar): `rounded-xl hover:bg-muted/50 transition active:scale-95`. Was previously `rounded-lg` with no hover bg.
  * The "Send" CTA in the topbar: `rounded-xl` (was `rounded-lg`).
  * Notification bell: already had `pulse && "animate-pulse text-primary"` and `ring-2 ring-destructive/40 animate-ping` from task 7-c — kept intact. Added `hover:bg-muted/50 active:scale-95`.
  * Added `aria-label="Open AI assistant"` to the Sparkles button (was missing).
  * Account avatar button: added `active:scale-95`.
  * `border-b border-border/50` and `bg-background/70 backdrop-blur-2xl` kept (already good).
- **Send/Receive view polish** (`src/components/gaexpay/views/send-view.tsx`) — the largest set of changes (951 → 1079 lines):
  * Added `USD_PER_UNIT` constant (NGN-per-unit reference rates for 9 currencies) used by the soft USD converter hint. Server-side `/api/exchange-rates` remains the source of truth.
  * **Top-level tabs (Send / Request / Top Up / Withdraw)**: redesigned as pill tabs — `TabsList` now `grid w-full grid-cols-4 bg-muted/50 p-1 rounded-full h-auto gap-1`. Each `TabsTrigger` is `rounded-full py-2 transition-all duration-200` with active state `data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-medium` (and `dark:data-[state=active]:bg-background` to override the shadcn default dark `bg-input/30`). Inactive: `text-muted-foreground hover:text-foreground`. Icons `h-4 w-4 sm:mr-1.5` before label.
  * **Internal tabs (GaexPay / Contacts / Saved / Recent)**: replaced the flat `flex gap-1.5 flex-wrap` with a pill container `flex gap-1 rounded-full bg-muted/50 p-1`. Each tab is `flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.98]`. Active: `bg-background shadow-sm text-foreground`. Inactive: `text-muted-foreground hover:text-foreground`. Icons `h-4 w-4`. Label hidden on `< sm` screens (just icon + count). Count badge kept.
  * **Action buttons row (Contacts / New Recipient)**: `h-12 rounded-xl border bg-card hover:bg-muted/50 active:scale-[0.98] transition` (was bare `h-12`).
  * **Contact list container**: converted `<div>` to `<motion.div>` with `key={activeTab}` so the stagger re-triggers on tab change. Variants: `hidden: {}, show: { transition: { staggerChildren: 0.04 } } }` with `initial="hidden" animate="show"`. Replaced `no-scrollbar` with `scrollbar-thin` for visible-but-subtle scrollbar.
  * **All 6 contact/recipient cards** (GaexPay members, checked members, non-member contacts, unchecked device contacts, beneficiaries, recent recipients): converted each `<button>` to `<motion.button>` with item variants `{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }`. Updated className from `rounded-lg border p-3 hover:border-primary/40 hover:bg-muted/30` to `rounded-2xl p-3 transition border border-transparent hover:border-border hover:bg-muted/50 active:scale-[0.98]`. Avatar size bumped `h-10 w-10` → `h-12 w-12` with gradient fallback (e.g., `bg-gradient-to-br from-emerald-500/25 to-emerald-500/10` for members, `from-muted-foreground/20 to-muted-foreground/5` for non-members, `from-primary/20 to-primary/5` for beneficiaries). AvatarFallback text bumped `text-xs` → `text-sm font-semibold`. Trailing "Instant" / "Again" badges removed; replaced with a single `<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />` (kept the inline KYC/GaexPay member badges next to the name, and the type badge on beneficiaries).
  * **Amount input (Step 1)** — PREMIUM redesign: currency selector centered on its own row (`rounded-full` trigger, was inline `w-24 h-9`). Large amount input is now `text-4xl font-bold tabular-nums text-center` (was `text-3xl`) with `text-2xl text-muted-foreground` currency symbol to its left. Added USD converter hint: `≈ $X.XX · Available: ₦Y` (only shown when amount > 0).
  * **Quick amount chips**: redesigned from `flex-1 rounded-lg border py-1.5` to `rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted transition active:scale-[0.98]`. Chips are now `[₦10k] [₦50k] [₦100k] [Max]` (was `₦5,000 ₦10,000 ₦25,000 ₦50,000`). The "Max" chip fills the entire available balance via `wallets.find(...).balance`.
  * **Action buttons (Back / Continue / Confirm & Continue / Confirm Transfer / Send Again / Copy Ref / Share)**: primary actions now use `h-12 rounded-xl font-medium bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 active:scale-[0.98] transition border-0` (gradient + tactile press). Secondary actions: `h-12 rounded-xl border bg-card hover:bg-muted/50 active:scale-[0.98] transition`. Applied consistently across all 4 steps of the SendFlow.
  * **RequestFlow** — major QR upgrade:
    * Added `qrDataUrl` state + `useEffect` that dynamically imports the already-installed `qrcode` package and calls `QRCode.toDataURL(link, { width: 240, margin: 1, color: { dark: "#000000", light: "#ffffff" } })`. Dynamic import ensures the browser build of `qrcode` only loads when a request link exists (no SSR issues, no bundle bloat on initial load).
    * Amount input given the same premium treatment as SendFlow (centered currency selector, `text-4xl` input, USD converter hint).
    * "Generate Request Link" button: gradient primary `h-12 rounded-xl`.
    * When a link is generated, shows a QR card: `rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border text-center`. The QR code itself is `h-48 w-48 p-3 bg-white rounded-2xl shadow-sm` (white background for scannability) with the rendered PNG image inside (or a `Loader2` spinner while generating). Below: "Scan to pay" label + amount + note.
    * Link row kept (Input + ghost Copy button).
    * Replaced the 3-button WhatsApp/Email/Copy row with a cleaner 2-button grid: gradient "Share" (uses `navigator.share` if available, falls back to clipboard) + outline "Copy Link" (clipboard). Both `h-12 rounded-xl ... active:scale-[0.98]`.
  * **TopUpFlow**: cards redesigned from `rounded-xl border p-3 sm:p-4 hover:border-primary/40 hover:bg-muted/30` to `rounded-2xl p-4 transition border border-transparent hover:border-border hover:bg-muted/50 active:scale-[0.98]`. Icon container `h-11 w-11 rounded-xl` (was `h-10 w-10 sm:h-11 sm:w-11 rounded-lg`). ChevronRight kept.
  * **WithdrawFlow**: "Continue" button upgraded to gradient primary `h-12 rounded-xl ... bg-gradient-to-r from-primary to-primary/90` (was bare `h-11`).

Stage Summary:
- **Files edited (5):**
  - `src/components/ui/button.tsx` — added `active:scale-[0.98]` to the cva base classes (app-wide tactile feedback).
  - `src/app/globals.css` — added `.card-hover`, `.scrollbar-thin`, `.scrollbar-none` utility classes (existing `.glass`, `.gradient-text`, `.no-scrollbar`, `.card-lift`, `.shimmer`, `.pulse-glow`, `.mesh-bg`, `.tabular-nums` untouched).
  - `src/components/gaexpay/sidebar.tsx` — pill nav items (rounded-xl, softer `bg-primary/10 text-primary` active state, h-4 w-4 icons), violet gradient Pro banner with Sparkles icon + `rounded-full bg-violet-500` "Upgrade now" button.
  - `src/components/gaexpay/topbar.tsx` — search `rounded-xl` + `focus:shadow-inner focus:border-primary/40`, all icon buttons `rounded-xl hover:bg-muted/50 active:scale-95`, notification bell pulse preserved, account avatar `active:scale-95`, added aria-label on AI assistant button.
  - `src/components/gaexpay/views/send-view.tsx` (951 → 1079 lines) — pill top-level tabs + internal tabs, premium amount input (`text-4xl` + currency symbol + USD converter hint + `[10k][50k][100k][Max]` pill chips), 6 motion.button contact cards with gradient avatars + ChevronRight + stagger animation, gradient primary action buttons (`bg-gradient-to-r from-primary to-primary/90`), real QR code in RequestFlow (rendered via dynamic-imported `qrcode` library into a 240×240 PNG, displayed in `h-48 w-48 p-3 bg-white rounded-2xl` container inside a `rounded-3xl bg-gradient-to-br from-primary/5 to-transparent border` card), polished TopUpFlow cards, gradient WithdrawFlow Continue button.
- **No new npm packages** — used the already-installed `qrcode` (was previously only used server-side in `/api/merchant-qr` and `/api/unified-address` routes; now also used client-side via dynamic `import("qrcode")` so the browser build only loads when a request link is generated).
- **No schema changes, no API changes, no DB writes.**
- **All existing functionality preserved**: 4 main tabs, 4 internal tabs, 5-step SendFlow (Recipient → Amount → Review → Verify → Success), manual contact add, device contacts picker, GaexPay membership check, mobile money provider selector, OTP entry, Confetti success animation, RequestFlow link generation + share, TopUpFlow method selection, WithdrawFlow with balance/limit display + destination selector. All `useFetch`, `useState`, `useEffect`, `setView`, `selectRecipient`, `submit`, `generate`, `handleWithdraw`, `handleManualAdd`, `handlePickContacts` logic untouched.
- **Lint:** `bun run lint` → exit 0, 0 errors, 0 warnings.
- **TypeScript:** `bunx tsc --noEmit --skipLibCheck` → 0 errors in any of the 5 edited files (pre-existing errors in other files untouched).
- **Runtime verification via agent-browser:**
  * Navigated to `/`, dismissed an overlay, clicked "Send & Receive" sidebar nav → Send view loaded with pill tabs + "Who are you sending to?" heading.
  * Internal pill tabs visible: GaexPay / Contacts / Saved (6) / Recent (20).
  * Clicked "Saved" → 6 beneficiary cards rendered with new design (initials avatars, names, account info, ChevronRight).
  * Clicked a beneficiary (Aisha Mohammed) → Step 2 (Amount) loaded with premium input: "₦" symbol, "0.00" placeholder, "Available: ₦1,267,086.70" hint, quick chips `[₦10k][₦50k][₦100k][Max]`, Back/Continue buttons.
  * Entered "25000" → hint updated to "≈ $16.23 · Available: ₦1,267,086.70" (correct USD conversion: 25000 ÷ 1540 = $16.23). Continue button enabled.
  * Clicked Request tab → amount input + Generate button rendered. Entered "5000" → clicked Generate → toast "Payment request link generated" appeared, QR card rendered with a real QR code image (`<img alt="Payment request QR code" src="data:image/png;base64,..." complete=true naturalWidth=240>`), Share + Copy Link buttons visible.
  * Clicked Top Up tab → 4 method cards (Bank Transfer / Mobile Money / Debit Card / Voucher) rendered with new design.
  * Browser `errors` command → empty (no console errors).
- **Dev.log:** Clean — all `GET /api/contacts`, `GET /api/wallets`, `GET /api/notifications`, `GET /` requests return 200. No runtime errors after the edits. The earlier `Fast Refresh had to perform a full reload` warning was from a transient mid-edit state and resolved on the next compile.
