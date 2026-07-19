# Task 11-a — Database Schema & RBAC Foundation Specialist

## Objective
Lay the production-grade infrastructure for GaexPay: account types (personal/business), KYB business profiles, centralized API config management, feature flags, configurable fees, and a full RBAC layer (9 roles / 60+ permissions). Seed a super admin.

## Files Touched

### Created
| File | Purpose |
|---|---|
| `prisma/seed-admin.ts` | Idempotent super-admin seeder. Handles 3 cases: existing super_admin (no-op), existing user at target email (upgrade), or fresh create. Uses env vars `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE`. |
| `prisma/seed-config.ts` | Idempotent config seeder. Seeds 27 API configs (12 service categories), 20 feature flags, 7 fee configs. All API configs disabled by default with placeholder credentials. |
| `src/lib/rbac.ts` | RBAC helper. `Role` union, `ROLES` metadata, `PERMISSIONS` const (60+), `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `getRolePermissions`, `isAdmin`, `isSuperAdmin`, `getRoleLabel`, `parsePermissions`. |

### Modified (additive only)
| File | Changes |
|---|---|
| `prisma/schema.prisma` | +2 fields on `User` (`accountType`, `permissions`), +1 relation (`businessProfile`). +5 new models (`BusinessProfile`, `ApiConfig`, `ApiLog`, `FeatureFlag`, `FeeConfig`) with appropriate indexes. No existing fields/models removed. |
| `src/lib/api-auth.ts` | Added imports (`db`, `parsePermissions`, `hasPermission`), `AuthUser` interface, `RoleAuthResult` type, `requireRole(req, roles[])` and `requirePermission(req, permission)` async helpers. Existing `getAuthUserId`, `requireAuth`, `getClientIdentifier` untouched. |

## Schema Additions

### `User` (additive fields)
- `accountType String @default("personal")` — `personal | business`
- `permissions String @default("[]")` — JSON array of permission strings; `"*"` grants all
- `businessProfile BusinessProfile?` — relation for KYB data

### New Models
1. **BusinessProfile** — KYB data (company name, registration #, tax ID, directors JSON, beneficial owners JSON, documents JSON, KYB status & tier, submission/verification timestamps). 1:1 with User.
2. **ApiConfig** — Centralized API key store. Fields: `service` (payment/blockchain/kyc/kyb/sms/email/push/geolocation/ai/exchange_rate/cloud_storage/auth/other), `provider`, `credentials` (JSON), `baseUrl`, `webhookUrl`, `environment` (sandbox/production), `enabled`, `isDefault`, rate limits, monitoring (lastUsedAt, lastError, totalRequests, failedRequests). Index on `[service, enabled]`.
3. **ApiLog** — Per-config request/error logs. Fields: `level` (info/warn/error), `message`, `endpoint`, `statusCode`, `responseTimeMs`, sanitized request/response bodies. Indexes on `[apiConfigId, createdAt]` and `[level, createdAt]`.
4. **FeatureFlag** — Module toggles. Fields: `key` (unique), `enabled`, `accountTypes` (JSON), `roles` (JSON), `category`. Defaults: enabled for personal+business, user+admin.
5. **FeeConfig** — Configurable fees. Fields: `name` (unique), `feeType` (percentage/fixed/mixed), `feeValue`, `fixedFee`, `currency`, min/max caps, `transactionType`, `accountType`, `enabled`.

## RBAC Design

### 9 Roles
| Role | Label (FR) | Default Permissions |
|---|---|---|
| `super_admin` | Super Administrateur | `["*"]` (wildcard) |
| `admin` | Administrateur | All PERMISSIONS except `roles.*` and `api.delete` |
| `moderator` | Modérateur | disputes + content + users.view |
| `support` | Support | users.view + tickets + notifications.view |
| `financial_manager` | Gestionnaire Financier | transactions + wallets + fees + reports |
| `kyc_manager` | Gestionnaire KYC/KYB | kyc + kyb + users.view |
| `marketplace_manager` | Gestionnaire Marketplace | businesses + products + merchants |
| `content_manager` | Gestionnaire Contenu | content + notifications + templates |
| `user` | Utilisateur | `[]` (no admin permissions) |

### 60+ Permissions (grouped)
- **Users**: view, create, edit, delete, suspend
- **Businesses**: view, verify, reject, suspend
- **Transactions**: view, reverse, flag, export
- **Wallets**: view, adjust, freeze
- **Currencies**: view, add, edit, toggle
- **Fees**: view, edit, create
- **API Config**: view, create, edit, delete, test, logs
- **Feature Flags**: view, toggle
- **Notifications**: view, send, template
- **Content**: view, edit, publish
- **Roles & Permissions**: view, assign, edit
- **Disputes**: view, resolve, assign
- **Reports**: view, export, schedule
- **Security**: view, audit, block, unblock
- **KYC/KYB**: view, approve, reject (each)
- **Modules**: view, toggle
- **Settings**: view, edit

### API Route Guards (in `src/lib/api-auth.ts`)
```ts
// Role check
const auth = await requireRole(req, ["admin", "super_admin"]);
if ("error" in auth) return auth.error;
const { userId, user } = auth; // user: { id, role, permissions[], accountType, status }

