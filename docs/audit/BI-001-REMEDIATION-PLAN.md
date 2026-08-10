# BI-001 Remediation Plan — Booking Race / TOCTOU

**Status:** Plan only — **no implementation in this document**  
**Date:** 2026-08-10  
**Maps to:** SEC-010 · BI-001 · (pulls BI-003, BI-004, BI-005)  
**Release gate:** ❌ **BLOCKED** until Closed criteria below are met  

---

## 1. Why “just add a lock” is not enough

BI-001 is a broken **business invariant**, not a missing `await`:

> For one physical `roomId`, there must never be two overlapping **inventory-holding** intervals.

Soft-hold (`WAITING_PAYMENT`, 15 minutes) is part of the product. Therefore the invariant includes holds, not only `CONFIRMED`.

Without a defined hold set + logical expiration + concurrency proof, a lock in one code path can still leave:

- offline create races;
- roomType (capacity) races;
- expire-vs-assert gaps (BI-004);
- double-click duplicates (BI-005).

---

## 2. Canonical inventory-hold model (from real code)

Source of truth today: `src/lib/booking/availability.ts`

### Platform (`source = PLATFORM`) — **holds inventory**

| Status | Holds? | Notes |
|--------|--------|-------|
| `WAITING_PAYMENT` | **Yes** | Soft-hold; `expiresAt` ≈ now+15m |
| `WAIT_PROOF` | **Yes** | Legacy alias of waiting |
| `ON_REVIEW` | **Yes** | After proof; timer paused |
| `PENDING_OWNER` | **Yes** | Pay-on-arrival |
| `CONFIRMED` | **Yes** | |
| `CHECKED_IN` | **Yes** | |
| `COMPLETED` | **Yes*** | Blocks those calendar nights; past stays OK |

\* `COMPLETED` in ACTIVE set is intentional for historical nights; future booking of past nights is a separate policy (BI-008).

### Platform — **does not hold**

| Status | Holds? |
|--------|--------|
| `CANCELLED` | No |
| `CANCELLED_BY_GUEST` | No |
| `EXPIRED` | No |
| `REJECTED` | No |

### Offline (`source = OWNER_MANUAL`) — via `offlineStatus`

Holds: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT` (BI-010: `CHECKED_OUT` should likely stop holding — fix alongside or after BI-001).

### Logical expiration (must ship with BI-001) — BI-004

**Rule:**

```text
IF status ∈ {WAITING_PAYMENT, WAIT_PROOF}
AND expiresAt != null
AND expiresAt <= now
AND paymentTimerPaused == false
→ treat as NOT holding inventory for availability
```

Physical cleanup job may still set `EXPIRED` later.  
**Availability must not wait for cron.**

---

## 3. Strategy options

| Option | Idea | Pros | Cons |
|--------|------|------|------|
| **A. App-only `$transaction` + `FOR UPDATE`** | Lock `Room` (or type) row, re-assert, create | Fast to ship; Prisma-friendly | Bug in second write path bypasses; no hard DB invariant |
| **B. Postgres `EXCLUDE` (gist daterange)** | DB rejects overlapping active ranges per `room_id` | Strong; survives app bugs | Nullable `roomId`; status filter; Prisma can’t express EXCLUDE — raw SQL; roomType capacity still app-level |
| **C. Night slots table** | `UNIQUE(roomId, nightDate)` rows inserted in same txn | Strong; clear; Prisma-native; easy to test | Migration + backfill; type-level unassigned holds need separate rule |
| **D. Hybrid (recommended)** | A + C (physical) + logical expiry + idempotency | Defense in depth | Slightly more work |

### Decision: **D — Hybrid**

1. **Single create/confirm inventory gateway** (all guest + offline + approve re-check paths).  
2. **Logical expiration** in `assertDatesAvailable` / `assertRoomTypeAvailable`.  
3. **Transaction:** `SELECT … FOR UPDATE` on physical `Room` when `roomId`/`assignedRoomId` known; for type-only bookings lock a stable key (RoomType row or advisory lock) and re-count capacity.  
4. **DB hard guarantee for physical rooms:** inventory night slots (or EXCLUDE — see §4).  
5. **Idempotency-Key** on `POST /api/bookings` (BI-005) in same epic (can be same PR or immediate follow-up — **required for Closed of “booking create integrity”**, not optional polish).

---

## 4. Recommended DB hard guarantee

### Preferred for TajStay: `BookingInventoryNight`

```text
BookingInventoryNight
  bookingId  → Booking
  roomId     → Room
  nightDate  Date   // UTC date-only night in [checkIn, checkOut)
  @@unique([roomId, nightDate])
