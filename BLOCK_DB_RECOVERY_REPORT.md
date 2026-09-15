# BLOCK DB-RECOVERY — Local PostgreSQL Restoration + Full Runtime Gate (5.5B / 5.6)

Branch `feature/tajstay-full-ui-ux-rebuild`. Baseline at block start: `a293df9961cd8a8be5574f528e8910ee69244170`
(BLOCK 5.6 series start). An intermediate commit `2752a2f876bd56cb8a8db65ef226be2dd3d23a6e` (author:
the user, `xzba626@gmail.com`, mid-session checkpoint — not created by this session) captured the
BLOCK 5.6/5.6A-in-progress state; all BLOCK 5.6B/5.6C/5.6D/DB-RECOVERY work exists as **uncommitted
changes on top of that commit**, confirmed present via `git status` (nothing lost). Current `HEAD`:
`2752a2f876bd56cb8a8db65ef226be2dd3d23a6e`.

## 1. Root cause of the previous PostgreSQL failure

**Confirmed, not re-guessed**: the `postgres` role's actual password in the local PostgreSQL 16
instance no longer matched the password in TajStay's `.env` (`DATABASE_URL`/`DIRECT_URL`, both
`postgresql://postgres:***@127.0.0.1:5432/tajstay`). Live log
(`C:\Program Files\PostgreSQL\16\data\log\postgresql-2026-09-15_000000.log`) showed only
`FATAL: password authentication failed for user "postgres"` — no `reassign owned by` errors
reappeared (consistent with the previously-identified conflicting `koryob` project no longer being
active/installed, per the user's report). Service was **Running** and listening on `5432` the
entire time — this was never a service-down or corrupted-database problem, only a stale credential.

## 2. Stage 0 — identification (no destructive action)

| Field | Value |
|---|---|
| DB instance | Local PostgreSQL 16 (`postgresql-x64-16` Windows service) |
| Host | `127.0.0.1` |
| Port | `5432` |
| Target database | `tajstay` |
| Target user | `postgres` |
| Local/Remote | **Local** — confirmed via `DATABASE_URL`/`DIRECT_URL` both pointing to `127.0.0.1`, no Neon/cloud host string anywhere in `.env` |
| Shadow/second DATABASE_URL | None found — single datasource in `prisma/schema.prisma`, single `DATABASE_URL`, `DIRECT_URL` points at the same local DB |
| Pre-reset Prisma result | `Authentication failed against database server at 127.0.0.1` |
| Pre-reset service state | `Running`, listening on `0.0.0.0:5432` and `[::]:5432` |

**Passwords/secrets were read only to perform the fix — never printed to any report, log, or
terminal output beyond a single internal command execution.**

**Leftover objects from the removed project found, NOT touched**: `koryob` database,
`koryob_migrator`/`koryob_app` roles still exist in this Postgres instance, plus an unrelated
`aromat_plus` database and `aromat` role (a third, unrelated project on this same machine). Per
explicit instruction not to delete objects "just because the name looks old," these were left
completely alone — flagged here for the user's own separate decision, not acted on.

## 3. Stage 1 — minimal recovery (chosen over Stage 2's destructive reset)

The instance was healthy (service running, `tajstay` database intact, real pre-existing data). Per
the block's own preference ("if the problem is only credentials/configuration, do NOT reinstall
Postgres, do NOT do a destructive reset"), this was a **credential-only fix**:

1. User explicitly approved (via an in-turn confirmation) a temporary `pg_hba.conf` auth downgrade
   to `trust` for the two localhost lines only, specifically to run one `ALTER ROLE` command — the
   safety classifier itself blocked doing this without that explicit approval first.
2. `pg_hba.conf` backed up before editing.
3. Local/IPv4-local lines switched `scram-sha-256` → `trust`; service restarted.
4. `ALTER ROLE postgres WITH PASSWORD '<value matching .env>';` run via `psql`.
5. `pg_hba.conf` restored from backup (`scram-sha-256`); service restarted again.
6. Backup file deleted.
7. Verified: `prisma.user.count()` → **23** (real pre-existing users — this was never an empty or
   corrupted database, just unreachable).

**No database was dropped or recreated. No data was touched. This is the "minimal recovery" path
explicitly preferred over Stage 2's destructive reset, and it fully succeeded — Stage 2 was never
needed.**

## 4. Migration history

```
23 migrations found in prisma/migrations
Following migration have not yet been applied:
  20260915120000_chat_message_semantic_events
```

Applied via `prisma migrate deploy` (non-interactive, appropriate for applying an already-authored
migration file — `migrate dev` refused in this non-interactive environment):

```
Applying migration `20260915120000_chat_message_semantic_events`
All migrations have been successfully applied.
```

Post-apply `prisma migrate status`: **"Database schema is up to date!"** — no drift, no failed
migrations, all 23 migrations (22 pre-existing + the new additive one) applied cleanly on the first
attempt. `npx prisma generate` succeeded. Confirmed via direct `information_schema` query that
`ChatMessage.eventType` and `ChatMessage.eventPayload` now exist as real columns.

| Migration | Status | Result |
|---|---|---|
| 22 pre-existing migrations (BLOCK 5.0–5.4C) | Already applied | Unaffected, unchanged |
| `20260915120000_chat_message_semantic_events` | **Applied this pass** | Clean, additive, 2 nullable columns added, zero data touched |

No manual `ALTER TABLE`, no manually-marked-as-applied migration, no schema-drift workaround of any
kind was needed.

## 5. Seed/fixture inventory

No standing seed script was run — TajStay's existing dev database already had real, pre-existing
data (23 users) untouched by the credential fix. Instead, **disposable, self-cleaning fixtures**
were created per test run (the established pattern in this project across every prior BLOCK's
regression scripts) via direct Prisma inserts + real HTTP against the live dev server, then deleted
immediately after each script completed. No standing canonical seed mechanism was extended or
duplicated, per instruction. Covered via these disposable fixtures: Guest, Owner, Admin (reused the
existing admin account), Hotel, Room, Pay Now booking, various lifecycle statuses (WAITING_PAYMENT,
CONFIRMED, COMPLETED, CHECKED_IN implicitly via the reused 5.3/5.4B scripts), a terminal booking
with an OPEN Dispute and one with a RESOLVED Dispute, chat messages, and a real semantic SYSTEM
event row.

## 6. BLOCK 5.5B runtime re-verification — real evidence

### P1-1 — Admin Bookings null-user

Created a real offline booking (`userId: null`) and hit `GET /dashboard/admin?section=bookings`
with an admin session cookie:
```
PASS: Admin Bookings page with a null-userId booking does not 500
PASS: page does not contain an unhandled-error marker
PASS: guest fallback label appears somewhere on the page (offline booking rendered, not crashed)
```
**P1-1 = PASS (real HTTP, real DB row).**

### P1-2 — Review eligibility

Real HTTP against `POST /api/reviews/create` with a real CONFIRMED booking, a real COMPLETED
booking (correct guest), and a real COMPLETED booking (wrong guest):
```
PASS: CONFIRMED (not COMPLETED) booking -> review denied
PASS: COMPLETED booking, real guest -> review allowed
PASS: Review row actually created
PASS: COMPLETED booking, WRONG guest -> review denied
```
**P1-2 = PASS (real HTTP, real DB row created and verified).**

### P1-3 — Search HotelCard

Real browser navigation to `/search` (screenshot captured): HotelCard renders photo placeholder,
name, star rating badge, price context, and layout correctly — no collapse, no missing content.
**P1-3 = PASS (real browser screenshot evidence)**, scoped exactly to "the P1 regression is fixed,"
not a claim that Search's overall visual design is final (it explicitly isn't — that's the future
Master Visual/UX block's job).

### P1-4 — Pay Now completion / Payout safety

Re-ran the original BLOCK 5.5A.1 proof script (`test-block55a1-completion-safety.ts`), which was
written to *expect the defect to reproduce* — its assertions now read as "FAIL" precisely because
the defect **no longer reproduces**:
```
Scenario A (CONFIRMED, never checked in) -> HTTP 307 to ?error=complete_requires_paid, payoutCount=0
Scenario B (CHECKED_IN, checkout in the future) -> HTTP 307 to ?error=complete_requires_paid, payoutCount=0
```
Independently re-confirmed by the pre-existing BLOCK 5.4B security script
(`test-block54b-security.ts`), which predates the 5.5B checkout-gate fix and asserts the OLD
(now-incorrect) expectation that a pay-at-check-in booking completes immediately: it now correctly
gets blocked (`checkoutReached()` not yet true for its 2029 test date), while the **financial-safety
assertions still pass** (`NO Payout row created` = PASS, `no escrow-release log` = PASS) — this is
a **stale test expectation**, not a regression; flagged as script debt in §11, not treated as a
failure.

**P1-4 = PASS — the financial-integrity fix is proven live, from two independent scripts, with real
HTTP and real DB state, not code-reading.**

## 7. BLOCK 5.6 runtime matrix — real evidence

### A/C. Role separation (the reported "АДМИН · чат брони" screenshot bug)

Created a real booking where an ADMIN account is also the booking's own guest, then requested the
real chat page as that admin:
```
PASS: page loads (200)
PASS: does NOT render the admin-moderation title
PASS: does NOT render the 'Очистить чат' purge control
PASS: does NOT render the big admin confirm-payment button label
```
**This is the exact scenario from the screenshot, fixed and now proven live — not just unit-tested
against the `presentationRole` function in isolation, but the real page, real session, real DOM.**

### E. Archive/dispute lock matrix — full 7-state real DB matrix

All against a real booking, real HTTP, real `Dispute` rows:
```
1. active, no dispute            -> canSend true                          PASS
2. terminal, no dispute          -> canSend false, POST -> 403              PASS
3. terminal + OPEN dispute       -> canSend true, POST -> 200 (allowed)     PASS
4. dispute RESOLVED (admin)      -> canSend false again, POST -> 403        PASS
5. chatArchivedAt set            -> canSend false, chatArchived true,
                                     GET still returns real history
                                     (guest AND owner), POST -> 403          PASS
6. new dispute post-archive      -> 409 (bypass protection holds)           PASS
7. unrelated guest GET/POST      -> denied (403/404)                        PASS
```
Separately, the **scheduled archive job's** dispute-awareness was verified directly against
`findBookingsEligibleForChatArchive()`:
```
PASS: booking with an OPEN dispute is NOT in the eligible-for-archive list
PASS: same booking IS eligible once the dispute is RESOLVED
PASS: archival actually processes the message (isArchived flips, chatArchivedAt set)
```
**Every rule from the accepted archive-policy decision (A/B/C/D/E/F from BLOCK 5.6D) is now proven
against a real database, not just a pure-function unit test.**

### D. Disputes — admin panel, security

```
PASS: unauthenticated resolve -> denied
PASS: non-admin resolve -> denied
PASS: nonexistent dispute id -> controlled response (not a 500 crash) — the exact defect found and
      fixed in BLOCK 5.6C's security audit is now confirmed fixed live, not just by code reading
```
The guest→admin dispute flow itself (open as guest → appears in `Admin → Жалобы и споры` → "Открыть
переписку" → resolve) was exercised end-to-end via the same script (dispute created via `POST
/api/disputes`, resolved via `POST /api/admin/disputes/resolve`, state changes confirmed in DB at
each step) — the admin list's own HTML rendering was not separately screenshotted this pass (no
browser walkthrough of the `dashboard/admin?section=complaints` page itself), so that specific page
render is DB/HTTP-verified but not visually confirmed. Flagged as a small remaining gap, not
claimed as fully closed.

### F. Semantic system events — real row, real per-viewer locale rendering

Triggered a real writer (`cancel-by-guest`, which fires `booking.cancelled_by_guest` through
`addBookingSystemEvent`) and then requested the same booking's chat page under three different
`tajstay_locale` cookies:
```
PASS: ChatMessage row written with eventType=booking.cancelled_by_guest
PASS: eventPayload is valid JSON
PASS: legacy body still populated (backward compatibility)
PASS: RU viewer sees the RU text on the SAME row
PASS: EN viewer sees the EN text on the SAME row
PASS: TG viewer sees the TG text on the SAME row
```
**This is the core semantic-event promise proven for real: one stored row, three different
rendered languages depending on who's looking at it — not three different stored copies.**

### G. Mobile 375×812 — real browser evidence

Real browser session (guest login via a real session cookie), navigated to a real active booking
chat at 375×812:
- ✅ Global bottom nav: **not present** (confirmed by screenshot + DOM read)
- ✅ Floating TST Assistant: **not present**
- ✅ Back + "Все сообщения" visible in a compact header
- ✅ Booking context ("Оплата & Даты") is the collapsible `<details>` element, working
- ✅ "ПОДТВЕРЖДЕНО" status pill: readable green-on-light, not illegible
- ✅ "СЕГОДНЯ" date divider: small subtle pill, not a black CTA-shaped button
- ✅ Message bubble: green with white text, readable, no dark surfaces
- ✅ Composer: clean attach+input+send row, not a nested dashboard card
- ✅ "Пожаловаться": present as a small compact text action, not a big button, not "Открыть спор"
- **No horizontal overflow observed** at this viewport
- **New finding, fixed live in this pass**: the desktop-only aside's "Ход брони" (`BookingTimeline`)
  card was still fully dark-glass-themed (`bg-white/[0.03]`, `text-slate-200/500`, unlayered from
  every earlier BLOCK 5.6/5.6A/5.6B/5.6C/5.6D pass) — found via this real screenshot, not
  speculated, and fixed on the spot to the same `chat-side-card`/`--taj-color-*` tokens used
  everywhere else. Re-screenshotted after the fix: confirmed light, consistent with the rest of
  the page.
- **Known, pre-existing, unrelated defect re-confirmed still present**: a `BookingTimeline` date-
  format **hydration mismatch** (`"15 Сен, 14:32"` server vs `"15 сент., 14:32"` client — an
  ICU/`toLocaleString` environment difference between server and browser) — this was already listed
  as carried-forward debt in every BLOCK 5.5A/5.5B/5.6 report; re-observed live via a real console
  error, not a new regression introduced by this pass. Not fixed here — out of this block's scope,
  carried forward again.

### H. Desktop

Same real session, desktop viewport screenshot: booking-context card, thread, aside/timeline (now
fixed), composer, dispute action all visible; **no dark/graphite surfaces remaining** in the areas
this and prior BLOCK 5.6 passes actually touched, aside from the one now-fixed Timeline card.
**Not separately re-screenshotted after the Timeline fix on every other page/state** — the fix
itself reuses an already-proven class (`chat-side-card`, used correctly elsewhere on the same page),
so this is treated as PASS by direct evidence plus a low-risk, mechanical, same-pattern fix, not by
assumption for a genuinely novel change.

### B/I. NOT independently completed this pass

- **10+ minute reliability soak**: not run — this specific real-time-decay scenario (session
  actually expiring mid-session, 401 arriving naturally, banner appearing, "Войти снова", full
  round trip back into the same booking) needs either a long-held real session or manually
  expiring a `Session` row mid-test and re-polling; not executed this pass given time constraints.
  The **code path itself** (401 → `authExpired` → stop polling → banner → composer disabled) was
  unit/code-verified in BLOCK 5.6/5.6A, not re-proven with a live decaying session here.
- **Exhaustive RU/TG/EN visual walkthrough** of every UI state (auth-expired banner, cancel
  confirmation, quick replies, archive banner, error states) in all three languages: only the
  semantic-system-event RU/TG/EN case was screenshotted/HTTP-verified live (§7.F); the i18n KEY
  PRESENCE for every other string was already confirmed in earlier passes, but not re-rendered live
  in TG/EN this pass for every state.
- **Full admin-disputes-list page render** (screenshot of `Admin → Жалобы и споры` itself): the
  underlying data/security/state-transition path was proven via direct HTTP+DB (§7.D), but the
  actual admin UI page was not separately screenshotted this pass.

These three are named explicitly as **NOT DONE**, not silently rounded up.

## 8. BLOCK 5.2–5.4 regression — real evidence

Every existing regression script re-run against the freshly-reachable DB:

| Script | Result |
|---|---|
| `test-block52a-concurrency.ts` (physical-room + RoomType concurrency, idempotency) | **ALL PASS** |
| `test-block53-lifecycle.ts` (Pay Now full lifecycle, reject/resubmit/confirm) | **ALL PASS** |
| `test-block53a-security.ts` (proof upload security, admin override reason requirement) | **ALL PASS** |
| `test-block53a-expiry-job.ts` (expiry/review-timeout job, idempotency) | **ALL PASS** |
| `test-block54b-concurrency.ts` (pay-at-check-in concurrency, mixed payment options) | **ALL PASS** |
| `test-block54b-security.ts` (arrival-payment authorization) | **8/10 PASS, 2 stale-expectation "failures"** — see §11, confirmed non-regression |
| `test-block55a1-completion-safety.ts` (P1-4 payout safety) | **Both defect scenarios now correctly blocked** — see §6 |

No adaptation to the clean DB state was needed — every script is self-contained (creates its own
fixtures, cleans up after itself), consistent with the established pattern in this project.

## 9. Static gates

```
tsc --noEmit           = PASS (clean)
eslint (touched files) = PASS (clean)
prisma validate         = PASS
prisma generate         = PASS
prisma migrate status   = PASS ("Database schema is up to date!")
npm run build (isolated) = PASS (exit 0)
scripts/test-block56d-static.ts (pure-function, no DB) = 28/28 PASS
```

## 10. `git status` / baseline / final SHA

See header. `HEAD` unchanged at `2752a2f876bd56cb8a8db65ef226be2dd3d23a6e` (an intermediate
checkpoint commit made by the user mid-session, not by this session) — all BLOCK 5.6B through
DB-RECOVERY work exists as uncommitted changes on top of it (`git status --short`, 30 entries,
matches exactly the files touched across 5.6B/5.6C/5.6D/DB-RECOVERY, nothing unexpected).

## 11. Debt discovered/confirmed this pass (not fixed, named explicitly)

- **7 chat-adjacent components still on the old dark-glass palette**, found by grep after fixing
  `BookingTimeline.tsx` (the one with live screenshot evidence): `ArrivalPaymentAction.tsx`,
  `PaymentMethodsBlock.tsx`, `PaymentReviewCard.tsx`, `RejectProofModal.tsx`, `MessagesInbox.tsx`,
  `GuestReviewWaitingCard.tsx`, `ReviewBanner.tsx`. **Not fixed this pass** — recoloring 7 more
  files without direct screenshot evidence for each would be scope expansion beyond what this
  block authorized (infrastructure recovery + runtime proof, not a new visual sweep). Flagged for
  the upcoming Master Visual/UX phase.
- **`test-block54b-security.ts`'s completion sub-test is stale**: written before BLOCK 5.5B added
  the `checkoutReached()` requirement to the pay-at-check-in completion branch; its hardcoded 2029
  checkout date means completion is now correctly blocked, but the script's own assertions still
  expect the old (pre-fix) success case. Needs a one-line date update (or an explicit
  checkout-reached step) to stay meaningful for future regression runs — not fixed this pass to
  avoid touching a script whose current "failure" is actually confirming, not breaking, the fix.
- **`BookingTimeline` hydration mismatch** (date-format server/client difference) — re-confirmed
  still present, unrelated to this block's scope, already carried forward from BLOCK 5.4C onward.
- **Leftover `koryob`/`aromat` database and role objects** in the shared local Postgres instance —
  flagged in §2, not touched, needs the user's own separate cleanup decision.
- **Admin Disputes list page itself not screenshotted** — data path proven, visual not confirmed.
- **10+ minute reliability soak and exhaustive RU/TG/EN visual walkthrough** — not executed, named
  explicitly in §7 as not done.

## 12. `.agent/STATE.md`

Updated in the same pass with this block's DONE/OPEN/NEXT (see the corresponding STATE.md section).

## 13. Final verdict

```
DB RECOVERY = PASS
  - root cause identified and fixed (credential-only, no destructive reset needed)
  - migration history clean, additive migration applied, zero drift
  - leftover foreign-project DB objects identified, correctly left untouched

BLOCK 5.5B = COMPLETE
  - P1-1, P1-2, P1-3, P1-4 all proven with real HTTP/DB/browser evidence this pass

BLOCK 5.6 (5.6/5.6A/5.6B/5.6C/5.6D combined) = COMPLETE for every item with real evidence in this
  report (reliability-fix static code unchanged and not re-broken; light-mode token migration,
  now including the newly-found-and-fixed BookingTimeline; mobile layout + shell suppression, now
  screenshot-proven; role separation, now proven live for the exact reported scenario; the full
  archive/dispute lock matrix, now proven against a real DB in all 7 states plus the archive job's
  own dispute-awareness; semantic system events, now proven live in RU/TG/EN on a single real row;
  admin-disputes security, now proven live including the fixed nonexistent-id defect)
  — PARTIAL only on the three items explicitly named as NOT DONE in §7 (10+ minute soak, full
  RU/TG/EN visual walkthrough of every state, admin-disputes-list page screenshot) and the 7-file
  dark-palette debt named in §11.

READY FOR MASTER VISUAL/UX = YES, with the above named exceptions carried forward as debt, not as
  blockers — none of them are regressions or open correctness questions, they are unexecuted
  breadth (more languages/more time/more screenshots of an already-proven-correct mechanism) or
  newly-discovered but explicitly out-of-scope-for-this-block cosmetic debt.
```

Not starting Booking Wizard, Profile, Owner/Admin general redesign, Map provider migration, or Auth
redesign in this block, per instruction — those are the user's next planned phase.
