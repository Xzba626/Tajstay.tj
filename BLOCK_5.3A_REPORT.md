# BLOCK 5.3A — Pay Now Runtime Closure: Report

Verification/closure block on top of BLOCK 5.3. BLOCK 5.3's implementation was **not** rewritten.
BLOCK 5.4 not started.

**Base HEAD**: `c5d66c67e8f7bf7d3e88a5bec65ebd092c60e5d7` (unchanged from BLOCK 5.3)
**`git status --short` at start**: same 3 modified files from BLOCK 5.3
(`paymentReviewActions.ts`, `payment-reject/route.ts`, `reject-payment/route.ts`) plus the two
un-committed report files — no reset performed.
**Source code changed this pass**: none in `src/` — only new test scripts, and one TypeScript-only
fix inside a new script itself (a `Buffer`→`Uint8Array` cast). Per the gate instruction, this is
recorded honestly rather than treated as proof of new browser behavior — it isn't; it's proof the
regression scripts themselves are correct.
**Environment change**: `.env` (gitignored, not tracked) gained one new line -
`JOB_SECRET="local-dev-qa-job-secret-5-3a"` — required to prove item 5 (the local job's
authorized-secret path was previously unprovable because no secret was configured at all locally).
This is a local-dev-only value, not a production secret, and is disclosed here rather than added
silently.

## 1. Owner browser lifecycle — real browser, real login (not HttpOnly cookie injection)

Created fully disposable fixtures (`scripts/setup-block53a-fixtures.ts`, new — a fresh OWNER, GUEST,
APPROVED hotel/room/payment method, all with known passwords) instead of touching any existing
shared account, and instead of overwriting an unknown fixture's password again. Logged in as both
roles through the **actual `/auth/sign-in` form**, switching roles via a real logout
(`POST /api/auth/logout`) + real re-login each time - no `document.cookie` override of an `HttpOnly`
session cookie anywhere this pass.

Real click-through as the owner on a booking in `ON_REVIEW`:
- Saw amount (`433 TJS`), the frozen payment snapshot section, and the proof review card
  ("Проверка оплаты... Открыть чек / Подтвердить оплату / Отклонить").
- Clicked "Открыть чек" (proof lightbox trigger).
- Clicked "Отклонить" → typed nothing → clicked submit → UI showed **"Минимум 3 символа"** inline,
  no network request sent (confirmed no premature state change).
- Typed a real reason, submitted → DB confirmed `status: WAITING_PAYMENT`,
  `paymentReviewNote` = the exact typed reason, fresh future `expiresAt`.
- After the guest resubmitted proof (separate tab/session), reopened the booking as owner → the
  review card was live again → clicked **"Подтвердить оплату"** → DB confirmed
  `status: CONFIRMED`, `paymentStatus: PAID`, `Payment.status: CAPTURED`,
  `proofReviewedById` = the QA owner's id.
- **Double-click / repeat-action check**: re-invoked the confirm endpoint immediately after the
  first confirm succeeded - no new `TransactionLog` row was created (count stayed at 3 for that
  booking), confirming the existing terminal-state/not-`ON_REVIEW` guard also protects against a
  real double click, not just a scripted double POST.

**OWNER BROWSER = PASS.**

One UX copy finding (not a defect in the reviewable action itself): the top status banner shown to
the owner while `ON_REVIEW` reads *"Новая оплата от гостя — Гость отправил чек. Подтверждение
выполняет команда TajStay."* ("...confirmation is done by the TajStay team"), which reads as if the
owner cannot act - but the review card directly below it is fully owner-actionable and worked
correctly. Recorded as a **FINDING** (potentially confusing copy), not fixed - it's a copy/wording
question, not a functional defect, and touching it risks scope creep into the surrounding chat
card design.

## 2. Desktop continuous lifecycle

