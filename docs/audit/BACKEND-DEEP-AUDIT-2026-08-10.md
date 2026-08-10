# TajStay — Backend Deep Audit (PASS 1)

**Date:** 2026-08-10  
**Mode:** `MODE: RESEARCH` — **no code changes, no remediation patches**  
**Scope:** All `src/app/api/**/route.ts` (142), auth helpers, Prisma usage patterns, jobs/webhooks  
**Roles (only):** `GUEST` · `OWNER` · `HOTEL_MODERATOR` · `ADMIN`  
**Core resources:** hotel · room · room type · inventory · booking · payment · proof · KYC · hotel staff · payout · dispute · review  

**Companion files**
| File | Role |
|------|------|
| `docs/audit/BACKEND-API-INVENTORY-2026-08-10.md` | Heuristic METHOD × PATH × AUTH × FLAGS for all 142 routes |
| `docs/audit/SECURITY-AUDIT.md` / `SECURITY-VALIDATION-v1.md` | Prior OWASP pass (cross-refs below) |
| `docs/audit/BOOKING-INTEGRITY-AUDIT.md` | BI deep pass (TOCTOU / state) |

---

## 0. Executive verdict

| Question | Answer |
|----------|--------|
| Is Security/Booking audit “enough” for backend maturity? | **No** — deep on AuthZ/booking races; shallow on payments, payouts, validation coverage, jobs, observability |
| Does API layer generally check DB role (not `tajstay_role` cookie)? | **Yes** for route handlers via `getSessionUser` → Prisma `User.role` |
| Can middleware be trusted alone? | **No** — edge trusts cookie **shape** + optional `tajstay_role`; fail-open when role cookie missing |
| Zod / rate-limit / transaction coverage | **~21% / ~14% / ~6%** of route files |
| Release-blocking overlap | Confirms **SEC-003**, **SEC-010/BI-001**, **SEC-011/BI-002**; adds **expire-job CAS**, **payout duplication**, **admin payment bypass**, **admin identity ops** |

**Backend maturity (this pass only):** ~**4/10**  
Strong: role helpers on mutating owner/admin/moderator paths; server-side booking price; guest booking scoping often present.  
Weak: state machines without CAS; public “private” storage; sparse Zod/RL/txn; payment/payout integrity; job races; in-memory rate limits.

This pass **does not** raise overall product maturity above the ~4.5/10 baseline — Payment Integrity + Runtime still open.

---

## 1. Method

1. Enumerate all 142 `route.ts` files; classify HTTP methods.  
2. Map auth helpers (`session`, `requireOwner/Admin/Moderator`, `apiGuard`, `rbac`).  
3. Sample every high-risk domain with full file reads (bookings, payments, owner payment, jobs, KYC uploads, admin users, cron, telegram).  
4. Grep coverage for `zod`, `rateLimit`, `$transaction`, public blob access.  
5. **Claim only with file evidence.** Runtime concurrency / E2E **not executed** → marked Coverage gap.

**Not in this pass:** UI, Content copy, Lighthouse, Payment provider deep-pass beyond app state machine, Backup/DR (PASS 7).

---

## 2. Auth architecture (truth)

```text
Browser cookie (tajstay_session | authjs.session-token)
        ↓
middleware.ts  →  shape check + tajstay_role (OPTIONAL, fail-open)
        ↓
Route Handler  →  getSessionUser() → Prisma Session → User.role / isBanned
        ↓
Role helper / require*Api* / resolveHotelAccess (DB ownership | HotelModerator)
        ↓
Business mutation
```

| Helper | Trusts role cookie? | Source of truth |
|--------|---------------------|-----------------|
| `getSessionUser` | No | DB session → user |
| `getOwnerUser` / `getAdminUser` / `getModeratorUser` | No | DB `user.role` |
| `requireHotelApiPermission` | No | `resolveHotelAccess` + permission matrix |
| `middleware` role gates | **Yes** | `tajstay_role` string |

**Evidence — middleware fail-open / role cookie:** `src/middleware.ts` (`hasSessionCookie` shape-only; `enforceRoleForPath` returns `null` when role cookie absent).  
**Evidence — API uses DB role:** `src/lib/auth/requireOwner.ts`, `requireAdmin.ts`, `requireModerator.ts`.

### Auth findings

