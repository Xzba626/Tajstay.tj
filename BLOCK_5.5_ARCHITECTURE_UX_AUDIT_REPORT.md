# BLOCK 5.5A — Post-Booking Lifecycle + Full Runtime UI/Visual Audit

PHASE A — audit only. No implementation, no redesign, no fixes applied. Two backend research
passes (Explore agents, read-only) plus a direct real-browser walkthrough (mobile 375×812 +
desktop) by me. Every finding below is evidence-cited (file:line, route, HTTP status, or exact
computed style) — nothing is asserted as "checked"/"looks good" without the underlying evidence.

## 1. Baseline

- Branch: `feature/tajstay-full-ui-ux-rebuild`. HEAD at start: `a293df9961cd8a8be5574f528e8910ee69244170`.
- `git status --short` at start: **clean** — all BLOCK 5.2A–5.4C work had been committed by this
  project's known external auto-commit tool (same pattern already documented in earlier STATE.md
  entries) between the previous session and this one. Nothing was lost; confirmed via `git log`/`git show --stat` on the new HEAD showing every 5.2A–5.4C file present.
- No reset/stash/discard performed. Production and production DB untouched throughout.
- **Environment incident, root-caused, not misattributed to the app**: mid-audit, `http://127.0.0.1:3000`
  started 307-redirecting every route to a `/tg/...` prefix that 404s (`/auth/sign-in` → `/tg/auth/sign-in`,
  `/` → `/tg`, `/search` → `/tg/search`), reproducible even with zero cookies via `curl`. Traced this
  to a **stale/zombie `node.exe` process (PID 15924) still bound to port 3000** from an earlier
  session in this same long-running conversation — this project's own `middleware.ts` and
  `next.config.mjs` were checked directly and contain no `NEXT_LOCALE`/`/tg/` logic at all, no
  `next-intl` dependency exists in `package.json`, confirming the responding process was not this
  project's current source. Killed the stray process, restarted the dev server cleanly, verified
  `/` and `/auth/sign-in` return 200 with correct content immediately after. **This was a session/
  tooling artifact, not an application defect** — recorded here for the record, not counted as a
  finding against the app.

## 2. Post-CONFIRMED booking status map

Full writer/reader trace (Explore agent, HEAD `a293df99...`), all citations from that pass:

