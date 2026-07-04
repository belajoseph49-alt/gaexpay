# Task ID: beta-4-5
# Agent: OAuth & Admin API Integration Specialist

## Task
Google/Facebook OAuth login + Admin API & Integrations section (Google, Facebook, WhatsApp Business credentials).

## Work Log

1. **Read worklog + explored existing project structure** to understand:
   - Existing `/api/auth/signup` flow (initial balance, wallet, notifications)
   - `/api/auth/login` JWT/cookie pattern (`gxp_token` cookie, 7-day TTL)
   - `src/lib/auth.ts` exposes `hashPassword` + `generateToken`
   - `SystemSetting` Prisma model with `key`, `value`, `category` columns
   - `src/lib/system-settings.ts` helpers (`getSetting`, `setSetting`, `ensureSetting`)
   - Admin section registration pattern in `admin-panel-view.tsx`
   - Existing `section-system-settings.tsx` + `section-developer-portal.tsx` as templates

2. **Google OAuth routes**
   - `src/app/api/auth/google/route.ts` — GET redirects to Google consent screen
     (`https://accounts.google.com/o/oauth2/v2/auth`) with `client_id` from
     `google_client_id` SystemSetting, `redirect_uri` = `${origin}/api/auth/google/callback`,
     `scope=openid email profile`, random 32-char `state` cookie (`gxp_oauth_state`,
     10-min TTL) for CSRF protection. If client ID missing, redirects home with
     `?oauth_error=google_not_configured`.
   - `src/app/api/auth/google/callback/route.ts` — GET verifies state cookie,
     exchanges `code` at `https://oauth2.googleapis.com/token`, fetches profile
     from `https://www.googleapis.com/oauth2/v2/userinfo`, then either logs the
     existing user in (by email) or creates a new account with the same logic as
     `/api/auth/signup` (random password hash, empty phone placeholder, default
     wallet with `signup_initial_balance`, welcome + confirmation notifications,
     beta demo deposit transaction). Sets `gxp_token` cookie + redirects to
     `/?authed=1`.

3. **Facebook OAuth routes**
   - `src/app/api/auth/facebook/route.ts` — GET redirects to
     `https://www.facebook.com/v18.0/dialog/oauth` with `client_id` from
     `facebook_app_id`, scope `email`, redirect URI
     `${origin}/api/auth/facebook/callback`, state cookie.
   - `src/app/api/auth/facebook/callback/route.ts` — GET verifies state, exchanges
     code at `https://graph.facebook.com/v18.0/oauth/access_token`, fetches profile
     from `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name`,
     same create-or-login logic as Google callback.

4. **Auth modal OAuth buttons** — `src/components/gaexpay/auth-modal.tsx`
   - Added inline `GoogleIcon` (multi-color SVG G) and `FacebookIcon` (white F) —
     no new dependency.
   - Added `Divider` (the existing "or" divider was duplicated inline; refactored
     into a component) + `OAuthButtons` (full-width `h-11`, rounded-lg; Google
     = white bg with border, Facebook = `#1877F2` blue bg).
   - Login tab: Sign In → divider → Google → Facebook → divider → Try Demo Account.
   - Signup tab: Create Account → divider → Google → Facebook → trust badges.
   - Buttons do `window.location.href = "/api/auth/google|facebook"` (server-side
     redirect flow, not popup).

5. **Page.tsx OAuth callback handling** — `src/app/page.tsx`
   - Reads `?oauth_error` / `?oauth_message` / `?authed=1` query params on mount,
     shows a toast (error for OAuth failures, success for `authed=1`), then strips
     them from the URL via `history.replaceState`. The actual auth source of truth
     is still `/api/auth/me` (cookie-based).

6. **System settings API** — `src/app/api/admin/system-settings/route.ts`
   - GET now lazy-seeds default OAuth/WhatsApp integration settings in addition
     to the general ones (category `integrations`).
   - PATCH now uses `categoryForKey()` helper: keys with a `.` keep the first
     segment as category (e.g. `general.platformName` → `general`); OAuth/WhatsApp
     keys without a `.` (e.g. `google_client_id`) go under the `integrations`
     category so the admin panel can read them as a single block.

7. **WhatsApp test endpoint** — `src/app/api/admin/integrations/whatsapp-test/route.ts`
   - POST requires `settings.edit` permission, reads `whatsapp_access_token` +
     `whatsapp_phone_number_id` from SystemSetting, sends a template/text message
     via `https://graph.facebook.com/v18.0/{phoneNumberId}/messages`. Returns
     `{ ok, messageId, raw }` on success or a descriptive error message. Logs an
     `integrations.whatsapp.test` audit-log entry.

8. **Admin section** — `src/components/gaexpay/views/admin-panel/section-api-integrations.tsx`
   - Three cards (Google / Facebook / WhatsApp Business) with editable fields:
     - Google: Client ID, Client Secret (masked), Redirect URI (read-only + Copy)
     - Facebook: App ID, App Secret (masked), Redirect URI (read-only + Copy)
     - WhatsApp: Access Token (masked), Phone Number ID, Business Account ID,
       Webhook Secret (masked)
   - Each card has Save + Test buttons. Google/Facebook Test opens the OAuth
     start URL in a new tab. WhatsApp Test POSTs to the whatsapp-test endpoint.
   - "Configured" / "Not configured" badge per card based on credential presence.
   - SecretField component masks stored secrets (`abcd…wxyz`) and reveals on
     focus or eye-toggle, never overwrites with the masked display.
   - Reminder card at the bottom about registering redirect URIs in Google
     Cloud Console / Facebook for Developers.

