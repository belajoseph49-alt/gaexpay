# Task 22-C — PWA: Installable on Web, iOS, Android, Desktop

**Agent**: Senior Frontend Engineer (PWA & Installability)
**Task ID**: 22-C
**Scope**: Turn GaexPay into a proper Progressive Web App — manifest, generated PNG icons (192/512/180/32) + branded screenshots, full Next.js 16 metadata API wiring (icons, theme color, apple-web-app, MS tiles), platform-specific `<head>` meta tags, and an animated smart `InstallPrompt` component mounted inside the app shell.

## Context Reviewed
- `src/app/layout.tsx` — previously only had `title`, basic `description`, single `icons: { icon: "/logo.svg" }`, and basic `openGraph`. No manifest, no theme color, no apple-web-app, no MS tile config.
- `src/app/page.tsx` — renders `<Landing>` first, then `<AppShell>` after the user clicks "Open App". The install prompt should only appear inside the app (per task spec: "not on landing page"), so mounting `<InstallPrompt />` inside `app-shell.tsx` automatically satisfies that constraint.
- `src/components/gaexpay/logo.tsx` — uses an inline SVG path `M4 7.5C4 6.12...` for the GaexPay "G" mark on an emerald-gradient rounded square. Reused the same path in the icon generator so install icons match the in-app brand.
- `public/logo.svg` — a dark-square-with-Z-pattern logo (not currently used by the in-app `<Logo/>`). Left untouched; new `icon.svg` + PNGs replace it as the canonical PWA icons.
- Previous agents (`/agent-ctx/22-A-senior-backend-engineer.md` and earlier) had no PWA work — this task is fully self-contained.
- `sharp@0.34.5` already installed in `package.json` — no new dependencies required.

## Deliverables

### 1. `public/manifest.json` — Web App Manifest
- `name`, `short_name`, `description` per spec.
- `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `display_override: ["standalone", "minimal-ui", "browser"]` for graceful fallback.
- `orientation: "portrait-primary"`, `background_color: "#0a0f0d"` (matches the dark `mesh-bg` background of the app shell), `theme_color: "#10b981"` (emerald brand).
- `lang: "en"`, `dir: "ltr"`, `categories: ["finance", "business", "productivity"]`.
- 4 icon entries: `icon-192.png` and `icon-512.png` each declared twice with `purpose: "any maskable"` and `purpose: "any"` (some Android versions ignore combined declarations, so emitting both is the safest cross-browser pattern).
- 2 `screenshots` (`screenshot-wide.png` 1280×720 with `form_factor: "wide"`, `screenshot-narrow.png` 720×1280 with `form_factor: "narrow"`) with `label` fields — Chrome's install dialog uses these to preview the app on desktop and mobile.
- 3 `shortcuts` (`Send Money`, `Pay with QR`, `Crypto Wallet`) with `url: "/?view=send|pay|crypto"` so long-press / right-click on the installed icon shows quick actions. The app's Zustand store reads `?view=` from the URL on mount.

### 2. `scripts/generate-icons.ts` — `sharp`-based icon generator
- Uses the already-installed `sharp@0.34.5` package.
- Builds 7 files in `/public`:
  - `icon-192.png` (192×192) — emerald-gradient background + soft inner shadow + GaexPay "G" path scaled into a 70% safe zone (so it survives `maskable` cropping on Android).
  - `icon-512.png` (512×512) — same template at higher resolution.
  - `apple-touch-icon.png` (180×180) — opaque (no alpha) as iOS requires; solid emerald gradient + G mark.
  - `favicon-32.png` (32×32) — simplified, brighter accent, slightly thicker stroke so it stays legible at 16-32px.
  - `screenshot-wide.png` (1280×720) — branded dark gradient with hero text "Borderless money, built for everyone.", balance card preview, and footer "Installable on Web · iOS · Android · Windows · macOS · Linux".
  - `screenshot-narrow.png` (720×1280) — mobile-install counterpart with balance card, quick-action tiles, and platform footer.
  - `icon.svg` (master SVG, 512×512) — emitted for the `mask-icon` (Safari pinned tabs) and as a crisp favicon fallback.
- All 4 PNG icons reuse the SAME GaexPay "G" path that's in `src/components/gaexpay/logo.tsx`, so install icons are visually identical to the in-app brand.
- Idempotent: re-running the script just overwrites the files.
- Verified: `bun run scripts/generate-icons.ts` → 7 files generated, sizes 981B (favicon-32) to 132KB (screenshot-narrow).

### 3. `src/app/layout.tsx` — Next.js 16 metadata API wiring
- Added `metadataBase: new URL("https://gaexpay.app")` so OG/Twitter image URLs resolve to absolute URLs (required for social previews).
- `title` is now a `{ default, template: "%s · GaexPay" }` object so nested pages can set just their name.
- `description` rewritten to explicitly mention crypto, mobile money, multi-currency, virtual cards, QR, and installability across all platforms.
- `applicationName: "GaexPay"`.
- `keywords` expanded with `crypto`, `bitcoin`, `USDT`, `stablecoin`, `PWA`, `installable wallet`, `multi-currency`, `cross-platform`.
- `manifest: "/manifest.json"`.
- `icons`: full object — `icon: [favicon-32 (32), icon-192 (192), icon-512 (512), icon.svg]`, `apple: [apple-touch-icon (180)]`, `shortcut: [favicon-32]`.
- `appleWebApp: { capable: true, title: "GaexPay", statusBarStyle: "black-translucent" }` — Next.js emits the three required `<meta name="apple-mobile-web-app-*">` tags from this.
- `formatDetection: { telephone: false, address: false, email: false }` — stops iOS Safari from auto-linking phone numbers / addresses in the wallet UI (which would interfere with copy-to-clipboard on account numbers).
- `openGraph` — full images array (icon-512 512×512 + screenshot-wide 1280×720), siteName, type.
- `twitter` — `summary_large_image` card with the wide screenshot.
- `other` map emits all the platform meta tags Next.js doesn't have typed fields for: `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, `application-name`, `msapplication-TileColor`, `msapplication-tap-highlight`, `msapplication-starturl`, `msapplication-config`.
- New `export const viewport: Viewport` — `themeColor: "#10b981"`, `width: "device-width"`, `initialScale: 1`, `maximumScale: 5`, `userScalable: true` (accessibility — never disable pinch-zoom), `viewportFit: "cover"` (so the app uses the full notched display when installed on iOS).
- Minimal `<head>` block — only the two tags Next.js doesn't auto-generate: `<link rel="mask-icon" href="/icon.svg" color="#10b981" />` (Safari pinned tabs) and `<meta name="apple-mobile-web-app-status-bar-inset" content="#0a0f0d" />` (iOS launch-screen background hint). Everything else comes from the metadata API to avoid duplicates.
- Verified via `curl http://localhost:3000/` — single `<meta name="theme-color">`, single `<link rel="manifest">`, one `<link rel="icon">` per size, all platform meta tags present exactly once.

