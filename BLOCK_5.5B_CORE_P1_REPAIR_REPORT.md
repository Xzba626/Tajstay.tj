# BLOCK 5.5B — Core P1 Repair: Report

## 1. Baseline

Branch `feature/tajstay-full-ui-ux-rebuild`. START_SHA `a293df9961cd8a8be5574f528e8910ee69244170`.
`git status --short` at start: `.agent/STATE.md` modified, two untracked 5.5A/5.5A.1 reports, one
untracked test script — all preserved, nothing reset/stashed/discarded.

## 2. DB-environment recovery — root-caused, correctly NOT remediated

Diagnosed to completion, per instruction's own escalation path:
- `postgresql-x64-16` Windows service confirmed **Running**; `postgres.exe` listening on `5432`.
- The actual PostgreSQL server log (`C:\Program Files\PostgreSQL\16\data\log\postgresql-2026-09-14_000000.log`)
  was read directly and shows the real cause:
  ```
  FATAL:  password authentication failed for user "postgres"
  ...
  ERROR:  cannot reassign ownership of objects owned by role postgres because they are required by the database system
  STATEMENT:  reassign owned by postgres to koryob_migrator;
  ```
  This is a **shared local Postgres instance also used by an unrelated project on this machine**
  (`D:\koryob\KORYOB` - confirmed via `wmic process ... get CommandLine`, a completely different
  Next.js app running on port 3002, sharing the same local Postgres server). That project's own
  migration tooling attempted to reassign/alter the shared `postgres` superuser role, and the
  `postgres` role's password no longer matches TajStay's `.env` `DATABASE_URL` as a result.
- This is unambiguously the **"credential corruption/config mismatch"** case the instruction
  explicitly says to STOP on rather than remediate: `.env` was not touched, no credential was
  guessed or changed, the Postgres service was not restarted, no reset/drop was attempted.
- Ruled out stale-TajStay-process connection exhaustion as the cause first (the original
  hypothesis from BLOCK 5.5A.1): `tasklist`/`wmic` at the time showed six `node.exe` processes, all
  confirmed via command line to belong to the unrelated `koryob` project, none to TajStay - so
  killing them would have violated "не убивать произвольные системные процессы" and would not have
  fixed anything regardless.
- **DB connectivity remains down as of this report** - re-checked immediately before writing this
  section, still `password authentication failed`.

**Consequence, stated plainly**: every runtime/backend test this block was supposed to produce
(P1-1's Admin Bookings matrix, P1-2's review status matrix, P1-4's financial matrix A-M, the
concurrency proof) **could not be executed**. All four fixes below were implemented and are
believed correct based on direct code reading and the exact evidence already gathered in
5.5A/5.5A.1 (including the real HTTP proof of the P1-4 defect that motivated this exact fix), but
**none of them has fresh runtime confirmation from this block** - this is stated explicitly in
every relevant section below rather than glossed over.

## 3. Files changed

- `src/app/dashboard/admin/page.tsx` — P1-1 (query include + null-safe render)
- `src/app/api/reviews/create/route.ts` — P1-2 (backend gate)
- `src/lib/trips/historyRecord.ts` — P1-2 (client-side gate, was duplicating the same wrong rule)
- `src/components/trips/HistoryRecordCard.tsx` — P1-2 (call-site update for the narrowed type)
- `src/app/globals.css` — P1-3 (CSS fix)
- `src/app/api/admin/bookings/complete/route.ts` — P1-4 (financial-integrity + concurrency guard)

## 4. P1-1 — Admin Bookings nullable-user 500

**Root cause** (unchanged from 5.5A): `dashboard/admin/page.tsx`'s Bookings query only included
`room: { include: { hotel: true } }, user: true` - an `OWNER_MANUAL`/offline booking legitimately
has `userId: null`, and the render read `b.user.name` unguarded. A `roomType`-only online booking
(`roomId: null`) would hit the identical class of crash on `b.room.hotel.name`, never exercised by
the specific dataset that reproduced the 500 but present as the same risk.

**Fix**:
- Query now also includes `roomType: { include: { hotel: true } }` and `assignedRoom: { include: { hotel: true } }`.
- Guest name: reuses the existing, already-tested `getBookingGuestLabel()` helper (from
  `src/lib/domain/booking.ts`, already handles `guestName`/`guestPhone`/`user` fallback chain) -
  when it falls all the way through to its own "—" sentinel, the admin card shows the literal RU
  text **"Гость без аккаунта"** instead, per the explicit requirement. No fake `User` row is
  created; no DB relation changed.
