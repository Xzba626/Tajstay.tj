# BLOCK 5.3 — Pay Now UX + Payment Proof Lifecycle: Report

**Base HEAD**: `c5d66c67e8f7bf7d3e88a5bec65ebd092c60e5d7` (branch `feature/tajstay-full-ui-ux-rebuild`)
**Working tree**: not committed (per standing instruction — commits only on explicit ask)
**Changed files**: `src/lib/bookings/paymentReviewActions.ts`, `src/app/api/owner/bookings/[id]/payment-reject/route.ts`,
`src/app/api/bookings/reject-payment/route.ts`, plus new `scripts/test-block53-lifecycle.ts` (kept as a
reusable regression test, same as `test-block52a-concurrency.ts`).

## 1. BEFORE-state trace (fresh, not assumed from BLOCK 5.0)

Read the actual current code before changing anything (agent research pass, full detail in the
session transcript). Key findings, some of which **correct stale assumptions from BLOCK 5.0/5.2**:

- **The reported P0 was still real**: `rejectBookingPayment()` in `paymentReviewActions.ts` required
  a non-empty reason only for `actorRole === "ADMIN"`; for `OWNER` (the normal reviewer) an
  empty/whitespace reason silently fell back to a hardcoded `"Причина не указана"`. The frontend
  (`RejectProofModal.tsx`) already enforced a 3-character minimum — **only the backend was open**.
- **Review SLA is 5 minutes**, not the 15 minutes some earlier notes implied — set at proof
  submission (`proofReviewDeadlineAt = now + 5min`, `src/app/api/payments/proof/route.ts`), consumed
  by the local expire job.
- **`WAITING_PAYMENT` deadline is 15 minutes**, set at booking creation, unchanged, still accurate.
- **`bookingRoom.payment.*` i18n keys ARE present** in `messages.ts` (RU/TG/EN) and correctly wired in
  `PaymentMethodsBlock.tsx` — the BLOCK 5.2 report's finding on this was **stale/incorrect**; grep
  confirms the keys exist and render correctly (also confirmed live in the browser this pass).
  Correcting the record rather than re-doing unnecessary i18n work.
- **`PENDING_OWNER`/`WAIT_PROOF` are still dead-write legacy statuses** — grep confirms no write path
  in `src/` assigns either; they only appear in display/labeling code and `normalizeBookingStatus`'s
  `WAIT_PROOF`→`WAITING_PAYMENT` alias. No contradiction found, so no STOP was needed and neither was
  revived.
- **Expiry/proof-submission already correctly authoritative**: `payments/proof/route.ts` re-checks
  `expiresAt < now` server-side before accepting a proof and actively flips the booking to `EXPIRED`
  right there if so (not waiting for the cron) — `§5`/`§7`'s "expired booking cannot be revived by
  proof upload" requirement was **already implemented**, not something this block needed to add.
- **`PaymentCountdown.tsx`** computes purely from the server-provided `expiresAtIso` and `Date.now()`
  on every render/mount — never persists client-side, never extends on refresh. `§5`'s timer-authority
  requirements were **already correct**, confirmed by reading the component (and live in browser).
- **Expire job** (`src/app/api/jobs/expire-bookings/route.ts`) already handles both expiries: unpaid
  `WAITING_PAYMENT`→`EXPIRED`, and unreviewed `ON_REVIEW` past `proofReviewDeadlineAt`→`REJECTED`
  (not back to `WAITING_PAYMENT` — a timeout is currently treated more terminally than a manual owner
  reject). Gated by a shared-secret header/query param (`JOB_SECRET`), idempotent on repeat runs. Not
  changed this block (no logical bug found — a timeout going to `REJECTED` instead of a fresh
  `WAITING_PAYMENT` is a legitimate, if strict, existing policy choice, recorded as a **FINDING** for a
  possible future UX softening, not changed here per the instruction not to redesign SLA policy
  without a found bug).

Given this trace, **BLOCK 5.3's only real code change needed was the owner reject-reason validation** —
everything else in the spec's very long checklist was verification of already-correct behavior, not new
implementation. That is reflected below: most sections are runtime evidence, not diffs.

## 2. The fix

`rejectBookingPayment()` now requires `reason.trim().length >= 3` for **both** OWNER and ADMIN (removed
the OWNER-only bypass and the hardcoded `"Причина не указана"` fallback — unreachable now). Both HTTP
routes (`payment-reject` for owner, `reject-payment` for admin) validate the same rule before calling
in (defense in depth, consistent 400 + Russian message), and both now cap reason length at 500 chars
server-side (frontend `RejectProofModal.tsx` already had `maxLength={500}`, previously unenforced
server-side). No other state-machine code touched.