```

**On create (holding statuses):** insert one row per night for the physical room.  
**On assign room:** insert/move nights.  
**On EXPIRED / CANCELLED / REJECTED / CANCELLED_BY_GUEST:** delete nights (or soft-delete + unique only on active).  
**On expire logical:** availability ignores booking without nights / with expired soft-hold; job deletes nights when marking EXPIRED.

**Conflict:** second concurrent insert → unique violation → map to `409 unavailable` (no double hold).

### Alternative: Postgres `EXCLUDE USING gist`

```sql
-- conceptual; status filter via partial index
EXCLUDE USING gist (
  room_id WITH =,
  daterange(check_in, check_out, '[)') WITH &&
) WHERE room_id IS NOT NULL AND status IN (...)
```

Use if team prefers fewer tables; still need capacity logic for `roomTypeId`-only bookings.

**Room-type capacity:** cannot be a single-room exclusion. Keep **lock RoomType + recount** (existing `getRoomTypeAvailability`) inside the same transaction; optionally later `RoomTypeInventoryNight(roomTypeId, night, unitsUsed)` with check constraint `unitsUsed <= capacity`.

---

## 5. Application changes (scope for Cursor assignment)

| Area | Change |
|------|--------|
| `POST /api/bookings` | Call inventory gateway only; no naked assert→create |
| `ownerOfflineBooking` create/update | Same gateway |
| `ownerPaymentApprove` / admin confirm | Re-check inside txn; nights already held by booking id |
| `availability.ts` | Logical expiry; single ACTIVE definition exported |
| Expire job | Mark EXPIRED + release nights |
| Proof / cancel | Release or keep nights per status rules |

**Do not** scatter three different “assert then create” copies.

---

## 6. Companion items in the same epic

| ID | Role in BI-001 epic |
|----|---------------------|
| **BI-003** | Expected to **collapse** once double-create impossible |
| **BI-004** | **Required** — logical expiry in assert |
| **BI-005** | **Required** — `Idempotency-Key` (or equivalent) on booking create |
| **BI-002** | Separate PR (payment policy) — not required to close BI-001 |
| **BI-006** | Same epic preferred: sellable/deleted/hotel match on `roomId` path |

---

## 7. Acceptance / Closed criteria

### ❌ Before (must reproduce)

Concurrency harness against real Postgres:

```text
N = 50 simultaneous POST /api/bookings
same roomId
same checkIn/checkOut
```

**Expect today (broken):** often `ACTIVE overlapping holds ≥ 2`.

Also assert DB:

```sql
-- conceptual: count ACTIVE overlapping for room
```

### ✅ After — Closed only if ALL pass

1. **Concurrency (HTTP + DB)**  
   - 10 runs × 50 concurrent identical creates  
   - **Successful inventory-holding bookings ≤ 1**  
   - Others: `4xx` unavailable / conflict (not 500)  
   - PostgreSQL: ≤ 1 set of nights (or ≤ 1 ACTIVE overlap) for that room/range  

2. **Logical expiry**  
   - Booking with `expiresAt < now`, status still `WAITING_PAYMENT`, timer not paused  
   - Second guest can book same room/dates **without** waiting for expire job  

3. **Idempotency**  
   - Same `Idempotency-Key` twice → one booking, same `publicCode`/id  

4. **Regression**  
   - Cancelled / expired / rejected do not block  
   - Offline create cannot double-confirm overlap  
   - Happy path: create → proof → approve still works  

5. **Docs**  
   - Update `BOOKING-INTEGRITY-AUDIT.md` + Baseline: BI-001 **Closed** with test evidence  

**Not Closed** if only “we wrapped in `$transaction`” without concurrency proof against Postgres.

---

## 8. Suggested test skeleton (to implement with fix)

```text
describe("booking inventory concurrency", () => {
  it("allows at most one active overlapping hold per room", async () => {
    // seed APPROVED hotel + sellable room
    // Promise.all 50× POST /api/bookings
    // query DB for ACTIVE overlaps + inventory nights
    // expect holdingCount === 1
  });

  it("treats expired soft-hold as free before cron", async () => {
    // create hold, set expiresAt in past, status WAITING_PAYMENT
    // assert second create succeeds
  });

  it("idempotency key returns same booking", async () => {
    // two POSTs same key → same booking id
  });
});
```

Prefer Vitest + real test DB (or Testcontainers Postgres). In-memory mocks **do not** prove BI-001.

---

## 9. Cursor implementation brief (copy-paste when ready to code)

```text
Implement BI-001 Hybrid remediation per docs/audit/BI-001-REMEDIATION-PLAN.md.

MUST:
1. Logical expiration in availability asserts (BI-004).
2. Single inventory gateway for guest create + offline create.
3. Transaction with row lock + re-assert before create.
4. DB unique night slots (or EXCLUDE) for physical roomId.
5. Idempotency-Key on POST /api/bookings (BI-005).
6. Concurrency regression tests against Postgres (10×50) — fail CI if >1 active overlap.
7. Do NOT “fix” by only shortening expiresAt or only adding rate limits.

OUT OF SCOPE this PR: BI-002 payment-approve policy (separate).
Closed only when §7 criteria green.
```

---

## 10. Priority context (P0 / P1)

```text
P0
├── SEC-001 Secrets (ops: REVOKE→ROTATE→SCRUB)
├── SEC-003 KYC private Blob
└── BI-001 Booking race (this plan)

P1
├── BI-002 Payment approval
├── BI-003 (closes with BI-001)
├── BI-004 / BI-005 (in BI-001 epic)
├── BI-006 Room integrity
├── SEC-004 Authorization
└── SEC-009 Upload validation
```

---

## 11. Release verdict (reaffirmed)

### 🔴 RELEASE: BLOCKED

Not because of “many bugs”, but because a **fundamental inventory invariant** is violated under concurrency:

> One physical room can simultaneously hold multiple overlapping active soft-holds.

Until BI-001 is Closed with **Postgres-backed concurrency proof**, real production booking traffic must not be scaled.