- Hotel name: reuses the existing, already-tested `bookingHotel()` helper (from
  `src/lib/pms/bookingContext.ts`, resolves `assignedRoom ?? room ?? roomType`), wrapped in a
  `try/catch` so the one case where it still throws (all three relations missing - hypothetically
  malformed data, not a real booking type) falls back to **"Отель не определён"** rather than
  crashing the page.
- Both helpers were **reused, not reinvented** - this is not a new null-handling pattern, it's the
  same one already proven correct in the guest-facing chat page and Trips history.

**Tests**: `npx tsc --noEmit` and targeted `eslint` both clean. **The A-G runtime matrix specified
in the block (platform booking 200, offline booking 200, both together 200, mobile, desktop) could
NOT be executed** - blocked by §2's DB outage. **Status: P1-1 = PARTIAL** (code fix in, believed
correct by direct reading, zero runtime confirmation this block).

## 5. P1-2 — Review eligibility

**Accepted rule** (per the user's explicit product decision, not re-litigated): a review is
allowed only when `Booking.status === COMPLETED`. Neither "checkout date has passed" nor
`CHECKED_IN` alone is sufficient.

**Before**: `reviews/create/route.ts:67-69` — `status !== "CONFIRMED"` combined with
`checkOut > now` → reject. This only allowed a review while the booking was *still* CONFIRMED
(guest never checked in) and *permanently* blocked it the instant CHECKED_IN or COMPLETED was
reached - the inverse of the intended lifecycle.

**After**: single condition, `booking.status !== "COMPLETED"` → reject, with the error message
corrected to reflect the real rule ("Отзыв доступен только после завершённого проживания"). The
`paymentStatus !== "PAID"` check is kept (defense in depth - every real COMPLETED booking already
has `paymentStatus: PAID` by construction, per both the Pay Now and pay-at-check-in completion
routes, so this can never itself become the blocking condition in practice, but costs nothing to
keep). `Review.bookingId` DB-unique constraint is untouched and remains the authoritative duplicate
guard.

**Client-side mirror fixed too**: `src/lib/trips/historyRecord.ts`'s `canLeaveReview()` had the
exact same inverted condition (`status===CONFIRMED && isStayPast(checkOut)`) controlling whether
the "Leave a review" UI even appears in Trips history - fixed to `status===COMPLETED`, unused
`checkOut`/`now` parameters and the now-unused `isStayPast` import removed. The one call site
passing an object literal (`HistoryRecordCard.tsx`) updated to match the narrower parameter type
(TypeScript's excess-property check would otherwise reject the old `checkOut` field).

**Tests**: `tsc`/`eslint` clean. **The full status matrix (WAITING_PAYMENT/ON_REVIEW/CONFIRMED/
CHECKED_IN/COMPLETED/CANCELLED/REJECTED/EXPIRED → DENY/ALLOW, duplicate-review denial, cross-user
denial) specified in the block could NOT be executed** - same DB outage. **Status: P1-2 = PARTIAL**
(code fix in on both the server and client gate, zero runtime confirmation this block).

## 6. P1-3 — Search HotelCard collapse

**Root cause** (unchanged from 5.5A): the standard `HotelCard` variant's only sizing rule for
`.hotel-img-wrap` was scoped to `.home-page .hotel-img-wrap` (`home.css:779-781`) - any page
without that ancestor class (Search) had no height rule at all, collapsing the wrapper to 0 and
hiding the entire photo/name/rating block.

**Chosen fix, per explicit instruction not to import `home-pr2.css` blindly**: `home-pr2.css` was
read in full (209 lines) before deciding - it contains substantial *other* unscoped global rules
completely unrelated to this bug (`.site-header` background/blur overrides, `.hotel-card-premium`
hover/border/shadow overrides, `.home-section`/`.home-owner-cta`/`.home-hero-visual` layout rules)
that would have changed the Header and every hotel card's hover behavior site-wide as an
unintended side effect of importing the whole file for one fix. **Rejected that approach.** Instead,
added one small, self-contained, unscoped default directly next to the existing `.hotel-img-wrap`
rule in `globals.css` (`position:relative; overflow:hidden` already lived there):
```css
.hotel-img-wrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
}
```
`.home-page .hotel-img-wrap`'s own `aspect-ratio: 16/9` (`home.css`) has higher specificity
(two classes vs. one) and both rules are unlayered, so **Home's existing look is unchanged** -
verified by reading the actual specificity, not assumed. `home-pr2.css` itself was left in place,
untouched and still unimported (deleting an orphaned file was outside this fix's scope; noted as a
housekeeping item, not acted on).

**Tests**: no TS/lint surface for a CSS-only change. **The full mobile+desktop HotelCard runtime
matrix (Home/Search/other live pages, wrapper height, image/name/rating visibility, no Home
regression, screenshots) specified in the block could NOT be executed** - the dev server itself
needs the same DB connection that's down. **Status: P1-3 = PARTIAL** (fix applied, specificity
verified by direct reading of both competing rules, zero live-render confirmation this block).

## 7. P1-4 — Pay Now completion / Payout safety (the priority item)

**Accepted rule** (per the user's explicit decision): completion + Payout requires ALL of
`status===CHECKED_IN`, `paymentStatus===PAID`, `Payment.status===CAPTURED`, AND checkout reached.
`CONFIRMED → COMPLETED` directly is never allowed; `CHECKED_IN → COMPLETED` before checkout is
never allowed.

**Checkout-time semantics** (per the explicit instruction to establish this before coding, not
invent an hour): `Booking.checkOut` is a plain calendar-date `DateTime` (midnight UTC of that
date, set at booking creation from a `"YYYY-MM-DD"` form value - confirmed by re-reading
`bookings/route.ts`'s `new Date(checkOutRaw)` parsing, unchanged since BLOCK 5.2/5.4). No separate
checkout-hour concept exists anywhere in the current product model. The exact same comparison the
codebase's own review-eligibility code already used for this concept (`checkOut.getTime() > Date.now()`
meaning "hasn't happened yet") was reused verbatim as `checkoutReached()` - not a new invented
boundary.

**Fix, both branches of `admin/bookings/complete/route.ts`**:
- Pay Now branch: precondition now requires `paymentStatus==="PAID" && payment?.status==="CAPTURED"
  && status===CHECKED_IN && checkoutReached(checkOut)` together - previously missing the last two.
- Pay-at-check-in branch: **also** given the `checkoutReached()` requirement (it already had
  `CHECKED_IN`) - this was implicit in the user's own §4.3 spec text ("after checkout → COMPLETED"
  for pay-at-check-in too) even though it wasn't named as a separate numbered P1; fixed for
  consistency since leaving the sibling branch with the identical gap would just relocate the bug.
- **Concurrency**: both branches now use an atomic `updateMany` guarded by the exact precondition
  WHERE clause (`status/paymentStatus/payOnArrival`), mirroring the pattern already proven in
  BLOCK 5.4B's `confirm-arrival-payment/route.ts` - a genuinely simultaneous second completion
  request resolves to `count:0` and a controlled rejection, never a second `Payout`/`TransactionLog`.
  This closes a real gap: the route previously used a plain `update()` with no atomicity at all.
- No-Payout invariant for pay-at-check-in (BLOCK 5.4B) is untouched - still an early-return, still
  no `Payment`/`Payout` row ever created for it.
- Owner-manual/offline bookings: re-confirmed (not re-designed) that this route has never
  supported them at all (`bookingHotel()`/the two explicit branches only handle `payOnArrival`
  true/false, both of which apply exclusively to PLATFORM-source bookings) - no ambiguity found,
  no scope expansion made, matching the instruction not to invent a financial model for a case the
  route was never wired for.

**Tests**: `tsc`/`eslint` clean, isolated `npm run build` clean (exit 0, confirmed as a single
non-overlapping run after two earlier builds accidentally raced on `.next` and were discarded as
untrustworthy - same discipline as prior blocks). **The full financial matrix A-M and the
concurrent-completion proof specified in the block could NOT be re-executed this pass** - the DB
outage in §2 began immediately after BLOCK 5.5A.1's own proof of the *original* defect and has not
lifted. **The defect this fix targets was proven live in the previous block** (real HTTP against
this exact route, real `COMPLETED`+`Payout` created in both invalid scenarios) - that evidence is
not repeated here, but this block's fix has not itself been re-run against that same proof script
to confirm the fix actually closes it. **Status: P1-4 = PARTIAL** (the financially-critical fix is
written, believed correct by direct reading and by the same pattern already proven for the sibling
`confirm-arrival-payment` route, but has zero fresh runtime confirmation that it actually blocks
the two proven-bad scenarios).

## 8. Regression against BLOCK 5.2/5.3/5.4

**Not executed this pass** - every one of `test-block52a-concurrency.ts`, `test-block53-lifecycle.ts`,
`test-block54b-concurrency.ts`, `test-block54b-security.ts`, and the P1-4 proof script itself
(`test-block55a1-completion-safety.ts`) requires the same DB connection that is down. None were run.
**Status: NOT MEASURED, not a false PASS.**

## 9. Static/build quality

- `npx tsc --noEmit` — PASS (clean, re-run after every fix).
- `npx eslint` on every touched `.ts`/`.tsx` file — PASS (clean).
- `npm run build` — PASS, one isolated single run (exit 0), after explicitly discarding two earlier
  runs that raced on `.next` concurrently and were not trusted.
- Build passing confirms the code compiles and type-checks correctly; **it does not and cannot
  confirm the P1-4 financial behavior, the P1-1/P1-2 runtime matrices, or the P1-3 visual fix** -
  stated explicitly per the instruction not to treat build as acceptance.

## 10. Cleanup

No new fixtures were created this block (the DB outage prevented creating any). Nothing to clean up.

## 11. Production

Untouched. No migration run. No deployment. Postgres service itself was not restarted, reconfigured,
or had its credentials changed - correctly left for the user's own resolution, per instruction.

## 12. Remaining known debt (carried forward, not re-litigated)

Unchanged from BLOCK 5.5A/5.5A.1's own lists: populated Owner visual audit pending; full Admin
visual audit pending; A-E black/gray classification pending; Header runtime reconfirmation pending;
public visual continuation pending; RU/TG/EN runtime audit pending; accessibility pending;
performance pending; security observation pending; BookingTimeline hydration mismatch; Wizard RU
leakage; Pay-at-check-in escrow-copy mismatch; Russian persisted system chat messages; native
SearchBar date-input issue; green token drift; dark mode not implemented; no owner cancel route; no
NO_SHOW flow; divergent check-in date-window rules across the three booking paths; the newly-found
`home-pr2.css` orphaned-file housekeeping item (§6).

## 13. Exact verdict per P1

```
P1-1 ADMIN BOOKINGS         = PARTIAL (code fix in, zero runtime confirmation - DB outage)
P1-2 REVIEW ELIGIBILITY     = PARTIAL (code fix in, zero runtime confirmation - DB outage)
P1-3 SEARCH HOTELCARD       = PARTIAL (fix in, specificity verified by reading, zero live render - DB outage)
P1-4 COMPLETION/PAYOUT SAFETY = PARTIAL (financially-critical fix in, zero runtime confirmation - DB outage)

BLOCK 5.5B CODE       = COMPLETE (tsc/eslint/build all clean)
BLOCK 5.5B BACKEND    = IMPLEMENTED, NOT RUNTIME-VERIFIED
BLOCK 5.5B BROWSER RUNTIME = NOT EXECUTED (DB outage)
BLOCK 5.5B REGRESSION = NOT MEASURED (DB outage)

BLOCK 5.5B = PARTIAL
```

A code fix without runtime evidence is explicitly not being reported as COMPLETE, per instruction.
The DB outage is a real, externally-caused (shared-Postgres-instance credential conflict from an
unrelated project on this machine) infrastructure blocker, root-caused to the actual Postgres log
line rather than guessed at, and correctly left unresolved by this session rather than remediated
by touching credentials or the service - exactly the STOP condition the instruction anticipated.

`.agent/STATE.md` updated, carrying forward every named pending item. STOP. Not starting BLOCK 5.6.
Awaiting either (a) the user's own resolution of the shared-Postgres credential conflict (this is a
local machine-level conflict between two unrelated projects' database tooling, outside what this
session can safely fix), after which this exact block's runtime matrices should be run before
calling P1-1 through P1-4 anything more than PARTIAL, or (b) the user's explicit acceptance of the
code-level evidence as sufficient to proceed.
