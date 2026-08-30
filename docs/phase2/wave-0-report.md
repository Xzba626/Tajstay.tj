# Wave 0 Report — Trust Blockers + Quality Gate

**Status:** **PASS** (build + lint green; browser QA at 390px completed for public routes)

**Wave:** 0  
**Branch:** `cleanup-project`  
**Date:** 2026-08-30

---

## Implemented

| Item | Change |
|------|--------|
| **Telegram error** | Button only when `isTelegramLoginConfigured()`; 503 → `reason: not_configured`; user message `auth.telegramUnavailable` |
| **Owner city validation** | City `<select>` with canonical TJ cities; `normalizeTajikCity()` on API |
| **Cookie banner** | Mobile `app-shell` positioning above bottom nav + TST FAB (`globals.css`) |
| **Payment methods** | Moved to `?section=finances` only via `OwnerPaymentMethodsPanel` |
| **Booking nav** | Removed `/booking`, `/payment`, `/chat/booking` from History tab active match |
| **Locale dates** | `LocaleDateInput` in booking wizard + formatted hint |
| **Photo placeholders** | `PhotoPlaceholder` for `HotelCard` + `RoomPhotoCarousel` |
| **i18n** | Localized hero aria-labels; `media.*`, `auth.telegramUnavailable`, payment catalog hint |
| **TST mobile close (P1)** | Bottom sheet + z-index 100/101; larger close target; Escape + toolbar X verified |
| **Build fixes** | Restored imports; `search/page.tsx` async `searchParams` |

---

## Build

```
npm run build → PASS (exit 0, ~228s)
```

Note: Prisma auth warnings to `localhost` during static generation — non-blocking.

---

## Lint

```
npm run lint → PASS (exit 0)
```

5 pre-existing warnings: `OwnerOnboardingExperience.tsx` (`react-hooks/exhaustive-deps`).

---

## Tests

**N/A** — no `test` script in `package.json`.

---

## Browser QA (390×844)

| Route | Result | Notes |
|-------|--------|-------|
| `/auth/sign-in` | **PASS** | Form, Telegram/Google buttons, no raw config errors |
| `/` (home) | **PASS** | Bottom nav, localized hero aria, search form |
| `/profile` (guest) | **PASS** | Sign-in prompt + CTA |
| `/profile/become-owner` | **PASS** | Redirects to sign-in when unauthenticated |
| **TST open/close** | **PASS** | Bottom sheet opens; toolbar X closes; Escape closes |
| Cookie banner | **PARTIAL** | Not triggered in session (already accepted / no first-visit) |
| `/booking` | **DEFERRED** | Requires authenticated session + seed hotel |
| `/dashboard/owner?section=finances` | **DEFERRED** | Requires OWNER auth |

---

## TST Fix Evidence

**Problem:** Mobile close button clicks intercepted by site header / wrong a11y target.  
**Change:** Panel z-index 101, backdrop 100, bottom-sheet layout, 2.75rem close button, distinct backdrop aria-label.  
**Verified:** Toolbar close (2nd "Закрыть" in tree) closes panel; Escape key closes; FAB returns.

---

## Security impact

Wave 0 changes are presentation + validation only. No auth contract changes.

---

## Known issues

1. Authenticated flows (booking, owner finances) need seed accounts for full QA.
2. Cookie banner re-test needs fresh storage / incognito.
3. Owner onboarding lint warnings remain (pre-existing).

---

## Deferred (Wave 1+)

- Profile full redesign (Step 3 — in progress)
- Admin command center
- Owner mobile-first workspace
- TST visual identity + greeting bubble polish
- Manager role/workspace

---

## Files changed (Wave 0 + gate fixes)

See git diff on `cleanup-project`. Key paths:

- `src/styles/tst-assistant.css`
- `src/components/ai/TstAssistant.tsx`
- `src/lib/i18n/messages.ts` (`tstAssistant.dismissOverlay`)
- `src/app/search/page.tsx`
- Wave 0 files listed in prior commit