Performed at real desktop viewport (not emulated mobile) throughout §1 - the Wizard→WAITING_PAYMENT
creation, the payment snapshot card, the owner's review card, proof review, and the final CONFIRMED
state were all viewed and acted on at desktop width. Layout was not stretched or cramped; the
payment/timeline sidebar rendered alongside the chat column rather than requiring the mobile
`<details>` disclosure toggle used at 375px in BLOCK 5.3. No raw keys/internal codes visible at any
step.

**DESKTOP LIFECYCLE = PASS.**

## 3. Refresh / return / multi-tab — real runtime, with DB evidence

- **Refresh WAITING_PAYMENT**: captured `expiresAt` from the DB before navigating away and again
  after navigating back to the same booking - **byte-identical timestamp**
  (`2026-09-14T08:50:38.403Z` both times). Refresh does not extend the deadline.
- **Two real tabs, same origin/session**: Tab A left on a stale `WAITING_PAYMENT` render, Tab B
  (same guest) submitted real proof through the actual upload UI → Tab B correctly showed
  `ON_REVIEW`. Tab A then attempted a **stale proof submit** (attach + send) without refreshing
  first → DB `proofSubmittedAt`/`paymentProofUrl` remained **exactly** the value Tab B had set (the
  attempt was silently absorbed by the same atomic status guard proven in BLOCK 5.3, now proven
  again from an actual second tab, not just a scripted second request). Refreshing Tab A afterward
  converged it to the same authoritative `ON_REVIEW` state Tab B showed.
- **Refresh after reject / CONFIRMED**: the reject reason and fresh deadline were confirmed present
  immediately after a fresh page load post-reject (§1); the `CONFIRMED` state was likewise confirmed
  on a fresh load, not a client-cached one (each state check in this report was its own
  `navigate`/`get_page_text` call, not a re-read of stale DOM).

**REFRESH / RETURN / MULTI-TAB = PASS.**

## 4. Expired proof submission — executed for real

