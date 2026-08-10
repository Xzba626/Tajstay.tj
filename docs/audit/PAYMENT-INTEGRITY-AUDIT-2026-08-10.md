# TajStay — Payment Integrity Audit

**Date:** 2026-08-10  
**Mode:** `MODE: RESEARCH` — **no production code, no schema changes, no remediation**  
**Chain:** Booking → Payment/Proof → Confirmation → Inventory → Payout → Refund → Dispute  
**State diagram:** `docs/audit/PAYMENT-STATE-MACHINE-2026-08-10.md`  
**Baseline:** Backend Deep Audit #2 · Booking Integrity · Security Validation  

**Release stance:** TajStay remains **not release-ready** for financial integrity (manual ledger ≠ settled money).  
**Product maturity:** still **≤ 4.5/10** — this pass does not uplift the score.

### Evidence vocabulary (mandatory)

| Label | Meaning |
|-------|---------|
| **CONFIRMED STATIC / RUNTIME UNVERIFIED** | Code path unambiguously allows the failure mode; no concurrent/E2E run in this pass |
| **UNCONFIRMED** | Insufficient evidence to assert |
| **RUNTIME GAP** | Requires live PSP, production traffic, or executed race/E2E to conclude |

Do **not** treat “suspicious” as confirmed without a concrete branch.

---

## 0. Executive verdict

| Question | Verdict |
|----------|---------|
| Is there a real card/PSP capture? | **No** — `Payment.provider="MANUAL"`; transfer labels ALIF/DC are methods, not gateways |
| Is there a payment webhook? | **No** — only Telegram webhook exists → duplicate PSP webhook = **N/A / RUNTIME GAP** for future PSP |
| Can `COMPLETED` exist without `Payout`? | **CONFIRMED STATIC / RUNTIME UNVERIFIED** (BE2-005) |
| Is `Refund.status=SENT` real money return? | **CONFIRMED STATIC / RUNTIME UNVERIFIED** (BE2-010) — DB row only |
| Can `PAID` ≠ `CAPTURED`? | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| Can guest set online booking amount? | **No** (server pricing) — **CONFIRMED STATIC** |
| Can owner set offline amount? | **Yes** — **CONFIRMED STATIC** |
| Idempotency-Key on money ops? | **Absent** — **CONFIRMED STATIC** |
| DB enforces finance invariants? | **Mostly no** — see §L |

**Financial integrity maturity (this pass):** ~**3/10** (ledger fiction + race-prone transitions).  
Does not change overall product baseline 4.5/10.

---

## 1. System model (as implemented)

```text
Guest pays outside platform (bank transfer)
        ↓
Uploads proof URL/file (or chat image)
        ↓
Owner and/or Admin mark PAID / CAPTURED in Postgres
        ↓
“Escrow” = deriveEscrowState(booking fields)  ← not a wallet
        ↓
Admin may create Payout PENDING (email “awaiting transfer”)
        ↓
Payout never auto-settles; Refund SENT never calls a bank
```

---

## 2. Happy path (online manual)

1. `POST /api/bookings` → server `computeRoom*TotalPrice` → `Booking(WAITING_PAYMENT, paymentStatus=PENDING)` + `Payment(MANUAL, PENDING, amount=totalPrice)` + 15m `expiresAt`.  
2. Guest `POST /api/payments/proof` (or chat image) → `ON_REVIEW` + `paymentProofUrl`.  
3. Admin `confirmBookingPaymentAdmin` (proof + PENDING) **or** Owner `confirmBookingPaymentOwner` (wider) → `CONFIRMED` + `PAID` + usually `CAPTURED`.  
4a. Admin complete → `COMPLETED` + `Payout PENDING`.  
4b. Guest confirm-checkout → `COMPLETED` **without** Payout.

**Evidence — server amount on create:** `src/app/api/bookings/route.ts` L111–162.  
**Evidence — admin confirm gates:** `src/lib/bookings/adminBookingActions.ts` L36–76.  
**Evidence — guest complete no payout:** `src/app/api/bookings/[id]/confirm-checkout/route.ts` L41–44.

---

