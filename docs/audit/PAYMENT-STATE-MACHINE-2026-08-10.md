# TajStay — Payment State Machine

**Date:** 2026-08-10  
**Mode:** RESEARCH ONLY  
**Model:** Manual bank/transfer proof (`Payment.provider = "MANUAL"`). **No card PSP / payment webhook** in codebase.  
**Companion:** `PAYMENT-INTEGRITY-AUDIT-2026-08-10.md`

---

## 1. Actors

| Actor | Financial actions |
|-------|-------------------|
| Guest | Create booking, submit proof (URL/file/chat image), cancel pre-PAID, confirm-checkout |
| Owner | Approve payment (wide), reject pay-on-arrival, offline totals |
| Admin | Confirm/reject proof, free `paymentStatus` write, complete→payout, cancel, extend timer |
| Job (`JOB_SECRET`) | Expire waiting / review-timeout → FAILED |
| PSP webhook | **Absent** |

---

## 2. Booking.status (online platform)

```text
WAITING_PAYMENT ──┬──(proof)──► ON_REVIEW ──┬──(admin confirm)──► CONFIRMED
                  │                         ├──(admin reject)───► REJECTED
WAIT_PROOF ───────┘                         └──(review job)─────► REJECTED

WAITING_PAYMENT / WAIT_PROOF
  ├──(owner approve*)──► CONFIRMED     [* no proof required — BI-002]
  └──(expire job*)─────► EXPIRED       [* blind updateMany — BE-002]

PENDING_OWNER + payOnArrival
  └──(owner confirm/reject)──► CONFIRMED / REJECTED

CONFIRMED ──► CHECKED_IN (ops)
CONFIRMED | CHECKED_IN
  ├──(guest checkout)──► COMPLETED     [no Payout — BE2-005]
  └──(admin complete)──► COMPLETED + Payout PENDING

CANCELLED / CANCELLED_BY_GUEST / EXPIRED / REJECTED — terminal-ish
```

Legacy aliases: `WAIT_PROOF` normalized to waiting in UI helpers; schema default comment still mentions `PENDING_OWNER`.

---

## 3. Booking.paymentStatus × Payment.status

| Booking.paymentStatus | Intended meaning | Who sets |
|----------------------|------------------|----------|
| `PENDING` | Unpaid / awaiting | create, some resets |
| `PAID` | Treated as paid in product | owner approve, admin confirm, admin free write |
| `FAILED` | Expired / rejected | expire job, admin |
| `REFUNDED` | “Refunded” flag | admin payment route, some reject/cancel branches |

| Payment.status | Intended | Who sets |
|----------------|----------|----------|
| `PENDING` | Soft hold / awaiting capture | create |
| `AUTHORIZED` | **Dead** — never written | — |
| `CAPTURED` | “Received” in ledger | admin confirm, owner approve (if was PENDING), admin free write |
| `FAILED` | Failed | expire job, reject |
| `REFUNDED` | Refunded in ledger | admin free write |

**Invariant claimed by product (escrow UI):** `deriveEscrowState(status, paymentStatus)` — **does not read** `Payment` or `Payout` tables.

```text
REFUNDED → REFUNDED
not PAID → NOT_CHARGED
PAID + COMPLETED → RELEASED
PAID + CHECKED_IN → HELD
PAID + CONFIRMED → RELEASABLE
else PAID → HELD
```

---

## 4. Allowed transitions (enforced vs claimed)

### 4.1 Proof submit — Guest

| FROM | TO | Enforced? |
|------|-----|-----------|
| `WAITING_PAYMENT` \| `WAIT_PROOF` | `ON_REVIEW` + proof URL | Partial CAS via `updateMany` status filter (`/api/payments/proof`) |
| same via chat image | `ON_REVIEW` | Status filter; **no** expiry check on chat path |

`proofAmount` — logged only, not compared to `Payment.amount`.

### 4.2 Confirm — Admin

| Guard | Present |
|-------|---------|
| status = `ON_REVIEW` | ✅ |
| `paymentProofUrl` + `proofSubmittedAt` | ✅ |
| Payment.status = `PENDING` | ✅ |
| Re-assert inventory | ✅ (assert*) |
| `$transaction` + CAS on write | ❌ |
| Idempotent second call | ❌ (read-then-update) |

### 4.3 Confirm — Owner

| Guard | Present |
|-------|---------|
| status ∈ {WAITING_PAYMENT, WAIT_PROOF, ON_REVIEW} | ✅ (too wide) |
| proof required | ❌ |
| Payment PENDING → CAPTURED | only if Payment exists & PENDING |
| Booking always → PAID + CONFIRMED | ✅ even if Payment not CAPTURED |

### 4.4 Admin free payment write

`POST /api/admin/bookings/payment`  
Allowlist: `PENDING | PAID | FAILED | REFUNDED`  
PAID guard: reviewed proof **OR** already CAPTURED (CAPTURED may come from owner approve without proof).  
Does **not** force `Booking.status = CONFIRMED`.  
On REFUNDED: creates `Refund{ status: SENT }` every time.

### 4.5 Complete / Payout

| Path | Booking | Payout |
|------|---------|--------|
| Admin complete | → COMPLETED if PAID + CAPTURED | `create` PENDING (no unique, no status CAS) |
| Guest checkout | → COMPLETED if PAID (+ date gate) | **none** |
| Payout PENDING → SENT | — | **no code path** |

### 4.6 Refund

```text
Admin paymentStatus=REFUNDED
  → Payment.status=REFUNDED
  → Refund.create({ status: "SENT", sentAt: now })
  → no bank/PSP call
  → no Payout cancel / clawback
```

Guest cancel when PAID: **blocked** by `guestBookingCancelAllowed` (dead `REFUNDED` assignment in cancel routes).

### 4.7 Dispute

```text
OPEN → (no RESOLVED/REJECTED API)
```

No freeze of payout/refund.

---

## 5. Race windows (conceptual)

```text
Time ─────────────────────────────────────────────►

Guest proof ─────────────► ON_REVIEW
Expire job selected id ─────────────────► EXPIRED (no status re-check)
Owner/Admin confirm ──────────► CONFIRMED+PAID
Admin complete ──► Payout₁
Admin complete ──► Payout₂ (duplicate)
Admin REFUNDED ──► Refund SENT (paper)
Guest checkout ──► COMPLETED (no Payout)
```

---

## 6. Offline (OWNER_MANUAL) money model

Separate from online `Payment` ledger:

- Owner/moderator supplies `totalPrice` / prepayment in FormData.
- Often **no** `Payment` row.
- Inventory still interacts with ACTIVE hold set when statuses overlap — see BI audit.
- Not a substitute for platform escrow.

---

## 7. What “escrow” means in TajStay today

**Not** a held PSP balance.  
**Is** a UI/derived label from booking fields + optional `Payout`/`Refund` rows that are **operational ledgers without settlement automation**.

---

## 8. Target machine (recommendation only — not implemented)

```text
Payment: PENDING → (proof) UNDER_REVIEW → CAPTURED
                              ↘ FAILED
Captured booking: CONFIRMED → COMPLETED ⇒ exactly one Payout PENDING → SENT
Refund: only from CAPTURED; Refund PENDING → SENT; blocks/cancels Payout
All transitions: CAS + txn + audit actor
DB: unique Payout(bookingId); unique open Refund(paymentId); CHECK PAID⇔CAPTURED
```

**Status:** RESEARCH diagram only.