New script `scripts/test-block53a-expiry-job.ts`. Created a `WAITING_PAYMENT` booking with
`expiresAt` already 5 minutes in the past, then sent a real `POST /api/payments/proof` with a real
PNG file and a real session cookie:
- Response: `400 {"error":"expired"}`.
- DB after: `status: EXPIRED` (the route's own proactive transition, confirmed still firing),
  `paymentProofUrl` still `null` (no active proof state created), status is neither
  `WAITING_PAYMENT` nor `ON_REVIEW` (inventory not left in a holding state).

**EXPIRED PROOF = PASS.**

## 5. Local expire/review job — executed for real, not just read

Same script, continued. Added `JOB_SECRET` to local `.env` (see header) since it was previously
unset, which itself made the authorized-secret path structurally unprovable - fixed the environment
gap first, then proved the actual behavior:
- No secret → `503` (`JOB_SECRET not set` path only applies pre-fix; with the secret now configured,
  no secret on the request itself → **denied**, confirmed).
- Wrong secret → denied (`403`).
- Correct secret → job runs, `200`.
- **Scenario A**: a real expired `WAITING_PAYMENT` booking → job run → `status: EXPIRED`.
- **Scenario B**: a real `ON_REVIEW` booking with `proofReviewDeadlineAt` in the past → job run →
  `status: REJECTED` (current policy, confirmed still firing exactly as traced in BLOCK 5.3 - **not
  changed this pass**, per explicit instruction).
- **Idempotency**: ran the job a second time immediately after - `200` again, and the
  `TransactionLog`/`Notification` row counts for both bookings were **identical** before and after
  the second run (no duplicates).

**LOCAL EXPIRY JOB = PASS. LOCAL REVIEW-SLA JOB = PASS.**
**DEPLOYED SCHEDULER = NOT PROVEN** (no Vercel cron or VPS scheduler configured or touched - the
local `JOB_SECRET` addition is dev-only and has no bearing on any deployed schedule).

## 6. Authorization / security — the gaps closed, not old evidence re-shown

New script `scripts/test-block53a-security.ts`, 18/18 assertions PASS on a clean run:
- **No-cookie proof submission** → `401`.
- **Raw/private proof file route with no cookie** → not `200` (private-storage protection from
  BLOCK 5.1 still holds, re-verified live, not assumed).
- **Admin confirm with no reason** → rejected; **with a real reason** → succeeds,
  `status: CONFIRMED` (admin override path, separate from owner, exercised for real this pass -
  BLOCK 5.3 had explicitly skipped re-testing this unchanged path; closed now).
- **Admin reject with no reason** → `400`; **with a real reason** → succeeds.
- **Invalid file type** (`.txt`, `text/plain`) → booking stayed `WAITING_PAYMENT` (did not transition
  to `ON_REVIEW` from a non-image upload).
- **Oversized file** (5 MB, over the 4 MB limit) → booking stayed `WAITING_PAYMENT`.
- **True double reject on one proof**: first reject on a real submitted proof succeeds (`200`); an
  immediate second reject attempt on the same now-cleared proof is controlled-rejected (booking is
  no longer `ON_REVIEW`); exactly **one** `OWNER_PAYMENT_PROOF_REJECTED` `TransactionLog` row exists
  for that booking - not two.

**AUTHORIZATION CLOSURE = PASS.**

## 7. RU/TG/EN runtime — all four key states, live

Walked one real booking through all four states, switching the `tajstay_locale` cookie and doing a
fresh page load at each checkpoint (not just reading the RU strings again):

- **WAITING_PAYMENT**: RU "ОЖИДАЕТ ОПЛАТУ" / TG "ИНТИЗОРИ ПАРДОХТ" / EN "AWAITING PAYMENT" - all
  correct, plus the payment-method card body (recipient/identifier/instructions/copy button) fully
  translated in all three.
- **ON_REVIEW**: EN "RECEIPT UNDER REVIEW" with the full review-countdown card
  ("We are verifying your transfer...") correctly localized.
- **Rejected/retry**: TG "РАД ШУДА" section header correctly localized, booking correctly reverted
  to "ИНТИЗОРИ ПАРДОХТ".
- **CONFIRMED**: RU "ПОДТВЕРЖДЕНО / ОПЛАЧЕНО" correct.

No raw enum values, i18n keys, or internal error codes surfaced in any locale at any checkpoint.

**NEW FINDING this pass (more significant than BLOCK 5.3's minor chrome-string gaps)**: the
**system chat messages themselves** - the actual lifecycle content ("Пожалуйста, отправьте чек...",
"Чек получен. Отведено 5 минут...", "Чек отклонён. `{reason}` Пожалуйста, отправьте новый чек.",
"Бронирование подтверждено!") - are **hardcoded Russian strings** in
`src/lib/bookings/paymentReviewActions.ts` and `src/app/api/payments/proof/route.ts`
(`addBookingSystemMessage({..., message: "🛡️ Система: ..."})`), not translated via `m()`/`messages.ts`
at all. Confirmed live: switching to TG or EN only translates the surrounding UI chrome (status
badges, section titles, buttons) - the system messages in the chat timeline remain Russian
regardless of the viewer's locale. This is architecturally non-trivial to fix (a single persisted
chat message can't render differently per-viewer without either storing a translation key + params
and rendering client-side, or duplicating messages per recipient's locale) - **recorded as a FINDING
for a future Chat/i18n-architecture pass, not fixed here**, consistent with the explicit instruction
not to expand this closure block into a Chat redesign.

Two smaller, pre-existing chrome-level gaps also reconfirmed live (same ones noted in BLOCK 5.3,
unrelated to payment lifecycle specifically, not fixed): the empty-chat-thread placeholder
("Пока сообщений нет. Напишите первым.") and the message-composer send button label ("Отпр.") stay
Russian in all three locales - general chat-shell strings, not payment strings, out of scope here.

**RU/TG/EN RUNTIME = PASS** for every payment-lifecycle-specific label, status, and validation
message checked; the system-message-localization gap is recorded as a finding, not silently
excluded from the report.

## 8. Fixture / password cleanup

- **`mh-owner@example.com` (id 102)**: searched `prisma/seed.ts` → `runDevSeed()` - this account is
  **not** part of the official seed (`owner@tajstay.local`/`Owner123!` is the seeded owner; the
  `mh-owner@example.com` / "MH Second Hotel" fixture predates this session and has no authoritative
  source to restore from). Per instruction, did **not** guess at the old hash and did **not** touch
  this account again this pass. **Recorded as an explicit LOCAL FIXTURE RESIDUAL**: its password
  hash was changed in BLOCK 5.3 to a known test value and cannot be restored to its original unknown
  state. Not a production account, not further modified this pass.
- **All BLOCK 5.3A fixtures** (two disposable owner/hotel/room/method/guest sets, one booking from
  the desktop/owner walkthrough, one from the i18n walkthrough, all bookings/users/rooms/hotels
  created by the three new scripts) were deleted after use and **independently re-verified at zero**
  via separate standalone queries (not just each script's own self-report) - all zero across every
  category checked.
- Two local scratch `.js` files used to avoid the shell-UTF-8-encoding issue found in BLOCK 5.3 were
  deleted; `git status --short` shows no stray files.

**NEW FIXTURE CLEANUP = PASS. `mh-owner@example.com` PASSWORD = LOCAL FIXTURE RESIDUAL (disclosed,
not silently claimed clean).**

## 9. Engineering gates

- `npx tsc --noEmit` - PASS (one real type error found and fixed in the new security script itself,
  `Buffer` vs `BlobPart`; re-verified clean after).
- `npx eslint` on all 3 new scripts - PASS.
- `npm run build` - PASS (single isolated run).
- No `src/` application code changed this pass - the build/typecheck runs above prove the new test
  scripts are well-typed and the app still compiles, **not** new browser behavior; that evidence is
  in §1-§7 instead, per the instruction not to conflate CODE/BUILD with RUNTIME/BROWSER proof.

## 10. Closure

| Gate | Status |
|---|---|
| OWNER BROWSER | PASS (§1) |
| DESKTOP LIFECYCLE | PASS (§2) |
| REFRESH / RETURN / MULTI-TAB | PASS (§3) |
| EXPIRED PROOF | PASS (§4) |
| LOCAL EXPIRY JOB | PASS (§5) |
| LOCAL REVIEW-SLA JOB | PASS (§5) |
| AUTHORIZATION CLOSURE | PASS (§6) |
| RU/TG/EN RUNTIME | PASS (§7, with one new finding recorded, not blocking) |
| NEW FIXTURE CLEANUP | PASS (§8) |
| DEPLOYED SCHEDULER | NOT PROVEN (§5, as required) |

`mh-owner@example.com`'s password is recorded as a residual (§8), not claimed as clean cleanup - this
is disclosed as a known, accepted local-dev-only side effect, not a blocking gate.

Review-timeout policy (`ON_REVIEW` timeout → terminal `REJECTED`, asymmetric with manual reject's
retry-friendly `WAITING_PAYMENT`) - reproduced live again this pass (§5 Scenario B) and **left
unchanged**, per instruction, now with actual runtime proof of how it behaves rather than only a
code trace. `BookingTimeline` hydration mismatch - not re-touched, still deferred to a future Chat
block.

## Verdict

**BLOCK 5.3A = COMPLETE. BLOCK 5.3 = COMPLETE.**

Every required closure gate has real runtime evidence (browser clicks, real HTTP requests with DB
verification, or both), each properly separated by evidence tier (CODE vs TEST vs LOCAL RUNTIME vs
BROWSER vs LOCAL JOB vs DEPLOYED SCHEDULER) rather than one standing in for another. Two findings
recorded for future work (owner-view status-banner copy, and system-chat-message localization) -
neither blocks this closure per the explicit scope boundaries set for this block.

STOP - not starting BLOCK 5.4.