## 3. Check matrix (required questions)

### A. BE2-005 — `COMPLETED` without `Payout`

| | |
|--|--|
| **Verdict** | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| **Evidence** | Guest checkout updates status only (`confirm-checkout/route.ts` L41–44). Payout create exists only in `admin/bookings/complete/route.ts` L48–55. |
| **Actual** | Happy-path guest completion → zero `Payout` rows; `deriveEscrowState` still returns `RELEASED` when `PAID`+`COMPLETED` (`domain/booking.ts` L34–36) without reading Payout. |
| **Expected** | One complete policy: either always create payout, or explicit “no platform payout” flag — never silent divergence. |
| **Runtime still needed** | Execute guest checkout on PAID booking; assert `Payout.count=0` and UI shows RELEASED. |

---

### B. BE2-010 — `Refund SENT` real vs DB-only

| | |
|--|--|
| **Verdict** | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| **Evidence** | `admin/bookings/payment/route.ts` L54–64 creates `Refund{ status: "SENT", sentAt: now }` with reason `"Admin refund"`. No Stripe/Payme/Alif SDK; no payment webhook route. |
| **Actual** | Paper ledger entry; repeatable (no unique on `Refund.paymentId`). |
| **Expected** | Refund PENDING → external settlement → SENT/FAILED; idempotent; ties booking lifecycle. |
| **Runtime still needed** | Confirm no outbound HTTP to banks on that POST (network trace). Static absence of client is already strong. |

---

### C. `PAID` ↔ `CAPTURED` desync

| | |
|--|--|
| **Verdict** | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| **Evidence** | Owner approve: always sets booking `PAID`; CAPTURED only if `payment.status === "PENDING"` (`ownerPaymentApprove.ts` L60–74). Guest checkout requires `paymentStatus === "PAID"` only — not CAPTURED (`confirm-checkout` L26–27). Admin free write can set fields independently (`admin/bookings/payment`). Owner reject can set booking `REFUNDED` without Payment update (`owner/.../reject`). |
| **Actual** | Booking and Payment can disagree; escrow UI ignores Payment row. |
| **Expected** | Single txn: PAID ⇔ CAPTURED (or fail). |
| **Runtime** | Owner approve with missing/non-PENDING Payment; observe PAID without CAPTURED. |

---

### D. Amount authority

| Path | Client influences sum? | Verdict |
|------|------------------------|---------|
| Online `POST /api/bookings` | **No** — server pricing | **CONFIRMED STATIC** |
| Offline owner/moderator create/update | **Yes** — `Number(form.get("totalPrice"))` | **CONFIRMED STATIC** |
| `proofAmount` on proof | Logged only; not matched to `Payment.amount` | **CONFIRMED STATIC** |
| Post-create `Payment.amount` update | No writers found (status-only updates) | **CONFIRMED STATIC** (immutability by omission) |

---

### E. Duplicate payment / proof / confirm

| Scenario | Verdict | Evidence |
|----------|---------|----------|
| Two Payment rows per booking | Blocked by `@unique bookingId` | schema Payment L478 |
| Duplicate proof JSON after already ON_REVIEW | False success `{ok:true}` if count=0 | proof route L115–160 — **CONFIRMED STATIC** |
| Parallel admin/owner confirm | Race (no CAS) | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| Duplicate admin Refund SENT | New row each time | **CONFIRMED STATIC** |
| Duplicate Payout on double complete | No booking status CAS; `Payout.bookingId` not unique | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |

---

### F. Duplicate payment webhook

| | |
|--|--|
| **Verdict** | **RUNTIME GAP** for PSP (feature absent); **CONFIRMED STATIC** that **no payment webhook exists** |
| **Evidence** | Grep: only `src/app/api/telegram/webhook`. No stripe/payme packages in app payment path. |
| **Implication** | Replay/idempotency of PSP callbacks cannot be audited until a PSP is integrated. |

---

### G. Payment ↔ expiration race

