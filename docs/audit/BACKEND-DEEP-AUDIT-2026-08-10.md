# TajStay — Backend Deep Audit #2

**Date:** 2026-08-10  
**Mode:** `MODE: RESEARCH` — **no production code changes, no remediation, no schema edits**  
**Product only:** TajStay · roles `GUEST` / `OWNER` / `HOTEL_MODERATOR` / `ADMIN`  
**Baseline inventory:** ~50 pages · **142** API routes · **43** Prisma models  

**Does not raise product maturity above ~4.5/10.** Runtime, Payment Integrity PASS, Lighthouse, a11y, load, DR remain open.

### Companion / prior audits (baseline — do not duplicate)

| Doc | Use in #2 |
|-----|-----------|
| `SECURITY-AUDIT.md` + `SECURITY-CRITICAL-HIGH-VALIDATION.md` + `SECURITY-VALIDATION-v1.md` | SEC-* confirmed / downgraded |
| `BOOKING-INTEGRITY-AUDIT.md` + `BI-001-REMEDIATION-PLAN.md` | BI-001…005 |
| `BASELINE-v1.md` | Inventory / maturity freeze |
| `BACKEND-API-INVENTORY-2026-08-10.md` | Heuristic METHOD×PATH×AUTH×FLAGS (A) |
| Pass 1 notes in git history of this file | Folded into §F |

---

## BACKEND AUDIT STATUS: **PARTIAL**

| Lens | Depth |
|------|-------|
| AuthZ at handler (sampled + offline IDOR hunt) | 🟢 Deep |
| Booking inventory TOCTOU / soft-hold | 🟢 Deep (prior BI) |
| Validation coverage measurement | 🟢 Deep (static) |
| KYC / Dispute / Payout / Refund machines | 🟢 Deep (static) |
| Jobs / Telegram webhook | 🟢 Deep (static) |
| Error handling / false-success | 🟢 Deep (static) |
| Sensitive response surfaces | 🟡 Partial |
| N+1 / indexes / EXPLAIN | 🟡 Partial (static only) |
| Payment provider / card webhooks | 🔴 Gap (manual proof model) |
| Runtime concurrency proof | 🔴 Gap |
| E2E AuthZ suite | 🔴 Gap |

```text
DEEP on: AuthZ patterns, booking integrity (prior), new offline BOLA, state-machine completeness
PARTIAL on: full per-route matrix cells, perf, sensitive data exhaustiveness
GAP on: runtime, PSP webhooks, load beyond booking, DR/observability
```

---

## 0. Question this pass answers

> What does each server endpoint actually enforce, and where does the backend **not** guarantee stated business invariants?

Answer in one line: **Role gates are generally real at handlers; several money/KYC/dispute machines are incomplete or race-unsafe; three offline-list Prisma `OR` clobber bugs are new cross-tenant BOLA.**

---

## A. API coverage matrix

Full heuristic table: `docs/audit/BACKEND-API-INVENTORY-2026-08-10.md` (142 rows).

### Coverage controls (static, route-file presence)

| Control | Signal | Count / 142 | Notes |
|---------|--------|------------:|-------|
| Zod in route file | `z.object` / `safeParse` | **30** (~21%) | Mutating files w/ zod ≈30; mutating w/o ≈**83** |
| Rate limit | `rateLimit(` | **20** (~14%) | In-memory `Map` — multi-instance weak |
| `$transaction` | Prisma txn | **8** (~6%) | |
| Idempotency-Key | header/key | **0** | BI-005 remains open for create |
| Secret job/cron | env secret | 3–4 | Mixed fail-open/closed |

### Session source (handlers)

| Pattern | Truth |
|---------|--------|
| API auth | Cookie → `getSessionUser()` → Prisma `Session` → `User.role` / `isBanned` |
| Middleware | Cookie **shape** + optional `tajstay_role` — **not** sufficient AuthZ |
| Cron/jobs | `CRON_SECRET` / `JOB_SECRET` / `SEED_SECRET` |

