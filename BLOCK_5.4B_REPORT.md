# BLOCK 5.4B — Pay at Check-in Implementation: Report

## 1. Baseline

- Branch: `feature/tajstay-full-ui-ux-rebuild`, HEAD before this block: `c5d66c67e8f7bf7d3e88a5bec65ebd092c60e5d7` (unchanged from BLOCK 5.4A's audit — source had not drifted).
- Pre-existing uncommitted BLOCK 5.3/5.3A/5.4A work (`.agent/STATE.md`, `reject-payment`/`payment-reject` routes, `paymentReviewActions.ts`, four earlier reports, five earlier test scripts) preserved, nothing reset or discarded.
- Production and production DB untouched throughout.

## 2. Architecture decision implemented

**Model A** (instant `CONFIRMED`, no owner-approval step), gated by an explicit per-hotel opt-in, exactly as decided: `PENDING_OWNER` was not revived; no new booking status was created.

## 3. Migration

`prisma/migrations/20260914120000_hotel_accepts_pay_at_checkin/migration.sql`:
```sql
ALTER TABLE "Hotel" ADD COLUMN "acceptsPayAtCheckIn" BOOLEAN NOT NULL DEFAULT false;
```
Applied to local dev DB only via `prisma migrate deploy` (not `db push`, not a schema-drift shortcut). Verified after apply: all 5 pre-existing sample hotels read back `acceptsPayAtCheckIn: false`. No other schema change — confirms BLOCK 5.4A's finding that Model A needs no new status/enum, only this one policy field.

## 4. Hotel policy

- `PATCH /api/owner/hotels/[id]/pay-at-checkin-policy` — new, single-purpose route. Ownership checked via `findFirst({ id, ownerId })`, never a bare `findUnique` + separate check. Cross-hotel owner and guest both denied (proven in §16).
- Toggle UI added to the existing `HotelPaymentMethodsManager` (finances section) — no new Settings surface, no redesign. Optimistic UI with server-truth revert on failure (client toggle is never trusted as authority; every booking creation re-derives the flag from the DB).

## 5. API contract

`POST /api/bookings` now reads `paymentOption: "PAY_NOW" | "PAY_AT_CHECK_IN"`, defaulting to `PAY_NOW` when absent — a legacy/unmodified client keeps today's exact behavior (verified: omitting the field in a request still produces a normal Pay Now booking).

## 6. PAY_NOW branch

Unchanged contract: `hotelPaymentMethodId` required, validated (exists, active, belongs to the authoritative hotel), server-built snapshot, `Payment` row created, `WAITING_PAYMENT`, 15-minute `expiresAt`, `payOnArrival: false`. Re-proven in §9/§10 regression re-runs, not assumed.

## 7. PAY_AT_CHECK_IN branch

Server-side, independent of client input beyond the option flag itself:
- Authoritative check: `hotel.acceptsPayAtCheckIn` read from the DB via the real Room/RoomType→Hotel chain; a spoofed client flag has no effect (proven in §16).
- No `hotelPaymentMethodId` required; one sent anyway is never read or used.
- No `Payment` row created — mirrors the pre-existing, already-working owner-manual/offline flow exactly (BLOCK 5.4A §7 finding).
- `Booking`: `status: CONFIRMED`, `payOnArrival: true`, `paymentStatus: "PENDING"`, `hotelPaymentMethodId: null`, `paymentMethodSnapshot: null`, `expiresAt: null`.

## 8. Real bug found and fixed during concurrency testing (not assumed away)

`computeRoomTotalPrice`/`computeRoomTypeTotalPrice` run their own independent, non-transactional `assertDatesAvailable` call (for pricing/date-override lookups) that has no notion of "this is the same user's own existing booking." This was invisible for Pay Now because `WAITING_PAYMENT`/`ON_REVIEW` only occupy via the opt-in active-hold check that call never enables — but a `PAY_AT_CHECK_IN` booking is `CONFIRMED` immediately, which occupies unconditionally, so a genuine same-user resubmit tripped a false `"unavailable"` before ever reaching the idempotency short-circuit. **Root-caused via a failing concurrency test** (Scenario H), not discovered by inspection. Fix: moved the pricing computation to run *after* the existing-booking idempotency check has already had the chance to short-circuit, rather than before it — no change to `assertDatesAvailable` itself, no guard logic rewritten. Re-verified: Scenario H now passes, and the full BLOCK 5.2A Pay Now regression suite still passes 18/18 after the reorder (§10).

## 9. Idempotency

Room/dates/user remains the one booking-intent identity (§10 of the spec, unchanged from BLOCK 5.2). `PAY_NOW` and `PAY_AT_CHECK_IN` are never two independent bookings for the same intent:
- **Same option, concurrent resubmit** → same booking, `ok:true`, no duplicate (Scenario H, both the outer pre-check and the in-transaction re-check compare `payOnArrival`).
- **Different option, concurrent/sequential resubmit** → new `DifferentPaymentOptionError` → `409 existing_booking_different_payment_option`, never a silent option switch, never a second booking (Scenario I). Verified the original booking's `payOnArrival`/`status` are provably unchanged by the rejected request.
- Wizard UI: on this specific error, sends the guest back to step 2 without losing other form data, per §11's requirement not to leave them stuck.

## 10. Inventory / concurrency matrix — real concurrent HTTP requests

`scripts/test-block54b-concurrency.ts`, run against the live dev server, **25/25 assertions PASS** on the clean counted run:
- A: physical room, 2 concurrent PAY_AT_CHECK_IN → 1 success / 1×409.
- B: RoomType capacity=1, 2 concurrent → 1/1.
- C: RoomType capacity=2, 3 concurrent → 2 success / 1×409.
- D: PAY_NOW vs PAY_AT_CHECK_IN simultaneously, same physical room → exactly 1 winner, 1×409 (one shared inventory authority, no guard changes needed — `OCCUPYING_ONLINE_STATUSES` already includes `CONFIRMED` regardless of `payOnArrival`).
- E: existing active `WAITING_PAYMENT` vs new PAY_AT_CHECK_IN → 409.
- F: existing CONFIRMED pay-at-check-in vs new PAY_NOW → 409.
- G: adjacent non-overlapping dates → allowed.
- H: same user/intent/option concurrent → one logical booking (after the §8 fix).
- I: same user/intent, different option concurrent → controlled conflict, no silent switch, no duplicate.
- Policy denial: hotel with `acceptsPayAtCheckIn=false` → 403, zero booking created.
- DB evidence: one PAY_AT_CHECK_IN booking's fields verified directly (`status/payOnArrival/paymentStatus/hotelPaymentMethodId/paymentMethodSnapshot/expiresAt/Payment count`) — all match §7 exactly.

**Mandatory Pay Now regression** (§30, not skipped): `scripts/test-block52a-concurrency.ts` re-run clean after the §8 reorder — **18/18 PASS**; `scripts/test-block53-lifecycle.ts` re-run clean — **31/31 PASS** (both suites' own logs quoted in the terminal history of this session). "Untouched code" was not accepted as a substitute for a real re-run, per instruction — both were actually executed.

## 11. Cancellation

Explicit, narrow exception added to both the guest (`cancel-by-guest/route.ts`) and admin (`admin/bookings/[id]/cancel/route.ts`) cancel routes: `status===CONFIRMED && payOnArrival && paymentStatus==="PENDING"` is cancellable; an ordinary paid Pay Now `CONFIRMED` booking can never match this condition (its `paymentStatus` is always `PAID` by the time it reaches `CONFIRMED`), so the general CONFIRMED protection is otherwise untouched — verified structurally, not just asserted. No refund is created (no money ever moved), no `Payment` row is touched (none exists). The client-side `canGuestCancel` gate in `BookingChatPanel.tsx` mirrors the same exception so the Cancel action actually becomes visible for this case. No new cancellation status invented — reuses the existing `CANCELLED_BY_GUEST`/`CANCELLED` values BLOCK 5.4A already catalogued, per the explicit instruction not to add a third one.

## 12. Arrival payment / check-in

New route `POST /api/owner/bookings/[id]/confirm-arrival-payment` — the one atomic owner action ("Подтвердить оплату и заселение"):
- Preconditions checked: owner owns the hotel (via `getBookingForOwner`'s authoritative relation), `payOnArrival`, `status===CONFIRMED`, `paymentStatus==="PENDING"`, same-day-or-later than `checkIn`.
- Atomic via `updateMany` with a `WHERE` clause on the exact preconditions (`status/paymentStatus/payOnArrival`) — a genuine simultaneous duplicate resolves to `count: 0` and a controlled `alreadyDone: true` response, never a second real transition or duplicate `TransactionLog`/notification (proven in §16, item 9).
- Transitions `status→CHECKED_IN` and `paymentStatus→PAID` together in one write — never one without the other.
- **No Payment row created or expected** — mirrors the offline flow.
- The pre-existing plain check-in route (`owner/bookings/[id]/check-in/route.ts`) now explicitly rejects any `payOnArrival` booking, directing it to the new route instead — closes the real gap where an owner could otherwise flip a pay-at-check-in booking to `CHECKED_IN` while it stayed unpaid forever. Confirmed the ordinary Pay Now check-in path is completely unaffected (§16, item 7).

## 13. Completion / payout semantics — the critical gate, checked first

Verified against the actual code before writing anything: `Payout` creation and the `"ESCROW_RELEASED_PAYOUT_CREATED"` `TransactionLog` type unambiguously mean "TajStay held this guest's captured payment and is now releasing the owner's share" (`admin/bookings/complete/route.ts`'s pre-5.4B code: payout amount = `subtotal - commission`, created only alongside that exact log type).

Pay-at-check-in money goes directly from guest to hotel — TajStay never holds it. **`admin/bookings/complete/route.ts` now has an explicit, separate branch for `booking.payOnArrival`**: requires `paymentStatus==="PAID" && status===CHECKED_IN`, transitions to `COMPLETED`, writes a distinct `PAY_AT_CHECKIN_COMPLETED_NO_PAYOUT` log — and **never calls `prisma.payout.create`**. No synthetic `Payment`/`CAPTURED` row is fabricated to force it through the existing Pay Now branch. The Pay Now branch (`Payment.status===CAPTURED` requirement, `Payout` creation, `ESCROW_RELEASED_PAYOUT_CREATED` log) is completely unchanged. Verified live in the security test (§16, item 10): a real payOnArrival booking completed with **zero** `Payout` rows and **zero** `ESCROW_RELEASED_PAYOUT_CREATED` logs.

## 14. Analytics / revenue

Reviewed the three sites BLOCK 5.4A flagged as potentially conflating `CONFIRMED` with paid, per the instruction to determine each label's actual semantics before touching anything:
- `ownerDashboardKpis.ts`'s revenue aggregate — already correctly requires `status===CONFIRMED AND paymentStatus==="PAID"`. Not touched.
- `bookingTimeline.ts:168`'s "Confirmed" timeline milestone — labeled and rendered as "Confirmed"/"Подтверждено" (a green dot + that word), never "Paid". A pay-at-check-in booking correctly showing this milestone the moment it's created is **correct** per its own label's semantics, not a bug. **Determined correct, left unchanged** — this is exactly the "if the label means confirmed bookings, CONFIRMED+PENDING should count" case the instruction described, not the reverse.
- `ownerInsights.ts`'s `bookingsCount` (occupancy-pressure metric) and the admin dashboard's `bookingConfirmed` donut bucket — both are booking *counts*, entirely separate from the dashboard's own `revenue30` field (which uses the correctly-ANDed calculation above). **Determined correct, left unchanged.**

No site needed a code change; all three were reviewed and their semantics documented rather than "fixed for uniformity," per the explicit instruction against that.

## 15. Payment-null audit

Re-checked the two sites BLOCK 5.4A flagged: `admin/chat/archive/route.ts`'s `booking.payment.id/status/amount` access is inside the truthy branch of `booking.payment ? {...} : null` — **already null-safe**; the audit's flag was a false positive (misread the guarding ternary). `admin/bookings/[id]/cancel/route.ts`'s access is behind `if (booking.payment && ...)` — already safe. Grepped the whole tree for `\.payment\.(id|status|amount)` — these two are the only hits, both safe. **No code change needed** — this is now a real, payOnArrival-population-scale-relevant path (more Payment-less PLATFORM bookings will exist going forward) and it was worth re-confirming rather than trusting the earlier audit's flag, which is exactly what was done.

## 16. Security matrix — real runtime, not carried over

`scripts/test-block54b-security.ts`, **21/21 assertions PASS**:
1. Cross-hotel owner cannot toggle another hotel's policy (403/401), policy unchanged.
2. Guest cannot toggle policy (403/401).
3. Correct owner can enable policy.
4. Cross-hotel owner denied the arrival-payment action (404/403), booking state unchanged.
5. Guest cannot call the arrival-payment action.
6. Arrival action denied before check-in day (`too_early`).
7. The plain check-in route now explicitly rejects a payOnArrival booking.
8. Correct owner succeeds once check-in day is reached — `CHECKED_IN`+`PAID` together, still zero Payment rows, `TransactionLog` recorded.
9. Double arrival action → second call is a controlled `alreadyDone: true`, exactly one `ARRIVAL_PAYMENT_CONFIRMED` log (no duplicate).
10. Completion → `COMPLETED`, **zero** `Payout` rows, distinct no-payout log, no escrow-release log — the critical gate, proven not asserted.

Plus the concurrency script's own policy-denial and mixed-inventory cases (§10). Not re-derived from BLOCK 5.1/5.2/5.3's old evidence — every case above was executed fresh against this block's actual new code.

## 17. Mobile / desktop walkthrough — real browser

Disposable QA fixtures only (fresh owner/guest/hotel/room/method, all deleted and independently re-verified at zero afterward — no shared/existing account touched). At 375×812, signed in as the real QA guest via the actual sign-in form (no cookie injection): Wizard step 2 showed both "Оплатить сейчас"/"Оплатить при заселении" toggle options; switching to Pay-at-Check-in correctly hid the HotelPaymentMethod picker/Copy button and showed the explanation text instead — no proof uploader, no countdown, no bank details, confirmed by reading the rendered page text directly. Step 3 confirmed the payment-method summary line correctly read "Оплатить при заселении". Submission produced an immediate `CONFIRMED` booking and landed on the real chat page.

**Real defect found and fixed live during this walkthrough**: the booking header's payment-status pill showed the generic `status.PENDING` label ("НА ПРОВЕРКЕ" / "under review") for a payOnArrival booking — actively misleading, since no proof/review process exists for it at all (exactly the failure mode §13 of the spec warned against). Root-caused to `BookingChatHeader.tsx`'s generic paymentStatus→label mapping never having considered a PLATFORM-source PENDING booking with no review in progress. Fixed with an explicit `payOnArrival` branch; re-verified live — the pill now reads "ОПЛАТИТЬ ПРИ ЗАСЕЛЕНИИ".

Confirmed-state guest card ("Бронирование подтверждено" / "Оплата — при заселении в отеле." + amount) rendered correctly; the new chat welcome system message rendered correctly ("Бронирование подтверждено. Предварительная оплата не требуется..."). Switched to owner (real logout + real sign-in as the QA owner, session forced to expire server-side rather than faked), confirmed the owner sees the "Оплата при заселении" card with the "Подтвердить оплату и заселение" button; its actual click-through (atomic transition, too-early gating, double-click protection) was proven via the HTTP security script (§16, items 6/8/9) since a native `window.confirm()` dialog isn't reliably scriptable in this browser tool — the button's *rendering* and *gating* were confirmed live, its *backend behavior* was confirmed via real HTTP.

Desktop viewport re-check: same booking, same header/badges, no overflow, "Оплата & Даты" panel present and functional.

**RU/TG/EN**: RU confirmed live throughout the above. TG confirmed live (switched locale cookie, reloaded the same booking as both guest and owner) — "ТАСДИҚ ШУДА" / "ҲАНГОМИ ВОРИДШАВӢ ПАРДОХТ КУНЕД" / "Пардохт ҳангоми воридшавӣ" / "Пардохт ва воридшавиро тасдиқ кунед" all rendered correctly, no raw keys. EN strings were added to the same locale blocks and typechecked/built but not independently re-driven live in the browser in this pass (time-boxed) — flagged honestly rather than claimed as browser-verified.

**Pre-existing, out-of-scope item observed and correctly left alone**: the already-known `BookingTimeline` hydration mismatch (date-format locale difference between server/client render) reproduced during this walkthrough exactly as previously documented in BLOCK 5.3A — confirmed unrelated to any 5.4B change (a date-formatting issue on the timeline component, not on anything this block touched) and left untouched per the explicit instruction to defer it to the Chat block.

## 18. Chat / notifications

New system messages added, consistent with the existing (Russian-only, not per-viewer-relocalized) architecture — not a new gap, the same limitation BLOCK 5.3A already documented for every existing system message:
- Booking creation welcome: `buildChatInitWelcome` now branches on `payOnArrival` (`chat.welcomePayAtCheckIn`, RU/TG/EN keys added) instead of always showing the Pay Now payment-window text.
- Arrival payment confirmed: `"🛡️ Система: Оплата при заселении подтверждена. Гость заселён."`, matching the existing check-in route's own hardcoded-Russian pattern exactly (not a new inconsistency).
- Notification on arrival: reuses the existing `BOOKING_CHECKED_IN` type (same as Pay Now check-in), sent to the guest.

## 19. Findings recorded, not fixed (out of scope for this block)

- `checkout.escrowTitle`/`escrowBody` copy shown on Wizard step 3 ("Защита эскроу... выплата владельцу после заселения") is technically escrow-specific language that doesn't quite describe a pay-at-check-in booking (no escrow, no platform-held funds). Cosmetic, not misleading about money actually changing hands incorrectly (no false claim is made to the guest), not fixed here — flagged for a future Wizard-copy pass.
- `BookingTimeline`'s "Ожидается оплата" step still appears in a pay-at-check-in booking's history even though that phase never actually occurred (the booking was CONFIRMED immediately). Cosmetic/historical, not a functional or security issue, not fixed here.
- System chat messages remain hardcoded Russian regardless of viewer locale — pre-existing, already documented in BLOCK 5.3A, not expanded or fixed by this block.
- No per-user booking-count/no-show-penalty policy exists — explicitly deferred per instruction §32, not designed here.

## 20. Engineering gates

- `npx tsc --noEmit` — PASS (clean), re-run after every substantive change.
- `npx eslint` on every touched file — PASS (clean).
- `npm run build` — PASS, one clean isolated run (no dev server or other build process running concurrently, learned from a BLOCK 5.2A process note).
- Automated tests: `test-block54b-concurrency.ts` (25/25), `test-block54b-security.ts` (21/21), Pay Now regressions `test-block52a-concurrency.ts` (18/18) and `test-block53-lifecycle.ts` (31/31) all re-run and green.

## 21. Cleanup

All disposable fixtures from every script and the manual browser QA session deleted; independently re-verified at zero via separate standalone queries (not just each script's own self-report): `{ bookings(2029+): 0, hotels(name contains "5.4B"): 0, users(name contains "5.4B"): 0, rooms(title contains "5.4B"): 0 }`. No shared/pre-existing account was used or modified — every QA identity (owner and guest, both mobile and desktop passes) was created fresh for this block and deleted afterward.

## 22. Findings — deferred abuse policy (per §32, not designed here)

No-show penalties, per-user booking limits, and a cancellation deadline were explicitly not invented in this block. The hotel opt-in defaulting to `false` is the first and only abuse control shipped here, as instructed.

## 23. Production

**PRODUCTION MIGRATION = NOT RUN.** **PRODUCTION RUNTIME = NOT PROVEN.** No production code, schema, or data was touched.

## 24. Final gate-by-gate verdict

| Gate | Status |
|---|---|
| Hotel-level policy exists, default false | PASS |
| Owner can control it securely | PASS |
| Guest option only appears when allowed | PASS |
| Server independently enforces policy | PASS |
| PAY_NOW unchanged | PASS (regression re-run, not assumed) |
| PAY_AT_CHECK_IN requires no payment method / snapshot / proof / timer | PASS |
| Immediate CONFIRMED, paymentStatus PENDING, payOnArrival true | PASS |
| Inventory safe (no guard rewrite) | PASS |
| Mixed concurrency | PASS (25/25) |
| Idempotency same-option | PASS |
| Mixed-option collision deterministic | PASS |
| Post-booking UX correct (no proof/timer/bank details) | PASS |
| CONFIRMED≠PAID conflation reviewed | PASS (all 3 sites determined already correct) |
| Payment-null unsafe accesses | PASS (both flagged sites confirmed already safe) |
| Unpaid pay-on-arrival cancellation works | PASS |
| Paid Pay Now cancellation semantics unchanged | PASS |
| Owner arrival action atomic | PASS |
| Double arrival protected | PASS |
| CHECKED_IN+PAID after arrival | PASS |
| Completion semantics safe, no fake Payment/Payout | PASS (critical gate, verified) |
| Analytics distinguish confirmed vs paid | PASS (reviewed, already correct) |
| Chat/notifications correct | PASS |
| Security matrix | PASS (21/21) |
| Mobile lifecycle | PASS |
| Desktop lifecycle | PASS |
| RU/TG runtime | PASS (live); EN | PASS (keys/build, not independently browser-driven this pass) |
| Pay Now regression | PASS (18/18 + 31/31) |
| Fixtures cleaned | PASS |
| Migration local only | PASS |
| Production untouched | PASS |

**BLOCK 5.4B = COMPLETE**, with the one honest exception noted: EN was verified via the same locale-key files and the production build, not independently re-driven live in the browser this pass (RU and TG were).

STOP. Not starting BLOCK 5.5 or any further block.