| | |
|--|--|
| **Verdict** | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| **Evidence** | `jobs/expire-bookings/route.ts` L42–47: `updateMany({ where: { id: { in: ids }}})` without re-checking status/`expiresAt`. Chat proof path sets ON_REVIEW without expiry check (`chat/.../messages`). Proof route checks expiry then separate update (TOCTOU). |
| **Impact** | Confirmed/ON_REVIEW booking can be overwritten to EXPIRED/REJECTED; or expired hold extended via chat. |
| **Runtime** | Concurrent proof/confirm vs expire job. |

---

### H. Payment ↔ cancellation race

| | |
|--|--|
| **Verdict** | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| **Evidence** | Guest cancel blocked when `PAID` or CONFIRMED+ (`guestCancel.ts` L16–20). Cancel/confirm are read-then-update, not conditional CAS. Admin cancel of PAID keeps `paymentStatus: PAID` and does not create Refund (`admin/.../cancel`). |
| **Impact** | Parallel confirm+cancel can interleave; admin cancel after PAID leaves “paid cancelled” without refund machine. |
| **Runtime** | Parallel cancel + confirm under load. |

---

### I. Refund ↔ payout double movement

| | |
|--|--|
| **Verdict** | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| **Evidence** | Admin can complete → Payout PENDING, then set REFUNDED → Refund SENT; no payout cancel. Multiple Payouts possible (BE-007). Neither path moves external money — **ledger double fiction**. |
| **Expected** | Mutex: refund blocks/cancels unsettled payout; settled payout needs clawback workflow. |
| **Runtime** | Sequence complete → refund; assert both rows exist. |

---

### J. Offline / proof reuse / substitution

| | |
|--|--|
| **Verdict** | **CONFIRMED STATIC / RUNTIME UNVERIFIED** |
| **Evidence** | Proof accepts any safe relative/`https` URL (`payments/proof`); no binding file↔booking hash. Chat image becomes `paymentProofUrl`. Owner approve without proof (BI-002). Offline totals client-trusted. |
| **Impact** | Cross-booking proof URL reuse; approve-without-proof; offline amount spoof by authorized owner (trust model). |

---

### K. Idempotency

| Operation | Atomic idempotency? | Verdict |
|-----------|---------------------|---------|
| Booking create | No Idempotency-Key; no txn with payment | **CONFIRMED STATIC** (BI-005) |
| Proof submit | Partial status CAS; false ok on no-op | **CONFIRMED STATIC** |
| Confirm pay | No CAS / no key | **CONFIRMED STATIC** |
| Refund | Creates new row each time | **CONFIRMED STATIC** |
| Payout | Creates new row; no unique | **CONFIRMED STATIC** |
| Payload conflict on same key | N/A — no key store | **CONFIRMED STATIC** |

---

### L. PostgreSQL invariants — have vs should

| Exists today | Missing for finance integrity |
|--------------|-------------------------------|
| `Payment.bookingId` `@unique` | `Payout.bookingId` `@unique` (or partial unique) |
| Indexes on booking/payment status, `expiresAt` | Unique open/successful `Refund` per `paymentId` |
| String status fields (comment enums) | CHECK / enum: `PAID` ⇔ `CAPTURED` |
| | CHECK: `COMPLETED` ⇒ payout policy XOR flag |
| | Conditional updates enforced in DB for expire/confirm |
| | `Payment.amount` = `Booking.totalPrice` for PLATFORM |
| | Exclusion / inventory uniqueness (BI-001) |

**Verdict on “DB guarantees money correctness”:** **CONFIRMED STATIC** that **current constraints do not** enforce escrow/refund/payout consistency.

---

## 4. Inventory coupling (payment ↔ holds)

Active online hold set includes soft-pay statuses (`ACTIVE_ONLINE_BOOKING_STATUSES` in availability lib — see Booking Integrity).  

| Event | Inventory effect |
|-------|------------------|
| Create WAITING_PAYMENT | Hold (app-level) |
| Expire → EXPIRED | Hold released **after** successful status write |
| Confirm → CONFIRMED | Hold continues |
| COMPLETED | Still in ACTIVE set (completed occupies dates) |
| Race expire vs confirm | **BE-002 / §G** — hold/status can tear |

