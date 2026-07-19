---
Task ID: redesign-marketplace
Agent: Marketplace Redesign — Video App Style
Task: Redesign marketplace to match video app design (white bg, purple accent, store pages, product detail, price comparison).

Work Log:
- Read `/home/z/my-project/worklog.md` and explored the codebase. Found that NO marketplace view, API, or `marketplace` View type existed — this is a brand-new feature, not a redesign of an existing one. The task brief's wording ("COMPLETE REWRITE") was treated as "create from scratch to the video spec".
- Inspected existing patterns: `useFetch` hook, `useFormatMoney` hook (NGN-based with currency conversion), `useTranslation` hook (12-language i18n with EN fallback), `View` type union in `src/lib/store.ts`, app-shell view registry, sidebar/mobile-nav nav catalogs, shadcn/ui component set (Card, Button, Badge, Input, Skeleton), framer-motion animation conventions.
- Added `"marketplace"` to the `View` union in `src/lib/store.ts` so the app-shell can route to it.
- Added 40 marketplace translation keys (`marketplace.*`) plus `nav.marketplace` to the English base dictionary in `src/lib/i18n/translations.ts`. All other languages inherit through the existing `build({...en, ...overrides})` helper, so they gracefully fall back to EN for the new keys.
- Created `src/app/api/marketplace/products/route.ts` — a public (no-auth) REST endpoint returning a typed catalog: 6 categories, 2 promotional offers (Nike 15% / Starbucks 10%), 6 brand stores (Nike, Adidas, Macy's, Levi's, Starbucks, Puma) and 15 products, each with 2 vendor price-comparison offers (StockX vs Amazon). Prices are NGN so `useFormatMoney` converts to the user's preferred currency.
- Created `src/components/gaexpay/views/marketplace-view.tsx` (834 lines) — a complete video-matching implementation with three internal sub-views driven by local state (since the user can only see `/`):
  1. **Marketplace home** — search bar (rounded-xl, gray border, magnifier icon), horizontally scrollable category pills (Popular = purple filled, others gray outline), 2-column promo grid (purple gradient + emerald gradient, brand emoji watermark, "Pay with GaexPay" cta, click-to-copy promo code), Stores list (circular gradient logos, brand name, "Online & In-store", emerald checkmark), filtered "Popular picks" product grid.
  2. **Store page** — full-bleed purple gradient hero banner with brand emoji watermark + glow, logo chip, brand name + "Online & In-store", "Get Code" pill button + rating/product-count chip, sub-category pills (Sport shoes / Sneakers), product count, 2-col product grid.
  3. **Product detail** — large centered product image (rounded-3xl, gradient bg, heart favorite, "Popular" purple pill), brand chip, title, purple star rating with reviews count, horizontal size selector (selected = zinc-900 bg + white text), price-comparison cards (StockX card highlighted with emerald ring + "Save X" + "In Stock" emerald badge; Amazon card neutral), "Add to Cart" (emerald) + "Buy Now" (zinc-900) rounded-xl buttons, related-products grid.
  4. **Bottom navigation** (mobile-only, `lg:hidden`) — Home / Shop (active, purple) / Payment / More, with safe-area-inset padding.
  5. **Loading skeleton** matching the home layout shape.
- Wired the new view into the app: imported `MarketplaceView` in `app-shell.tsx` and registered `marketplace` in the views map; added a "Marketplace" nav item with the `ShoppingBag` icon and "New" badge to both `sidebar.tsx` (desktop) and `mobile-nav.tsx` (mobile).
- The whole marketplace surface renders inside a `bg-white text-zinc-900` wrapper so it always matches the video's light shopping-app look, regardless of the global dark/light theme. Accent colour is `#6A11CB` (used via Tailwind arbitrary values like `bg-[#6A11CB]`). All cards use `rounded-2xl` + `shadow-sm` (hover `shadow-md`), and framer-motion provides staggered entrance animations on promo cards, store rows and product grids.

Self-Verification:
- `cd /home/z/my-project && bun run lint` → **EXIT=0, 0 errors, 0 warnings**.
- `GET /api/marketplace/products` → HTTP 200, returns 6 categories, 2 promos, 6 stores (Nike/Adidas/Macy's/Levi's/Starbucks/Puma), 15 products (verified via curl + python json parse).
- Dev server recompiled cleanly (dev.log shows `✓ Compiled` and the view successfully called `/api/marketplace/products`).

Stage Summary:
- **Files created**:
  - `src/app/api/marketplace/products/route.ts` (public REST endpoint with typed catalog).
  - `src/components/gaexpay/views/marketplace-view.tsx` (834-line video-matching marketplace).
- **Files edited**:
  - `src/lib/store.ts` — added `"marketplace"` to `View` union.
  - `src/lib/i18n/translations.ts` — added 40 `marketplace.*` keys + `nav.marketplace` to EN base.
  - `src/components/gaexpay/app-shell.tsx` — imported + registered `MarketplaceView`.
  - `src/components/gaexpay/sidebar.tsx` — added `ShoppingBag` import + "Marketplace" nav item (badge "New").
  - `src/components/gaexpay/mobile-nav.tsx` — same nav entry for the mobile drawer.
- **Key design decisions**:
  1. Marketplace is a *white surface* independent of the global theme — wraps everything in `bg-white text-zinc-900`.
  2. Three sub-views (home → store → product) handled with local state to honour the "single `/` route" constraint.
  3. Purple `#6A11CB` accent for active pills, "Popular" badges, hero buttons, selected star fills.
  4. Emerald accent reserved for discounts ("In Stock" badges, "Add to Cart", promo gradient, store checkmarks).
  5. All prices NGN-denominated so the existing `useFormatMoney` converts to the user's preferred display currency.
  6. Real `useFetch("/api/marketplace/products")` integration + `useTranslation()` + `useFormatMoney()` retained; no new npm packages installed.
- **No existing functionality removed** — purely additive: a new view, a new API route, a new nav entry.
