# BLOCK 5.2A — Concurrency Closure: Report

Verification-only closure on top of BLOCK 5.2. No changes to Payment UI, Chat, Pay-at-check-in, or
any state machine. No changes to `src/app/api/bookings/route.ts` or `BookingWizard.tsx` — this block
only adds a real concurrency regression harness and runs it.

## Process note (per explicit instruction — not mixing evidence across runs)

The first attempt at this suite hung/was interrupted mid-run before its fixtures used unique names.
That interruption killed the Node process before its own `cleanup()` could execute, so its fixtures
(`RoomType` ids 146/147, `Room` ids 551-554, `HotelPaymentMethod` id 20 — all named plainly `5.2A
Cap1`/`5.2A Cap2`/etc., no run-tag suffix) were left behind. This was **not** a product regression —
confirmed no `Booking` rows ever referenced them (`0` when checked) — but they were **manually
deleted** after the fact (not by any automated cleanup) once found by an explicit post-hoc audit query.
A second run failed immediately with `ECONNREFUSED` because the dev server was down at that moment
(unrelated infrastructure issue, not scored). **Only the third, fully clean, uninterrupted run below is
counted as evidence.** Its own setup uses a `Date.now()` run-tag on every fixture name specifically to
avoid this collision, and its own cleanup was independently re-verified afterward (see §3).

## 1. What was run

New script: `scripts/test-block52a-concurrency.ts` (kept in the repo as a real regression test, not
deleted — genuinely useful for any future change touching booking creation). Run via `npx tsx
scripts/test-block52a-concurrency.ts` against the live dev server on `http://127.0.0.1:3000`, using
one real, active `HotelPaymentMethod` fixture on every request (the new BLOCK 5.2 contract is never
weakened or bypassed for this test — every request goes through the same mandatory
`hotelPaymentMethodId` validation as a real guest).

## 2. Results — the clean, complete run

```
=== Scenario 1: physical room, 2 concurrent guests, overlapping dates ===
  PASS: exactly 1 success
  PASS: exactly 1 conflict (409)
  PASS: exactly 1 booking row in DB for this room+date
  PASS: exactly 1 payment row for the winning booking

=== Scenario 2: RoomType capacity=1, 2 concurrent requests ===
  PASS: exactly 1 success
  PASS: exactly 1 conflict (409)

=== Scenario 3: RoomType capacity=2, 3 concurrent requests ===
  PASS: exactly 2 successes
  PASS: exactly 1 conflict (409)

=== Scenario 4: active WAITING_PAYMENT hold blocks a later request ===
  PASS: third request against the still-active hold gets 409

=== Scenario 5: expired WAITING_PAYMENT hold releases inventory ===
  PASS: new booking succeeds despite the expired hold

=== Scenario 6: adjacent non-overlapping dates still allowed ===
  PASS: adjacent (non-overlapping) booking succeeds

=== Scenario 7: same-user simultaneous duplicate requests (idempotency under concurrency) ===
  PASS: seed request succeeds
  PASS: both concurrent resubmits return ok:true
  PASS: both resolve to the SAME bookingId as the seed
  PASS: exactly 1 booking row total (no duplicate)
  PASS: exactly 1 payment row total (no duplicate)

=== Scenario 8: losing/conflicting requests leave no orphan side effects ===
  PASS: no unexpected/orphan booking rows beyond the tracked winners
  PASS: no orphan payment rows for these test rooms/roomTypes

=== BLOCK 5.2A: ALL PASS ===  (18/18 assertions)
```

Each scenario used real concurrent HTTP `POST /api/bookings?json=1` calls via `Promise.all` (true
simultaneous requests, not sequential calls dressed up as concurrent), against real Prisma-backed
inventory (a genuine physical `Room` with `roomTypeId: null` for scenarios 1/4/6, genuine `RoomType`
rows with 1 and 2 real `Room` children for scenarios 2/3), with a real active `HotelPaymentMethod` on
every request.

## 3. Cleanup evidence for the counted run

The script's own cleanup, immediately after the run above:
```
deleted payments: 7 txlogs: 7 notifications: 21 bookings: 8
deleted users: 12
deleted rooms: 4 roomTypes: 2 paymentMethods: 1
VERIFY leftover: bookings(2028+)= 0 rooms= 0 roomTypes= 0 methods= 0 users= 0
```
Independently re-checked afterward with separate, standalone queries (not the script's own
self-report): `{ bookings(2028+): 0, roomTypes-named-5.2A: 0, rooms-named-5.2A: 0,
methods-named-5.2A: 0, users: 0 }` — all zero. The two leftover-fixture sets from the discarded first
attempt (see the process note above) were located by name pattern and deleted manually, confirmed
zero `Booking` references existed on them beforehand, and re-verified at zero afterward.

## 4. Gates (re-run after adding the script)

- `npx tsc --noEmit` — PASS (clean)
- `npx eslint scripts/test-block52a-concurrency.ts` — PASS (clean)
- `npm run build` — PASS. Two earlier build invocations were run inadvertently overlapping on the
  same `.next` directory during a background-task timing issue on this host; neither is trusted as
  evidence for that reason (discarded, not scored — same discipline as the discarded first
  concurrency run). A single, isolated `npm run build` was run afterward with no other build process
  active and completed cleanly; that is the one counted here.

## 5. Verdict

**BLOCK 5.2A CONCURRENCY REGRESSION = PASS.**

All 8 required scenarios (physical-room overlap, RoomType capacity=1, RoomType capacity=2, active
hold blocking, expired-hold release, adjacent non-overlapping dates, same-user concurrent idempotency,
zero orphan side effects on losers) proven with real concurrent HTTP requests against real inventory,
using the new mandatory `hotelPaymentMethodId` contract on every request — not weakened for the test.

**BLOCK 5.2 = COMPLETE.**

STOP — not starting BLOCK 5.3.
