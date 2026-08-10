# TajStay — Booking Integrity Audit (Deep Pass)

**Date:** 2026-08-10  
**Mode:** Research only — **no code changes**  
**Focus:** SEC-010 TOCTOU / double booking + payment/booking state integrity  
**Related:** SEC-011 (owner payment approve), Security Validation v1  

---

## Executive verdict

| Question | Answer |
|----------|--------|
| Can one physical room get two overlapping **ACTIVE** platform bookings? | **YES** under concurrency (app check only, no DB exclusion) |
| Guest can set price on create? | **NO** (server `computeRoom*TotalPrice`) |
| DB enforces non-overlap? | **NO** — indexes only |
| Owner can `WAITING_PAYMENT` → `CONFIRMED`/`PAID` without proof? | **YES** (SEC-011 / BI-002) |
| Release gate impact | Still **❌ BLOCKED** until BI-001 (+ KYC/secrets) closed |

**Bottom line:** Availability logic is real but **not concurrency-safe**. Soft holds make double-`WAITING_PAYMENT` more common than double-`CONFIRMED` on the online path; offline create + owner approve-without-proof remain direct integrity breaks.

---

## A. Invariants

| # | Invariant | Result | Evidence |
|---|-----------|--------|----------|
| 1 | 1 room ≠ 2 overlapping ACTIVE | **FAIL under race** | assert then `create` outside txn |
| 2 | checkout > checkin | **OK** | `POST /api/bookings` + availability |
| 3 | Price server-side | **OK** | pricing helpers only |
| 4 | Guest cannot alter price | **OK** | form ignores client total |
| 5 | Inactive/unapproved not bookable | **PARTIAL** | hotel `APPROVED` + roomType/room availability; **not** `deletedAt` / `OUT_OF_SERVICE` on roomId path |
| 6 | Ownership on mutate | **OK** (sampled) | userId / hotel.ownerId |
| 7 | CANCELLED/EXPIRED/REJECTED free inventory | **OK** once status written | `INACTIVE_*` not in ACTIVE |
| 8 | Hold statuses | See below | `ACTIVE_ONLINE_*` includes soft holds |
| 9 | 15m soft hold | **PARTIAL** | `expiresAt` set; free only after expire **job** |
| 10 | Past dates / TZ | **WEAK** | API allows past; UTC vs local day mix |

### Inventory hold set (`ACTIVE_ONLINE_BOOKING_STATUSES`)

`WAITING_PAYMENT`, `WAIT_PROOF`, `ON_REVIEW`, `PENDING_OWNER`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`

File: `src/lib/booking/availability.ts`

---

## B. Concurrency — `POST /api/bookings`

```
form + rate limit
  → optional session / auto-guest
  → validate dates
  → computeRoom*TotalPrice  ← assertDatesAvailable / assertRoomTypeAvailable HERE
  → generateBookingCode
  → booking.create            ← NO lock / NO $transaction wrapping assert+create
  → payment.create
  → side effects
```

| Control | Present? |
|---------|----------|
| `prisma.$transaction` around assert+create | **No** |
| `SELECT FOR UPDATE` / advisory lock | **No** |
| Idempotency-Key | **No** |
| Postgres EXCLUDE / unique overlap | **No** |

**Race:**

```text
A: assert OK          B: assert OK
A: create hold        B: create hold
→ two WAITING_PAYMENT on same room/dates
```

Confirm often then **deadlocks** both (re-assert with exclude) until expire — inventory still polluted.

---

## C. Database

| Item | Status |
|------|--------|
| Indexes on `(roomId, checkIn, checkOut[, status])` | Yes |
| Exclusion / unique overlap | **Missing** |
| `Payment.bookingId` unique | Yes |
| `publicCode` unique | Yes |
| Booking → User/Room FK onDelete | Restrict (default) |

---

## D. State machines (simplified)

### Booking (platform)

```text
WAITING_PAYMENT / WAIT_PROOF
  → ON_REVIEW              (guest proof)
  → EXPIRED                (job / late)
  → CANCELLED_BY_GUEST
  → CANCELLED              (admin)
  → CONFIRMED+PAID         ★ owner payment-approve (NO proof)  ← BI-002

