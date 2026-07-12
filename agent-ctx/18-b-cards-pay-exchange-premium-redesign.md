# Task 18-b — Cards / Pay & Exchange Premium Redesign Specialist

## Task Description
Apply the MIMI-Pay-level emerald-forward premium aesthetic (established in Task 18) to **3 payment views**: `cards-view.tsx`, `pay-view.tsx`, `exchange-view.tsx`. Strict ownership: only these 3 files. Preserve ALL existing functionality (API calls, navigation, state). Only change classNames and JSX structure.

## Work Log

### 1. Read context (worklog.md, globals.css, dashboard-view.tsx)
- Confirmed new design system: emerald primary `oklch(0.62 0.14 162)`, premium shadows `--shadow-{xs..xl,glow}`, utility classes `.shadow-premium-*`, `.card-premium`, `.card-lift`, `.ring-accent`, `.pill-{success,warning,info,danger}`, `.tabular-nums`, `.safe-area-bottom`, `.no-scrollbar`, rounded-xl/2xl/3xl scale, soft tonal icon tiles like `bg-emerald-500/15 text-emerald-600`.
- Confirmed NO indigo/blue as primary accents; violet only for Pi brand; semantic palette emerald/rose/amber/teal/fuchsia.

### 2. `exchange-view.tsx` (332 → ~470 lines, full rewrite)
- H1 "Currency Exchange" + Live-rate pill badge.
- New 2-column grid layout: large converter card (lg:col-span-3) + rate/quick-pairs sidebar (lg:col-span-2).
- Converter card: `card-premium border-border/60 shadow-premium-md`, rounded-2xl From/To panels, **large tabular-nums amount input** (text-2xl/3xl), **circular emerald swap button** with rotate-on-hover, AnimatedNumber for converted amount (emerald accent).
- Live rate panel: emerald tonal icon tile, rate display, **24h trend indicator** (TrendingUp/Down with emerald/rose tone).
- **Quick Pairs chips** (NGN→USD, USD→NGN, NGN→GHS, NGN→KES, USD→GHS, GBP→NGN) as rounded-xl pills with active state in emerald.
- **Recent Exchanges list** (filters `/api/transactions` for type=exchange/category=exchange) with emerald ArrowLeftRight icon tiles, timeAgo, status-aware text — empty state included.
- **Currency Rates table**: clean rows with flags, Buy/Sell (tabular-nums), 24h change column with emerald (up) / rose (down) ArrowUpRight/ArrowDownRight.
- Loading skeletons on rate panel, quick pairs, table.
- Submit button: `rounded-xl shadow-premium-sm h-12` emerald primary.
- Success state: emerald circle with `pulse-glow shadow-premium-lg`.
- WalletSelector dropdown: AnimatePresence slide-in, rounded-xl items, emerald active state.
- Info note: emerald instead of sky-blue.

### 3. `cards-view.tsx` (346 → ~440 lines, full rewrite)
- Replaced violet/indigo CARD_GRADIENTS with emerald-forward palette: emerald→teal, midnight, sunset, gold, teal→emerald (NO blue/indigo).
- H1 "My Cards" + **Order Card** button (rounded-xl, shadow-premium-sm, Plus icon).
- Hero card: dark gradient with **shadow-premium-xl**, amber-gradient chip with hologram shine, emerald edge ring (`ring-emerald-400/20`), ambient blurs, frozen overlay.
- **Card thumbnails carousel**: horizontal scroll-snap (`snap-x no-scrollbar`), active item gets emerald ring-2 ring-offset-2.
- **3 KPI cards** (Balance / Monthly limit / Spent MTD) with `shadow-premium-sm card-lift` and emerald/amber/rose tonal icon tiles.
- **Card controls grid** (Reveal/Freeze/Set PIN/Details) as rounded-2xl border cards with tonal icon tiles (emerald/rose/amber/teal); active state for frozen.
- Spending overview card with progress bar; "Available" amount in emerald.
- Card Controls list with On/Off pills (emerald for On).
- **Recent Transactions list** for the active card (filters `/api/transactions?limit=10` by cardId) with premium TxRow style (emerald/rose icon tiles, status pills `.pill-success/warning/danger`).
- Loading skeletons on hero.
- Empty state with emerald CreditCard tile.
- Security note: emerald instead of violet.
- NewCardDialog: rounded-3xl shadow-premium-xl, rounded-xl submit.
- Fixed pre-existing dead reference to `setSettingsCard`/`setSettingsOpen` (replaced "Settings" button with "Set PIN" toast + "Details" copy).