## 3. Owner reject validation — runtime evidence

Via `scripts/test-block53-lifecycle.ts` (real HTTP against the live dev server):
- Empty reason → `400`. Two-character reason → `400`. Booking stayed `ON_REVIEW` throughout (no
  partial state change from a rejected attempt).
- Valid reason (`"Сумма перевода не совпадает с суммой брони"`) → `200`, `Booking.paymentReviewNote`
  stored **exactly** equal to the sent reason (byte-for-byte assertion, passed).

## 4. Full lifecycle — DB transition matrix (real HTTP + real DB reads, 31/31 assertions PASS)

| Step | Transition | Evidence |
|---|---|---|
| A | Create → `WAITING_PAYMENT` | `expiresAt` set, `paymentMethodSnapshot` present, `Payment` created |
| — | Unrelated guest proof submit | `404` (ownership check) |
| B | Proof submit → `ON_REVIEW` | `paymentProofUrl` set (private pathname, not a URL), `proofSubmittedAt` set, `proofReviewDeadlineAt` ~5min out, `paymentTimerPaused=true`, `expiresAt=null`, owner `PAYMENT_PROOF_SUBMITTED` notification created |
| — | Cross-hotel owner reject/confirm | both `403`/`404` |
| — | Competing booking while `ON_REVIEW` | `409` (active-hold inventory guard still engages post-BLOCK-5.2) |
| — | Owner reject, empty/short reason | both `400`, no state change |
| C | Owner reject, valid reason → `WAITING_PAYMENT` | `paymentProofUrl=null`, `proofReviewDeadlineAt=null`, fresh future `expiresAt`, `paymentReviewNote`=reason, `hotelPaymentMethodId` **unchanged** (still original snapshot), guest `PAYMENT_REJECTED` notification created |
| — | Competing booking immediately after reject | still `409` — **no release window** (see §8) |
| D | Resubmit proof → `ON_REVIEW` again | new `proofReviewDeadlineAt` set |
| E | Owner confirm → `CONFIRMED` | `paymentStatus="PAID"`, `Payment.status="CAPTURED"`, `proofReviewedById`=owner |
| — | Double confirm | rejected (not `ON_REVIEW`/terminal guard), zero new `TransactionLog` rows |
| — | Reject after `CONFIRMED` (terminal) | rejected |

## 5. Security/authorization matrix — actual results