// Permission check
const auth = await requirePermission(req, "users.delete");
if ("error" in auth) return auth.error;
```

Both helpers:
- Verify authentication (delegates to `getAuthUserId`)
- Load user from DB (id, role, permissions, accountType, status)
- Reject suspended/inactive users (403)
- Return 401 if unauthenticated, 404 if user not found, 403 if insufficient permissions
- Support wildcard `"*"` permission (super_admin)

## Super Admin Credentials

| Field | Value |
|---|---|
| Email | `admin@gaexpay.com` |
| Password | Existing (retained from previous admin user — reset via admin UI if forgotten; for a fresh deploy defaults to `Admin@2025`) |
| Username | `admin` |
| Role | `super_admin` |
| Permissions | `["*"]` (all permissions via wildcard) |
| Account Type | `personal` |
| KYC Status | `verified` (tier 3) |
| Status | `active` |
| User ID | `cmqk4on7x0001l54p0fk1j9xn` |

Override via env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE`.

## Seed Results

| Resource | Count | Notes |
|---|---|---|
| API configs | 27 | Across 12 service categories (payment:3, blockchain:3, kyc:2, kyb:2, sms:2, email:2, push:2, geolocation:2, ai:2, exchange_rate:2, cloud_storage:2, auth:3). All **disabled** by default — admin must configure credentials before enabling. |
| Feature flags | 20 | Covers crypto_trading, pi_network, international_transfer, qr_payments, mobile_money, virtual_cards, savings_goals, budgets, scheduled_transfers, analytics, spending_map, merchant_dashboard, business_pro, developer_portal, treasury, aml_compliance, enterprise_admin, push/email/sms notifications. |
| Fee configs | 7 | transfer_fee (1.5%), exchange_fee (2%), crypto_swap_fee (1%), bill_payment_fee (0.5%), card_fee (2.5%), international_transfer_fee (mixed 1.5% + ₦500), withdrawal_fee (1%). All with min/max caps. |
| Super admin | 1 | Upgraded existing `admin@gaexpay.com` user. |

## Verification Results

1. `bun run db:push` — ✅ schema synced, Prisma Client regenerated (v6.19.2)
2. `bun run prisma/seed-admin.ts` — ✅ existing admin user upgraded to super_admin with `["*"]` permissions
3. `bun run prisma/seed-config.ts` — ✅ 27 API configs + 20 feature flags + 7 fee configs seeded
4. `bun run lint` — ✅ **0 errors, 0 warnings**
5. Super admin verification query — ✅ confirmed `role: super_admin`, `permissions: ["*"]`, `kycTier: 3`, `status: active`
6. Dev server log — ✅ stable, only 200 OK responses

## Key Design Decisions

1. **Backward compatibility**: The `role` field retains its original enum values (`user | admin | agent | support`) — new roles are appended. Existing routes using `requireAuth` continue to work unchanged.

2. **Two-tier authorization**: `requireRole` for coarse role-based checks (backward compat with existing admin routes), `requirePermission` for granular permission checks (new admin panel routes). Wildcard `"*"` works in both.

3. **Idempotent seeders**: All seeders use find-then-update-or-create patterns — safe to re-run, won't duplicate or overwrite user-configured values (e.g. enabled state, credentials JSON).

4. **API configs disabled by default**: Security best practice — admin must explicitly enable each integration after configuring credentials. The `isDefault` flag allows marking one provider per service as the primary.

5. **Granular monitoring**: `ApiConfig` tracks `lastUsedAt`, `lastErrorAt`, `lastError`, `totalRequests`, `failedRequests` — admin UI can surface health at a glance. `ApiLog` provides detailed audit trail.

6. **JSON fields for flexibility**: `directors`, `beneficialOwners`, `documents` (BusinessProfile), `credentials` (ApiConfig), `accountTypes`, `roles` (FeatureFlag) all use JSON-encoded string fields — SQLite-compatible and flexible for evolving schemas.

7. **Fee structure supports all common patterns**: `percentage` (e.g. 1.5% of amount), `fixed` (e.g. ₦100 flat), `mixed` (e.g. 1.5% + ₦500 floor). Min/max caps allow free tiers and ceilings.

## Next Steps for Downstream Agents

- **Admin panel UI** (task 11-b+): Build the admin pages consuming these models — API config CRUD, feature flag toggles, fee editor, business KYB review queue.
- **Apply `requireRole`/`requirePermission`** to existing admin API routes under `/api/admin/*` to enforce the new RBAC.
- **Business onboarding flow**: Use `BusinessProfile` model for the KYB wizard in the business-pro view.
- **Feature flag middleware**: Create a server-side helper to check feature flags before enabling routes/views.
- **Fee calculation service**: Create `src/lib/fees.ts` that reads `FeeConfig` rows and computes fees for each transaction type.