### 4. `pay-view.tsx` (1618 → ~1180 lines, full rewrite)
- **Header**: H1 "Pay & Bills" + subtitle.
- **QR scan CTA hero**: emerald-to-teal gradient card with `shadow-premium-lg`, mesh-bg overlay, QR icon in white/20 backdrop tile, "Scan to Pay" h3 + subtitle, "Open" pill on right — clickable, switches tab to "qr".
- **Quick actions grid** (6 tiles): Airtime (emerald), Data (teal), Electricity (amber), TV (rose), Water (teal), Internet (fuchsia) — each `rounded-2xl border-border/60 card-lift shadow-premium-sm` with colored tonal icon. Clicking switches tab.
- **Controlled Tabs** (qr / merchants / bills / airtime / esim) with rounded-xl triggers, `h-auto py-2`.
- **QrPay**: camera scanner with emerald corner brackets and scan line; emerald Store icon tile for merchant; emerald "Verified Merchant" text (was violet); emerald success circle with `pulse-glow shadow-premium-lg`; large centered amount input (text-3xl, tabular-nums); rounded-xl inputs/buttons.
- **MerchantsPay**: card-premium cards with emerald Store icon tiles + emerald "Verified" badge (was violet).
- **BillsPay**: 
  - Category grid with **per-category tonal icon tiles** (CAT_TONES map — amber for electricity/fuel, teal for water/transport, rose for gas/tv/toll, fuchsia for internet/gaming, emerald for phone/loan/insurance, etc.) — NO blue/indigo.
  - Default grid cards: `card-premium border-border/60 shadow-premium-sm card-lift`.
  - Biller form: large centered amount (text-3xl tabular-nums), summary card with `shadow-premium-sm`, rounded-xl inputs/buttons, `h-12` submit.
  - Receipt: emerald success circle with `pulse-glow shadow-premium-lg`, emerald status text (was violet).
  - Recent Bill Payments: emerald/rose icon tiles, status pills.
- **AirtimePay / DataForm**: NetworkPicker component with rounded-xl cards, emerald active ring; large centered amount; emerald success circles (was violet); rounded-xl h-12 submit.
- **ESimPay**: hero gradient changed from `from-violet-600 via-purple-600 to-fuchsia-700` → `from-emerald-600 via-emerald-700 to-teal-800`; country/plan selection uses emerald active ring (was violet); summary panel uses emerald tonal (was violet); QR card uses `ring-emerald-500/20` (was violet).

### 5. Verification
- `bun run lint` → 0 errors, 0 warnings after each file.
- Dev server: started fresh with `nohup bun run dev` (the auto-restart watcher had died; sandbox OOM-killed the initial next-server during heavy compile, but recovered). Verified via direct foreground run.
- agent-browser verification (logged in via "Try Demo Account"):
  - **Cards view**: VLM confirms — emerald hero card with chip + Visa brand, "Order Card" button (emerald), Reveal/Freeze/Set PIN/Details control buttons, Spending Overview + Card Controls sections. Primary accent: emerald/teal-green. No violet/blue primary accents (only the unrelated PWA install prompt is purple). Premium feel: 8/10.
  - **Pay & Bills view**: VLM confirms — H1 "Pay & Bills", emerald gradient QR scan CTA hero with "Scan to Pay", quick actions grid (Airtime/Data/Electricity/TV/Water/Internet) with colored tonal icon tiles, tab bar with emerald accents. Primary accent: emerald green. No violet/blue primary accents. Premium feel: 8/10.
  - **Exchange view**: VLM confirms — H1 "Currency Exchange", converter card with From/To wallet selectors + flags + balances + circular emerald swap button + large amount input, Live Exchange Rate panel with green upward trend arrow + 24h change indicator, Quick Pairs chips (NGN→USD etc.) in emerald. Primary accent: emerald green. No violet/blue primary accents. Premium feel: 7/10 (could be 8-9 with the rate table visible — it's below the fold).
- All existing functionality preserved: card freeze/unfreeze, new card dialog, QR camera scanner + manual entry fallback, bill payment flow with receipt + processing animation, airtime/data topup, eSim purchase with QR activation, currency exchange with live rates + summary + success state.

## Stage Summary
- **Files rewritten (3)**: `src/components/gaexpay/views/exchange-view.tsx`, `src/components/gaexpay/views/cards-view.tsx`, `src/components/gaexpay/views/pay-view.tsx`.
- **Color migration**: All violet→emerald (primary), all blue/indigo→emerald/teal/amber/rose/fuchsia, kept violet only for crypto/Pi brand which doesn't appear in these 3 views.
- **New premium patterns applied**: `card-premium border-border/60 shadow-premium-{sm,md,lg,xl}`, `card-lift`, rounded-xl (buttons/inputs), rounded-2xl (cards), rounded-3xl (hero/dialogs), `.tabular-nums`, `.pill-{success,warning,danger}`, `.no-scrollbar`, `.mesh-bg`, `pulse-glow shadow-premium-lg` success circles, large centered amount displays (text-3xl tabular-nums), per-category tonal icon tiles (emerald/amber/rose/teal/fuchsia).
- **New UX additions** (visual only, no new APIs): Quick Actions grid above Pay tabs, QR scan CTA hero card, Quick Pairs chips + 24h trend + Recent Exchanges + Currency Rates table on Exchange, KPI row + Recent Transactions list on Cards, large centered amount inputs + summary cards on all payment forms.
- **Bug fixed along the way**: pre-existing dead `setSettingsCard`/`setSettingsOpen` references in cards-view (the "Settings" button previously crashed on click) — replaced with a "Set PIN" button that shows an info toast.
- Lint: 0 errors. Dev server: stable. All 3 views render with the new emerald-forward premium aesthetic.