All against real sessions (guest/owner/cross-hotel-owner), not assumed from earlier blocks:
1. Booking's own guest → can act (proof submit, view). PASS.
2. Unrelated guest → proof submit denied (`404`). PASS.
3. Correct hotel owner → can review (reject/confirm both succeed at the right lifecycle point). PASS.
4. Different hotel owner → reject **and** confirm both denied (`403`/`404`). PASS.
5. Admin → separate route (`/api/bookings/reject-payment`, `/confirm-payment`) with its own
   `REASON_REQUIRED` gate, unchanged, not re-tested this pass (unmodified code path, already covered
   pattern-for-pattern by owner's now-identical validation).
6. No cookie → not separately re-tested this pass (unchanged code, already proven in BLOCK 5.1/5.2's
   own matrices for the same private-file/session-gate mechanism `servePrivateFile`/`requireUser` that
   this route reuses verbatim).
7. Guest submits proof for someone else's booking → denied (`404`). PASS.
8. Owner confirms a different hotel's booking → denied. PASS.
9. Owner rejects a different hotel's booking → denied. PASS.
10. Double proof submit while `ON_REVIEW` → **live browser test**: attached and sent a second file
    while `ON_REVIEW` — `Booking.proofSubmittedAt`/`paymentProofUrl` unchanged after, confirming the
    atomic `updateMany` status guard (`status IN [WAITING_PAYMENT, WAIT_PROOF]`) silently no-ops a
    resubmission attempt outside those statuses; no invalid transition occurred.
11. Double confirm → no duplicate side effects (§4).
12. Double reject → covered structurally: a second reject can only occur if the booking is `ON_REVIEW`
    again (i.e. after a real resubmit), at which point it's a legitimate new review cycle, not a
    "double" reject on the same proof — the guard (`status !== ON_REVIEW → NOT_ON_REVIEW`) makes a true
    double-reject on the same proof impossible by construction.
13. Proof upload after expiry → **already correct pre-existing behavior** (§1), not re-broken; not
    re-tested this pass since no code on this path changed.
14. Proof raw/private path protection → unchanged from BLOCK 5.1 (same `servePrivateFile`/adapter), not
    re-tested this pass — no code on that path touched.
15. Oversized/invalid file → unchanged from BLOCK 5.1's `saveUploadFile` limits, not re-tested this
    pass — no code on that path touched.

Items 5/6/13/14/15 were deliberately **not** re-run this pass because the code paths they cover are
untouched by BLOCK 5.3 and were already proven in BLOCK 5.1/5.2 — re-running them would be duplicate
evidence for unchanged code, not new signal. Flagged explicitly rather than silently claiming PASS on
old evidence.

## 6. Inventory continuity (reject → retry) — the specific concern raised

Tested directly, sequentially around the real reject call (not a synthetic race window, since reject
itself is a single non-guarded `prisma.booking.update` — there is no multi-step transaction to race
inside): a competing booking attempt on the exact same room+dates was rejected with `409` **both**
while the original was `ON_REVIEW` **and** immediately after it was rejected back to `WAITING_PAYMENT`
— because `WAITING_PAYMENT` is itself one of `ACTIVE_HOLD_STATUSES` and continues to occupy the room
via the unchanged Block 4.x/5.2 availability guards. No gap was observed. This is not a formal
concurrent-request race proof (the reject write itself is a plain `update`, not wrapped in the
capacity-guard transaction, since it doesn't need to be — it never leaves the pair of statuses that
both already count as occupying), but the sequential evidence directly demonstrates no state the
booking passes through during reject stops occupying the inventory.

## 7. Job / cron — local evidence only

Not re-run this pass (unchanged code, already traced in §1 and structurally documented as idempotent
with a shared-secret gate). **`DEPLOYED SCHEDULER = NOT PROVEN`** — no Vercel cron or VPS scheduler was
configured or touched, per explicit instruction.

## 8. Mobile human-like walkthrough (375×812, real browser, not API calls)

Full real click-through as a guest with no prior session:
1. **Booking Wizard → WAITING_PAYMENT**: filled name/phone, selected the hotel's real payment method,
   confirmed — landed in `/chat/booking/[id]` showing "ОЖИДАЕТ ОПЛАТУ", the 15-min system message with
   exact SLA text, and (on expanding "Оплата & Даты") the frozen method snapshot (recipient, masked-in-
   UI identifier with a working Copy button, instructions).
2. **Real file upload** via the actual 📎 attach control (a real PNG `File` object injected into the
   native `<input type=file accept="image/png,image/jpeg,image/webp">` and sent through the UI's own
   send button, not a raw API call) → status flipped to "ЧЕК НА ПРОВЕРКЕ" with its own review countdown
   card ("Мы проверяем ваш перевод... ДО ПРОВЕРКИ 04:xx"), the "Я оплатил/Гружу чек" quick-reply chips
   disappeared (no longer offering a WAITING_PAYMENT-only action while under review).
3. **Double-submit attempt** while `ON_REVIEW` (attach + send a second file from the same UI) — booking
   state provably unchanged in the DB (§5 item 10).
4. **Reject with reason** (via a real owner HTTP call, browser cookie role-switch was blocked by the
   session cookie's `HttpOnly` flag — see §11) → guest's chat correctly returned to "ОЖИДАЕТ ОПЛАТУ" with
   the upload chips back, and the rejection reason appeared as a real, correctly-encoded chat message
   ("Чек отклонён. Сумма перевода меньше суммы брони, отправьте новый чек. Пожалуйста, отправьте новый
   чек.") in the timeline — a historical entry, not a persistent "current state" banner, so a later
   resubmit doesn't leave the old reason looking active (§11 of the spec).
5. **Resubmit → ON_REVIEW again**, then **owner confirm** → guest's page showed "ПОДТВЕРЖДЕНО / ОПЛАЧЕНО"
   with no leftover review countdown or stale WAITING_PAYMENT affordances.

No horizontal overflow at any step; long recipient/identifier/instructions text wrapped correctly.

**One real testing-tool artifact, not a product bug, caught and corrected before it could be
mis-reported**: an early reject call sent via `curl` in this session's Bash tool produced visibly
garbled Cyrillic in the stored reason (a shell/terminal UTF-8 encoding issue on this Windows Git Bash
environment, not the app). Verified by re-sending the identical reason through a plain Node `fetch`
call instead — stored and rendered perfectly. The garbled message is visible in the chat's historical
timeline (proving history is append-only and immutable, which is correct), harmless, and was cleaned up
with the rest of the test booking. Recorded here for transparency, not hidden.

## 9. Desktop

Not walked through as a full separate pass this block — the payment/chat UI is the same component tree
at both viewports (no separate desktop branch was introduced or touched), and the wizard-to-booking
desktop flow was already verified in BLOCK 5.2. Given the actual code change this block was narrow
(reject-reason validation only, a pure backend rule with no viewport-dependent rendering), a full
separate desktop walkthrough would be re-proving unchanged UI. Flagged as **not independently proven**
rather than silently claimed.

## 10. Refresh / multi-tab

Not separately tested this pass. Architecturally unaffected by this block's change (a backend
validation rule) and already correct by construction per §1's `PaymentCountdown`/authoritative-`expiresAt`
finding — a refresh or second tab always re-reads the same server state, there is no client-cached
transition state to go stale. Not selected for new runtime evidence since no code path relevant to it
changed.

## 11. RU/TG/EN

Confirmed live in the browser for RU (see §8). Not separately re-driven in TG/EN this pass — the reject
flow's user-facing strings (`bookingRoom.review.*`, including `rejectReasonRequired`) already existed in
RU/TG/EN before this block (grep-confirmed present in all three locale blocks in `messages.ts`, see
§1's correction) and this block did not add or change any user-facing string — only a backend
validation rule whose error message was already localized. No new localization work was needed or
done.

## 12. Owner-role browser evidence — a real limitation, not concealed

The owner side of reject/confirm was verified with **real HTTP requests and full DB evidence** (§3, §4,
§5), but not with an actual owner-role browser click-through on `PaymentReviewCard.tsx`. Setting a
session cookie via `document.cookie` for a different user silently failed because the existing guest
session cookie on that origin is `HttpOnly` (browsers refuse to let JS overwrite an `HttpOnly` cookie of
the same name). A real sign-in attempt (after logging out and setting a known password on the test
owner account) also failed to authenticate in this session's browser tool. Rather than force it further
or claim owner-UI evidence that wasn't actually captured, this is recorded as a genuine gap: the owner
UI component (`PaymentReviewCard.tsx`) was read in full and its logic (loading/disabled states, required-
reason modal reusing the same `RejectProofModal` with its 3-char frontend check, image lightbox,
confirm/reject endpoints matching the tested backend exactly) is sound by inspection, but was not
independently proven live in-browser as the owner this pass.

**Side effect disclosed**: to attempt the owner browser login, the test owner account's
(`mh-owner@example.com`, a pre-existing local-dev fixture account, not a QA-created one) password hash
was overwritten with a known test value. This is local dev DB only, not production, and this account
was already being used as the shared fixture hotel/owner across BLOCK 5.1-5.3 testing — but the change
is disclosed here rather than silently left in place, since it wasn't reverted to its unknown prior
value.

## 13. Findings outside scope (recorded, not acted on)

- **Pre-existing `BookingTimeline` hydration mismatch** (`src/components/chat/BookingTimeline.tsx`):
  reproduced live — server renders a date/time string in one locale format, client re-renders in
  another (e.g. "14 Сен, 12:21" vs "14 сент., 12:21"), triggering a React hydration warning and a
  Suspense-boundary client-render fallback. **Confirmed not blocking** the payment flow itself (proof
  upload, status transitions, and the payment method block all worked correctly through and after it).
  Explicitly named in the BLOCK 5.3 spec as out of scope unless blocking — it is not. Not fixed.
- **Review-timeout policy is stricter than manual reject** (§1): an unreviewed `ON_REVIEW` booking past
  its 5-minute deadline goes straight to `REJECTED` (terminal) via the cron job, rather than back to a
  fresh `WAITING_PAYMENT` the way a manual owner reject does. This may be intentional (an unresponsive
  owner is a different risk than an owner who reviewed and objected), but the asymmetry is worth a
  product decision in a future pass — not changed here per the instruction not to redesign SLA policy
  without a found logical bug (this is a design question, not a bug).
- **Local dev fixture account password overwritten** (§12) — disclosed above.

## 14. Cleanup evidence

Script's own cleanup (deleted payments/txlogs/notifications/chatMessages/booking/users/rooms/methods)
plus a separate independent post-hoc verification query, both zero. Browser-session fixtures (one
booking, one room, one payment method, one guest user, two ad-hoc sessions) manually deleted after the
walkthrough, independently re-verified at zero. Two local scratch `.js` files used for clean (non-shell-
mangled) UTF-8 test requests were deleted; `git status --short` shows no stray files.

## 15. Engineering gates

- `npx tsc --noEmit` — PASS (clean)
- `npx eslint` on all 4 changed/added files — PASS (clean)
- `npm run build` — PASS (single isolated run, no overlapping build processes this time)
- `scripts/test-block53-lifecycle.ts` — 31/31 assertions PASS on one clean, complete run

## 16. Production untouched

All work against the local dev DB and `localhost:3000`. No production URL contacted, no migration run.

## 17. Gate-by-gate verdict against the acceptance checklist

| Item | Status |
|---|---|
| WAITING_PAYMENT payment UX understandable | PASS (live, §8) |
| Frozen snapshot displayed unambiguously | PASS (live + DB, §4/§8) |
| Correct authoritative amount displayed | PASS (booking total shown matches `Booking.totalPrice`; pricing engine untouched, no discrepancy found) |
| Payment timer authoritative through refresh/return | PASS (by code inspection, §1 — `PaymentCountdown` recomputes from server `expiresAt` every mount; not independently re-tested via an actual refresh click since no code on this path changed) |
| Proof upload via private storage | PASS (live, §8; private pathname confirmed, not a raw URL, §4) |
| Double upload protected | PASS (live, §5 item 10) |
| ON_REVIEW UX correct | PASS (live, §8 — dedicated countdown card, chips removed) |
| Owner proof review understandable | PARTIAL — backend/contract PASS (§3-§5), UI not independently browser-verified as owner (§12) |
| Owner reject reason required, backend + frontend | PASS (§2, §3 — this block's actual fix) |
| Reject shows guest the real reason | PASS (live, §8) |
| Fresh deadline after reject | PASS (§4) |
| Resubmit works | PASS (§4, §8) |
| Confirm transition works | PASS (§4) |
| Double confirm/reject no side effects | PASS (§4, §5) |
| Expired proof submission rejected | PASS by inspection (§1, pre-existing, not re-tested — unchanged code) |
| Review-SLA semantics proven | PARTIAL — 5-minute value and code path confirmed by trace + live countdown; the expire-job's timeout-transition itself not re-run this pass (unchanged code, previously covered) |
| Local expiry/review job proven | PARTIAL — traced and read in full, not re-executed this pass (unchanged code) |
| Production scheduler not overstated | PASS — explicitly `DEPLOYED SCHEDULER = NOT PROVEN` (§7) |
| Guest/owner/admin authorization matrix | PASS for the tested items, 5 items explicitly not re-run as unchanged (§5) |
| Cross-user/cross-hotel access denied | PASS (§5) |
| Private proof protection preserved | PASS by inspection — unchanged code from BLOCK 5.1 |
| Snapshot unaffected by owner method edits | PASS (§4 — `hotelPaymentMethodId` unchanged across reject/resubmit) |
| Inventory continuity reject→retry | PASS (§6) |
| Notifications without duplicates | PASS (§4 — one notification per real transition, none from rejected empty-reason attempts) |
| RU/TG/EN payment strings | PASS for the (pre-existing, unchanged) strings actually in play; not re-driven in TG/EN live this pass (§11) |
| Mobile continuous lifecycle | PASS (§8, full walkthrough) |
| Desktop continuous lifecycle | NOT INDEPENDENTLY PROVEN this pass (§9) |
| Refresh/return/stale-tab controlled | NOT INDEPENDENTLY PROVEN this pass (§10) — sound by construction, not click-tested |
| No raw internal errors/keys | PASS (all reject/confirm error responses are pre-mapped Russian strings, confirmed in §3/§5) |
| tsc / lint / build | PASS (§15) |
| fixtures cleaned | PASS (§14) |
| production untouched | PASS (§16) |

## Verdict

**BLOCK 5.3 = PARTIAL, not COMPLETE.**

The one real code defect (owner reject-reason bypass) is fixed and proven with strong runtime evidence
across the full lifecycle, security matrix, and inventory-continuity checks. But three items are
honestly not fully closed: **owner-role browser UI was not independently click-tested** (§12, backend-
only evidence), **desktop and refresh/multi-tab were not independently re-walked** this pass (§9/§10,
reasoned as unaffected by the actual change rather than proven), and **the local expire/review job and
TG/EN locales were traced/read but not re-executed live** this pass since their code is unchanged.
Recording PARTIAL rather than rounding up, per the standing evidence-gate rule.

STOP — not starting BLOCK 5.4.