### 4. `public/browserconfig.xml` — Windows / MS tile config
- Wires `msapplication-config: "/browserconfig.xml"` to a real file (otherwise IE/Edge legacy would 404 looking for it).
- `TileColor: #10b981`, `square150x150logo: /icon-192.png`.

### 5. `src/components/gaexpay/install-prompt.tsx` — Smart install prompt
- **PWA detection**: `isStandalone()` checks `display-mode: standalone`, `display-mode: minimal-ui`, and `navigator.standalone === true` (iOS). If already installed → renders nothing.
- **Platform detection** (`detectPlatform()`):
  - iOS / iPadOS (includes iPadOS 13+ which reports as MacIntel + touch).
  - Android Chrome (separates from Edge).
  - Desktop Chrome / Edge.
  - Other (Firefox, Safari desktop, etc.).
- **Three behaviours**:
  1. **Chrome / Edge / Android Chrome** — listens for `beforeinstallprompt`, calls `e.preventDefault()` to suppress the default mini-infobar, stores the deferred event. The banner shows an "Install now" button that calls `deferred.prompt()` and awaits `userChoice`. If accepted → banner disappears, `appinstalled` event fires → `localStorage[INSTALLED_KEY] = "1"`.
  2. **iOS Safari** — never receives `beforeinstallprompt`. Banner shows an "Add to Home Screen" button that opens a step-by-step Dialog with Share-icon → "Add to Home Screen" → "Add" instructions.
  3. **Desktop / Android Chrome without deferred event** — banner shows a "Show me how" button that opens a platform-specific instructions Dialog (browser-menu → Install → Confirm).