Per-route METHOD/PATH/FILE/AUTH/FLAGS: inventory companion. Cells for TRANSACTION/IDEMPOTENCY/PAGINATION/SENSITIVE are evidenced in §§3–10 and findings — not every of 142 rows was hand-filled (see §G).

---

## B. Authorization matrix

| Resource | Guest | Owner | Moderator | Admin | Object-level | #2 status |
|----------|-------|-------|-----------|-------|--------------|-----------|
| Hotel mutate | — | own `ownerId` | — | approve/reject | DB | OK sampled; status not mass-assigned |
| Room / roomType | — | own hotel | read/ops | — | hotel scope | OK sampled |
| Online booking create | ✅ (+ anon guest) | ✅ | — | ✅ | server price | BI-001 race remains |
| Guest booking mutate | own `userId` | — | — | some bypasses | `userId` | Guest→guest IDOR **NR** |
| Payment proof | own | — | — | — | `userId` + status | IDOR **NR**; reuse BE-008 |
| Payment approve | — | hotel owner | — | proof-gated helper | hotel | **BE-001** covered |
| Offline list/search | — | **BOLA if `roomId`** | **BOLA search/`roomId`** | — | **broken `OR`** | **BE2-200…202 NEW** |
| Chat / Pusher | party | hotel | assigned | all | `canAccessBookingChat` | IDOR **NR** |
| Notifications | own | own | own | own | `userId` | IDOR **NR** |
| Favorites | self | self | — | self | `userId` | OK |
| KYC application | submit | — | — | review | guest/admin | CAS gaps **NEW** |
| Dispute | party | party | — | party | party only | no resolve **NEW** |
| Payout | — | view UI | — | create on complete | — | never settles **NEW** |
| Admin users | — | — | — | role/ban/creds | global | BE-010/011 covered |

**SEC-005:** remain **defense-in-depth / hardening only** — 32/32 admin routes call server admin auth. Not active BFLA.

**Middleware role cookie:** ALREADY COVERED as BE-AUTH-001 / SEC-004 family — fail-open when role cookie missing; handlers still DB-check on covered routes.

---

## C. Validation coverage

| Metric | Value |
|--------|------:|
| Route files | 142 |
| Mutating handlers in files **with** Zod | ~30 |
| Mutating handlers in files **without** Zod | ~83 (~73% of mutating) |
| Domains worst without Zod | admin (23), owner (16), profile (11), bookings (9) |

**State-mutating without Zod (examples, evidence):**  
`POST /api/bookings`, `POST /api/payments/proof`, owner/moderator offline create, owner rooms, admin `bookings/payment`, admin `users/update`, profile password, chat messages body.

**FormData patterns:** client-trusted `totalPrice` on offline create; unbounded chat/complaint message strings; room title unbounded — see **BE2-100…106**.

---

## D. State-machine map

### D.1 Booking × Payment (manual proof — no PSP webhook)

```text
WAITING_PAYMENT / WAIT_PROOF
  ├─ proof ──► ON_REVIEW
  ├─ owner approve* ──► CONFIRMED + booking PAID     [* BE-001 / SEC-011]
  ├─ expire job* ──► EXPIRED                         [* BE-002]
  └─ admin payment enum* ──► PAID/FAILED/REFUNDED    [* BE-006]

ON_REVIEW
  ├─ admin confirm ──► CONFIRMED + PAID + CAPTURED
  ├─ admin reject ──► REJECTED
  └─ review timeout job* ──► REJECTED                [* BE-002]

CONFIRMED | CHECKED_IN
  ├─ guest checkout ──► COMPLETED (NO Payout)        [* BE2-005]
  └─ admin complete ──► COMPLETED + Payout PENDING   [* BE-007 / BE2-006]
```

`Payment.AUTHORIZED` — schema only, never written (**BE2-014**).

### D.2 Refund

```text
Admin bookings/payment → REFUNDED
  └─ always refund.create({ status: "SENT" })   [* BE2-010]
No PENDING→provider→SENT machine. Duplicates allowed (no unique).
```

### D.3 Payout

```text
admin complete → Payout PENDING
  └─ (no update to SENT/FAILED anywhere in src/)  [* BE2-006]
guest checkout → COMPLETED with zero Payout       [* BE2-005]
```

