# Task 26-B — Rebuild Bills Tab: Real Localized Services + GPS + Payment Flow

**Agent**: Senior Fintech Engineer
**Date**: 2025
**Task ID**: 26-B

## Objective

Rebuild the Bills tab in Pay & Bills to show REAL localized service providers
per country (sourced from 26-A's `country-services` directory), with GPS-based
detection, a category browser, and a category-aware payment flow with full
traceability through the existing `/api/pay-merchant` endpoint.

## Scope

1. **NEW** `src/hooks/use-geolocation.ts` — explicit-permission GPS hook with
   reverse geocoding + localStorage caching.
2. **MODIFIED** `src/components/gaexpay/views/pay-view.tsx` — replaced the
   placeholder `BillsPay` (which used the static `BILL_CATEGORIES` grid) with
   a real **localized services browser**:
   - Location banner with "Change location" CTA
   - 13 horizontally-scrollable category tabs (1-to-1 with `SERVICE_CATEGORIES`)
   - Provider cards with type / city coverage / "Plans from ₦X" hints
   - Category-aware payment sheet (Drawer on mobile, Dialog on desktop)
   - Recent bill payments list (filters `/api/transactions?type=bill`)
   - Location selector Dialog with GPS auto-detect, country dropdown, city input

## Inputs read

- `/home/z/my-project/worklog.md` — project history & conventions.
- `/home/z/my-project/agent-ctx/26-A-senior-data-engineer.md` — upstream task
  that built `src/lib/country-services.ts` + `/api/country-services` route.
  Confirmed response shape: `{ country, resolvedFrom, city, category, counts,
  services: { [cat]: AnyProvider[] }, servicedCountries }`.
- `/home/z/my-project/src/lib/country-services.ts` — provider type union
  (`CityProvider`, `PlanProvider`, `PackageProvider`, `UniversityProvider`,
  `CoverageProvider`, `ServiceListProvider`) drove the `AnyProvider` union
  type and the per-category payment form fields.
- `/home/z/my-project/src/app/api/country-services/route.ts` — confirmed
  `?country=NG&city=Lagos&category=internetProviders` returns 7 ISPs with
  NGN plans.
- `/home/z/my-project/src/app/api/pay-merchant/route.ts` — confirmed it
  accepts `{ amount, currency, type:"bill", category, counterpartyName,
  method:"wallet", description }` and returns `{ success, transaction }`
  with a `reference` for traceability.
- `/home/z/my-project/src/app/api/me/route.ts` — confirmed `user.country`
  (full name like "Nigeria") and `user.city` are returned for fallback.
- `/home/z/my-project/src/hooks/use-format-money.ts` — `fmt(amountNGN,
  fallbackCurrency?)` lets us format plan prices in their original currency
  (NGN/XOF/KES/etc.) instead of always converting to the user's display
  currency.
- `/home/z/my-project/src/lib/gaexpay.ts` — `COUNTRIES` (40 entries with
  code/name/flag/currency) and `timeAgo`.
- `/home/z/my-project/src/lib/store.ts` — `useApp` has `userCurrency` only,
  so we fetch `/api/me` directly for the country/city fallback.

## Deliverables

### 1. `src/hooks/use-geolocation.ts` (NEW, ~180 lines)

- **`useGeolocation()`** hook returns:
  `{ latitude, longitude, accuracy, loading, error, request, location }`.
- **`request()`** is explicit (calls `getCurrentPosition`) — the browser
  permission prompt only appears when the user clicks "Use GPS".
- **Reverse geocoding** via BigDataCloud's free, no-API-key endpoint
  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=..&longitude=..&localityLanguage=en`
  — returns `countryName`, `countryCode` (ISO-3166 alpha-2), `city`/`locality`.
- **localStorage caching** (`gxp_last_location`) so the UI can render
  instantly on subsequent loads without re-prompting.
- **Graceful error handling** — `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`,
  `TIMEOUT` all collapse to friendly user-facing strings; the hook never
  throws.
- **Cache → GPS → error** precedence: on mount we hydrate from localStorage
  (source="cache"); when the user presses "Use GPS", we replace the cached
  value with a fresh fix (source="gps").

### 2. `src/components/gaexpay/views/pay-view.tsx` — `BillsPay` rebuild

**Constants added**:
- `BILLS_CATEGORY_TABS` — 13 entries with `{ id, label, Icon, kind }`,
  where `kind ∈ { "plan", "package", "meter", "route", "amount", "patient",
  "prescription", "student", "fuel", "policy", "tax" }` drives the payment
  form fields.
- `AnyProvider` — discriminated union of all 6 provider shapes from
  `country-services.ts`.
- `CountryServicesResp`, `MeResp`, `SelectedLocation` — typed API responses.

**Location resolution** (one-time `useEffect`):
1. `geo.location` (GPS or cache) — preferred.
2. `/api/me` `user.country` (full name → ISO code via `COUNTRIES`) + `user.city`.
3. Last resort: Nigeria / Lagos.

The "GPS" badge on the banner only shows when `source === "gps"` (a real
fresh fix), not for cached or profile-derived locations.

**Provider fetch** (`useEffect` on `[location, activeCategory]`):
- Calls `/api/country-services?country=NG&city=Lagos&category=X` via
  `fetch` with `AbortController` for cleanup on rapid tab switches.
- Loading / error / empty states handled separately.

**Provider card** (`<ProviderCard>`):
- Icon (category-specific) + name + type pill.
- Per-shape summary line: city list (`Lagos +2 more`), coverage text,
  services list, or tuition range.
- Price hint: "Plans from ₦100" (cheapest plan/package), or tuition range
  for universities.
- CTA: "Pay" (default) or "Subscribe" (for plan/package categories).

**Payment sheet** (`<PaySheet>` wrapper, Drawer on mobile / Dialog on desktop):
- Header accent: category icon in a tinted circle.
- Provider/service summary card.
- **Category-aware form** rendered by `<PaymentForm>`:
  - `plan` / `package` → Select dropdown of plans/packages with price;
    amount is auto-set from the selected plan's price.
  - `meter` (electricity, water) → meter/account number input + amount.
  - `route` (transport) → free-text route/trip + amount.
  - `patient` (hospitals) → patient ID + amount.
  - `prescription` (pharmacies) → prescription reference + amount.
  - `student` (universities) → student ID + semester + amount, with
    tuition range hint.
  - `fuel` (fuel stations) → station/pump + litres (optional) + amount.
  - `policy` (insurance) → Select policy type (from `provider.services`)
    + amount.
  - `tax` (government) → Select tax type (from `provider.services`) +
    reference/TIN + amount.
  - `amount` (restaurants, supermarkets) → just amount.
- Amount input uses the shared `<AmountInput>` (₦ symbol + quick chips).
- Fee summary: amount / "Free (wallet)" / total.
- Validation runs on submit; toast error if any required field is missing.
- `Pay Now` POSTs to `/api/pay-merchant` with:
  ```json
  {
    "amount": 5000,
    "currency": "NGN",            // from COUNTRIES[code].currency
    "type": "bill",
    "category": "internetProviders",
    "counterpartyName": "MTN Nigeria",
    "method": "wallet",
    "description": "MTN Nigeria - Monthly 10GB payment"
  }
  ```
- On success: closes the sheet, fires a Sonner toast with the reference,
  shows the existing `<SuccessSheet>` with reference + recipient + amount,
  and reloads the recent bills list.

**Recent bills**:
- Uses `useFetch("/api/transactions?type=bill&limit=5")` — same pattern as
  the old code, but the empty-state copy now says "Pick a provider above".

### 3. `<LocationDialog>` — Change location dialog

- "Use GPS to auto-detect" button (calls `geo.request()`, shows progress).
- Country dropdown — filtered to the 15 serviced countries (`NG, GH, KE,
  UG, TZ, RW, CM, CI, SN, ML, BF, TG, BJ, EG, MA`) so users can't pick a
  country with no providers.
- City free-text input with placeholder examples (`Lagos, Nairobi, Accra…`).
- Helpful hint: "Leave blank to see all providers in the selected country."
- GPS-detected location is reflected back into the form fields.
- Save → updates `BillsPay`'s `location` state, which retriggers the
  provider fetch.

### 4. UI / UX

- **Mobile**: provider cards single column, payment sheet uses `Drawer`
  (bottom sheet).
- **Desktop**: cards in 2-column grid (lg: 3-column), payment sheet uses
  `Dialog` (centered modal).
- **Category tabs**: horizontally scrollable on all sizes, pill-shaped,
  active tab uses `bg-primary text-primary-foreground`.
- **Loading**: skeleton provider cards (×6) with icon + text + button
  skeletons.
- **Empty state**: `EmptyState` with the active category's icon and a
  contextual message: "No {category} providers found in {country}. Try
  another location or pick a different category."
- **Animations**: Framer Motion `motion.div` with `layout` + initial/exit
  opacity/translate for provider cards; `AnimatePresence mode="popLayout"`
  for smooth reordering when switching categories.
- **All amounts** use `useFormatMoney().fmt()`, which respects the user's
  preferred display currency (default NGN).

### 5. Cleanup

Removed now-unused code from `pay-view.tsx`:
- `CATEGORY_GROUPS` constant (was only used by the old `BillsPay`).
- `BILL_CATEGORIES` import (replaced by `BILLS_CATEGORY_TABS`).
- `BillsCategoryKind` type alias (declared but never used).
- `ResolvedLocation` type import (we built our own `SelectedLocation`).
- `RefreshCw` icon import (unused).

### Verification

- ✅ `bun run lint` → 0 errors, 0 warnings.
- ✅ Dev server compiles cleanly; no errors in `dev.log`.
- ✅ `GET /api/me` → 200, returns `{ user: { country: "Nigeria", city: "Lagos" } }`.
- ✅ `GET /api/country-services?country=NG&city=Lagos&category=internetProviders`
  → 200, returns 7 ISPs (MTN, Airtel, Glo, 9mobile, Spectranet, Smile,
  Starlink) with their NGN plan lists.
- ✅ `POST /api/pay-merchant` with `{ amount:5000, currency:"NGN",
  type:"bill", category:"internetProviders", counterpartyName:"MTN Nigeria",
  method:"wallet", description:"MTN Nigeria - Monthly 10GB payment" }`
  → 200, returns `{ success:true, transaction:{ reference:"GXPMQM3C2WDQGZE",
  type:"bill", category:"internetProviders", counterpartyName:"MTN Nigeria",
  status:"completed" } }`.
- ✅ `GET /api/transactions?type=bill&limit=5` → 200, includes the
  transaction we just created with full traceability (reference, amount,
  counterparty, description, timestamp).
- ✅ Lint passes after removing the 5 unused symbols above.
- ✅ The `/` route continues to render in 18–30 ms (no perf regression).

### Files added/modified

- **NEW** `src/hooks/use-geolocation.ts` (~180 lines, GPS + reverse
  geocoding + localStorage cache + friendly errors).
- **MODIFIED** `src/components/gaexpay/views/pay-view.tsx`:
  - Added imports: `Select` components, `useGeolocation`, `COUNTRIES`,
    11 new Lucide icons (`MapPin`, `Navigation`, `Wifi`, `Droplet`, `Tv`,
    `Bus`, `Pill`, `GraduationCap`, `Fuel`, `Shield`, `Landmark`, `Globe`,
    `SlidersHorizontal`, `Building2`), `DialogFooter`.
  - Removed: `BILL_CATEGORIES` import, `CATEGORY_GROUPS` constant,
    `BillsCategoryKind` type alias, `RefreshCw` icon, `ResolvedLocation`
    type import.
  - Replaced the entire `BillsPay` function (was ~180 lines of placeholder
    category grid → now ~520 lines including the localized services
    browser, `ProviderCard`, `PaymentForm`, and `LocationDialog`
    subcomponents).

### Notes for downstream agents

- The 13 category tabs in `BILLS_CATEGORY_TABS` are kept in 1-to-1
  correspondence with `SERVICE_CATEGORIES` in
  `src/lib/country-services.ts` — if you add a new category there, add a
  matching entry here (and a new `kind` if the payment form needs new
  fields).
- The 15 serviced countries are hard-coded in `LocationDialog`'s
  `SERVICED_CODES`. If 26-A's directory grows beyond 15 countries, update
  this list (or import `listServicedCountries()` from
  `@/lib/country-services` directly — it's safe to bundle since the file
  has no server-only imports).
- The GPS hook uses BigDataCloud's free reverse-geocode endpoint (no API
  key, no rate limit documented). If we ever need higher reliability,
  swap `reverseGeocode()` for a paid provider (Google, Mapbox, Nominatim
  with backoff).
- All payments go through `/api/pay-merchant` (the existing generic
  payment endpoint), so they automatically get audit logs, notifications,
  rate limiting, and the same `Transaction` schema as QR-pay and airtime.
  No backend changes were required.
- The currency used for the payment is `COUNTRIES[location.countryCode].currency`
  (e.g. NGN for Nigeria, KES for Kenya, XOF for Senegal), so a user in
  Dakar paying SENELEC sees the transaction in XOF, not NGN.