#### BE-AUTH-001 — Edge RBAC is cookie-shaped and fail-open  
**Severity:** Medium (defense-in-depth; API still DB-checks on covered routes)  
**Evidence:** `src/middleware.ts` L33–37, L64–114  
**Actual:** Any request with 64-hex `tajstay_session` (unverified) and **missing** `tajstay_role` passes `/api/owner` and `/api/moderator` edge gates.  
**Expected:** Edge either validates session server-side or fails closed without verified role.  
**Note:** Handlers using `getOwnerUser` still 403 — risk is inconsistent coverage + dashboard HTML routes relying on edge.  
**Remediation:** Fail closed without role; do not treat role cookie as auth; prefer server layouts already using `requireOwner`.  
**Regression:** Forged role cookie Guest→Owner blocked at handler; missing role cookie must not widen access.

#### BE-AUTH-002 — `/api/admin/*` not in middleware matcher  
**Severity:** Low (positive if every admin route calls `getAdminUser` / `requireUser(["ADMIN"])` — sampled 32/32 do)  
**Evidence:** middleware matcher vs admin routes; prior SEC-005 validation.  
**Status:** Not an active BFLA given route helpers — keep as regression guard.

#### BE-AUTH-003 — Profile APIs exclude `HOTEL_MODERATOR`  
**Severity:** Low (product gap)  
**Evidence:** `src/lib/profile/profileApi.ts` allowlist `GUEST|OWNER|ADMIN` only.

---

## 3. Inventory summary (142 routes)

| Segment | Count |
|---------|------:|
| admin | 32 |
| owner | 25 |
| auth | 20 |
| profile | 11 |
| bookings | 10 |
| moderator | 8 |
| chat | 7 |
| notifications | 5 |
| other (payments, cron, jobs, search, …) | 24 |
| **Total** | **142** |

### Heuristic auth classification (static)

| Class | ~Count | Notes |
|-------|-------:|-------|
| ADMIN | 32–37 | All admin mutating routes use admin helpers |
| OWNER | ~24–25 | `getOwnerUser` / owner API guards |
| MODERATOR | 8 | Hotel-scoped permissions |
| SESSION / guest-scoped | ~35–40 | Bookings, chat, profile, notifications |
| PUBLIC | ~20+ | search, health, auth entry, OTP, availability |
| SECRET (cron/job/seed) | 3–4 | Mixed fail-open/closed |

Full table: `BACKEND-API-INVENTORY-2026-08-10.md` (FLAGS = ADMIN/OWNER/MOD/SESSION/RATE/ZOD/TX/SECRET heuristics).

### Cross-cutting coverage

| Control | Route files with signal | % of 142 |
|---------|------------------------:|---------:|
| Zod (`z.object` / `safeParse`) | 30 | ~21% |
| `rateLimit(` | 20 | ~14% |
| `$transaction` | 8 | ~6% |
| Idempotency-Key | **0** | 0% |

**Rate limiter implementation:** in-memory `Map` (`src/lib/security/rateLimit.ts`) — **not multi-instance safe** on Vercel.

---

## 4. Authorization matrix (by resource)

| Resource | Guest | Owner | Moderator | Admin | Typical scoping |
|----------|-------|-------|-----------|-------|-----------------|
| Hotel create/update | — | ✅ own | — | moderate/approve | `hotel.ownerId` |
| Room / roomType | — | ✅ own hotel | read/assign | — | hotel ownership / `HotelModerator` |
| Inventory overrides | — | ✅ | offline ops | — | hotel scope |
| Booking create | ✅ (+ anon auto-guest) | ✅ | — | ✅ | server price |
| Booking cancel (guest) | ✅ own | — | — | via admin paths | `userId` / `publicCode` |
| Payment proof | ✅ own booking | — | — | — | `userId` + status gate |
| Payment approve | — | ✅ **wide statuses** | — | ✅ proof-gated | hotel owner / admin |
| KYC owner-request | guest submit | — | — | review + file | admin file proxy |
| Payout create | — | — | — | ✅ complete | **no unique bookingId** |
| Dispute | party | party | — | party | booking parties |
| Review | guest/owner booking | reply | — | — | booking link |
| Chat | party | party | party | party | `canAccessBookingChat` |
| Expire job | secret | — | — | — | global batch |

**BFLA (guest → owner/admin):** Not confirmed on sampled mutating routes — role helpers hold.  
**BOLA (cross-owner):** Owner hotel/room paths generally re-check `ownerId`. Gaps: incomplete `assignedRoom` / `roomType`-only includes on some helpers (false-deny / footgun more than classic IDOR).

