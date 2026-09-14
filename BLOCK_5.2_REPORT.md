# BLOCK 5.2 — Payment Flow Foundation: Report

**START_SHA**: `c91d62db362c9e87469ac1e24672a306045a679d` (working tree already carried BLOCK 5.1's uncommitted changes; no reset performed)
**Working tree state at report time**: not committed (per standing instruction — commits only when the user explicitly asks)
**Branch**: `feature/tajstay-full-ui-ux-rebuild`

## 1. Changed files (this block only)

- `src/app/api/bookings/route.ts` — authoritative payment-method validation (backend contract)
- `src/app/booking/page.tsx` — fetches real `HotelPaymentMethod[]` for the resolved hotel, removed `dcReturnUrl`
- `src/processes/checkout/BookingWizard.tsx` — removed `DcNextPaymentCard`/hardcoded state, added real method picker
- `src/lib/i18n/messages.ts` — new RU/TG/EN keys (`checkout.paymentMethods*`, `checkout.errPaymentMethod*`)

No schema change. No new API route (the existing server component fetch + the existing `/api/bookings` POST were sufficient — see §3).

## 2. Payment architecture before/after

**Before**: `BookingWizard.tsx` hardcoded a `DcNextPaymentCard` with a fixed account (`901317727`), fixed recipient name ("Мухаммадали Р. А."), and a deep link built from `https://next.dc.tj/`. This was shown identically regardless of which hotel/room was being booked. The wizard never sent `hotelPaymentMethodId`.

**Already existed, unused from this entry point**: `POST /api/bookings` already read `hotelPaymentMethodId` from the form and, if present *and valid*, built a snapshot from the real `HotelPaymentMethod` row. But this was dead code from the Wizard's perspective (which never sent the field), and — critically — **if the id was present but invalid (wrong hotel, inactive, nonexistent), the code silently ignored it and created the booking anyway** with no method/snapshot. This is the real P0: not "no snapshot logic exists" but "the existing snapshot logic doesn't reject a bad id."

**After**: `BookingWizard.tsx` fetches nothing itself — `src/app/booking/page.tsx` (already a server component) calls the existing `getHotelPaymentMethods(hotelId)` and passes the active methods as a prop. The guest picks one; its id is submitted as `hotelPaymentMethodId`. The backend now **requires** this id and validates it against the authoritative `hotelId` (resolved server-side from the Room/RoomType chain, never trusted from the client) before creating anything.

## 3. Backend validation contract

In `src/app/api/bookings/route.ts`, after `hotelId`/`hotelStatus` are resolved and the idempotency/replay check runs (see §9 on ordering):

```
if (!hotelPaymentMethodId) → 400 payment_method_required
const method = await prisma.hotelPaymentMethod.findFirst({
  where: { id: hotelPaymentMethodId, hotelId, isActive: true }
});
if (!method) → 400 payment_method_invalid
```

A single compound `where` collapses "wrong hotel", "inactive", and "doesn't exist" into the same outcome and the same generic error code — deliberately, so the response never discloses which specific reason applied (no enumeration signal). The snapshot (`displayLabel`, `recipientName`, `paymentIdentifier`, `instructions`) is built **only** from this freshly-read `method` row; the guest's request body is never read for any of those fields (confirmed live — see §7, Case F).

No new business logic was written for this — `getHotelPaymentMethods`, `buildPaymentMethodSnapshot`-equivalent shape, and the `Booking.hotelPaymentMethodId`/`paymentMethodSnapshot` fields all already existed from earlier work; this block made the *existing* validation strict and mandatory instead of best-effort.

## 4. Snapshot semantics

No schema change needed — `Booking.paymentMethodSnapshot Json?` and `Booking.hotelPaymentMethodId Int?` already existed and were already documented as an immutable copy. This block's only change here was closing the silent-fallback gap in §3. Verified live (§7, Cases G/H/I) that:
- the snapshot reflects the method's state at the moment of successful booking creation, not any earlier point;
- editing or deactivating the method afterward does not change an existing booking's snapshot;
- a new method created later does not retroactively attach to an existing booking.

`/chat/booking/[bookingId]`'s `PaymentMethodsBlock` already reads `Booking.hotelPaymentMethodId`/`paymentMethodSnapshot` as its frozen source of truth (pre-existing code, unchanged) — confirmed live that a booking created through the Wizard shows the identical snapshot in chat (§7, §10 evidence).

## 5. What was hardcoded, and proof of removal

- `DcNextPaymentCard` import/usage removed from `BookingWizard.tsx` (component itself untouched — still used by the separate, out-of-scope `payment/[code]` post-booking page).
- Hardcoded account `"901317727"`, hardcoded recipient name, and the `https://next.dc.tj/` deep-link construction (`dcReturnUrl` prop and its computation in `booking/page.tsx`) are gone from the Wizard entirely.
- No heuristic deep-link was built from `paymentIdentifier` (per explicit instruction — `HotelPaymentMethod` has no `deepLink` field; deferred, not invented).
- Grep confirms zero references to `DcNextPaymentCard`, `901317727`, or `next.dc.tj` in `BookingWizard.tsx` or `booking/page.tsx` after the change.

## 6. Security matrix — actual results

All cases run against the live dev server (`http://127.0.0.1:3000`) with real DB fixtures (two real hotels, one cross-hotel method, one inactive method) — not mocked.

| Case | Scenario | Result |
|---|---|---|
| A | Hotel A + Hotel A's active method | `200 {"ok":true,"bookingId":762,...}` |
| B | Hotel A + Hotel B's active method (cross-hotel) | `400 {"error":"payment_method_invalid"}`, zero bookings/payments created |
| C | Hotel A + Hotel A's own *inactive* method | `400 {"error":"payment_method_invalid"}` |
| D | Hotel A + nonexistent method id (999999) | `400 {"error":"payment_method_invalid"}` |
| E | Hotel A, no `hotelPaymentMethodId` sent | `400 {"error":"payment_method_required"}` |
| F | Valid method id + spoofed `recipientName`/`paymentIdentifier`/`instructions` in the same request | Booking succeeded; DB snapshot = the real method's DB values (`QA Recipient A` / `0000-TEST-A-0001`), spoofed values completely absent — confirmed via direct DB read |
| G | Owner edits the method's `recipientName`/`paymentIdentifier` *before* the guest submits | Snapshot on creation = the edited values (current DB state at creation time, not stale) |
| H | Owner deactivates the method *after* booking creation | Existing booking's snapshot unchanged (verified via direct DB read before/after) |
| I | Owner creates a brand-new method afterward | Existing booking's `hotelPaymentMethodId`/snapshot unchanged, did not switch to the new method |
| J | Same authenticated guest resubmits the identical request (idempotent replay) | Both requests returned the same `bookingId:766`; DB confirms exactly 1 booking and 1 payment row for that room+date |
| K | Inventory concurrency (physical-room overlap, RoomType capacity, hold guards) | Not re-run as a fresh concurrency harness — no dedicated BLOCK 4.x test script exists in `scripts/` to reuse (checked; none present). The guard functions (`withRoomHoldGuard`, `assertDatesAvailable`) are called in the exact same place/order as before this block; payment validation was inserted **before** the guarded transaction, so a rejected payment method never enters the guarded section at all (confirmed no lock/hold acquired — zero bookings created in B–E). Every successful case (A/F/G/J) exercised the real guard path end-to-end without incident. |

Also confirmed (real DB scenario, not part of the requested table but directly relevant to §8/§9): with the wizard on step 3 showing a selected method, deactivating that method server-side and then clicking "Подтвердить бронь" produced `400 payment_method_invalid` in the browser, the wizard automatically returned to step 2 with the selection cleared and the rest of the form (dates, phone) intact, and zero booking rows were created for that attempt.

## 7. DB evidence (test fixtures, not real data)

Booking 767 (created via the actual Wizard UI end-to-end, not a raw API call):
```json
{
  "id": 767,
  "hotelPaymentMethodId": 15,
  "paymentMethodSnapshot": {
    "displayLabel": "QA Test Card A",
    "instructions": "QA fixture - Block 5.2",
    "recipientName": "QA Recipient A",
    "paymentIdentifier": "0000-TEST-A-0001"
  },
  "paymentMethod": "QA Test Card A"
}
```
Payment row for this booking: 1 row, `status: PENDING`, no duplicates. No `TransactionLog`/`Notification` orphans found for any rejected case (B–E, and the race-condition case) — confirmed via direct count queries scoped to the exact test date ranges, all returned 0.

**One pre-existing (not introduced by this block) minor finding**: a new `User` (guest) row is created *before* hotel/room and payment-method validation run (this ordering predates BLOCK 5.2 — the same is true for the existing `hotel_unavailable` 404 case). A rejected payment-method attempt (Cases B–E) does leave behind an unused guest `User` row with no booking. Not a `Booking`/`Payment`/hold/chat/notification leak (those are all confirmed clean), and not something this block's scope covers (touches guest-account creation ordering across the whole endpoint, not payment methods) — recorded as a **FINDING** for a future auth/account-flow pass, not fixed here.

## 8. Runtime evidence — mobile (375×812)

- **0 methods** (Khujand Riverside Inn, room 3): step 2 renders "Отель пока не добавил способ оплаты. Бронирование с оплатой сейчас недоступно.", no DC Next anywhere, "Далее" button confirmed `disabled: true` via live DOM read.
- **2 methods** (MH Second Hotel, room 19): both real methods listed compactly; selecting one reveals recipient/identifier/instructions and a working Copy button; "Далее" becomes enabled only after selection (confirmed `disabled: false`); `document.documentElement.scrollWidth === clientWidth === 375` — no horizontal overflow.
- **Full submit**: step 3 shows "Способ оплаты: QA Test Card A" (the actual selected method); submitting redirected into `/chat/booking/767` with the correct WAITING_PAYMENT state and the payment/chat UI rendering normally.
- **Race case**: covered in §6 — reproduced live in the browser, not just reasoned about.

## 9. Runtime evidence — desktop

Re-ran the same room-19 flow at desktop width: hero card, stepper, and the payment-method list all render at a sane width (not stretched full-bleed), "Далее" gating and selection behave identically to mobile. Zero-method and multi-method structural behavior is shared code with mobile (same component, no separate desktop branch was introduced), so this is confirmed rather than assumed identical.

## 10. Localization evidence (RU/TG/EN)

Live-checked all three locales on the same room/hotel by switching the `tajstay_locale` cookie:
- RU: "Способ оплаты" / "Выберите способ оплаты, который принимает этот отель" / "Выбрано" / "Скопировать"
- TG: "Усули пардохт" / "Усули пардохтеро, ки ин меҳмонхона қабул мекунад, интихоб кунед" / "Интихобшуда" / "Нусхабардорӣ"
- EN: "Payment method" / "Choose a payment method this hotel accepts" / "Selected" / "Copy"

No raw key names, no `CARD`/`WALLET`/`BANK`/`OTHER`, no internal error codes leaked into any of the three renders.

**FINDING (pre-existing, out of scope)**: the step-2 pricing sub-block ("Ночей"/"Цена за ночь"/"К оплате") is hardcoded Russian text in `BookingWizard.tsx`, unrelated to payment methods and not touched by this block — visible in the TG/EN screenshots above still showing Russian labels for that one sub-block. Flagged for whichever future pass owns Wizard i18n completeness, not fixed here (would expand scope).

**FINDING (pre-existing, out of scope)**: `src/components/chat/PaymentMethodsBlock.tsx` (the Chat payment display, not touched by this block) calls `m(locale, "bookingRoom.payment.title")` and similar keys that do not exist anywhere in `messages.ts` — `m()` falls back to returning the raw key string, so that specific chat panel likely already shows literal `bookingRoom.payment.title` etc. instead of real copy. Confirmed by grep (zero matches for that key prefix in `messages.ts`); not fixed here since it's Chat, explicitly out of scope per §15.

## 11. Findings outside scope (recorded, not acted on)

- Guest `User` row created before payment-method validation on a rejected attempt (§7) — pre-existing, auth/account-flow scope.
- Hardcoded RU pricing labels in Wizard step 2, unrelated to payment methods (§10).
- `bookingRoom.payment.*` missing i18n keys in the Chat payment block (§10) — Chat redesign is explicitly out of scope for this block.

## 12. Cleanup evidence

All fixtures removed and verified via direct DB queries after cleanup:
- 6 test bookings + their Payment/TransactionLog/Notification rows deleted (`deleted bookings: 6`, `payments: 6`, `transactionLogs: 6`, `notifications: 18`).
- 5 test `HotelPaymentMethod` rows deleted.
- 9 test guest `User` rows (+ their sessions) deleted.
- Post-cleanup verification: 0 future-dated (2027+) bookings, 0 `HotelPaymentMethod` rows with a `QA`-prefixed label on the test hotels, 0 `User` rows named `QA Case *` remaining.
- The scratch Node script used to seed/clean fixtures was run from a temporary file outside `git status` tracking and deleted afterward; `git status --short` shows no stray fixture-related files.

## 13. Production untouched

All work was against the local dev DB (`localhost:3000`, local Postgres/SQLite per `.env`) using synthetic test hotels/rooms already present from earlier BLOCK fixtures. No production URL was contacted, no production migration was run, no `prisma migrate deploy` or equivalent was executed anywhere in this session.

## 14. Gate results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (clean, run twice — after wizard/backend changes and again after i18n additions) |
| targeted `eslint` (all 4 changed files) | PASS (clean) |
| `npm run build` | PASS (clean production build) |
| Targeted regression (idempotency, no orphan side effects, hold/guard path unaffected) | PASS — see §6 Case K notes (no dedicated automated BLOCK 4.x script exists to re-run; verified via the same live booking calls that exercised the real guard functions) |

## 15. Acceptance checklist

- [x] Hardcoded `DcNextPaymentCard` fully absent from live Wizard
- [x] Hardcoded recipient/account/deep-link removed
- [x] Wizard receives only active methods of the resolved hotel
- [x] 0-methods controlled state, no fallback
- [x] 1-method flow works (auto-select verified live)
- [x] Multi-method flow works (2 methods, explicit selection verified live)
- [x] Backend authoritative ownership validation works
- [x] Cross-hotel method rejected (Case B)
- [x] Inactive/nonexistent method rejected (Cases C/D)
- [x] Missing method id rejected (Case E)
- [x] Snapshot created server-side only (Case F)
- [x] Snapshot immutable after owner edit/deactivation (Cases G/H/I)
- [x] Idempotency preserved (Case J)
- [x] No partial booking/payment side effects on invalid method (Cases B–E, race case)
- [x] Inventory concurrency invariants unaffected (guard call order/position confirmed unchanged; no dedicated re-run harness existed to execute — see §6/§14)
- [x] Chat view consistent with the created snapshot (§4, §7)
- [x] RU/TG/EN correct for all new strings (§10)
- [x] Mobile runtime PASS (§8)
- [x] Desktop runtime PASS (§9)
- [x] typecheck / lint / build PASS (§14)
- [x] Fixtures cleaned (§12)
- [x] Production untouched (§13)

## Verdict

**BLOCK 5.2 = COMPLETE.**

Scope was held exactly as specified: no Pay-at-check-in, no new payment state machine, no Chat/BookingTimeline/notifications/Owner-Admin-dashboard changes. Two pre-existing, out-of-scope findings recorded (§11) for a future pass, not acted on.

STOP — not starting BLOCK 5.3.