9. **Register section** — `src/components/gaexpay/views/admin-panel-view.tsx`
   - Added `KeyRound` to lucide imports.
   - Added `"api-integrations"` to `AdminSection` type.
   - Added nav item under the Configuration group:
     `{ id: "api-integrations", labelKey: "admin.apiIntegrations", icon: KeyRound, description: "Google, Facebook, WhatsApp", color: "bg-emerald-500/15 text-emerald-500" }`.
   - Added conditional render for `<ApiIntegrationsSection />`.

10. **Translations** — `src/lib/i18n/translations.ts`
    - Added `"admin.apiIntegrations": "API & Integrations"` to English.
    - Added `"admin.apiIntegrations": "API & Intégrations"` to French.
    - Other languages fall back to English via the `useTranslation` hook.

11. **Seed script** — `prisma/seed-oauth-integrations.ts`
    - Idempotent upsert of all 10 OAuth/WhatsApp integration settings (empty
      values by default, `integrations` category).
    - Ran successfully — verified all 10 rows exist in the SystemSetting table.

## Verification

- **Lint**: `bun run lint` → exit code 0, no errors.
- **Dev log**: No errors related to the new code (only the pre-existing
  `middleware` deprecation warning + memory threshold notice).
- **Browser verification** (agent-browser):
  - Landing page → Sign In modal shows: Sign In button → divider →
    "Continue with Google" → "Continue with Facebook" → divider → Try Demo.
  - Create Account tab shows: Create Account → divider → Continue with Google →
    Continue with Facebook → trust badges.
  - Admin Panel → Configuration → "API & Integrations" nav item is present and
    selected.
  - Section renders all 3 cards with fields + Copy / Show / Test / Save buttons.
- **Endpoint tests** (curl):
  - `GET /api/auth/google` without configured client ID → 307 redirect to
    `/?oauth_error=google_not_configured&oauth_message=…`.
  - `GET /api/auth/google` with dummy `google_client_id` → 307 redirect to
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=…&redirect_uri=…&scope=openid+email+profile&state=…&prompt=select_account`.
  - `GET /api/auth/facebook` → 307 redirect (Facebook not configured).
  - `GET /api/admin/system-settings` without admin → 404 (demo user lacks
    admin role — endpoint correctly protected).
  - `POST /api/admin/integrations/whatsapp-test` without admin → 404 (correctly
    protected).

## Stage Summary

- **Google OAuth login**: full server-side flow (consent → token exchange →
  profile fetch → create-or-login → JWT cookie). Reuses the existing
  `signup_initial_balance` system setting so OAuth users get the same beta
  demo funds as regular signups.
- **Facebook OAuth login**: identical pattern using the Graph API v18.0.
- **CSRF protection**: both providers use a 10-minute `gxp_oauth_state` cookie
  that the callback verifies against the `state` query param.
- **Auth modal**: branded Google (white + multi-color G icon) and Facebook
  (blue + white F icon) buttons in both login and signup tabs, below the form
  and above the Try Demo button, with "or" dividers.
- **Admin section**: API & Integrations card with three sub-cards (Google,
  Facebook, WhatsApp Business), masked secrets, save/test actions, configured
  status badges, and redirect URI copy-to-clipboard helper.
- **WhatsApp test**: real Graph API call to send a `hello_world` template
  message — surfaces the actual Graph API error message if credentials are bad.
- **System settings**: GET now lazy-seeds integration defaults; PATCH groups
  dotless OAuth keys under `integrations` category.
- **No existing features removed**: signup, login, demo, 2FA, forgot/reset
  password flows all untouched. The only mutation to `auth-modal.tsx` is
  refactoring the inline divider into a reusable component and adding OAuth
  buttons + dividers in both tabs.

## Files

### Created
- `src/app/api/auth/google/route.ts`
- `src/app/api/auth/google/callback/route.ts`
- `src/app/api/auth/facebook/route.ts`
- `src/app/api/auth/facebook/callback/route.ts`
- `src/app/api/admin/integrations/whatsapp-test/route.ts`
- `src/components/gaexpay/views/admin-panel/section-api-integrations.tsx`
- `prisma/seed-oauth-integrations.ts`

### Edited
- `src/components/gaexpay/auth-modal.tsx` (added OAuthButtons, Divider,
  GoogleIcon, FacebookIcon; refactored login + signup tabs to use them)
- `src/app/page.tsx` (read oauth_error/authed query params, show toast,
  strip them from the URL)
- `src/app/api/admin/system-settings/route.ts` (lazy-seed integration defaults,
  categoryForKey helper, PATCH groups dotless keys under `integrations`)
- `src/components/gaexpay/views/admin-panel-view.tsx` (added KeyRound import,
  `api-integrations` to AdminSection type, nav item under Configuration,
  conditional render)
- `src/lib/i18n/translations.ts` (added `admin.apiIntegrations` key in en + fr)

## Lint Result
`bun run lint` → **0 errors, 0 warnings**.
