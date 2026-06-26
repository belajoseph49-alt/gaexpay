# Task 16-d — i18n Business & Misc Views Wiring Specialist

**Agent**: i18n Business & Misc Views Wiring Specialist
**Task ID**: 16-d
**Scope**: Wire `useTranslation()` into 9 business/misc views + create `src/lib/i18n/keys-business.ts` with all translation keys in 12 languages (en, fr, ru, zh, ar, es, de, ew, ff, sw, ln, ha). DO NOT edit `translations.ts` — the coordinator will merge `keys-business.ts`.

## Views in scope
1. `src/components/gaexpay/views/business-dashboard-view.tsx`
2. `src/components/gaexpay/views/team-view.tsx`
3. `src/components/gaexpay/views/invoices-view.tsx`
4. `src/components/gaexpay/views/payroll-view.tsx`
5. `src/components/gaexpay/views/calendar-view.tsx`
6. `src/components/gaexpay/views/scheduled-view.tsx`
7. `src/components/gaexpay/views/statement-view.tsx`
8. `src/components/gaexpay/views/international-transfer-view.tsx`
9. `src/components/gaexpay/views/unified-address-view.tsx`

## Approach
- Reuse existing keys from `translations.ts` where they already exist (e.g. `scheduled.title`, `calendar.title`, `statement.title`, `unifiedAddress.title`).
- Add new keys under `business.*`, `team.*`, `invoices.*`, `payroll.*`, `international.*`, plus a few additions to `calendar.*`, `scheduled.*`, `statement.*`, `unifiedAddress.*` namespaces.
- Each view: import `useTranslation`, call `const { t } = useTranslation()`, replace ALL user-facing English strings with `t("key")` calls (including toasts, placeholders, labels, badges, empty states).
- The `useTranslation` hook will return the raw key string until the coordinator merges `keys-business.ts` into `translations.ts` — that is expected and acceptable.

## Progress
- [ ] Read worklog, use-translation hook, translations.ts structure, dashboard-view reference
- [ ] Create `src/lib/i18n/keys-business.ts`
- [ ] Wire 9 views
- [ ] Lint + dev.log check
- [ ] Append to worklog.md