---

## 5. Findings (ranked)

Cross-refs to prior audits are **aliases**, not duplicates of closed work — all remain **OPEN** unless a later IMPLEMENTATION pass proves otherwise.

### Critical

#### BE-001 — Owner confirms payment without proof  
**Aliases:** SEC-011, BI-002  
**Severity:** Critical  
**Evidence:** `src/lib/bookings/ownerPaymentApprove.ts` L12–16, L60–75; route `src/app/api/owner/bookings/[id]/payment-approve/route.ts`  
**Attack:** Owner (or stolen owner session) `POST …/payment-approve` on `WAITING_PAYMENT` / `WAIT_PROOF` with **no** `paymentProofUrl` → `paymentStatus=PAID`, `Payment=CAPTURED`, `status=CONFIRMED`.  
**Actual vs Expected:** Actual allows pre-proof statuses. Expected: only `ON_REVIEW` + proof present (as admin confirm).  
**Root cause:** Owner state machine wider than admin; no proof gate; no CAS/`$transaction`.  
**Remediation:** Align with admin confirm; `updateMany` WHERE status=`ON_REVIEW`; require proof fields; transactional payment+booking.  
**Regression:** Approve without proof → 400; with ON_REVIEW+proof → 200 once.

#### BE-002 — Expire/review job blind `updateMany` can wipe newer states  
**Severity:** Critical  
**Evidence:** `src/app/api/jobs/expire-bookings/route.ts` L16–29, L42–47, L72–77  
**Attack / race:** Job `findMany` selects ids in `WAITING_PAYMENT|WAIT_PROOF` (or `ON_REVIEW`); guest/admin transitions booking; job `updateMany({ id: { in: ids }})` **without** re-asserting status → `CONFIRMED`/`ON_REVIEW` overwritten to `EXPIRED`/`REJECTED`.  
**Expected:** Conditional update `WHERE id AND status IN (…) AND expiresAt < now`.  
**Root cause:** TOCTOU select-then-update.  
**Remediation:** Single conditional `updateMany`; per-row CAS; optionally `SKIP LOCKED`.  
**Regression:** Concurrent proof/confirm vs expire — confirmed booking must not expire.

#### BE-003 — “Private” KYC docs stored with public Blob access  
**Alias:** SEC-003  
**Severity:** Critical  
**Evidence:** `src/lib/uploads/savePrivateFile.ts` L39–48 (`access: "public"`) despite comment “never a public URL”  
**Attack:** Anyone with URL reads passport/KYC; storage bypasses admin `/file` proxy.  
**Remediation:** Private blob / signed URLs only; revoke leaked URLs; keep authz proxy.  
**Regression:** Unauth GET of stored KYC URL → 401/403.

---

### High

#### BE-004 — Booking create inventory TOCTOU (double soft-hold)  
**Aliases:** SEC-010, BI-001  
**Severity:** High (release-blocking with BI plan)  
**Evidence:** availability assert in pricing helpers; `src/app/api/bookings/route.ts` create outside transaction  
**Actual:** Two concurrent creates → two `WAITING_PAYMENT` holds.  
**Expected:** One winner; DB exclusion or txn+lock+re-assert (see `BI-001-REMEDIATION-PLAN.md`).  
**Regression:** 10×50 concurrent create — exactly one active hold (plan proof).

#### BE-005 — Payment confirm (admin/owner) not transactional / double-approve  
**Severity:** High  
**Evidence:** `src/lib/bookings/adminBookingActions.ts` (check-then-update); `ownerPaymentApprove.ts` L60–75  
**Attack:** Parallel confirm/approve both pass status checks.  
**Remediation:** `$transaction` + `updateMany` count=1 CAS on booking+payment.  
**Regression:** Parallel double confirm → one 200, one 409.

#### BE-006 — Admin `POST /api/admin/bookings/payment` bypasses booking lifecycle  
**Severity:** High  
**Evidence:** `src/app/api/admin/bookings/payment/route.ts` L13–52  
**Actual:** Mutates `Booking.paymentStatus` (+ mirrors `Payment`) independently; PAID allowed if `CAPTURED` **or** reviewed proof — `CAPTURED` can come from BE-001 without proof; does not force `CONFIRMED`.  
**Expected:** Only via confirm/reject/refund workflows with booking.status transitions.  
**Remediation:** Remove or route through confirm helpers; forbid free enum writes.  
**Regression:** PAID without proof+CAPTURED from legitimate confirm → rejected.