ON_REVIEW
  → CONFIRMED+PAID         (admin needs proof; owner also OK)
  → REJECTED               (admin / review timeout)

PENDING_OWNER (+ payOnArrival)
  → CONFIRMED | REJECTED   (owner/moderator)

CONFIRMED → CHECKED_IN → COMPLETED
```

### Payment (`Booking.paymentStatus`)

`PENDING` | `PAID` | `FAILED` | `REFUNDED`

### Payment row (`Payment.status`)

Mostly `PENDING` → `CAPTURED` / `FAILED` / `REFUNDED` (`AUTHORIZED` unused)

---

## E. Findings (BI-xxx)

| ID | Sev | Title | Fix direction |
|----|-----|-------|---------------|
| **BI-001** | 🔴 Critical | TOCTOU double soft-book / no DB exclusion (= SEC-010) | Txn+lock or gist EXCLUDE on active ranges |
| **BI-002** | 🔴 Critical | Owner approve without proof (= SEC-011) | Mirror admin: require `ON_REVIEW` + proof |
| **BI-003** | 🟠 High | Soft-hold deadlock after double create | Follows from BI-001 |
| **BI-004** | 🟠 High | `expiresAt` passed but status still holds until job | Assert treats expired-as-free **or** inline expire |
| **BI-005** | 🟠 High | No create idempotency | Idempotency-Key / client token unique |
| **BI-006** | 🟠 High | roomId path ignores type holds / room ops status / hotel.deletedAt | Unify sellable checks |
| **BI-007** | 🟡 Medium | Proof API returns `ok:true` when `updateMany` count=0 | Return 409 |
| **BI-008** | 🟡 Medium | Past checkIn accepted by API | Reject in hotel TZ |
| **BI-009** | 🟡 Medium | Confirm/approve booking+payment not one txn | `$transaction` + conditional update |
| **BI-010** | ⚪ Low | Offline `CHECKED_OUT` in ACTIVE hold set | Drop from hold list |
| **BI-011** | ⚪ Low | Admin can set payment PAID without CONFIRMED | Couple transitions |
| **BI-012** | ⚪/🟡 | UTC vs local day for check-in/out gates | Single TZ policy |

### 🟢 OK

- Server-side price on guest create  
- `checkOut > checkIn` on create  
- Unapproved hotel blocked  
- Terminal cancelled/expired/rejected do not hold once written  
- Guest/owner ownership checks on sampled mutate APIs  
- Admin payment confirm requires proof  
- Proof uses conditional `updateMany` (response handling weak — BI-007)

---

## Suggested concurrency tests (before claiming Closed)

1. **BI-001:** 20 parallel identical `POST /api/bookings` → expect ≤1 ACTIVE overlap (today often >1).  
2. **BI-001 offline:** parallel offline creates → ≤1 CONFIRMED overlap.  
3. **BI-002:** approve without proof → must fail after fix.  
4. **BI-007:** double proof → second not `ok: true`.

---

## Link to Security Validation

| Security ID | Booking Integrity ID |
|-------------|----------------------|
| SEC-010 | BI-001 |
| SEC-011 | BI-002 |

Three proofs before Security Phase closes (unchanged):

1. SEC-001 secrets rotated  
2. SEC-003 KYC private  
3. **BI-001 / SEC-010** concurrent double-book impossible  

---

## Recommended remediation order (integrity only)

1. BI-001 DB/app serialization  
2. BI-002 payment approve policy  
3. BI-004 / BI-005 expire + idempotency  
4. BI-006 / BI-007 / BI-008 polish  

Then re-run concurrency tests and update Baseline + Validation Accuracy.