Payment confirmation re-asserts availability (admin/owner) but **not** inside the same CAS as status write → confirm-time double-book still possible under concurrency (BI-001 family).

---

## 5. Dispute interaction

| | |
|--|--|
| Create dispute | Party-scoped; **no** booking-status gate (BE-020) |
| Resolve | **No API** (BE2-007) |
| Freeze payout/refund | **None** |
| **Verdict** | Disputes do **not** protect financial integrity today — **CONFIRMED STATIC** |

---

## 6. Finding index (payment-scoped)

| ID | Theme | Class |
|----|-------|-------|
| BE2-005 | COMPLETED without Payout | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| BE2-010 | Paper Refund SENT | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| BI-002 / BE-001 | Owner confirm without proof | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| BE-002 | Expire blind updateMany | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| BE-006 | Admin free paymentStatus | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| BE-007 | Duplicate Payout | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| BE-008 | Proof URL reuse | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| PAID≠CAPTURED | Desync | CONFIRMED STATIC / RUNTIME UNVERIFIED |
| Offline amount | Client totalPrice | CONFIRMED STATIC |
| Online amount | Server authority | CONFIRMED STATIC (positive) |
| PSP webhook replay | — | RUNTIME GAP (no webhook) |
| Concurrent races proof/expire/confirm/cancel | — | CONFIRMED STATIC pattern / RUNTIME UNVERIFIED outcome |

---

## 7. Runtime experiment plan (not executed)

| # | Experiment | Proves |
|---|------------|--------|
| R1 | Guest checkout on PAID → SQL `Payout` count | BE2-005 |
| R2 | Admin REFUNDED ×2 → Refund rows; tcpdump no bank | BE2-010 |
| R3 | Owner approve w/ Payment FAILED/missing → PAID vs CAPTURED | desync |
| R4 | Tamper create totalPrice field → ignored | amount authority online |
| R5 | Offline create totalPrice=1 → persisted | offline authority |
| R6 | Parallel expire job + proof/confirm | §G |
| R7 | Double admin complete | duplicate payout |
| R8 | Complete then REFUNDED | payout+refund coexistence |
| R9 | Reuse proofUrl across two bookings | BE-008 |

---

## 8. Recommended DB + app invariants (research — not implemented)

1. Single `completeBookingAndReleaseEscrow()` for guest + admin.  
2. `@@unique([bookingId])` on Payout; reject second complete.  
3. Refund machine with uniqueness; forbid REFUNDED while unsettled payout exists (or auto-void payout).  
4. Owner approve = admin proof gates; CAS `ON_REVIEW` + `Payment.PENDING`.  
5. Expire/confirm/cancel: `updateMany` WHERE status IN (…) AND count check.  
6. Idempotency-Key store for create/confirm/refund/complete.  
7. CHECK constraints or transactional assertions for PAID⇔CAPTURED.  
8. If PSP added later: webhook signature + replay protection + AUTH→CAPTURE machine (**RUNTIME GAP** until then).

---

## 9. Pipeline position

```text
SECURITY ✅ deep
BOOKING INTEGRITY ✅ deep
BACKEND DEEP #2 ✅ closed (research)
PAYMENT INTEGRITY ✅ this document (static deep; runtime open)
   ↓ NEXT (suggested)
DATABASE / STATE MACHINE hardening design
   ↓
RUNTIME E2E (incl. R1–R9)
   ↓
UI/UX → Lighthouse → a11y → load → DR → Final re-audit
   ↓
Design System → Restyle   ← still deferred
```

---

## 10. Status footer

```text
MODE: RESEARCH ONLY
CODE CHANGES: none
ARTIFACTS:
  docs/audit/PAYMENT-INTEGRITY-AUDIT-2026-08-10.md
  docs/audit/PAYMENT-STATE-MACHINE-2026-08-10.md
PSP / PAYMENT WEBHOOK: absent
VERDICTS: use CONFIRMED STATIC / RUNTIME UNVERIFIED | UNCONFIRMED | RUNTIME GAP
RELEASE-READY: no
NEXT: Database/state-machine design pass OR runtime payment experiments — not restyle
```