#### BE-007 — Admin complete creates duplicate payouts  
**Severity:** High  
**Evidence:** `src/app/api/admin/bookings/complete/route.ts` L34–56; `prisma/schema.prisma` `Payout.bookingId` **not** `@unique` (L500–515)  
**Actual:** No booking-status guard before complete; always `payout.create`.  
**Expected:** Idempotent complete; ≤1 payout per booking.  
**Remediation:** `updateMany` status guard; `@@unique([bookingId])` or find-first.  
**Regression:** Double POST → one payout.

#### BE-008 — Payment proof URL reuse / unbound evidence  
**Severity:** High  
**Evidence:** `src/app/api/payments/proof/route.ts` (client `proofUrl` + public uploads via `saveUploadFile`)  
**Attack:** Reuse another booking’s public proof URL; `proofAmount` not tied to `totalPrice`.  
**Remediation:** Upload-only tokens scoped to booking; content-hash uniqueness; optional amount check.  
**Regression:** Foreign proof URL → 400.

#### BE-009 — Guest ID / payment proof files world-readable  
**Severity:** High  
**Evidence:** `src/lib/uploads/saveUpload.ts` `access: "public"`; `src/app/api/bookings/document/route.ts` guest-docs path  
**Remediation:** Private storage + authz download (participant roles).  
**Regression:** Unauth GET → deny.

#### BE-010 — Admin user role/ban without safeguards  
**Severity:** High (privileged abuse / stolen admin)  
**Evidence:** `src/app/api/admin/users/update/route.ts` L7–28 — any role incl. `ADMIN`, ban anyone; no Zod/rate limit/last-admin/self guards.  
**Remediation:** Break-glass policy; prevent last-admin demotion; audit log; step-up auth.  
**Regression:** Cannot ban/demote last admin; promote requires second factor/policy.

#### BE-011 — Admin OWNER credentials change = account takeover primitive  
**Severity:** High  
**Evidence:** `src/app/api/admin/users/credentials/route.ts` — phone/email change + session invalidate; no rate limit.  
**Remediation:** Audit + rate limit + notify old contact; dual control for production.  
**Regression:** Credentials change emits audit row; rate limited.

---

### Medium

#### BE-012 — Proof API returns `{ ok: true }` when status transition count=0  
**Evidence:** `payments/proof/route.ts` — after `updateMany`, JSON success regardless of `transitioned.count`  
**Remediation:** 409 when count=0.  

#### BE-013 — `JOB_SECRET` accepted via query string  
**Evidence:** `jobs/expire-bookings/route.ts` L12  
**Remediation:** Header-only.  

#### BE-014 — Cron fail-open when `CRON_SECRET` unset outside production  
**Evidence:** `src/app/api/cron/booking-reminders/route.ts` (and archive twin)  
**Remediation:** Fail closed always, or separate local-only flag.  

#### BE-015 — Telegram webhook secret optional if unset  
**Evidence:** `src/app/api/telegram/webhook/route.ts` L26–33  
**Remediation:** Fail closed when bot configured but secret missing.  

#### BE-016 — Receipt HTML interpolates owner-controlled names without escape  
**Evidence:** `src/app/api/bookings/[id]/receipt/route.ts`  
**Remediation:** `escapeHtml` all dynamic fields.  

#### BE-017 — Booking create non-atomic (booking without payment)  
**Evidence:** `bookings/route.ts` sequential create  
**Remediation:** `$transaction` for booking+payment+log.  

#### BE-018 — Profile password change without current password  
**Evidence:** `src/app/api/profile/password/route.ts` L8–23  
**Remediation:** Require current password (and/or recent auth).  

#### BE-019 — Reviews allowed on `CONFIRMED` (not only `COMPLETED`)  
**Evidence:** `src/app/api/reviews/create/route.ts`  
**Remediation:** COMPLETED (+ checkout) only if product policy requires stay finished.  

#### BE-020 — Disputes lack booking-status gate  
**Evidence:** `src/app/api/disputes/route.ts`  
**Remediation:** Allow only post-paid / post-stay statuses.  