| Status | Written by | Notes |
|---|---|---|
| CHECKED_IN (Pay Now) | `owner/bookings/[id]/check-in/route.ts:45`, gated on `status===CONFIRMED`, `!payOnArrival` (line 29-37, BLOCK 5.4B), same-calendar-day only (`isSameLocalDay`, line 39-41). Double-click fails cleanly (already `CHECKED_IN` ≠ `CONFIRMED` → 400, not idempotent-success). Owner-only, cross-owner → 404 via `getBookingForOwner`. |
| CHECKED_IN (Pay at Check-in) | `owner/bookings/[id]/confirm-arrival-payment/route.ts:51-54`, atomic `updateMany` with `payOnArrival:true` + same-day-**or-later** gate (`isSameLocalDayOrLater`, no late cutoff — asymmetric with the Pay Now route's same-day-only rule, see §3). Double-click → `{ok:true, alreadyDone:true}`, not an error. |
| CHECKED_IN (owner-manual/offline) | **A completely separate field**, `Booking.offlineStatus`, never `Booking.status` — `ownerOfflineBooking.ts:184-187`. Owner can set it to any valid enum value **with no state-machine guard at all** (no prior-status check, no date check, no double-click idempotency) — any value, any time. |
| COMPLETED | `admin/bookings/complete/route.ts` — admin-only, **two separate branches**, see §4. |
| CANCELLED / CANCELLED_BY_GUEST | See full matrix, §5. |
| PENDING_OWNER, WAIT_PROOF | Reconfirmed dead (no writer anywhere) — consistent with BLOCK 5.4A's earlier finding, not re-litigated here. |
| NO_SHOW | **Does not exist** — zero matches for `no.?show`/`noshow` anywhere in `src`. |

## 3. Check-in trace — three flows, one real asymmetry found

Pay Now: same-calendar-day-**only** (early AND late rejected). Pay at Check-in: same-day-**or-later**
(no late cutoff at all). Owner-manual: no date check whatsoever. **These are three genuinely
different business rules for "when can check-in happen," not one unified model** — worth a product
decision before any further check-in UX work, not silently unified in an implementation block.

## 4. Checkout/completion trace — real asymmetry found, one genuine bug

`admin/bookings/complete/route.ts`:
- **No `checkOut` date check anywhere in this route**, for either branch. An admin can complete a
  booking before its checkout date has passed — nothing server-side prevents this.
- **Pay-at-check-in branch** (lines 30-41): requires `paymentStatus==="PAID" && status===CHECKED_IN`
  — cannot skip CHECKED_IN.
- **Pay Now branch** (lines 43-73): requires only `paymentStatus==="PAID" && payment?.status==="CAPTURED"`
  — **does NOT require `status===CHECKED_IN`**. A Pay Now booking that was never checked in (guest
  never arrived, or owner never clicked check-in) can still be completed directly by an admin,
  creating a Payout for a stay that, per the system's own records, never had a check-in event.
  **This is a real inconsistency**: the pay-at-check-in branch enforces the natural ordering,
  the Pay Now branch doesn't.
- Payout separation confirmed clean: `if (booking.payOnArrival) {...; return}` early-return before
  the Pay Now/Payout logic — no code path could create a Payout for payOnArrival or skip one for Pay Now.
- No cron/automated completion job exists (`grep` of `src/app/api/jobs/` for `COMPLETED` — zero hits).

## 5. Inventory after CHECKED_IN/COMPLETED — confirmed safe

`OCCUPYING_ONLINE_STATUSES` includes CONFIRMED/CHECKED_IN/COMPLETED unconditionally (no date
cutoff in the constant itself), **but** the Postgres EXCLUDE constraint
(`20260913080000_booking_room_exclusion_constraint`) is `tsrange("checkIn","checkOut",'[)')`-scoped
— a stale CHECKED_IN/COMPLETED row only blocks its own date range, never future dates on the same
room. **Verified by reading the actual constraint SQL, not assumed.** No permanent-blocking risk.
Caveat: nothing ever auto-transitions a stale CHECKED_IN to COMPLETED/CANCELLED — historical rows
persist as-is, cosmetically stale but not an availability bug.

## 6. Cancellation matrix

| Status | Guest (`/cancel`) | Guest (`/cancel-by-guest`) | Owner | Admin |
|---|---|---|---|---|
| WAITING_PAYMENT | DENY | ALLOW | NO ROUTE | ALLOW |
| ON_REVIEW | ALLOW | ALLOW | NO ROUTE | ALLOW |
| CONFIRMED, Pay Now (PAID) | DENY | DENY | NO ROUTE | DENY |
| CONFIRMED, Pay-at-check-in (PENDING) | DENY | **ALLOW** (BLOCK 5.4B exception) | NO ROUTE | **ALLOW** (BLOCK 5.4B exception) |
| CHECKED_IN | DENY | DENY | NO ROUTE | DENY |
| COMPLETED | DENY | DENY | NO ROUTE | DENY |

**No dedicated owner cancel route exists at all** — an owner who wants to cancel a booking on a
guest's behalf has no first-party path; they'd have to ask an admin. Confirmed via `grep`, not
assumed. **No NO_SHOW flow anywhere.** Recorded as findings, not designed here.

## 7. Review architecture — one real, live bug found

`reviews/create/route.ts:66-68`: gate is `status !== "CONFIRMED"` **combined with** `checkOut` already
past. This means: **a review can only be submitted while the booking is still CONFIRMED and the
checkout date has passed** — i.e., only for a guest who was *never checked in*. The moment an owner
performs check-in (→ CHECKED_IN) or a booking is completed (→ COMPLETED), this exact condition
flips and review submission becomes **permanently blocked**, with a message ("Отзыв доступен
только после подтверждения брони владельцем") that reads as if COMPLETED should unlock it — the
opposite of what the code does. **This is a genuine, live logic bug, not a hypothetical.** One
review per booking is correctly enforced at both the app layer and the DB (`Review.bookingId @unique`).
Owner-reply and hotel-page display are genuinely one connected system (not two disconnected ones) —
`getHotelReviewsForDisplay` reads exactly what `reviews/create`/`reviews/reply` write.

## 8. Chat / BookingTimeline — hydration mismatch, exact root cause established

`BookingTimeline.tsx:46-53` calls `new Date(ev.at).toLocaleString(undefined, {month:"short",...})`
— **`undefined` locale**, not the app's own `formatStayDateRange`/`formatDateTimeShort` from
`src/lib/i18n/format.ts` (which already exists and is locale-safe). With `undefined`, the runtime's
*default* locale differs between Node's server-side ICU resolution and the browser's own, producing
two different Russian month-abbreviation strings for the identical `Date` ("14 Сен" vs "14 сент.") —
a genuine, precisely-located bug (this component simply never calls into the shared formatter),
not "probably a locale thing." Not fixed here per instruction.

## 9. Public/guest runtime visual audit — real findings, real root causes

**A. Native `<input type="date">` on the Home search bar (P2, live, screenshot+DOM confirmed)**
`src/components/SearchBar.tsx:54,61` — `<input name="checkIn" type="date" .../>` and the checkOut
equivalent. This is a genuine regression relative to the already-fixed `BookingWizard` (which uses
the custom `LocaleDateInput` component specifically because "real mobile browsers were showing it
empty," per earlier project history) — `SearchBar.tsx` (the Home page's primary search entry point)
never got that same treatment. Confirmed via `read_page`: `textbox "Заезд" type="date"`.

**B. Search results cards render with a fully invisible header block — P1, root-caused exactly**
On `/search` at 375×812, every result card showed only the availability badge + price; the hotel
photo/placeholder, name, city, and rating were completely absent visually (though present in the
DOM/accessibility tree — confirmed via `get_page_text` showing "TajStay Dushanbe Premium" etc. that
never appeared on screen).
- Root cause, confirmed via live computed styles: `.hotel-img-wrap` (the shared image container in
  `HotelCard.tsx:119`) has **zero rendered height** on `/search` (`wrapRect.height: 0`, measured
  live via `getComputedStyle`/`getBoundingClientRect`).
- The only rule that gives `.hotel-img-wrap` a real height is **scoped to `.home-page`**:
  `src/styles/home.css:779-781` — `.home-page .hotel-img-wrap { aspect-ratio: 16 / 9; }`. The
  Search results page has no `.home-page` ancestor class, so this rule never matches there.
- An **unscoped, correct version of the same rule already exists** in
  `src/styles/home-pr2.css:174-177` (`aspect-ratio: 16/10; height: auto !important;`) — but
  `home-pr2.css` is **never imported anywhere** (`grep` across all `.tsx`/`.ts`/`.css` for
  `home-pr2` found only its own file; `globals.css` imports `home.css` at line 8, never `home-pr2.css`).
  This reads as an abandoned/orphaned fix attempt that never got wired in.
- **Net effect**: `HotelCard.tsx`'s standard (non-compact) card variant is broken everywhere except
  the actual Home page — confirmed live on Search; the hotel detail page itself uses a different,
  unaffected hero-image layout and renders correctly (screenshot taken, name/address/price/rating
  all visible). Not checked in this pass: any other page reusing the same non-compact `HotelCard.tsx` variant (e.g. "similar hotels" on the hotel page, if it exists) — flagged as a follow-up check, not assumed clean.

**C. Header notification bell — already fixed, confirmed via code, not re-broken**
The historically-reported bug (bell rendering dark/greenish instead of white) was root-caused by the
Explore agent to an **unlayered** global `button` reset in `globals.css` that used to beat Tailwind's
`text-white` utility regardless of source order (CSS Cascade Layers rule: unlayered beats layered).
At current HEAD, `globals.css:88-93` has already been moved into `@layer base`, with an in-repo
comment documenting exactly this history. **No other unlayered global selector currently matches
this button/svg widely enough to reintroduce the bug.** Confirmed via direct grep, not re-litigated
live in the browser (login friction with a stale local dev-account password consumed time this
pass — see §12; the code-level evidence is unambiguous enough not to need a live re-confirmation for a "known-fixed" item).

## 10. Design-token / color map

Canonical source: `src/styles/variables.css:6-51`. Brand green `#0f7a4d` (matches CLAUDE.md, used
extremely widely and consistently — no competing `#0d7a4d` or similar near-duplicate found).
Canonical dark text `#14231b` (also consistent, no competing dark-navy alternative found — the
"drift" here is redundant redeclaration of the *same* value across 5+ files/~25 call sites in
`globals.css`, not divergent values).

**Real green drift found, distinct from the canonical `#0f7a4d`** — at least 3 other green families
coexist under brand-adjacent variable names, not tokenized together with the canonical one:
- `#065f46`/`#064e3b`/`#022c22` (Tailwind emerald-900/950 range) — `globals.css:366,1227-1229`,
  `mobile-drawer.css:247` — used for gradients/border-images, a visually darker, bluer green than
  the brand's `#0f7a4d`.
- `--green-dim`/`--brand-green-dark: #16a34a` (Tailwind green-600) — `globals.css:1930,1946` —
  aliased under "brand-green" naming despite being a different hex family entirely.
- `--green-glow`/`--brand-green-glow: rgba(34,197,94,...)` (Tailwind green-500) — `globals.css:1931,1948`.
- `.page-backdrop` mixes green-500 and teal-700 rgba values — `globals.css:104-112`.

Top gray/black-scale utility usage by file (`text-black`/`bg-black`/`border-black`/`zinc-*`/`neutral-*`/
`gray-*`/`slate-*`, occurrence count): `tajstay-design-system.css` (36), `BookingChatPanel.tsx` (30),
`globals.css` (27), `BookingWizard.tsx` (24), `owner-command-center.css` (19),
`NotificationBell.tsx` (19), `notifications/page.tsx` (19), `PaymentReviewCard.tsx` (16),
`dashboard/owner/page.tsx` (14). This is raw occurrence count, **not** a defect count — most of
these are legitimate semantic dark text or Tailwind's own gray scale used correctly; a per-site
classification (A-E per the requested taxonomy) was not completed in this pass given time — flagged
as the next audit step before any global CSS rewrite, not skipped silently.

## 11. Dark mode

`[data-theme="dark"]` selectors exist (`globals.css:29-52`) but **re-target the same light-palette
literals** rather than defining a distinct dark palette — e.g. `.text-slate-100/200` forced to
`#14231b` under *both* `[data-theme="dark"]` and `[data-theme="light"]`. No `prefers-color-scheme:
dark` block found. **Conclusion: dark mode is architecturally not implemented — the toggle (if one
exists in UI) currently just re-applies the light palette.** Not built in this phase per instruction;
recorded as current state only.

## 12. Admin — mobile "Бронирования" 500, reproduced and root-caused exactly

**Reproduced live** (real browser, real login, real navigation to `/dashboard/admin?section=bookings`):
HTTP 500, generic error page ("Что-то пошло не так").

Server stack trace (`preview_logs`, level=error):
```
TypeError: Cannot read properties of null (reading 'name')
    at eval (./src/app/dashboard/admin/page.tsx:2582:66)  [compiled line]
    at Array.map (<anonymous>)
    at AdminDashboardPage (./src/app/dashboard/admin/page.tsx:2414:44)
```
Exact source line, confirmed via `grep` of `.name` usages in the Bookings section:
`src/app/dashboard/admin/page.tsx:1005` — `{b.user.name}`, rendered inside a `.map()` over the
booking list with no null guard.

**Confirmed via direct DB query, not assumed**: `prisma.booking.count({ where: { userId: null } })`
→ **2 rows**. These are owner-manual/offline bookings (`source: OWNER_MANUAL`), which legitimately
have `userId: null` since they have no platform guest account (per BLOCK 5.4A's own trace of the
offline flow). `roomId: null` count is 0, ruling out the room/roomType-null hypothesis.

**Exact root cause**: the Admin "Бронирования" list view unconditionally reads `b.user.name`
(and likely `b.room.hotel.name` at line 1010, not exercised by this specific dataset but the same
class of risk) without a null guard, and the dataset now contains offline bookings that were always
expected to have `userId: null` by design — this is not viewport-specific ("mobile Admin Bookings")
despite how it was first reported; it is a **data-shape bug that crashes the page for any admin, on
any device**, the instant at least one offline booking exists. Not fixed in this phase per instruction.

## 13. Owner runtime visual audit — limited pass (time-boxed, disclosed)

Real browser, real login (fresh disposable QA owner), empty-state view only (no hotel/rooms fixture
was built out given remaining time budget for this pass). The empty-state checklist ("Чеклист
запуска", 0/5) and "У вас пока нет объектов" card rendered cleanly: correct brand green, no dark/
gray inconsistency, clear CTA, readable copy, no horizontal overflow. **A populated-dashboard pass
(hotels/bookings/finance/calendar with real data) was NOT completed this session** — recorded as
PARTIAL, not silently assumed clean, and flagged as a concrete next step for whoever does the 5.5A
follow-up or 5.5B scoping.

## 14. Admin runtime visual audit — partial, one real defect found (§12), one credential dead-end

Admin Overview dashboard (`?section=dashboard`, default landing after login) rendered cleanly:
correct donut charts (Отели 13, Пользователи 25, Бронирования 3), correct brand green, RU labels
correct, no visible black/gray inconsistency, no raw keys. Admin "Бронирования" deep view crashes
per §12. **Full admin surface (Users/Hotels/Applications/Payments/Chats/Subscriptions/Content/Logs)
was NOT walked this pass** given the time spent diagnosing (a) the zombie-server routing incident
(§1) and (b) the seeded `admin@tajstay.local` account's password no longer matching the documented
default (401 on the real credentials from `runDevSeed.ts` — consistent with an earlier STATE.md note
that this exact account's password had already been reset once for a prior local test). Worked
around by creating a disposable QA admin account (deleted after use, see §16) rather than guessing
or resetting the shared seeded account's password. **This is recorded as a real, current constraint
on this project's local dev environment** (the documented seed credentials for `admin@tajstay.local`
no longer work), not glossed over.

## 15. RU/TG/EN localization — spot-checked, not exhaustive this pass

Not independently re-driven for Owner/Admin beyond what's in §13/§14 (RU only, since login friction
consumed the time budget that would have gone to locale-switching). The general Wizard i18n debt
(`Телефон`/`Ночей`/`Цена за ночь`/`К оплате` staying Russian under EN) already confirmed live in
BLOCK 5.4C is not re-litigated here. No new localization runtime evidence beyond what's already on
record from 5.4C.

## 16. window.confirm() catalog

Four call sites, all already catalogued precisely by the Explore agent:
`BookingChatPanel.tsx:475` (delete one chat message, admin-only), `:486` (delete entire
conversation+attachments, admin-only), `:498` (hide conversation from all parties, owner-only),
`ArrivalPaymentAction.tsx:19` (confirm arrival payment, owner-only). **Recommendation, not
implementation**: given all four are destructive/state-changing and none are currently reliably
browser-E2E-testable (per BLOCK 5.4C's finding that this environment's automation can't accept
native `confirm()`), a shared `TajStayConfirmDialog` component would fix the E2E-testability gap for
all four at once rather than one at a time — but this is a recommendation for a future block, not
started here.

## 17. Accessibility, performance, security — not independently exercised this pass

Given the time consumed by §1's environment incident and §14's credential dead-end, targeted
accessibility (focus/keyboard/labels), performance (N+1 instrumentation), and security-regression
observation during the runtime walkthrough were **not completed** this pass beyond what's
incidentally covered above (e.g. the admin 500 is itself a functional/P1 issue, not a security one).
Status: **NOT MEASURED**, not a false PASS.

## 18. Cleanup

Two disposable QA accounts created for this audit (`qa-audit-admin@tajstay.local`,
`qa-audit-owner@tajstay.local`) — both deleted after use, confirmed via `deleteMany` returning
count 2. No shared/seeded account was modified. No hotel/room/booking fixtures were created (the
audit used existing seed data throughout). Production untouched.

## 19. Prioritized findings

| # | Finding | Priority | Evidence |
|---|---|---|---|
| 1 | Admin "Бронирования" 500 for any admin, any device, whenever an offline booking exists | **P1** | §12 — reproduced, exact file:line, exact null field confirmed via DB query |
| 2 | Review submission gate is inverted — permanently blocked the moment a booking is actually checked in/completed | **P1** | §7 — exact file:line, exact condition |
| 3 | Search results (and Home-page-only-styled) `HotelCard` renders with zero-height image container off the Home page — hotel name/photo/rating fully invisible | **P1** | §9.B — root-caused to exact CSS scoping bug + orphaned unscoped fix |
| 4 | Pay Now completion has no CHECKED_IN precondition (asymmetric with Pay-at-check-in's own gate) | **P2** | §4 |
| 5 | Three check-in date-window rules (Pay Now/Pay-at-check-in/offline) are genuinely different, not one model | **P2** | §3 |
| 6 | Home search bar uses raw `<input type="date">`, unlike the already-fixed Wizard | **P2** | §9.A |
| 7 | BookingTimeline hydration mismatch — exact root cause (locale-unaware `toLocaleString`) | **P2** | §8 |
| 8 | Brand green drift — 3 non-canonical green families under brand-adjacent variable names | **P2** | §10 |
| 9 | No owner cancel route, no NO_SHOW flow | **P3 (product gap, not a bug)** | §6 |
| 10 | Dark mode architecturally unimplemented (re-applies light palette) | **P3 (documented state, not a defect)** | §11 |
| 11 | Seeded `admin@tajstay.local` password no longer matches documented default | **P2 (dev environment)** | §14 |

**Deferred, explicitly, per instruction — not to be pulled into 5.5B just because they're now known**:
Chat redesign, Owner/Admin full redesign, Profile redesign, global CSS token rewrite, dark-mode
build-out, BookingTimeline fix, Admin-500 fix, window.confirm replacement, general Wizard i18n
(Телефон/Ночей/etc.), escrow-copy mismatch for Pay-at-check-in, review-gate fix. All of these are
findings for the user to sequence into future blocks, **not a recommendation to fix them now.**

## 20. Recommended scope for BLOCK 5.5B (proposal only, not started)

Given the P1 findings are concrete and narrow (not "redesign everything"), a plausible first 5.5B
scope — **pending the user's own sequencing decision, not decided here** — would be exactly the three
P1s (§19 rows 1-3) plus the two-file CSS fix that resolves row 3, since all three are precisely
root-caused, narrowly scoped, and independent of any visual-design-system decision. Rows 4-11 would
naturally wait for a dedicated lifecycle/design-system block per the user's stated intent not to mix
new functionality with accumulated debt.

## 21. Explicit STOP

BLOCK 5.5A = **PARTIAL**, not COMPLETE — named gaps: full Owner populated-dashboard pass, full Admin
surface beyond Overview+Bookings, RU/TG/EN runtime sampling for Owner/Admin, accessibility/
performance/security-regression observation, and the A-E CSS-usage classification requested in §13
of the original spec were not completed this pass, consumed by the zombie-server incident (§1) and
the admin credential dead-end (§14). Everything reported above is real evidence, not filler — the
gaps are named precisely rather than rounded up to a false COMPLETE.

`.agent/STATE.md` updated. STOP. Not starting implementation. Awaiting the user's review and a
separate BLOCK 5.5B (or a continuation of 5.5A to close the named gaps, at the user's discretion).