### D.4 KYC (`OwnerApplication`; no `OwnerRequest` model)

```text
GUEST submit → PENDING
  ├─ multipart: docs required
  └─ JSON path: docs optional                     [* BE2-003]
Admin approve → APPROVED + User.role=OWNER        [* BE2-001 no CAS]
Admin reject → REJECTED
HostProfile.kycStatus: never written              [* BE2-004]
```

### D.5 Dispute / Complaint

```text
Dispute: create → OPEN → ✗ no resolve/reject API  [* BE2-007]
Complaint: create → PENDING → admin RESOLVED (ungarded FROM) [* BE2-009]
```

### D.6 Inventory / Room

Hold set & TOCTOU: **BI-001** (ALREADY COVERED). Offline money/status: client price on create (**BE2-101**).

---

## E. New findings (#2 only)

> Rule: every item below is **not** a re-label of SEC-001/003/010/011, BI-001/002, or Pass1 BE-001…011 themes unless explicitly marked “extends”.

### Critical

#### BE2-005 — Guest checkout completes stay without payout / escrow ledger  
| | |
|--|--|
| **AREA** | Payout / Booking |
| **SEVERITY** | Critical |
| **FILE / ROUTE** | `src/app/api/bookings/[id]/confirm-checkout/route.ts` L41–62 |
| **SCENARIO** | Paid guest completes checkout via chat UX → `COMPLETED`. Admin complete path creates `Payout`; guest path does not. |
| **ACTUAL** | Status flip only + review notify |
| **EXPECTED** | Shared complete helper: CAS status + idempotent payout (or explicit “no payout” product rule) |
| **ROOT CAUSE** | Two complete paths; only admin wires ledger |
| **IMPACT** | Owners unpaid; `deriveEscrowState` can show RELEASED without payout row |
| **RECOMMENDATION** | Unify complete + payout create; guest must not bypass ledger |
| **REGRESSION** | Guest checkout after PAID → exactly one `Payout` PENDING (or documented skip) |
| **VERIFICATION** | CONFIRMED (static) |
| **CLASS** | CONFIRMED |

#### BE2-010 — Paper refunds: `Refund` forced `SENT`, unbounded duplicates  
| | |
|--|--|
| **AREA** | Payment / Refund |
| **SEVERITY** | Critical |
| **FILE / ROUTE** | `src/app/api/admin/bookings/payment/route.ts` L54–64; `Refund` model no `@@unique(paymentId)` |
| **SCENARIO** | Admin sets `REFUNDED` repeatedly → multiple `SENT` refund rows; no PSP; can flip back toward PAID via same free enum (interaction with BE-006). |
| **ACTUAL** | Ledger fiction |
| **EXPECTED** | Refund state machine + idempotency + booking couple |
| **ROOT CAUSE** | Free paymentStatus writes + create-always refund |
| **IMPACT** | Finance integrity / audit failure |
| **RECOMMENDATION** | Remove free enum; refund PENDING→SENT; unique open refund |
| **REGRESSION** | Second REFUNDED → 409; one refund row |
| **CLASS** | CONFIRMED |

#### BE2-200 — Moderator offline search drops hotel ACL (`OR` clobber)  
| | |
|--|--|
| **AREA** | AuthZ / BOLA |
| **SEVERITY** | Critical |
| **FILE / ROUTE** | `src/app/api/moderator/offline-bookings/search/route.ts` L17–24 |
| **CODE EVIDENCE** | Spreads `moderatorOfflineBookingWhere` (contains hotel `OR`), then overwrites with text-match `OR` → filter becomes `source=OWNER_MANUAL` + text match **platform-wide** |
| **SCENARIO** | Moderator searches `q=ab` → sees other hotels’ offline bookings |
| **ACTUAL** | Cross-hotel read |
| **EXPECTED** | `AND: [ hotelScope, OR: text… ]` |
| **ROOT CAUSE** | Prisma where object key overwrite |
| **IMPACT** | Cross-tenant PII / ops data |
| **RECOMMENDATION** | Nest text predicates under `AND`; add regression test |
| **REGRESSION** | Mod A cannot see Mod B hotel offline rows via search |
| **CLASS** | CONFIRMED |

