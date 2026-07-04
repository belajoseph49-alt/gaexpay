# Task 17-a — Marketplace & Seller Dashboard Specialist

## Scope
- Added 2 new Prisma models (`Product`, `Order`) + `products`/`orders` relations on `User`.
- Built 6 API routes under `/api/marketplace/` (products list+create, product detail+update+delete, purchase, seller products, seller orders+update, seller stats).
- Seeded 21 demo products across 8 categories with 57 sample orders (8 sellers).
- Built `marketplace-view.tsx` (browse / search / filter / cart / featured carousel / detail modal / receipt).
- Built `seller-dashboard-view.tsx` (stats cards / 4 tabs: Overview, Products, Orders, Analytics / add-edit-delete product modal / accept-ship-complete order actions).
- Added EN translation keys for `marketplace.*` + `seller.*` + `nav.marketplace` + `nav.sellerDashboard`.
- Registered `"marketplace"` + `"seller-dashboard"` in store View type, sidebar, mobile-nav, app-shell views map, command-palette.
- Fixed a pre-existing `TwoFactorSection is not defined` lint error in `security-view.tsx` by adding a minimal 2FA section component.

## Key implementation notes
- **Atomic purchase flow** (`/api/marketplace/purchase`): wraps wallet re-fetch + balance check + wallet debit + Transaction (type "payment", category "shopping") + Order row + product stock decrement + salesCount increment + AuditLog inside `db.$transaction`. Notifications (buyer + seller) created outside the tx. Returns a full receipt payload (reference, orderId, amount, fee, newBalance, newStock, etc.).
- **2% marketplace fee**, capped at 1000 currency units.
- **Stock auto-sync**: PATCHing stock to 0 → status becomes "out_of_stock"; raising stock from 0 → status becomes "active" again.
- **Status flow guard** on order updates: pending → accepted → shipped → completed. Cancel allowed from any non-terminal state. Returns 400 on invalid transitions.
- **Seller authorization**: PATCH/DELETE on a product verifies `product.sellerId === userId`. PATCH on order verifies the order's product belongs to the seller.
- **Delete safety**: a product with open orders (pending/accepted/shipped) cannot be deleted — must complete/cancel them first.
- **Cart checkout**: client iterates cart items sequentially (each is its own atomic purchase) so a partial failure doesn't roll back successful items.

## Files created
- `src/app/api/marketplace/products/route.ts` (GET list + POST create)
- `src/app/api/marketplace/products/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/marketplace/purchase/route.ts` (POST — atomic buy)
- `src/app/api/marketplace/seller/products/route.ts` (GET — seller's products w/ derived revenue)
- `src/app/api/marketplace/seller/orders/route.ts` (GET list + PATCH update status)
- `src/app/api/marketplace/seller/stats/route.ts` (GET — aggregated seller stats)
- `src/components/gaexpay/views/marketplace-view.tsx`
- `src/components/gaexpay/views/seller-dashboard-view.tsx`
- `prisma/seed-marketplace.ts`

## Files edited
- `prisma/schema.prisma` — added `Product` + `Order` models + User.products/User.orders relations
- `src/lib/db.ts` — bumped `PRISMA_CACHE_VERSION` to `v3-marketplace-2026-06`
- `src/lib/store.ts` — added `"marketplace"` + `"seller-dashboard"` to View union
- `src/lib/i18n/translations.ts` — added marketplace + seller + nav keys to EN dictionary
- `src/components/gaexpay/sidebar.tsx` — added Marketplace + Seller Dashboard nav items
- `src/components/gaexpay/mobile-nav.tsx` — added Marketplace + Seller Dashboard mobile nav items
- `src/components/gaexpay/app-shell.tsx` — registered both views in views map
- `src/components/gaexpay/command-palette.tsx` — added Marketplace + Seller Dashboard to command list
- `src/components/gaexpay/views/security-view.tsx` — added `TwoFactorSection` stub (fixes pre-existing lint error)

## Verification
- `bun run lint` — 0 errors, 0 warnings
- `bun run db:push` — schema synced; Prisma client regenerated
- `bunx tsx prisma/seed-marketplace.ts` — seeded 21 products + 57 sample orders
- All API endpoints tested via curl (with CSRF token): products list/detail/create/update/delete, purchase, seller products/orders/stats — all return 200 with correct payloads.
- dev.log: no errors from marketplace routes; only pre-existing StakingPool errors from Task 16 (unrelated).