#### BE-021 — Offline booking list returns raw Prisma (PII) vs search DTO  
**Evidence:** moderator/owner `offline-bookings` GET vs `toOfflinePublicView` on search  
**Remediation:** Same DTO / field allowlist.  

#### BE-022 — Owner application mass-assigns `adminComment` → `comment`  
**Evidence:** `src/app/api/owner/applications/route.ts`  
**Remediation:** Drop guest-writable admin fields.  

#### BE-023 — Unbounded `findMany` (no pagination) on admin/moderator lists  
**Evidence:** e.g. `moderator/rooms`, `admin/owner-requests`, hotel moderators list  
**Remediation:** `take`/`cursor` pagination.  

#### BE-024 — In-memory rate limit ineffective across instances  
**Evidence:** `src/lib/security/rateLimit.ts` L14–15 comment + `Map` store  
**Remediation:** Redis/Upstash (or platform) limiter for auth/OTP/proof.  

#### BE-025 — Zod coverage ~21%; most booking/payment/owner FormData routes unvalidated  
**Evidence:** inventory FLAGS  
**Remediation:** Shared zod schemas per domain; reject unknown keys (mass assignment).  

---

### Low / Info

| ID | Summary | Evidence |
|----|---------|----------|
| BE-026 | Unauth availability probe, no RL | `bookings/check-availability` |
| BE-027 | Admin confirm-payment path maps `DATES_UNAVAILABLE` inconsistently (500 vs 409) | admin vs `/api/bookings/confirm-payment` |
| BE-028 | `getBookingForOwner` omits `assignedRoom` hotel OR | `ownerBooking.ts` |
| BE-029 | Chat/inbox/review reply roomType-only gaps (false deny / 500) | chat includes, `reviews/reply` |
| BE-030 | Notifications list `include: { user: true }` loads password hash in memory | `notifications/list` |
| BE-031 | Moderator assign user enumeration via phone/email | owner moderators POST |
| BE-032 | Soft-auth notifications return 200 empty for anon | `notifications/unread` |
| BE-033 | Seed blocked in prod + secret — OK shape | `api/seed` |
| BE-034 | Cancel→REFUNDED without refund pipeline latent if gates weaken | guest cancel helpers |

---

## 6. Positive controls (do not regress)

- Server-side pricing on `POST /api/bookings` (no client `totalPrice` trust).  
- Admin payment confirm requires `ON_REVIEW` + proof URL + `proofSubmittedAt` + payment `PENDING` (when using confirm helper).  
- Proof upload uses `updateMany` status ∈ `{WAITING_PAYMENT, WAIT_PROOF}` (transition CAS partial).  
- Guest cancel blocked when `paymentStatus===PAID`.  
- Owner confirm/reject without online pay restricted to `payOnArrival` + `PENDING_OWNER`.  
- Owner payment-reject stub hard-403 (admin path for reject).  
- `JOB_SECRET` fail-closed if unset (stronger than cron).  
- Hotel create forces `PENDING`; owners cannot self-approve.  
- Sampled owner mutate paths re-check `hotel.ownerId`.  
- Admin content routes go through `runAdminContentPost` / `getAdminUser`.

---

## 7. Domain matrices (high-risk)

### 7.1 Booking → Payment → Confirm

| METHOD | PATH | AUTH | AUTHZ | ZOD | TX | RL | RISK |
|--------|------|------|-------|-----|----|----|------|
| POST | `/api/bookings` | optional session | auto-guest | ❌ | ❌ | ✅ IP | BE-004, BE-017 |
| POST | `/api/payments/proof` | session | own booking | ❌ | partial | ✅ | BE-008, BE-012 |
| POST | `/api/owner/bookings/[id]/payment-approve` | OWNER | hotel owner | ❌ | ❌ | ❌ | **BE-001** |
| POST | `/api/bookings/confirm-payment` | ADMIN | admin | ❌ | ❌ | ❌ | BE-005 |
| POST | `/api/admin/bookings/[id]/confirm-payment` | ADMIN | admin | ❌ | ❌ | ❌ | BE-005 |
| POST | `/api/admin/bookings/payment` | ADMIN | admin | ❌ | ❌ | ❌ | **BE-006** |
| POST | `/api/admin/bookings/complete` | ADMIN | admin | ❌ | ❌ | ❌ | **BE-007** |
| POST | `/api/jobs/expire-bookings` | JOB_SECRET | secret | ❌ | ❌ | ❌ | **BE-002**, BE-013 |

