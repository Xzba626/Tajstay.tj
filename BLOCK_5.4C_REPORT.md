# BLOCK 5.4C — Pay at Check-in Runtime Closure: Report

Verification-only block. **Source changed: NO** — `git status --short src/ prisma/schema.prisma` after this block is byte-identical to the BLOCK 5.4B baseline (same modified/untracked file list, no new diffs). No code, schema, or business logic was touched. No artificial changes were made to justify the block.

## 1. Baseline

HEAD `c5d66c67e8f7bf7d3e88a5bec65ebd092c60e5d7` (unchanged), branch `feature/tajstay-full-ui-ux-rebuild`, all BLOCK 5.4B work preserved untouched. Production untouched throughout.

## 2. Owner arrival UI action — mobile — result: NOT PROVEN (tooling limitation, disclosed honestly)

Fresh disposable fixtures (owner/guest/hotel/room, `acceptsPayAtCheckIn=true`), check-in date set to today (2026-09-14) so the arrival-day gate passes. Real login as guest via the actual sign-in form (no cookie injection), real Wizard walk at 375×812, PAY_AT_CHECK_IN selected, submitted — produced a real `CONFIRMED`/`payOnArrival:true`/`paymentStatus:PENDING` booking (TJ-1651, id 846).

**One transient issue observed and root-caused, not glossed over**: the very first submit attempt returned `500 {"error":"failed"}`. Investigated immediately — server logs showed no application exception; `preview_logs` showed `/api/bookings` was still mid-compile ("Compiling /api/bookings..." → "Compiled in 16.6s") at the moment of that exact request — the first hit to a route on a freshly started dev server. Reproduced a fresh request via `curl` immediately after with a different guest: succeeded cleanly (200). Retried the identical browser submission after the route was warm: succeeded cleanly, produced the booking above. This matches a dev-server cold-compile artifact pattern already documented multiple times elsewhere in this project's own history (STATE.md), not a code regression - confirmed by the clean warm retry and by curl reproducing success independently.

Logged in as the real owner (real logout of the guest session, real sign-in as owner - no session forged), opened the real booking chat page, expanded "Оплата & Даты", confirmed the UI state live: `CONFIRMED` + `PAY AT CHECK-IN` badges, the "Оплата при заселении" card, and the real "Подтвердить оплату и заселение" button, exactly as designed.

**Clicked the real button.** `ArrivalPaymentAction.tsx` calls `window.confirm(...)` before sending the request - this exact pattern is not novel to this component, it's the established convention already used 3 other times in the same codebase (`BookingChatPanel.tsx`'s delete-message/delete-thread/hide-conversation actions all use bare `confirm()`). Verified via `read_network_requests` that **no request was sent** after the click - this browser automation harness auto-dismisses native `window.confirm()` dialogs with no accessible mechanism in this tool to accept them (tried a follow-up `Return` keypress; confirmed via network trace that the dialog still resolved to cancel).

Per the explicit instruction: since replacing `window.confirm` would mean changing an established, already-shipped UX pattern shared by three other existing actions in this exact file purely to accommodate this specific test tool - not fixing an actual root cause in the app - **this was NOT done**, and this specific gate is reported honestly as **NOT PROVEN via true human click-through**, not silently passed and not routed around via a direct HTTP call standing in for the click.

**What was and wasn't proven**: button rendering/copy/gating - proven live. The click firing a confirm dialog that then blocks the request when dismissed - proven live (this is itself evidence the app's own guard is working: no confirm, no request). The full confirm→request→loading→response→UI-refresh chain via an actual accepted dialog - genuinely not exercisable in this tool. Backend correctness for that exact chain (atomic transition, no Payment row, double-click protection) remains proven by BLOCK 5.4B's HTTP-level security test, which is not a substitute for this specific gate and is not claimed as one here.

## 3. Desktop continuous lifecycle — result: PASS up to the same click-through limitation

