# BLOCK 5.4A — Pay at Check-in: Architecture / State-Machine Trace

READ-ONLY audit. No code, schema, or UI was changed. No implementation happened in this block.

## 1. Baseline

- Branch: `feature/tajstay-full-ui-ux-rebuild`
- HEAD: `c5d66c67e8f7bf7d3e88a5bec65ebd092c60e5d7`
- `git status --short` at start: `M .agent/STATE.md`, `M src/app/api/bookings/reject-payment/route.ts`, `M src/app/api/owner/bookings/[id]/payment-reject/route.ts`, `M src/lib/bookings/paymentReviewActions.ts`, plus untracked BLOCK 5.2A/5.3/5.3A reports and test scripts — all pre-existing, uncommitted BLOCK 5.3/5.3A work. Nothing was reset, checked out, or cleaned. Nothing further was written to source during this audit.
- Production and production DB were not touched.

## 2. Current Booking status map

Declared in `src/lib/domain/booking.ts:2-16` (`BOOKING_STATUS`) and `prisma/schema.prisma:381` (column default `"PENDING_OWNER"` — **already a mismatch**, see below).

| Status | Written by (real path) | Read/transitioned by | Live or dead |
|---|---|---|---|
| WAITING_PAYMENT | `src/app/api/bookings/route.ts:245` — actual initial state of every guest booking | → ON_REVIEW (`payments/proof/route.ts:156`), → EXPIRED (`jobs/expire-bookings/route.ts:45`, `payments/proof/route.ts:109`), → CANCELLED (`bookings/cancel/route.ts:42`) | **Live**, real entry state |
| ON_REVIEW | `payments/proof/route.ts:156,201` | → CONFIRMED (`paymentReviewActions.ts:76-79`), → REJECTED (same file's reject counterpart; cron SLA timeout `jobs/expire-bookings/route.ts:71`) | **Live** |
| CONFIRMED | `paymentReviewActions.ts:76` (real online-payment path) | → CHECKED_IN (`owner/bookings/[id]/check-in/route.ts:32`) | **Live** via the online-payment path only |
| CHECKED_IN | `owner/bookings/[id]/check-in/route.ts:32`, gated on `status===CONFIRMED` + same calendar day | No automatic or manual transition out found | **Live**, real gated write path (overturns the block's own hypothesis that this might be display-only) |
| COMPLETED | `admin/bookings/complete/route.ts:38`, gated on `paymentStatus==="PAID" && payment?.status==="CAPTURED"` | Terminal | **Live**, admin-only manual action (escrow/payout trigger, not an automated checkout job) |
| REJECTED | `paymentReviewActions.ts` reject path; cron SLA timeout | Terminal (`TERMINAL_STATUSES_BLOCKING_CONFIRM`, `paymentReviewActions.ts:60-67`) | **Live** |
| CANCELLED | `bookings/cancel/route.ts:42`, `admin/bookings/[id]/cancel/route.ts:36`, `bookings/[id]/cancel-by-guest/route.ts` (writes a **different** string, `"CANCELLED_BY_GUEST"`, not `BOOKING_STATUS.CANCELLED`) | Terminal | **Live** |
| EXPIRED | `jobs/expire-bookings/route.ts:45`, `payments/proof/route.ts:109` | Terminal | **Live**, cron-driven |
| PENDING_OWNER | **No writer anywhere in `src/`.** It is only the Prisma column default; the one real creation route (`bookings/route.ts:245`) always overrides it to `WAITING_PAYMENT`. | `owner/bookings/[id]/confirm/route.ts:27` and `.../reject/route.ts:18` both gate on `status===PENDING_OWNER` — **both routes are dead code today**, unreachable because no row is ever in that state | **Dead as a write target**, but read/counted live in ~10 places (see §4) |
| WAIT_PROOF | **No writer anywhere.** | `normalizeBookingStatus()` (`domain/booking.ts:43`) treats it as a legacy alias and remaps to `WAITING_PAYMENT` on read | **Dead**, kept only for legacy-row read compatibility |

**Schema/reality mismatch, cited explicitly**: `prisma/schema.prisma:380-381`'s own doc comment lists the "current" lifecycle as `WAIT_PROOF | ON_REVIEW | PENDING_OWNER | CONFIRMED | COMPLETED | REJECTED | CANCELLED | EXPIRED` — this comment is itself stale: it omits `WAITING_PAYMENT` and `CHECKED_IN`, the two statuses the real 2026 chat-first lifecycle actually uses. Do not treat schema doc comments as authoritative without cross-checking write paths — this audit didn't.

## 3. Inventory occupancy map (four-layer cross-check)

Authoritative definitions, `src/lib/booking/availability.ts`:
```
OCCUPYING_ONLINE_STATUSES = [CONFIRMED, CHECKED_IN, COMPLETED]                    (line 12-16)
PENDING_ONLINE_STATUSES   = [WAITING_PAYMENT, WAIT_PROOF, ON_REVIEW, PENDING_OWNER] (line 19-24, calendar display only)
ACTIVE_HOLD_STATUSES      = [WAITING_PAYMENT, ON_REVIEW]                          (line 55, deliberately excludes WAIT_PROOF/PENDING_OWNER)
OCCUPYING_OFFLINE_STATUSES = [OFFLINE_STATUS.CONFIRMED, OFFLINE_STATUS.CHECKED_IN] (line 54)
```

**Layer 1 — Postgres physical-room EXCLUDE constraint** (`prisma/migrations/20260913080000_booking_room_exclusion_constraint/migration.sql:13-14,41-42`):
```
("source" = 'PLATFORM' AND "status" IN ('CONFIRMED','CHECKED_IN','COMPLETED'))
OR ("source" = 'OWNER_MANUAL' AND "offlineStatus" IN ('CONFIRMED','CHECKED_IN'))
```
Byte-for-byte consistent with `OCCUPYING_ONLINE_STATUSES`/`OCCUPYING_OFFLINE_STATUSES`. PENDING_OWNER/WAITING_PAYMENT/ON_REVIEW are **not** in the DB-level hard constraint — holds are enforced only at the app layer.

**Layer 2 — RoomType capacity** (`src/lib/pms/inventory.ts:64-115`): physical-room-assigned bookings use `isOccupyingOnlineStatus(b.status) || (includeActiveHolds && isActiveHoldBooking(b))` (line 82) — consistent. Unassigned/room-type-level bookings use a **hardcoded literal** `status: { in: ["CONFIRMED","CHECKED_IN","COMPLETED"] }` (line 99) instead of spreading `OCCUPYING_ONLINE_STATUSES` — functionally identical today, flagged as a **latent drift risk** (not a live bug) since it isn't a shared reference.

**Layer 3 — Search/hotel availability**: `getHotelDateAvailability` (`inventory.ts`, doc comment lines 155-163) explicitly reuses the same `assertRoomTypeAvailable`/`getRoomTypeAvailability` — "never a second, parallel availability implementation" — and opts into `includeActiveHolds`. Consistent with creation.

**Layer 4 — Lifecycle transitions**: confirmation (`paymentReviewActions.ts:88-108`, `owner/bookings/[id]/confirm/route.ts`) calls the same guards **without** `includeActiveHolds` (defaults false) — deliberate, documented (`inventory.ts:57-61`): enabling it here would let two coexisting holds deadlock each other out of ever confirming.

**PENDING_OWNER across all four layers — consistent but dormant, not contradictory**: excluded from the EXCLUDE constraint, excluded from `OCCUPYING_ONLINE_STATUSES`, excluded from `ACTIVE_HOLD_STATUSES`, and its only two write-adjacent routes are unreachable dead code. **Direct answer to the audit's central question: if a PENDING_OWNER booking existed today, a second guest COULD book the same room/dates — it is excluded from every occupancy/hold list every guard actually checks.** This is currently inert (nothing ever creates such a row) but is the exact gap a revived PENDING_OWNER would have to close first, not inherit silently.

**WAITING_PAYMENT/ON_REVIEW have no single "occupying: yes/no" answer** — this is architecture, not a bug: occupying-as-active-hold at creation/search time (`includeActiveHolds: true`), not occupying at confirmation time (`includeActiveHolds: false`, by design to prevent deadlock), never occupying at the DB constraint layer. A future Pay-at-Check-in design must pick one explicit answer per layer rather than assume "however WAITING_PAYMENT behaves" transfers directly.

## 4. Meaning of CONFIRMED — the architectural conflict, not smoothed over

Two genuinely different interpretations of `CONFIRMED` coexist in the current codebase, and the audit found **both a correct site and multiple sites that quietly conflate them**:

**Correct (ANDs both fields)**: `src/lib/services/ownerDashboardKpis.ts:71-77` — revenue aggregate requires `{ source: PLATFORM, status: "CONFIRMED", paymentStatus: "PAID" }` together. This is the only site that treats CONFIRMED as "reservation confirmed" and separately requires `paymentStatus: PAID` for "money received."

**Conflated (treats CONFIRMED alone as a paid-proxy)**:
- `src/lib/chat/bookingTimeline.ts:168` — `if (booking.status === CONFIRMED || booking.paymentStatus === "PAID")` — ORs them, i.e. CONFIRMED alone is sufficient to trigger paid-looking timeline UI even if `paymentStatus` is not PAID.
- `src/lib/services/ownerInsights.ts:22` — counts `status === "PENDING_OWNER" || status === "CONFIRMED"` as `bookingsCount` with no `paymentStatus` check at all.
- `src/app/dashboard/admin/page.tsx:255` — `bookingConfirmed = sumBookingStatus(["CONFIRMED","COMPLETED","CHECKED_IN"])`, a headline admin KPI bucket, status-only.

**Why this matters for 5.4, concretely, not hypothetically**: every one of today's CONFIRMED bookings genuinely does have `paymentStatus: PAID` set atomically alongside it (the only live writer, `paymentReviewActions.ts:78-79`, sets both together) — so the conflation is currently harmless by construction. The moment any future design sets `status: CONFIRMED` with `paymentStatus` still `PENDING` (which is exactly what "Pay at Check-in, confirmed immediately" would require), these three sites start silently misreporting: `bookingTimeline.ts` would show paid-looking UI for an unpaid booking, `ownerInsights.ts`'s booking count would already correctly include it (harmless there), and the admin `bookingConfirmed` KPI would count it as "confirmed" without distinguishing paid vs. unpaid — which may or may not be the intended admin semantics, but is not currently a decision anyone made, it's just how the string comparison happens to fall out.

**Separately found, real, unrelated bug** (not to fix in this audit): `src/app/dashboard/admin/page.tsx:226` — `prisma.booking.count({ where: { paymentStatus: "ON_REVIEW" } })`. `ON_REVIEW` is a `Booking.status` value, **never** a valid `paymentStatus` value (confirmed against every write site in §5) — this filter can never match a row; `bookingsOnReview` is always 0. Repeated at lines 916-917 (harmless there since ORed with the correct `status==="ON_REVIEW"` check).

## 5. paymentStatus map

Declared `prisma/schema.prisma:368`: `paymentStatus String @default("PENDING")` — no formal enum/const (unlike `BOOKING_STATUS`, there is no exported `PAYMENT_STATUS` list; every site uses raw string literals: `PENDING`, `PAID`, `FAILED`, `REFUNDED`).

**Writers**: `paymentReviewActions.ts:80` → `"PAID"` (the canonical money-verified write, atomic with `status: CONFIRMED`); `jobs/expire-bookings/route.ts:45,71` → `"FAILED"`; `bookings/cancel/route.ts:43`, `owner/bookings/[id]/reject/route.ts:31`, `admin/bookings/[id]/cancel/route.ts:37` → `"REFUNDED"` when previously PAID; `admin/bookings/payment/route.ts:25-54` → admin manual override of any of the three; `ownerOfflineBooking.ts` → `PAID` or `PENDING` depending on `prepayment >= totalPrice`.

**Readers gating independently of `status`**: `bookings/[id]/cancel-by-guest/route.ts:22` blocks guest self-cancel once `paymentStatus==="PAID"`, independent of booking status; `domain/booking.ts:34-38` (`deriveEscrowState`) is primarily `paymentStatus`-driven; `trips/classify.ts:113-115` derives guest-facing trip status from `paymentStatus` as a first-class signal; `profile/payments/page.tsx:19` gates a guest's payment history purely on `paymentStatus==="PAID"`.

**Check-in gate does not check paymentStatus at all**: `owner/bookings/[id]/check-in/route.ts:23` gates solely on `status===CONFIRMED` + same-day. Harmless today because the only live path to CONFIRMED always sets `paymentStatus: PAID` in the same write. **This exclusivity would need re-examination the moment a CONFIRMED-but-PENDING booking (Pay at Check-in, Model A) can exist** — check-in currently would not know or care whether money changed hands.

**CURRENT MODEL CANNOT EXPRESS "booking confirmed + payment still owed at hotel" WITH GUARANTEED CORRECT DOWNSTREAM SEMANTICS** — it can express the *state* (CONFIRMED + paymentStatus PENDING is a legal combination the schema already allows and the offline flow already produces, see §6), but three read sites (§4) do not yet treat that combination correctly for their purposes. This is a "needs review," not "needs migration," finding.

## 6. Payment entity trace

Verbatim `Payment` model (`prisma/schema.prisma:486-507`):
```prisma
model Payment {
  id          Int      @id @default(autoincrement())
  bookingId   Int      @unique
  booking     Booking  @relation(fields: [bookingId], references: [id])
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  provider    String   @default("MANUAL")
  method      String   @default("card")
  status      String   @default("PENDING")   // PENDING | AUTHORIZED | CAPTURED | FAILED | REFUNDED
  currency    String   @default("TJS")
  amount      Decimal
  fee         Decimal  @default(0)
  externalRef String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  refunds Refund[]
  logs    TransactionLog[]
}
```
`bookingId Int @unique` — a Booking can have zero or one Payment, never required from Booking's side.

**Only one creation site in the whole codebase**: `src/app/api/bookings/route.ts:327-337`, and only for `source: PLATFORM` bookings, and skipped even there on an idempotent replay (`!isNewBooking` branch). **Owner-manual bookings never create a Payment row — this is the existing, working precedent that "Booking without Payment" is already a supported, real state**, not a hypothetical.

**Actual `Payment.status` values written**: `PENDING` (creation), `CAPTURED` (`paymentReviewActions.ts:122`, `admin/bookings/payment/route.ts:42`), `FAILED` (`jobs/expire-bookings/route.ts:89`, `admin/bookings/[id]/cancel/route.ts:42`), `REFUNDED` (`admin/bookings/payment/route.ts:46`). `AUTHORIZED` has **zero write sites** — dead value in current code, do not assume it's wired to anything.

**Null-safety of `booking.payment` access**: correctly optional-chained everywhere except one spot — `src/app/api/admin/chat/archive/route.ts:51-53` accesses `booking.payment.id/.status/.amount` after only `include: { payment: true }`, with no defined-check. If this archive route can ever run against an owner-manual (Payment-less) booking, it would throw. **Flagged as a pre-existing finding, not caused by and not fixed in this audit** — worth a look before Pay-at-Check-in increases the population of Payment-less PLATFORM bookings beyond the offline-only case this code path presumably wasn't tested against.

**Owner/admin analytics do not assume every booking has one Payment**: `ownerDashboardKpis.ts`/`ownerInsights.ts` never touch `Payment` at all — they branch by `source` and read `Booking.totalPrice`/`paymentStatus`/`offlineStatus` directly, which is exactly the pattern a Pay-at-Check-in booking (also Payment-less) would fall into cleanly.

## 7. Existing owner manual/`payOnArrival` flow — the single most important precedent found

`src/components/owner/OfflineBookingForm.tsx` → `src/lib/services/ownerOfflineBooking.ts` (`createOwnerOfflineBooking`):

- `Booking.status` set **unconditionally to `CONFIRMED`** (`ownerOfflineBooking.ts:88`) — no owner-approval step, no intermediate pending state.
- `Booking.paymentStatus`: `"PAID"` if `prepayment >= totalPrice`, else `"PENDING"` (line 89) — **this is the exact "confirmed reservation, payment still owed" combination §5 asked whether the schema can express. It already exists in production code today.**
- **No `Payment` row created** — confirmed by the single global `prisma.payment.create` call site being elsewhere.
- `paymentMethod: "ARRIVAL"`, **`payOnArrival: true`** (lines 90-91) — `payOnArrival` is a real, already-existing `Boolean` column on `Booking`. The online guest-booking route (`bookings/route.ts`) hardcodes `payOnArrival: false` for every platform booking today — the field exists precisely to distinguish this dimension, it is simply never set to `true` by the guest-facing path yet.
- Real lifecycle progression (pending → confirmed → checked-in → checked-out → cancelled) happens through a **separate field**, `offlineStatus` (`OFFLINE_STATUS` enum, `domain/booking.ts:60-68`), independent of `Booking.status` which stays fixed at `CONFIRMED` for the booking's whole life. `updateOwnerOfflineBooking` (lines 144-233) is the one generic write path for every `offlineStatus` transition, including cancel and checkout (checkout also flips the physical room to `housekeepingStatus: "DIRTY"`, lines 189-194).
- Inventory guard uses `offlineStatus`, never `Booking.status`, for `OWNER_MANUAL` bookings (`isOccupyingOfflineStatus`, `availability.ts:93-96`) — occupying = `[CONFIRMED, CHECKED_IN]`, matching the EXCLUDE constraint exactly (§3).
- Notification on creation: `OWNER_OFFLINE_BOOKING_CREATED` to the **owner themselves** (line 121-127) — there is usually no platform guest user. No `addBookingSystemMessage` call tied to offline creation, unlike every online-booking lifecycle event.
- **No dedicated cancel/check-in/checkout route** — all of it flows through the one generic `updateOwnerOfflineBooking` PATCH-style endpoint; there is no explicit "release inventory" call, it works implicitly because cancelled/checked-out states are simply absent from the occupancy lists.

**This is direct evidence the project already knows how to express "booking is real and holds inventory, but money hasn't necessarily changed hands yet" — via `payOnArrival: true` + `paymentStatus: PENDING`, with no Payment row — without any schema change.** The gap is not "can the schema express this," it's "no guest-facing code path sets `payOnArrival: true` yet, and the three §4 conflation sites weren't written expecting a PLATFORM-source CONFIRMED-but-unpaid booking to exist."

## 8. PENDING_OWNER — full audit (confirms dead, adds one new fact)

Every occurrence traced (routes, UI, cron, guards, notifications, chat, analytics, i18n) — full table in the agent trace; summary: **zero write sites** exist anywhere (`data: { status: PENDING_OWNER }` never appears). The two routes gated on it (`owner/bookings/[id]/confirm/route.ts:27`, `.../reject/route.ts:18`) are unreachable dead code. It is nonetheless **read/counted live** in ~10 places: both dashboards' KPI counts and filter dropdowns, chat header/panel status labels, `StatusBadge`, notification reminders, trip classification, and `PENDING_ONLINE_STATUSES` (calendar display). `src/lib/booking/availability.ts:47-51`'s own doc comment independently states the identical conclusion this audit reached by grep: *"neither is ever assigned by any current write path... confirmed empirically."*

**Step-by-step answer to "if a guest booking were created as PENDING_OWNER tomorrow"**: it would display on owner/admin calendars (`PENDING_ONLINE_STATUSES`) and get counted in a few KPI buckets (`ownerDashboardKpis.ts:46,94`, `ownerInsights.ts:22`), but it would **not** block inventory anywhere — not the Postgres EXCLUDE constraint, not `OCCUPYING_ONLINE_STATUSES`, not even `ACTIVE_HOLD_STATUSES` (explicitly excluded, unlike WAITING_PAYMENT/ON_REVIEW). **A second guest could successfully book the identical room/dates while the first sits as PENDING_OWNER.** Reviving this status for Pay-at-Check-in without first adding it to at least `ACTIVE_HOLD_STATUSES` (and deciding whether it belongs in `OCCUPYING_ONLINE_STATUSES`/the EXCLUDE constraint too) would reintroduce exactly the double-booking hole BLOCK 4.x closed for the Pay-Now path.

## 9. Owner-approval models A vs B — consequences, not a choice

**MODEL A — immediate CONFIRMED, no owner approval**:
- State transitions: `CREATED → CONFIRMED (paymentStatus PENDING) → CHECKED_IN → COMPLETED`, cancel path TBD (see gap below).
- Inventory: trivially safe — reuses `OCCUPYING_ONLINE_STATUSES`/EXCLUDE constraint exactly as-is (CONFIRMED already occupies at all 4 layers, §3). **Zero guard changes required.**
- No-show/abuse risk: highest — nothing stops a guest from instantly holding real inventory with no owner review and no payment. Existing anti-abuse controls (§20-equivalent, rate limit 30/60s/IP, phone-in-use check, hotel-status gate) apply but are generic, not payment-choice-specific.
- **Real, newly-found gap**: every existing cancel route explicitly blocks `CONFIRMED` — `bookings/cancel/route.ts` only allows `WAIT_PROOF/ON_REVIEW/REJECTED`; `bookings/[id]/cancel-by-guest/route.ts` blocks once status is `CONFIRMED/CHECKED_IN/COMPLETED` **or** `paymentStatus==="PAID"`; `admin/bookings/[id]/cancel/route.ts`'s `BLOCKED` set explicitly includes `CONFIRMED`. **A Model-A Pay-at-Check-in booking, once created, would have NO cancellation path in the current codebase at all** (not by guest, not by admin) until it reaches check-in day. This must be treated as a hard prerequisite, not an afterthought.
- Owner UX: booking simply appears confirmed; owner has no say before it occupies their calendar.
- Guest UX: simplest, instant.
- Implementation complexity: lowest of the two models.

**MODEL B — owner acceptance required (pending → owner Accept/Reject → CONFIRMED)**:
- Requires a genuinely new pending-but-holding state, since PENDING_OWNER as it exists today does **not** hold inventory (§8) — reviving it correctly means adding it to `ACTIVE_HOLD_STATUSES` at minimum, deciding its interaction with `includeActiveHolds` at confirmation-time call sites (the existing deliberate exclusion of confirmation-time holds, `inventory.ts:57-61`, was designed around WAITING_PAYMENT/ON_REVIEW only — a third hold-status changes that reasoning and needs re-verification, not an assumed pass).
- Needs its own expiry/timeout policy (an owner who never responds must not hold inventory forever) — no existing job covers this; `jobs/expire-bookings/route.ts` only handles `WAITING_PAYMENT/WAIT_PROOF` (15 min) and `ON_REVIEW`'s `proofReviewDeadlineAt` (5 min).
- Abuse risk: lower (owner can reject before committing inventory), but adds owner friction/latency to every booking.
- Guest UX: worse (uncertainty until owner responds).
- Implementation complexity: materially higher — new hold semantics, new expiry policy, reviving and re-verifying two currently-dead routes rather than adding one boolean-driven branch to an existing live one.

**No recommendation is made between A and B here** per the block's read-only constraint — this is exactly the decision the user reserved for the next conversation.

## 10. Hotel-level policy support

Full `Hotel` model (`prisma/schema.prisma:97-130`) quoted: `id, ownerId, name, city, address, description, propertyType, coverImageUrl, rating, status, currentRejectionReason, latitude, longitude, createdAt, updatedAt`, relations `rooms, roomTypes, staff, favorites, photos, amenities, paymentMethods, subscription`. Grep for `acceptsPayNow|acceptsPayAtCheckIn|prepaymentRequired|paymentPolicy|requiresApproval|bookingPolicy` across `src/`: **zero matches**.

**NO HOTEL-LEVEL PAY-AT-CHECK-IN POLICY EXISTS.** Today `HotelPaymentMethod` only represents payment *methods* for the proof-based Pay-Now flow — there is no field for "this hotel accepts pay-at-check-in" or "this hotel requires prepayment." Showing the option to guests for every hotel automatically today would mean no owner has opted in or out of it.

## 11. Current booking API contract (`POST /api/bookings`)

Fields read (`src/app/api/bookings/route.ts:44-60`): `roomTypeId`, `roomId`, `checkIn`, `checkOut`, `phone`, `guestName`, `guestEmail`, `paymentMethod` (legacy, defaults ALIF/DC), `hotelPaymentMethodId` (mandatory since BLOCK 5.2, validated against the resolved hotel + `isActive`), `guestCount`. `payOnArrival` is **not** currently an accepted input — it's hardcoded `false` in `bookingData` (confirmed in the BLOCK 5.2 trace and re-confirmed here).

## 12. Proposed API contract (specification only — not implemented)

A `paymentOption: "PAY_NOW" | "PAY_AT_CHECK_IN"` input (name illustrative, not a commitment) would need to branch validation:

| | PAY_NOW (current) | PAY_AT_CHECK_IN (proposed) |
|---|---|---|
| `hotelPaymentMethodId` | Required, validated (existing BLOCK 5.2 contract) | Not required — no snapshot needed since no HotelPaymentMethod is being paid to yet |
| `paymentMethodSnapshot` | Required (built server-side) | None — mirrors offline flow exactly |
| `Payment` row | Created | Not created (mirrors offline flow — Booking-without-Payment is already a supported real state, §6) |
| Initial `Booking.status` | `WAITING_PAYMENT` | Depends entirely on the A/B decision (§9) — `CONFIRMED` under Model A, a new/revived hold status under Model B |
| `expiresAt` | 15-minute payment deadline | Must NOT inherit the 15-minute payment deadline — see §15 |
| `payOnArrival` | `false` (as today) | `true` (reusing the existing field, §7) |
| proof fields | Used | Unused |

## 13. Idempotency implications

Exact identity key (`bookings/route.ts:159-161`, re-checked in-transaction at 255-260): `userId + (roomId | roomTypeId) + checkIn + checkOut + status not in terminal set` — **does not key on payment method or any payment-choice field at all**, confirmed deliberate by the existing code comment (lines 154-158).

**Direct, non-hypothetical risk**: a guest submitting PAY_NOW then, moments later, PAY_AT_CHECK_IN for the identical room+dates (or the reverse) would hit the existing-booking short-circuit and simply get back the **first** booking, silently ignoring the second request's different payment choice. This is a real design question the future contract must resolve explicitly — either accept it (payment option isn't part of "booking intent" identity, matching today's philosophy that room+dates+user is the intent), or deliberately fold the option into the identity key knowing that changes the resubmit semantics BLOCK 5.2 proved.

## 14. Concurrency implications (tests to design later, not run in this block)

Per §3's four-layer map, Model A (CONFIRMED immediately) requires **no new guard code** — the existing physical-room EXCLUDE constraint, RoomType capacity guard, and search availability all already treat CONFIRMED as occupying regardless of `payOnArrival`, so a PAY_NOW vs PAY_AT_CHECK_IN mixed-inventory race is already correctly unified under one occupancy authority (`OCCUPYING_ONLINE_STATUSES`) with zero code changes. Model B would need its new hold status added consistently to the same map before any concurrency test could pass — this audit does not assume it would.

## 15. Expiry implications

`jobs/expire-bookings/route.ts` secret-gated (`x-job-secret` header / `?secret=`, compared to `JOB_SECRET` env, `9-12`), handles exactly two things: (a) `WAITING_PAYMENT`/`WAIT_PROOF` past `expiresAt` → `EXPIRED` (lines 15-20, 43-46), (b) `ON_REVIEW` past `proofReviewDeadlineAt` → `REJECTED` (lines 30-37, 69-72, **not EXPIRED** — a real, documented policy asymmetry the user has already flagged as a product question to defer, not a bug to fix here).

No current code path unconditionally dereferences a booking's `expiresAt` — every UI/route site checked is already null-safe. **One real semantic trap found**: `isActiveHoldBooking` (`availability.ts:155-160`) treats `expiresAt === null` on a status included in `ACTIVE_HOLD_STATUSES` as "never expires" (`if (!b.expiresAt) return true;`). This is safe today only because nothing with a null `expiresAt` is ever in `ACTIVE_HOLD_STATUSES`. **If a future Pay-at-Check-in hold status were ever added to `ACTIVE_HOLD_STATUSES` with `expiresAt: null` (which is exactly what "no payment deadline because nothing is owed yet" would naturally look like), it would become a permanent, unexpiring hold** — this function's null-handling would need to change, or the new status would need its own separate deadline field (e.g. an owner-response deadline) rather than `expiresAt: null`.

## 16. Cancellation

Three distinct routes: guest early-cancel (`bookings/cancel/route.ts`, allows only `WAIT_PROOF/ON_REVIEW/REJECTED`), guest late-cancel (`bookings/[id]/cancel-by-guest/route.ts`, blocks once `CONFIRMED/CHECKED_IN/COMPLETED` or `paymentStatus==="PAID"`, writes a distinct `"CANCELLED_BY_GUEST"` string not `BOOKING_STATUS.CANCELLED`), admin cancel (`admin/bookings/[id]/cancel/route.ts`, explicit `BLOCKED` set includes `COMPLETED, CANCELLED, CANCELLED_BY_GUEST, EXPIRED, CONFIRMED, CHECKED_IN`). **As established in §9, every one of these blocks `CONFIRMED` — a Model-A Pay-at-Check-in booking cannot currently be cancelled by anyone through any existing route.** Owner-manual cancellation has no dedicated route either — it's just another `offlineStatus` value via the generic update endpoint, with no notification/chat side effect, unlike all three online routes.

## 17. Check-in / completion

Both have real, gated, reachable write paths (§2) — correcting the block's own hypothesis that these might be display-only:
- `CHECKED_IN`: `owner/bookings/[id]/check-in/route.ts:32`, gated on `status===CONFIRMED` + same calendar day as `checkIn`. Gates on status only, not `paymentStatus` (§5) — currently harmless, becomes a real question under Model A.
- `COMPLETED`: `admin/bookings/complete/route.ts:38`, gated on `paymentStatus==="PAID" && payment?.status==="CAPTURED"` — admin-only manual action, also creates a `Payout` row and `TransactionLog` (escrow release), not an automated checkout job.

**Nothing in the current codebase records "guest arrived + money was received at the hotel" as a single event** — the closest existing pattern is the offline flow's `updateOwnerOfflineBooking`, which can set `offlineStatus: CHECKED_IN` freely without any payment-received signal at all (offline bookings track money via `prepayment`/`remainingAmount`, not a captured-payment event). A guest-facing Pay-at-Check-in feature needs an explicit "owner confirms payment received at check-in" action that does not exist today — likely a small new owner route writing `paymentStatus: "PAID"` (mirroring `paymentReviewActions.ts`'s existing pattern) rather than a new Payment row (mirroring the offline flow's precedent of not needing one).

## 18. Analytics / revenue

`ownerDashboardKpis.ts:71-77` is the one place that correctly requires `status===CONFIRMED AND paymentStatus==="PAID"` for revenue. Every other CONFIRMED-adjacent count (`ownerInsights.ts:22`, admin dashboard's `bookingConfirmed` bucket, `bookingTimeline.ts:168`) does not check `paymentStatus` (§4) — a Pay-at-Check-in booking sitting as CONFIRMED+PENDING would already, today, without any further code change, get counted in those three places' non-revenue-labeled buckets (bookings count, confirmed-status KPI, paid-looking chat UI) while correctly being excluded from the one true revenue calculation. Whether that's the desired behavior for the "confirmed bookings" KPI (arguably yes — it is a confirmed booking) and the chat timeline (arguably no — showing paid-style UI for unpaid money) is a product call, not something this audit resolves.

## 19. Chat / notifications catalog

| Event | Site | Notification type | Recipient | System message |
|---|---|---|---|---|
| Booking created | `bookings/route.ts:364-372` | `NEW_BOOKING` | owner | via `initializeBookingChatRoom`/`initWelcomeMessage.ts` |
| Proof submitted | `payments/proof/route.ts:173-197` | `PAYMENT_PROOF_SUBMITTED` | owner | "Чек отправлен..." |
| Payment window expired | `jobs/expire-bookings/route.ts:48-64` | `BOOKING_EXPIRED` | owner | "Бронь отменена по истечении 15 минут..." |
| Review-SLA timeout → REJECTED | `jobs/expire-bookings/route.ts:73-117` | `PAYMENT_REJECTED` | guest only | "Время проверки чека истекло..." |
| Owner/admin confirm | `paymentReviewActions.ts:140-155` | `PAYMENT_APPROVED` | guest + owner | "Бронирование подтверждено!..." |
| Owner/admin reject | `paymentReviewActions.ts:211-223` | `PAYMENT_REJECTED` | guest + owner | "Чек отклонён. {reason}..." |
| Guest cancel | `bookings/[id]/cancel-by-guest/route.ts:47-66` | none created (existing notifications for the booking are deleted) | — | "Бронирование отменено пользователем..." |
| Admin cancel | `admin/bookings/[id]/cancel/route.ts:33-58` | `BOOKING_REJECTED` | guest | "Бронирование отменено администратором." |
| Owner-manual creation | `ownerOfflineBooking.ts:121-127` | `OWNER_OFFLINE_BOOKING_CREATED` | owner (self) | none |

For a future Pay-at-Check-in, at minimum "guest chose pay at hotel" (creation), "booking confirmed"/"accepted" (model-dependent), cancellation, and "payment received at check-in" would need their own events — specification only, no code proposed here.

## 20. Security / abuse

Existing controls on `POST /api/bookings`: IP rate limit 30/60s (`clientIp`+`rateLimit`, lines 62-71), phone-in-use check for new guest accounts (lines 90-94), hotel-must-be-APPROVED gate (lines 138-145), the idempotency/duplicate-submit guard (§13), the BLOCK 5.2 payment-method authoritative validation, and the atomic advisory-lock availability check (§3). **No per-user booking-count limit, no verification-required gate** (a brand-new unverified guest, `verified: false`, can book immediately). Pay-at-Check-in raises the stakes on all of these because it removes the one soft deterrent Pay-Now has today — a guest must at least go through the motions of "paying" (uploading a real-looking proof) before occupying inventory; Pay-at-Check-in would occupy real inventory with zero payment friction at all under Model A.

## 21. Owner controls

No existing setting lets an owner opt in/out of Pay-at-Check-in, require prepayment, or require approval (§10 — confirmed no such field exists). A minimal future model would need at least one new `Hotel`-level boolean/enum; not designed or added here.

## 22. UX consequences (specification only)

Wizard must not show `HotelPaymentMethod` picker, payment countdown, or proof uploader for a Pay-at-Check-in choice — none of those concepts apply when no payment is due yet. Post-booking, the guest should see a confirmation of the reservation and (once decided) either "your room is held, pay at the hotel" (Model A) or "waiting for the hotel to accept" (Model B) — not the WAITING_PAYMENT/ON_REVIEW UI verbatim, since neither state applies.

## 23. Schema decision

**B — can be implemented using existing fields, no migration required for Model A.** `payOnArrival: Boolean` already exists and is already load-bearing for exactly this semantic distinction in the offline flow (§7); `Booking.status = CONFIRMED` + `paymentStatus = PENDING` + no `Payment` row is already a real, working, occupancy-safe combination today, just never reached from the guest-facing route. Model B would additionally need either reviving `PENDING_OWNER` with corrected occupancy-list membership (schema change: none required, just code — but real state-machine work, §9) or, if that proves too entangled with the existing dead routes, a genuinely new status — a schema change, but a small one (one enum-like string value plus its own hold-window field, not a restructuring).

## 24. Decision matrix

| | Semantic correctness | Inventory safety | Implementation risk | Migration | Analytics correctness | Owner UX | Guest UX | Compat w/ Pay Now | Abuse/no-show |
|---|---|---|---|---|---|---|---|---|---|
| **Option 1 — reuse `payOnArrival`+CONFIRMED+PENDING (Model A)** | Matches existing offline precedent exactly | Already safe at all 4 layers, zero guard changes | Low — mostly Wizard/API branching + one new "mark paid at check-in" owner action | None | 3 sites (§4/§18) need review, none need urgent fixing | Booking just appears; no control | Simplest, instant | Fully compatible — same occupancy authority | Highest — no cancellation path exists yet (§16), no friction before occupying inventory |
| **Option 2 — revive PENDING_OWNER (Model B)** | Enum name matches intent but currently means nothing operationally | Unsafe until re-added to hold/occupancy lists — real work, real re-verification of the deliberate confirmation-time exclusion (§3) | High — reviving 2 dead routes, new expiry policy, re-proving concurrency invariants BLOCK 4.x/5.2 already proved for the current statuses | None (status already exists) but substantial state-machine work | Needs its own KPI review since it's already counted in a few places today (§8) | Owner gets a real accept/reject step | Worse — uncertainty window | Needs new interaction rules with existing holds (mixed Pay-Now/Pay-at-Check-in races, §14) | Lower — owner can reject before committing |
| **Option 3 — brand-new explicit status/paymentOption enum** | Cleanest on paper | Safe once correctly wired, but duplicates effort Option 1 already gets for free | Medium-high — most net-new code for a distinction the schema can already express | Small (one field) | Same review need as Option 1 | Flexible, but over-engineered relative to evidence | Same as chosen model | Requires care not to fragment "what counts as occupying" further | Same as chosen model |

**Option 4 was not found** — the evidence pointed clearly at Option 1 being the correct starting point for whichever of Model A/B is chosen, since `payOnArrival` already carries the semantic weight regardless of the approval-step decision; Model A vs B is really a decision about whether a *second* field/hold status is layered on top of the already-adequate Option 1 foundation, not a rejection of it.

## 25. Recommended architecture (evidence-based, not implemented)

Recommend **Option 1 as the foundation regardless of the A/B decision**, since it costs nothing and both models need it:

```
PAY NOW (existing, unchanged):
CREATED → WAITING_PAYMENT → ON_REVIEW → CONFIRMED → CHECKED_IN → COMPLETED
                 ↓ reject        ↓ timeout
           WAITING_PAYMENT      REJECTED
                 ↓ expiry
              EXPIRED

PAY AT CHECK-IN — Model A (recommended default absent a stated reason for B):
CREATED → CONFIRMED (payOnArrival: true, paymentStatus: PENDING, no Payment row)
        → CHECKED_IN (existing route, unchanged gate) + NEW: owner "payment received" action → paymentStatus: PAID
        → COMPLETED (existing admin route — but its current gate `paymentStatus==="PAID" && payment?.status==="CAPTURED"` would need a payOnArrival-aware branch, since there is no Payment row to be CAPTURED)

PAY AT CHECK-IN — Model B (if owner approval is decided to be required):
CREATED → [new/revived pending-and-holding status] → owner Accept → CONFIRMED (same as Model A from here)
                                                    → owner Reject → REJECTED
                                                    → owner timeout → [must be decided, not inherited from ON_REVIEW's REJECTED-on-timeout]

CANCEL (both, new work required — currently blocked in all three existing cancel routes for CONFIRMED):
CONFIRMED (payOnArrival, unpaid) → CANCELLED, via a widened cancel policy specific to this case
```

## 26. Exact implementation prerequisites (for whichever BLOCK 5.4B follows)

**Required schema changes**: none for Model A. Model B: either correct `PENDING_OWNER`'s occupancy-list membership (no migration) or add one new status + a hold-deadline field (small migration).

**Required backend changes**: accept a payment-choice input on `POST /api/bookings`; branch `hotelPaymentMethodId`/snapshot/Payment-creation validation by choice (§12); a new owner "mark payment received at check-in" action; a new cancel path for CONFIRMED+payOnArrival+unpaid bookings; fix or knowingly accept the three §4 conflation sites' behavior once a real PENDING-paymentStatus CONFIRMED booking can exist; decide `admin/bookings/complete/route.ts`'s Payment-CAPTURED gate for the no-Payment-row case.

**Required inventory changes**: none for Model A (§14). Model B: add the new/revived status to `ACTIVE_HOLD_STATUSES` and re-verify the confirmation-time exclusion reasoning still holds with a third hold status present.

**Required UI changes**: Wizard payment-choice step; suppress HotelPaymentMethod picker/countdown/proof-uploader for Pay-at-Check-in; a distinct post-booking confirmation state; owner "mark paid" action in the booking/chat surface.

**Required owner changes**: none mandatory for a v1 (every hotel could default to accepting both), but §10/§21 flag that no per-hotel opt-out exists — a real product decision, not an implementation detail, for whether to ship without one.

**Required tests**: full BLOCK 4.x/5.2-style concurrency matrix re-run for the mixed Pay-Now/Pay-at-Check-in case (§14) even though Model A needs no guard-code changes — the invariant must still be *proven*, not assumed, per this project's own evidence standard; a cancellation-path test for the new CONFIRMED+unpaid case; an idempotency test for the mixed-payment-option collision (§13).

## 27. Risks / open questions (for the user's next decision, not resolved here)

- Model A vs B is unresolved and explicitly left to the user.
- The three §4 conflation sites need an explicit decision (fix now as prerequisite, or accept and document) before Model A ships, since they will start actually diverging in production for the first time.
- No cancellation path exists today for CONFIRMED bookings — this blocks Model A regardless of A/B choice and must be designed, not discovered live.
- The `admin/bookings/complete/route.ts` Payment-CAPTURED gate needs a decision for the no-Payment-row path.
- No per-hotel opt-in/opt-out exists — shipping without one means every approved hotel gets Pay-at-Check-in by default.
- `src/app/api/admin/chat/archive/route.ts:51-53`'s unguarded `booking.payment.*` access is a pre-existing latent null-deref risk, unrelated to this audit's cause but worth fixing before Payment-less PLATFORM bookings become common via Pay-at-Check-in.

## 28. Production untouched

No production code, schema, or data was modified. No migration was run. This is a documentation-only artifact plus a `.agent/STATE.md` update.

---

**BLOCK 5.4A ARCHITECTURE TRACE = COMPLETE**

**BLOCK 5.4 IMPLEMENTATION = NOT STARTED**