- **Dismissal** — "Not now" / "Maybe later" sets `localStorage[DISMISS_KEY] = "1"` so the banner never reappears until the user clears storage.
- **3-second delay** — `setTimeout(..., 3000)` before the banner appears (per task spec) so users can settle into the dashboard without an immediate popup. Re-evaluated when `deferred` changes (i.e., if the browser fires `beforeinstallprompt` AFTER mount, the banner will switch to installable mode).
- **Visual design** — fixed bottom-center, max-w-md, Framer Motion spring slide-in (`y: 120 → 0`), gradient emerald background (`from-emerald-950/95 via-emerald-900/95 to-slate-950/95`), backdrop-blur, top accent strip, install icon in an emerald tile with a Sparkles badge, platform label chip, feature strip ("Offline-ready · No app store · Push notifications"). The instructions Dialog has matching emerald accent, step cards with numbered circles, and a "Got it" CTA.
- **Accessibility** — `role="dialog"`, `aria-labelledby`, `aria-describedby`, `aria-label` on the dismiss button. Touch targets all ≥ 32px (sm: buttons are h-8 = 32px, banner padding adds more).
- **SSR-safe** — short-circuits to `null` until `mounted === true` to avoid hydration mismatches (since `navigator` / `window` aren't available during SSR).
- **Respects "already installed"** — if `isStandalone()` is true on mount, sets `INSTALLED_KEY` and returns null.

### 6. `src/components/gaexpay/app-shell.tsx` — Mounted InstallPrompt
- Imported `InstallPrompt` and rendered it inside the `<AppShell>`'s root div alongside `<AiAssistant />`, `<CommandPalette />`, `<AchievementMonitor />`, and `<OnboardingTour />`. Since `AppShell` only renders AFTER the user clicks "Open App" on the landing page, the install prompt never appears on the landing page (per task spec).

## Verification

### Lint
- `bun run lint` → **0 errors, 0 warnings** (exit 0).

### PWA asset reachability (live dev server)
```
manifest:          200
icon-192:          200
icon-512:          200
apple-touch-icon:  200
favicon-32:        200
browserconfig:     200
icon.svg:          200
screenshot-wide:   200
screenshot-narrow: 200
```

### Rendered HTML `<head>` (verified via curl)
- All required platform meta tags present exactly once:
  - `<meta name="mobile-web-app-capable" content="yes"/>`
  - `<meta name="apple-mobile-web-app-capable" content="yes"/>`
  - `<meta name="apple-mobile-web-app-title" content="GaexPay"/>`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>`
  - `<meta name="application-name" content="GaexPay"/>`
  - `<meta name="msapplication-TileColor" content="#10b981"/>`
  - `<meta name="msapplication-tap-highlight" content="no"/>`
  - `<meta name="msapplication-starturl" content="/"/>`
  - `<meta name="msapplication-config" content="/browserconfig.xml"/>`
  - `<meta name="theme-color" content="#10b981"/>`
- Icons resolved correctly: `<link rel="icon">` for 32px / 192px / 512px / svg, `<link rel="apple-touch-icon">` 180px, `<link rel="shortcut icon">`, `<link rel="manifest">`, `<link rel="mask-icon">`.
- `<meta name="viewport">` includes `viewport-fit=cover` (iOS notch) and `user-scalable=yes` (accessibility).

### Dev log
- Dev server compiled cleanly across all changes — no errors, no warnings, no hydration mismatches logged.

## Stage Summary
- **Files created**: 4
  - `public/manifest.json` — Web App Manifest (icons, screenshots, shortcuts, colors, display modes)
  - `public/browserconfig.xml` — Windows tile config
  - `scripts/generate-icons.ts` — `sharp`-based PNG icon generator (run once, idempotent)
  - `src/components/gaexpay/install-prompt.tsx` — smart cross-platform install prompt with platform detection + instructions dialog
- **Files modified**: 2
  - `src/app/layout.tsx` — full PWA metadata API wiring (manifest, icons, theme color via viewport export, appleWebApp, MS tiles via `other`, OG/Twitter cards)
  - `src/components/gaexpay/app-shell.tsx` — mounted `<InstallPrompt />` so it only appears inside the app (not on landing page)
- **Generated assets**: 7 files in `/public` (icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png, screenshot-wide.png, screenshot-narrow.png, icon.svg) — all reproducible via `bun run scripts/generate-icons.ts`.
- **Installability**: GaexPay now meets all of Chrome's installability criteria — manifest with name/icons/display/start_url. On Chrome/Edge desktop + Android, the `beforeinstallprompt` event is captured and surfaced as an "Install now" button. On iOS Safari and Firefox, the prompt surfaces step-by-step "Add to Home Screen" instructions.
- **No breaking changes** to existing routes, APIs, or views. The install prompt is purely additive (returns `null` when dismissed or already installed).