#### BE2-201 — Moderator offline list `?roomId=` drops hotel ACL  
| | |
|--|--|
| **AREA** | AuthZ / BOLA |
| **SEVERITY** | Critical |
| **FILE / ROUTE** | `src/app/api/moderator/offline-bookings/route.ts` L24–27 |
| **SCENARIO** | `GET …?roomId=<foreign>` → raw Prisma rows for that room globally |
| **ACTUAL / EXPECTED / ROOT** | Same `OR` clobber as BE2-200 |
| **IMPACT** | Full guest PII (list returns raw include, not public view) |
| **RECOMMENDATION** | `AND` compose; verify room ∈ assigned hotels |
| **REGRESSION** | Foreign roomId → empty / 403 |
| **CLASS** | CONFIRMED |

#### BE2-202 — Owner offline list `?roomId=` drops owner ACL  
| | |
|--|--|
| **AREA** | AuthZ / BOLA |
| **SEVERITY** | Critical |
| **FILE / ROUTE** | `src/app/api/owner/offline-bookings/route.ts` L26–28; `ownerOfflineBookingWhere` in `ownerQueries.ts` L13–17 |
| **SCENARIO** | Owner A passes Owner B’s `roomId` → B’s offline bookings |
| **CLASS** | CONFIRMED |
| **RECOMMENDATION** | Same `AND` fix + ownership check on roomId |

---

### High

#### BE2-001 — OwnerApplication approve/reject not CAS-safe  
**AREA** KYC · **FILE** `src/lib/owner/ownerRequestReview.ts` L16–33, L79–94 · **CLASS** CONFIRMED  
Read status then `update({ where: { id } })` without `status: PENDING` → double approve side effects.  
**REGRESSION:** parallel approve → one success.

#### BE2-003 — JSON KYC submit skips identity documents  
**AREA** KYC · **FILE** `src/app/api/owner/applications/route.ts` JSON create ~L247–283 vs multipart doc gates ~L168–178 · **CLASS** CONFIRMED  
Guest reaches PENDING without passport/property docs.

#### BE2-006 — Payout never leaves `PENDING` (no settle path)  
**AREA** Payout · **EVIDENCE** only `payout.create` in admin complete; **zero** `payout.update` in `src/` · **CLASS** CONFIRMED  
Email implies queue; status stuck forever.

#### BE2-007 — Dispute has no resolve/reject API  
**AREA** Dispute · **FILE** `src/app/api/disputes/route.ts` create/list only; schema `OPEN|RESOLVED|REJECTED` · **CLASS** CONFIRMED  
OPEN is effectively terminal.

#### BE2-011 — Owner approve can set booking PAID without Payment CAPTURED  
**AREA** Payment · **FILE** `ownerPaymentApprove.ts` L60–70 · **CLASS** CONFIRMED (extends BE-001)  
CAPTURED only if payment was PENDING; booking always PAID → admin complete blocked / ledger desync.

#### BE2-012 — Admin cancel can leave PAID/CAPTURED without refund  
**AREA** Payment / Cancel · **FILE** `admin/bookings/[id]/cancel/route.ts` L34–44 · **CLASS** CONFIRMED  
If PAID, keeps PAID; Payment FAILED only when still PENDING.

#### BE2-101 — Offline booking create trusts client `totalPrice`  
**AREA** Validation / money · **FILE** `owner/offline-bookings/route.ts` L58–71 · **CLASS** CONFIRMED  
No server price recompute (unlike online booking).

#### BE2-140 — Duplicate Refund rows on repeated admin REFUNDED  
**AREA** Idempotency · overlaps BE2-010 · **CLASS** CONFIRMED  

#### BE2-131 — Stable PII blast: admin owner-requests list decrypts all rows unbounded  
**AREA** Sensitive data · **FILE** `admin/owner-requests/route.ts` L41–65 · **CLASS** CONFIRMED  

---

### Medium

