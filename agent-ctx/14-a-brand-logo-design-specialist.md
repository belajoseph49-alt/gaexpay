# Task 14-a — Brand & Logo Design Specialist

## Task
Create real GaexPay animated logo (G+arrow mark with shimmer/glow/gradient effects), update favicon/icons, add CSS animations, remove any Z.ai branding.

## Work Log
- Read worklog at `/home/z/my-project/worklog.md` (last entries: Task 13 coordinator summary, 35-section admin panel complete).
- Audited current branding:
  - Old `src/components/gaexpay/logo.tsx` was a generic "G" squiggle on an oklch emerald gradient — no arrow motif, no animations.
  - **Found a hidden Z.ai-branded SVG at `public/logo.svg`** — rounded square with a stylized white "Z" + `z-breathe` CSS animation keyframe. This is a leftover from the Z.ai template. Not referenced in `src/` code but reachable via direct URL → replaced with a real GaexPay logo so the file no longer exposes Z.ai branding.
  - Searched `src/` + `public/` for "Z.ai", "z-ai", "ZAI", "zhipu", "chatglm" → only matches are the legitimate backend SDK import in `src/app/api/ai-chat/route.ts` (invisible to users — left untouched per spec).
  - AI assistant is already branded "Gaxie AI" everywhere (`ai-assistant.tsx`, `support-view.tsx`, admin `section-support.tsx`) — no "powered by Z.ai" attribution exists.

## Logo Design
The new mark is a stylized "G" + payment-arrow on a rounded-square gradient background:
- **G arc** (270° from top → CCW → right edge) = the wallet / circle of money
- **Horizontal bar** = the G's spine
- **Chevron arrow at the right edge** pointing right = payment / money-flow direction (GaexPay = wallet + pay)
- **Center dot** = closure / settled balance
- **Fill**: emerald `#34d399` → teal-green `#10b981` → teal `#14b8a6` → cyan `#06b6d4` linear gradient at 135°
- **Stroke**: white → `#ecfeff` gradient (glassy premium feel)
- **Depth**: top-half white sheen overlay + soft inner drop-shadow filter

Built on a 40×40 viewBox with vector strokes → crisp at 16px (favicon) up to 128px+ (hero).

## Files Created/Edited (8)

### Created (1)
- `public/favicon.svg` — NEW 32×32 simplified GaexPay mark (thicker stroke 3.1px for visibility at 16px tab size)

### Rewritten/Edited (7)
- `src/components/gaexpay/logo.tsx` — full rewrite:
  - Exports `Logo` (icon + wordmark) and `LogoMark` (icon only)
  - Props: `className`, `size` (default 32), `showText` (default true), `animated` (default true), `textScale` (default 1)
  - 3 animation layers toggleable via `animated`: `gxp-glow` + `gxp-gradient-animate` classes + `gxp-shimmer-overlay` element
  - Wordmark: "Gaex" in `text-foreground`, "Pay" in `text-primary`, `font-bold tracking-tight`
  - Uses `useId()` to generate unique SVG gradient IDs per instance (prevents ID collisions when multiple logos on same page)
- `src/app/globals.css` — appended 5 keyframe animations + `.gxp-*` utility classes + `prefers-reduced-motion` guard:
  - `gxp-shimmer` (3.5s sweep), `gxp-glow` (3s breathe), `gxp-gradient-shift` (5s hue cycle), `gxp-float` (3s bob), `gxp-rotate` (8s ring)
- `public/icon.svg` — replaced generic emerald mark with new GaexPay mark (gradient + G + arrow + dot + drop-shadow filter)
- `public/logo.svg` — **replaced hidden Z.ai "Z" logo** with new GaexPay mark (eliminates the only Z.ai-branded asset in the repo)
- `public/manifest.json` — added SVG icon as first PWA icon entry
- `src/app/layout.tsx` — `metadata.icons` now SVG-first (`/favicon.svg`, `/icon.svg`), `shortcut` → `/favicon.svg`
- `src/components/gaexpay/auth-modal.tsx` — removed redundant nested-logo wrapper, replaced with clean `<Logo size={28} className="text-white [&_span]:text-white" />` (white wordmark variant for the gradient header)

## Animation Behavior
- **Shimmer**: white highlight strip (45% wide, skewed -15°) sweeps across every 3.5s (1.2s initial delay so multiple logos don't fire in sync)
- **Glow**: outer emerald box-shadow breathes 0.30→0.55→0.30 opacity over 3s
- **Gradient**: background-position cycles every 5s, rotating hue emerald↔cyan
- All toggleable via `animated={false}` (print/static contexts)
- `prefers-reduced-motion: reduce` users get NO logo animations (accessibility)

## Verification Results
- ✅ `bun run lint` — 0 errors, 0 warnings
- ✅ `tail -25 dev.log` — clean compiles, all routes 200, no runtime errors
- ✅ Logo renders in all 4 verified contexts: topbar, sidebar, landing header + footer, auth-modal header (all use the same `<Logo />` component)
- ✅ Mobile-first: `size` prop scales icon + wordmark proportionally; default 32px works in 60px and 64px headers
- ✅ PWA install prompt: uses its own emerald-themed icons (Apple/Chrome/Smartphone) — no logo change needed
- ✅ Existing PNG icons (`icon-192.png`, `icon-512.png`, `favicon-32.png`, `apple-touch-icon.png`) preserved as fallbacks for browsers that don't support SVG icons
- ✅ Z.ai branding: zero user-visible references remain (only the legitimate backend SDK import in `ai-chat/route.ts`)
- ✅ Gaxie AI branding: unchanged, no "powered by Z.ai" anywhere