### 7.2 Identity / KYC / Admin users

| METHOD | PATH | AUTH | RISK |
|--------|------|------|------|
| POST | owner-requests / applications uploads | SESSION guest | BE-003 |
| GET | `/api/admin/owner-requests/[id]/file` | ADMIN | OK proxy (storage still public) |
| POST | `/api/admin/users/update` | ADMIN | BE-010 |
| POST | `/api/admin/users/credentials` | ADMIN | BE-011 |
| POST | `/api/profile/password` | SESSION | BE-018 |
| POST | `/api/bookings/document` | SESSION | BE-009 |

### 7.3 Jobs / webhooks

| PATH | Secret behavior | Risk |
|------|-----------------|------|
| `/api/jobs/expire-bookings` | Fail-closed if unset; header **or query** | BE-002, BE-013 |
| `/api/cron/*` | Fail-open if unset + non-prod | BE-014 |
| `/api/telegram/webhook` | Secret skipped if unset | BE-015 |

---

## 8. State machine (as implemented)

```text
WAITING_PAYMENT / WAIT_PROOF
   ├─(proof)──► ON_REVIEW
   ├─(owner approve*)──► CONFIRMED + PAID     (* no proof — BE-001)
   └─(expire job)──► EXPIRED                  (race — BE-002)

ON_REVIEW
   ├─(admin confirm)──► CONFIRMED + PAID
   ├─(admin reject)──► REJECTED
   └─(review timeout job)──► REJECTED         (race — BE-002)

PENDING_OWNER + payOnArrival
   └─(owner confirm/reject)──► CONFIRMED / REJECTED

CONFIRMED
   └─(admin complete)──► COMPLETED + Payout   (duplicate payout — BE-007)
```

Schema defaults / comments mentioning `PENDING_OWNER` diverge from online create (`WAITING_PAYMENT`) — dual vocabulary increases bypass risk.

**Card payment webhooks / provider callbacks:** not present as first-class routes in this inventory (manual proof model). Payment Integrity PASS 2 should still map refund/dispute/payout edges.

---

## 9. Coverage gaps (explicit)

| Gap | Why it matters |
|-----|----------------|
| Runtime concurrent races | BE-002/004/005 need multi-worker proof |
| Full Payment Integrity PASS | Refunds, disputes, payout settlement, orphan payments |
| CSRF posture | Cookie sessions + form POSTs; SameSite not fully proven here |
| Magic-byte upload validation | MIME allowlists only |
| Multi-instance RL efficacy | In-memory Map |
| Prod cron wiring | Who calls expire/reminders; secret rotation |
| E2E AuthZ suite | 0 product tests in `src` for these paths |
| DB EXPLAIN / indexes deep-pass | Partial via BI audit only |
| Observability of failed transitions | Silent `.catch(() => undefined)` on side effects |

---

## 10. Prioritization (research → later IMPLEMENTATION)

| Priority | IDs | Track |
|----------|-----|-------|
| P0 release gate | BE-003, BE-004, BE-001 | Existing SEC/BI — **do not implement until explicit MODE: IMPLEMENTATION** |
| P0 adjacent | BE-002, BE-007 | Jobs + payouts |
| P1 | BE-005, BE-006, BE-008, BE-009, BE-010, BE-011 | Payment integrity + admin identity |
| P2 | BE-012…BE-025 | Hardening / hygiene |
| P3 | BE-026…BE-034 | Low / product gaps |

---

## 11. Recommended next passes (still RESEARCH)

1. **PASS 2 — Payment Integrity** (state machine + refunds + payouts + proof + races with expire/cancel).  
2. **PASS 3 — Full UI/UX Runtime** (browser matrix).  
3. **PASS 4 — Google/Page Experience** (Lighthouse measurements).  
5. Content / 6 Accessibility / 7 Reliability — as previously scoped.  

**Restyle / Design System:** deferred until findings prioritized and P0/P1 addressed — Verdant Peak / Central Asian Hospitality remains a **candidate**, not a decision.

---

## 12. Status

```text
MODE: RESEARCH ONLY
CODE CHANGES: none
FINDINGS: evidenced, open
CLAIMED FIXED: none
```

**Inventory artifact:** `docs/audit/BACKEND-API-INVENTORY-2026-08-10.md`  
**This report:** `docs/audit/BACKEND-DEEP-AUDIT-2026-08-10.md`