| ID | Summary | Class | Evidence |
|----|---------|-------|----------|
| BE2-002 | Concurrent OwnerApplication → duplicate PENDING | CONFIRMED | ensureNoPending then create |
| BE2-004 | `HostProfile.kycStatus` never written; role≠KYC | CONFIRMED | schema vs zero writes |
| BE2-008 | Concurrent dispute OPEN duplicates | CONFIRMED | findFirst then create |
| BE2-009 | Complaint resolve ungarded FROM status | CONFIRMED | admin/complaints/resolve |
| BE2-013 | Proof soft-expire incomplete vs job | CONFIRMED | proof route sets EXPIRED only |
| BE2-014 | `Payment.AUTHORIZED` dead; no PSP webhook | CONFIRMED | schema / no handler |
| BE2-100 | ~83 mutating routes without Zod | CONFIRMED | inventory |
| BE2-110 | Prisma code leaked (`prismaCode` in JSON) | CONFIRMED | owner/hotels create 500 |
| BE2-111 | Raw `Error.message` to clients | CONFIRMED | offline-bookings, uploads |
| BE2-112 | Expire job reports findMany length not update count | CONFIRMED | expire-bookings L126 |
| BE2-113 | Check-in/checkout `{ok:true}` without status CAS | CONFIRMED | check-in / confirm-checkout |
| BE2-115 | Telegram webhook returns ok after handler errors | CONFIRMED | telegram/webhook |
| BE2-120…126 | Unbounded lists / N+1 photo create / serial job side effects | CONFIRMED | static |
| BE2-130 | Offline list raw PII vs search DTO | CONFIRMED | extends BE-021 |
| BE2-132 | `user: true` loads password hash in memory | CONFIRMED | notifications/disputes |
| BE2-141 | Favorites toggle race / non-idempotent | CONFIRMED | findFirst→create/delete |
| BE2-142 | Payment timer extend not idempotent (+5m each) | CONFIRMED | adminBookingActions |
| BE2-144 | Chat image→proof bypasses proof rate limit | CONFIRMED | messages route |
| BE2-145 | Guest document overwrite + notify every POST | CONFIRMED | bookings/document |
| BE2-203 | cancel-by-guest: any role + ADMIN bypass, weak audit | CONFIRMED | cancel-by-guest L22–33 |

### Low / Latent

| ID | Summary | Class |
|----|---------|-------|
| BE2-204 | Admin cancel lacks transactionLog / byAdminId | LATENT |
| BE2-102…106 | Unbounded strings / weak FormData bounds | CONFIRMED |
| BE2-114 | Silent `.catch(() => undefined)` side effects | CONFIRMED |
| BE2-134 | Push subscribe can reassign endpoint→userId | CONDITIONAL |

---

## F. Existing findings confirmed (do not re-count as new)

| Prior ID | Topic | #2 stance |
|----------|--------|-----------|
| **SEC-001** | Secrets in `.env.example` / git history | CONFIRMED prior — out of API matrix; still P0 |
| **SEC-003 / BE-003** | KYC public Blob | CONFIRMED still present |
| **SEC-005** | Admin BFLA | **NOT active** — hardening / defense-in-depth only |
| **SEC-010 / BI-001 / BE-004** | Inventory TOCTOU | CONFIRMED; Hybrid plan pending IMPLEMENTATION |
| **SEC-011 / BI-002 / BE-001** | Owner approve without proof | CONFIRMED |
| **BI-005** | Booking create idempotency | CONFIRMED gap (0 Idempotency-Key) — not re-filed |
| **BE-002** | Expire job blind updateMany | CONFIRMED; BE2-112 adds false metrics |
| **BE-005** | Confirm/approve non-transactional | CONFIRMED |
| **BE-006** | Admin payment free enum | CONFIRMED; interacts with BE2-010/012 |
| **BE-007** | Duplicate payouts | CONFIRMED; pairs with BE2-005/006 |
| **BE-008 / BE-009** | Proof reuse / public guest docs | CONFIRMED |
| **BE-010 / BE-011** | Admin role/credentials | CONFIRMED |
| **BE-012** | Proof false `{ok:true}` | CONFIRMED |
| **BE-020 / BE-021 / BE-023 / BE-025** | Dispute gate / offline PII / pagination / zod % | CONFIRMED; extended by BE2-* |
| **BE-AUTH-001** | Middleware role fail-open | ALREADY COVERED |
| **TS-CNT-001 / TS-UI-001 / TS-SEO-01 / TS-UX-005** | Product audit P0s | Out of backend; remain open product P0s |

