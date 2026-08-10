# TajStay — P0 Remediation Backlog (Audit Frozen)

**Date:** 2026-08-10  
**Audit phase:** **FROZEN** — no further general research passes  
**Maturity:** ≤ 4.5/10 · **Release:** BLOCKED  
**Next value:** real diffs + tests + PostgreSQL proof — not more Markdown audits  

**Implementation gate:** each item starts only with an explicit command, e.g.

```text
MODE: IMPLEMENTATION
implement BI-001
```

(or `implement BE2-200`, `implement BE2-005`, …)

**BI-001** additionally requires that exact pair of lines (legacy lock).

---

## Architectural diagnosis (frozen)

Two broken chains share the same root class:

```text
Booking → Payment → Completion → Payout → Refund
Room → Inventory → Booking
```

Missing combination:

```text
HTTP idempotency  +  transaction  +  DB invariant
```

`if (...)` in a single route is **not** sufficient.

---

## Execution order (locked)

```text
1  BI-001     Inventory integrity          PRODUCTION BLOCKER
2  BI-002     Owner approve ≠ PAID         RUNTIME CONFIRMED
3  BE2-200…202 Tenant isolation (OR)       RUNTIME CONFIRMED
4  BE2-005    Complete ↔ Payout atomic     RUNTIME CONFIRMED
5  BE-007     Complete idempotent          RUNTIME CONFIRMED
6  BE2-010    Refund state machine         RUNTIME CONFIRMED
7  Idempotency policy (cross-cutting)      after money/inventory paths
8  SEC-001 / SEC-003                       security P0 (can parallel ops)
9  TS-CNT-001 Legal routes/content         trust
10 TS-SEO-01 / TS-UX-005                   after P0 core (or parallel low-risk)
—  TS-UI-001 / Design System / Restyle     AFTER P0/P1 remediation
—  Prod build CWV                          AFTER buildable P0; not next-dev scores
```

SEC-005 remains **hardening only** (not active BFLA).

---

## 1. BI-001 — Inventory Integrity

**Plan:** `BI-001-REMEDIATION-PLAN.md` (Hybrid — already approved as design)  
**Do not rely on** `assertDatesAvailable()` alone.

Target flow:

```text
POST /api/bookings
 → Inventory Gateway
 → logical expiration
 → transaction
 → row/night locking
 → re-assert availability
 → create booking
 → create BookingInventoryNight
 → DB UNIQUE(roomId, night)  [or equivalent exclusion]
```

### Closed criterion

```text
10 workers × 50 concurrent POST × same room × same dates
→ ACTIVE overlapping holds ≤ 1
→ PostgreSQL proves UNIQUE(roomId, night) (or exclusion) holds
```

**Status:** OPEN · implement only on `MODE: IMPLEMENTATION` + `implement BI-001`

---

## 2. BI-002 — Owner approval without proof

**Runtime:** approve → `CONFIRMED` + `PAID` without proof.

Separate concerns:

| Intent | Must NOT be |
|--------|-------------|
| Owner “ready to host” | `paymentStatus=PAID` |
| Financial paid fact | Requires verified proof + capture path |

Target machine (concept):

```text
WAITING_PAYMENT → (valid proof) → verification → PAID → CONFIRMED
```

Optional distinct state if product needs host ack: e.g. `OWNER_APPROVED` ≠ `PAID`.

### Closed criterion

- Owner approve without proof → **4xx**, booking stays unpaid  
- Admin/owner confirm with proof → single PAID+CAPTURED  
- Regression test covers both

---

## 3. BE2-200…202 — Tenant isolation

**Runtime:** Owner/Moderator saw foreign “Secret Guest”.

Rule:

```text
tenantScope AND businessCondition
```

Never overwrite tenant `OR` with a second top-level `OR`.

### Closed criterion

- Foreign `roomId` / search `q` → empty or 403 for other-tenant data  
- Regression: seeded foreign offline booking invisible to seed owner/mod

---

## 4–6. Finance: BE2-005 · BE-007 · BE2-010

| ID | Bug | Direction |
|----|-----|-----------|
| BE2-005 | `COMPLETED` with 0 Payout | Complete + settlement in **one transaction**; define SoT |
| BE-007 | Complete×2 → 2 Payouts | Idempotent transition + `Payout.bookingId` unique (or equiv.) |
| BE2-010 | Refund×2 → 2× SENT | Idempotent refund; machine `REQUESTED→PROCESSING→REFUNDED`; `SENT` ≠ settled truth |

### Closed criterion

- Complete once → ≤1 Payout; second complete → no new side effect  
- Guest or admin complete never leaves COMPLETED without defined payout policy  
- Refund twice → one refund artifact; no double SENT fiction without processor

---

## 7. Cross-cutting Idempotency

Minimum endpoints:

```text
POST booking | payment | confirmation | completion | refund | payout | proof
```

```http
Idempotency-Key: <client-operation-id>
```

**Does not replace** DB constraints.

---

## 8. Security P0 (parallel ops track)

| ID | Action |
|----|--------|
| SEC-001 | REVOKE → ROTATE → SCRUB → VERIFY (history) |
| SEC-003 | Private storage + authz proxy for KYC |

---

## 9. Trust / SEO / Mobile (after or parallel low-risk)

| ID | Closed when |
|----|-------------|
| TS-CNT-001 | Real `/privacy` `/terms` `/refund-policy` `/cookies` — no placeholders; fix `/privacy` 404 |
| TS-SEO-01 | Sitemap includes `/hotel/[id]` |
| TS-UX-005 | Mobile sticky Reserve wired — **after** finance/inventory P0 unless product insists earlier |

---

## Explicitly deferred

- Verdant Peak / Central Asian Hospitality restyle  
- Design System Stage C as production rewrite  
- Treating `next dev` Lighthouse (Perf~43, LCP~22s) as production CWV  

Next performance pass only after:

```bash
npm run build && npm run start
```

---

## How to start work

Pick **one** P0 id and send:

```text
MODE: IMPLEMENTATION
implement <ID>
```

Recommended first: **`implement BI-001`**.

Until then: **no remediation diffs**; audit remains frozen evidence.
