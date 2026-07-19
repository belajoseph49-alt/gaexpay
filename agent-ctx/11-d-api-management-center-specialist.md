# Task 11-d — API Management Center Specialist

## Summary
Built a complete API Management Center for the GaexPay admin panel, covering all 12 external service categories (payment, blockchain, kyc, kyb, sms, email, push, geolocation, ai, exchange_rate, cloud_storage, auth). The view is accessible from the sidebar under "Platform → API Management" and is gated behind `api.view` (and per-action permissions for create/edit/delete/test/logs).

## Files Created
### Server-side
- `src/lib/api-client.ts` — `getApiConfig`, `getApiConfigs`, `getApiConfigById`, `logApiCall`, `parseCredentials`, `serializeCredentials`, `maskCredential`, `sanitizeCredentialsForLog`.
- `src/app/api/admin/api-configs/route.ts` — GET (list, credentials stripped) / POST (create) / PATCH (bulk toggle). Permission: `api.view` / `api.create` / `api.edit`.
- `src/app/api/admin/api-configs/[id]/route.ts` — GET (single, with credentials) / PATCH / DELETE. Permissions: `api.view` / `api.edit` / `api.delete`.
- `src/app/api/admin/api-configs/[id]/test/route.ts` — POST with 12 per-service live test implementations (Stripe/Twilio/SendGrid/FCM/Google Maps/OpenAI/OXR/S3/OAuth...). Permission: `api.test`.
- `src/app/api/admin/api-configs/[id]/logs/route.ts` — GET (filtered) / DELETE (clear). Permissions: `api.logs` / `api.delete`.
- `src/app/api/admin/api-configs/stats/route.ts` — GET aggregated stats (totals, byService, topUsed, topErrors, 14-day series, response-time buckets, recent errors). Permission: `api.view`.

### Client-side (view + 5 sub-modules)
- `src/components/gaexpay/views/api-management-view.tsx` — main view (4 tabs: Overview / APIs / Logs / Statistics, KPIs, modals).
- `src/components/gaexpay/views/api-management/data.ts` — `SERVICE_META` for all 13 categories (12 + other) with icons, colors, credential field templates; types; health helpers.
- `src/components/gaexpay/views/api-management/overview-dashboard.tsx` — 13 service-category cards with health indicators + per-card API lists.
- `src/components/gaexpay/views/api-management/api-list-tab.tsx` — searchable / filterable / sortable table with row actions.
- `src/components/gaexpay/views/api-management/edit-modal.tsx` — 3-tab form (Basic / Credentials / Advanced) with dynamic credential fields per service, secret masking, custom field support.
- `src/components/gaexpay/views/api-management/logs-viewer.tsx` — config selector + level/days filters + search + expandable rows + CSV export + clear-all.
- `src/components/gaexpay/views/api-management/stats-tab.tsx` — 4 health KPIs + 4 charts (area, line, bar, horizontal-bar) + 2 leaderboards + recent-errors feed.

## Files Edited
- `src/lib/store.ts` — added `"api-management"` to View union (also cleaned up a duplicate from a prior in-progress edit).
- `src/components/gaexpay/sidebar.tsx` — added "API Management" nav item (Plug icon, "Config" badge) to the Platform section.
- `src/components/gaexpay/mobile-nav.tsx` — same nav item for the mobile drawer.
- `src/components/gaexpay/app-shell.tsx` — imported `ApiManagementView`, registered in view map.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `npx tsc --noEmit` → 0 errors in any of my files (api-configs, api-management, api-client).
- Dev server stable on port 3000; latest dev.log entries show only 200/201 responses.
- curl tests with admin cookie (admin@gaexpay.com / Admin@2025):
  - GET /api/admin/api-configs → 200, 27 configs across 12 service categories.
  - GET /api/admin/api-configs/stats → 200, totals + byService (12) + topUsed + topErrors + 14-day series + responseTimeDistribution + recentErrors.
  - GET /api/admin/api-configs/[id] → 200, single config with credentials.
  - POST /api/admin/api-configs/[id]/test → 200, made a real network call to https://data.fixer.io/api/latest?base=USD, returned HTTP 200 in 719ms. Result was logged to ApiLog and counters incremented.
  - PATCH /api/admin/api-configs/[id] → 200, toggled enabled.
  - POST /api/admin/api-configs → 201, created new config.
  - DELETE /api/admin/api-configs/[id] → 200, cascade-deleted logs.
  - DELETE /api/admin/api-configs/[id]/logs → 200, cleared logs.
  - Demo-user token → 403 "Insufficient permissions, requiredPermission: api.view" on all api-configs endpoints. ✅
- Note: had to reset admin password via direct Prisma update — the seed-admin script from Task 11-a only sets the password when the field is empty, and the existing admin had a placeholder hash `admin_hash_secure`. After update, `Admin@2025` works.

## Features Delivered
- ✅ A. Overview Dashboard — 12 service-category cards with health indicators (green/amber/red/gray), per-service stats, Test button on each entry.
- ✅ B. API List & Configuration — searchable/filterable/sortable table, click-to-edit.
- ✅ C. Add/Edit API Modal — 3-tab form (Basic/Credentials/Advanced), dynamic credential fields per service, secret masking with Eye/EyeOff, custom field support.
- ✅ D. Test Connection — 12 per-service live test implementations, real network calls with 8s timeout (12s for AI), format-only fallback when server can't reach provider, logs to ApiLog, updates lastUsedAt/lastErrorAt/totalRequests/failedRequests.
- ✅ E. API Logs Viewer — config selector, level + days filters, search, expandable rows with request/response bodies, CSV export, clear-all with AlertDialog confirm.
- ✅ F. Usage Statistics — 4 health KPIs, requests-over-time area chart, error-rate line chart, response-time distribution bar chart, requests-by-service horizontal bar chart, top-5 most-used leaderboard, top-5 most-erroring leaderboard, recent errors feed.
- ✅ Navigation — "API Management" in sidebar (desktop + mobile), registered in store + app-shell, visible with "Config" badge.
- ✅ RBAC — every endpoint guarded by `requirePermission(req, "api.view|create|edit|delete|test|logs")`.