### AuthZ hunt results (guest paths)

| Hypothesis | Result |
|------------|--------|
| Guest→other booking cancel/doc/proof/receipt/chat/dispute | **NOT REPRODUCED** |
| Chat stream/typing/Pusher IDOR | **NOT REPRODUCED** |
| Notification read-by-id IDOR | **NOT REPRODUCED** |
| Owner self-APPROVE hotel | **NOT REPRODUCED** |
| Moderator/Owner offline `OR` clobber | **CONFIRMED** BE2-200…202 |

---

## G. Coverage gaps

| Gap | Status |
|-----|--------|
| Hand-filled 142×15 cell spreadsheet | PARTIAL — inventory + domain deep dives |
| Runtime concurrent races (expire vs confirm, offline IDOR live) | NOT TESTABLE STATICALLY → need runtime |
| PSP / card webhooks | NOT APPLICABLE today / GAP for future |
| What if expire job never runs | Documented: soft holds forever (BI) — still GAP for ops runbooks |
| Backup/restore/DR | PASS 7 — not this pass |
| Observability / alerting on stuck PENDING payouts & OPEN disputes | GAP |
| Index EXPLAIN / lock analysis | GAP |
| CSRF / SameSite full proof | GAP |
| Product tests in `src` | **0** — GAP |

---

## H. Recommended next audit pass

```text
1) MODE: RESEARCH — PAYMENT INTEGRITY PASS
   Focus: BE-001/006 + BE2-005/006/010/011/012 end-to-end money ledger
   Refunds · payouts · proof · expire/cancel races · orphan payment

2) Then: Full UI/UX Runtime (Desktop/Mobile matrix)

3) Then: Google / Page Experience (Lighthouse measurements)

4) Design System Stage C / Restyle — ONLY after P0/P1 remediation track
```

**Do not** start restyle while BE2-200…202 (cross-tenant offline read) and money-machine holes remain open alongside SEC/BI P0s.

---

## Confirmed P0 board (product + backend) — freeze

| # | ID | Area | Note |
|---|-----|------|------|
| 1 | SEC-001 | Secrets | REVOKE→ROTATE→SCRUB→VERIFY |
| 2 | SEC-003 | KYC storage | private + authz proxy |
| 3 | BI-001 | Inventory | Hybrid plan — wait for `implement BI-001` |
| 4 | BI-002 / SEC-011 | Payment approve | proof required |
| 5 | **BE2-200…202** | Offline BOLA | **new** — Prisma `OR` clobber |
| 6 | **BE2-005 / BE2-010** | Payout / Refund ledger | **new** money integrity |
| 7 | TS-CNT-001 | Legal placeholder | product |
| 8 | TS-UI-001 | Token stacks | product |
| 9 | TS-SEO-01 | Sitemap hotels | product |
| 10 | TS-UX-005 | Sticky book unwired | product |

SEC-005: **not** on P0 board as active BFLA.

---

## Positive controls (do not regress)

- Handler AuthZ uses DB session role (not role cookie) on owner/admin/moderator helpers.  
- Online booking price computed server-side.  
- Guest booking IDOR on cancel/proof/document/receipt/chat — not reproduced.  
- Admin hotel approve separate from owner update (status locked).  
- `JOB_SECRET` fail-closed if unset.  
- Proof `updateMany` status gate (partial CAS) still present.

---

## Status footer

```text
MODE: RESEARCH ONLY
APPLICATION CODE: unmodified
PRISMA SCHEMA: unmodified
NEW FINDINGS: BE2-001…BE2-204 family (see §E)
DUPLICATES OF SEC/BI: listed in §F only
BACKEND AUDIT STATUS: PARTIAL
PRODUCT MATURITY: remain ≤ 4.5/10 (no uplift)
NEXT: Payment Integrity RESEARCH pass
```