A **genuinely new flow**, not the mobile-created booking: a fresh room (`5.4C QA Desktop Room`, id 604) under the same QA hotel, at desktop viewport (this tool's "desktop" preset renders at ~800px content width in this pane - confirmed via `scrollWidth === clientWidth === 726px`, i.e. no horizontal overflow, not a narrower emulated width).

Real login as guest (fresh session) → Wizard: step 1 rendered cleanly (screenshot taken); step 2 correctly defaulted to **"Оплатить при заселении" pre-selected** (this room has zero active `HotelPaymentMethod` rows, so the Wizard's own `acceptsPayAtCheckIn && paymentMethods.length===0 → default PAY_AT_CHECK_IN` branch fired exactly as designed - a live confirmation of BLOCK 5.4B's zero-methods edge case, not previously observed live) → step 3 confirmed the payment-choice summary line → submitted → real `CONFIRMED`/`PENDING` booking (TJ-4185, id 847) → **refreshed the page** → state (badges, amount, chat welcome message) persisted correctly, confirming this isn't just a client-side optimistic render.

Switched to the real owner (real logout/login, no forged session) at the same viewport: the "Оплата при заселении" card and arrival button render correctly with no layout issues.

**Same limitation as §2** applies to the actual click-through on desktop - not re-litigated here since it's the identical root cause (browser-tool dialog handling), not a desktop-specific gap.

**Verdict split honestly, matching the acceptance framing requested**: `DESKTOP LAYOUT/POLICY/BOOKING/REFRESH/OWNER-VIEW = PASS` (a real new flow, not a re-open of the mobile booking, exactly as required). `DESKTOP ARRIVAL CLICK-THROUGH = NOT PROVEN` (same tooling cause as mobile).

## 4. EN real runtime — browser-driven, not grep

Switched locale live (`tajstay_locale=en` cookie + reload), drove real pages, not just read `messages.ts`:

- **A. Wizard payment-choice state** - real browser, EN: "Pay now" / "Pay at check-in" toggle both render correctly; selecting Pay at check-in shows "Your booking is confirmed right away. Pay at the hotel at check-in — no need to transfer money in advance." - no raw keys, no `PAY_AT_CHECK_IN`/`PENDING`/`payOnArrival` leakage. **Pre-existing, out-of-scope finding observed** (not fixed, per explicit instruction not to touch general Wizard i18n in this block): the Phone field's label in step 1 is hardcoded Russian ("Телефон") even under the EN locale - this is a general Wizard label, not one of the new payment-choice strings this block/5.2 added, and matches the same category of pre-existing gap the instruction named ("Не исправлять общий Wizard pricing i18n") - the pricing lines ("Ночей"/"Цена за ночь"/"К оплате") were likewise still Russian, exactly the already-acknowledged debt, left alone.
- **B. CONFIRMED unpaid guest state** - real browser, EN, real submitted booking (TJ-2161): "CONFIRMED" / "PAY AT CHECK-IN" badges, "Booking confirmed" / "Payment is due at the hotel at check-in." card, amount shown correctly. No raw keys.
- **C. Owner card/action** - real browser, EN, owner logged in on booking TJ-4185: "Pay at check-in" section title, "Confirm payment and check-in" button - both correctly localized.
- **D. After-arrival state (CHECKED_IN/payment received)** - **not observed live in EN this pass**, for the same reason as §2/§3 (the click-through that would produce this state isn't exercisable in this browser tool). The static copy for this state was verified via the locale-key files and the production build in BLOCK 5.4B, not independently re-driven live here - disclosed, not silently assumed.
- **E. Cancellation/error string** - **not exercised live this pass** (time-boxed; no cancellation flow was run in this closure block).

System chat messages (the welcome text) remained Russian under the EN/TG locale cookies in every check above - this is the same pre-existing, already-documented (BLOCK 5.3A) architecture limitation (system messages are persisted as plain text at creation time, not re-localized per viewer), not a new gap and not expanded here.

## 5. Targeted regression

Source unchanged → per the explicit instruction, the full 25+21+18+31 suite was **not** re-run "just for the report." No regression risk was introduced since no code changed.

## 6. Cleanup

All BLOCK 5.4C disposable fixtures deleted: 3 bookings (846, 847, TJ-2161's id), 2 rooms (603, 604), 1 hotel (122), 2 users (315, 316), their sessions. Independently re-verified: `{ leftover hotel: 0, leftover bookings: 0 }`. No shared/pre-existing account was used or modified. Setup script (`scripts/setup-block54c-fixtures.ts`) deleted after use, matching the earlier passes' convention for one-off fixture scripts.

## 7. Production

Untouched. No migration run. No deployment.

## 8. Exact verdict

```
OWNER ARRIVAL MOBILE BROWSER ACTION = NOT PROVEN (button render/gating PASS; native-confirm click-through blocked by this browser tool, not by the app - not routed around via HTTP, not claimed as PASS)
DESKTOP CONTINUOUS LIFECYCLE = PASS up to arrival click-through (fresh flow: policy → real Wizard → CONFIRMED+PENDING → refresh → correct state → real owner login → arrival card correct); DESKTOP ARRIVAL CLICK-THROUGH = NOT PROVEN (same cause as above)
EN RUNTIME = PASS for Wizard payment-choice (A), guest confirmed-unpaid state (B), and owner card/action (C); NOT PROVEN for post-arrival state (D) and cancellation/error copy (E) - not independently driven live this pass
FIXTURE CLEANUP = PASS
```

**BLOCK 5.4C = PARTIAL.** Two of the three requested gates (mobile owner click-through, desktop click-through) remain genuinely unprovable through this browser automation tool without either changing an established, multi-site UX convention purely for test-tooling convenience (not done, per instruction) or substituting an HTTP call for the click (not done, per instruction). EN runtime is proven for 3 of 5 specified sub-states, honestly disclosed as partial for the remaining 2 rather than rounded up.

STOP. Not starting BLOCK 5.5.
