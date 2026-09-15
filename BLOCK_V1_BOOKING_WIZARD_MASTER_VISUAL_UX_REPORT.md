# BLOCK V1 — Booking Wizard: Master Visual/UX Rebuild

## 1. Baseline SHA
`9cba7c5db0b7ac3c7e7ae2323cb4cc2cda8d4f10` on `feature/tajstay-full-ui-ux-rebuild`. Confirmed clean
working tree before starting, per the block's own required pre-check.

## 2. Final SHA / working tree
`HEAD` unchanged at `9cba7c5db0b7ac3c7e7ae2323cb4cc2cda8d4f10` — this block's work is **not
committed** (per your own instruction to keep the visual diff separate from the closed
architecture baseline; commit is left for your review first). `git status --short`:
```
 M scripts/test-block54b-security.ts
 M src/app/booking/page.tsx
 M src/constants/app-navigation.ts
 M src/lib/i18n/messages.ts
 M src/processes/checkout/BookingWizard.tsx
```

## 3. Files changed
- `src/app/booking/page.tsx` — light header card, removed the separate always-static `<CheckoutSteps
  activeStep={0}>`, now passes step-label/i18n props down to the wizard, added `errorMessages` map
  (server-resolved `m(locale, ...)` for every `/api/bookings` error code).
- `src/processes/checkout/BookingWizard.tsx` — the entire visual/UX rebuild (see §5 below).
- `src/constants/app-navigation.ts` — added `/booking` to `SHELL_HIDDEN_PREFIXES`.
- `src/lib/i18n/messages.ts` — added `checkout.backToRooms` (RU/TG/EN).
- `scripts/test-block54b-security.ts` — fixed the stale 2029-checkout-date regression (§12,
  carried-forward debt from BLOCK DB-RECOVERY).

`src/processes/checkout/CheckoutSteps.tsx` — **unchanged**, its existing `--taj-*` token-based CSS
was already correct; the bug was that it was never fed the wizard's live step, not that its own
styling was wrong.

## 4. BEFORE audit (§1 of the block spec)

Full inventory delivered by a background audit pass before any code was touched — every claim
below cites the exact pre-existing line, not a guess:

- Header card (`booking/page.tsx:103-119`, before): hardcoded dark gradient
  (`linear-gradient(145deg, rgba(15,23,42,0.92)...)`, `text-white`, `text-slate-300/95`,
  `text-[#d1fae5]/85`) — no light-mode branch existed at all.
- Stepper text (`BookingWizard.tsx:280-282`, before): `text-[#d1fae5]/70` at 11px — a pale mint
  green meant for a dark background, the reported near-invisible "1/3–3/3".
- Account card title (`BookingWizard.tsx:296`, before): `text-[#d1fae5]/85` — the reported
  near-invisible "ВАШ АККАУНТ".
- Summary card (`BookingWizard.tsx:403-416`, before): `bg-white/5` + `text-slate-300`/
  `text-slate-100`, **and** raw Russian string literals ("Ночей", "Цена за ночь", "К оплате") not
  wrapped in `m(locale, ...)` at all — this was the EN-leakage bug's exact root, not a stale build.
- Payment-option selector (`BookingWizard.tsx:419-438`, before): `bg-white/5`, inactive state
  `text-slate-300` — low contrast, not the "two black cards" the user described from screenshots,
  but confirmed low-contrast on a light background either way.
- Payment-method list (`BookingWizard.tsx:461`, before): unselected card literally
  `bg-black/20` — the actual black card.
- Step 3 escrow card (`BookingWizard.tsx:522-540`, before): rendered **unconditionally**, even for
  Pay-at-check-in, where the "escrow protection... paid only after check-in" claim is factually
  false (TajStay never holds any money in that flow) — a real backend-truth violation, not just a
  color problem.
- `CheckoutSteps` decorative bar (`booking/page.tsx:121-124`, before): `activeStep={0}` hardcoded —
  never reflected the wizard's actual step, a second, silently-broken progress indicator running
  alongside the real one.
- `/booking` was missing from `SHELL_HIDDEN_PREFIXES` (`app-navigation.ts`, before) — floating
  assistant and bottom nav both rendered unhidden on the wizard route.
- Six further raw Russian literals found and fixed: guest-name/email/phone field *labels* (as
  opposed to their already-localized placeholders), the "Вернуться к номерам" recovery link, the
  generic submit-error fallback string, and the entire `mapBookingApiError` table (11 hardcoded
  Russian error messages, `locale` parameter accepted but never used).

## 5. Root cause + fix, per defect

| Defect | Root cause | Fix |
|---|---|---|
| Black/graphite header | Inline dark gradient, no token used | Replaced with `--taj-color-bg-card-solid`/`--taj-color-border`/`--taj-color-text*` — same pattern already proven correct elsewhere in the app (chat panel, admin cards) |
| Invisible step counter | `#d1fae5` pale-mint at low opacity | `--taj-color-text-muted` |
| Invisible "ВАШ АККАУНТ" | Same pale-mint pattern | `#0f7a4d` solid brand green on a light green card — readable, on-brand |
| Illegible summary card + EN leak | Dark-glass card + raw RU strings | `--taj-color-*` tokens + `labels.nights`/`labels.pricePerNightLabel`/`labels.totalCharge`, all resolved server-side via `m(locale, ...)` |
| Black payment-method card | `bg-black/20` | `--taj-color-bg-card-solid` / `--taj-color-border` |
| False escrow claim for Pay-at-check-in | Escrow card rendered unconditionally | Now conditional on `!isPayAtCheckIn`; the Pay-at-check-in branch reuses the same accurate `payAtCheckInExplain` copy already used and vetted on step 2 — no new copy invented |
| Stepper never advanced | `CheckoutSteps` rendered server-side with a hardcoded `activeStep={0}`, wizard's live `step` state lived client-side only | Moved `<CheckoutSteps>` into `BookingWizard.tsx` itself, now driven by `activeStep={step - 1}` — one true source of progress, not two |
| Assistant/bottom-nav overlap | `/booking` missing from the existing `SHELL_HIDDEN_PREFIXES` shell-suppression mechanism (already built and proven for `/chat/booking` in BLOCK 5.6A) | Added `/booking` to the same list — route-scoped, zero new mechanism |
| Remaining raw-RU field labels / recovery link / error table | Never wrapped in `m(locale, ...)` | All now resolve through existing i18n keys (`checkout.guestNamePh`, `phonePh`, etc.) or the new `checkout.backToRooms` key; `mapBookingApiError` rewritten to take a server-resolved `errorMessages` map instead of hardcoding any language |

## 6. Design decisions

- **No new color palette invented.** Every fix reuses `--taj-color-*` tokens already defined and
  already correct elsewhere in the app (confirmed via the chat-panel token migration in BLOCK
  5.6/5.6A), or the canonical `#0f7a4d`/`#14231b` brand values already used throughout the wizard's
  *correct* spots (e.g. the confirm button was already `#0f7a4d`, just via a redundant gradient).
- **The outer `Card`/`AppCard` wrapper was left untouched** — traced its CSS (`taj-card--public` →
  `var(--taj-public-surface)`) and confirmed it already resolves to `#ffffff !important` via the
  same global "palette lock" mechanism found during the chat work. Not a bug, correctly left alone.
- **`CheckoutSteps.tsx` itself was not rewritten** — its `.checkout-stepper__*` CSS in
  `premium-overhaul.css` already used `--text-muted`/`--green-accent`/`--green-primary`, all
  resolving to light-appropriate values. The only change was *where* it's rendered and *what step*
  it's told about.
- **`.wizard-rail`/`.wizard-progress` (the old top progress bar) removed from the JSX**, not because
  they were unreadable, but because they duplicated the newly-live `CheckoutSteps` bar — one
  progress indicator, not two, per the "не превращать в три огромные карточки" simplicity
  guidance. The now-unused CSS rules were left in `globals.css` (dead but harmless; not deleting
  CSS outside this block's scope without separately confirming no other page depends on it).
- **No business logic touched.** `hotelPaymentMethodId` validation, the payment snapshot, the
  `WAITING_PAYMENT`/`ON_REVIEW` lifecycle, `payOnArrival`/`acceptsPayAtCheckIn` gating, the
  error-code-driven step/selection resets, and `/api/bookings/route.ts` in full — all read, none
  modified. Confirmed by diff: only `BookingWizard.tsx`, `booking/page.tsx`,
  `app-navigation.ts`, and `messages.ts` changed; zero files under `src/app/api/bookings/` touched.

## 7. Mobile implementation (375×812, real evidence)

Real browser session, real login, real fixtures, screenshots taken at each step (not just Step 1):
- Step 1: light header, live 3-step progress bar, readable "ВАШ АККАУНТ" account card, clean
  date/phone fields, no dark surfaces.
- Step 2 (Pay Now): readable "Ночей / Цена за ночь / К оплате" summary, single-active-method
  payment card, light green info panel.
- Step 2 (Pay at Check-in, `acceptsPayAtCheckIn=true` + zero methods): payment-option toggle shows
  both options, correctly pre-selects Pay-at-check-in, accurate explainer text.
- Step 2 (no active payment method): controlled "Отель пока не добавил способ оплаты" message,
  "Далее" correctly disabled — no crash, no fake fallback account.
- Step 3 (Pay Now): "Защита эскроу" card, accurate for this path.
- Step 3 (Pay at Check-in): **no escrow card** — the accurate "Оплатить при заселении... оплата в
  отеле" explainer instead. This is the concrete fix for the false-backend-claim defect.
- 409 conflict (real competing `WAITING_PAYMENT` booking created directly in DB, then wizard
  submitted against the same room/dates): "Номер или даты недоступны. Выберите другие даты." +
  working "Вернуться к номерам" link, wizard state (step, selected method, dates) untouched — no
  data loss on a recoverable conflict.
- Bottom nav and floating assistant: confirmed **absent** in every screenshot across the whole flow.

Not independently re-screenshotted at 320/360/390/430 — only 375×812 was exercised with a real
browser; the CSS changes are token/text-color substitutions on already-responsive Tailwind
utility classes (no new breakpoint-specific rules added), so the same fix applies at every width,
but this is not the same as having pixel-checked each one.

## 8. Desktop implementation

One real screenshot at 1440×900 (real session, real fixture): centered `max-w-3xl` layout, light
header, live stepper, light form card — no dark surfaces, no giant empty side margins (the
existing `max-w-3xl` centering was already reasonable and left as-is, per "don't redesign what
already works"). Not exhaustively walked through every step at 1440×900 or additionally checked at
1280×800 — time-boxed to one representative desktop screenshot confirming the token fixes apply
correctly outside the mobile viewport, not a full desktop-specific QA pass.

## 9. Stepper states

Real, live, confirmed by screenshot at every step: Step 1 → first dot filled, others hollow; Step 2
→ first dot+connecting line filled (done), second dot filled (active); Step 3 → first two
done, third active. This is the concrete fix for "the stepper never advances" — previously the
decorative bar was frozen at `activeStep=0` regardless of the wizard's real progress; now one
component (`CheckoutSteps`, rendered inside `BookingWizard.tsx`) is the single source of truth for
progress, driven by the same `step` state that gates content and buttons.

## 10. Booking summary

Fixed contrast (light card, dark readable text) and fixed EN/TG leak (see §5). Total-to-charge now
visually separated by a top border and rendered at a slightly larger weight than the other two
lines, without becoming an oversized promotional element.

## 11. Guest/details states

Signed-in account card: readable green-on-light-green title, dark name/email text. Unauthenticated
guest-name/email fields: labels now read from the same i18n keys as their placeholders (no
duplicate hardcoded Russian). Phone field: same fix. Field height reduced from `h-14` to `h-12`
(the reported "oversized fields" — still comfortably touch-friendly, just no longer needlessly
tall) and background/border switched from dark-glass to light tokens.

## 12. Payment selector

Light track with light-token unselected buttons, solid green selected state, `aria-pressed` added
to both toggle buttons for correct assistive-technology state (was purely visual before — a real,
if small, accessibility fix). Payment-method list: light unselected cards fixed (no more
`bg-black/20`), selected state unchanged (already correct green). Copy/Select action buttons
recolored from dark-glass to token-based light styling.

## 13. Pay Now

Verified live end-to-end (§16 Flow A): selecting Pay Now, choosing/auto-selecting a real
`HotelPaymentMethod` fixture, submitting, redirecting into the real booking chat, landing on
`WAITING_PAYMENT` ("ОЖИДАЕТ ОПЛАТУ") with the guest quick-reply chips present. No backend files
touched — this exercised the pre-existing, untouched `/api/bookings` route end-to-end.

## 14. Pay at Check-in

Verified live end-to-end (§16 Flow B): a hotel with `acceptsPayAtCheckIn=true` and zero payment
methods correctly defaults to Pay-at-check-in, step 3 shows the accurate (non-escrow) explainer,
submitting creates the booking as `CONFIRMED` immediately, redirects into chat showing "ПОДТВЕРЖДЕНО"
with the correctly-localized `booking.welcome` semantic system event (pay-at-checkin variant — no
payment/proof UI shown, matching the existing, untouched backend architecture from BLOCK 5.4B).

## 15. No-payment-method

Verified live (§16 Flow C): a Pay-Now-only hotel with zero active payment methods shows a
controlled, readable message and a disabled "Далее" — confirmed no crash, no fallback fake payment
details invented, matching the explicit instruction not to fabricate anything here.

## 16. Validation/error + 409 conflict

Verified live (§16 Flow D): created a real competing `WAITING_PAYMENT` booking directly in the
database for the same room/dates, then submitted the wizard against it — got a real 409, a
human-readable message (not a raw backend code), a working "Вернуться к номерам" recovery link,
and confirmed the wizard's own client state (step, selected payment method, entered dates) was
**not** reset or lost by the failed submission — the SPA state simply stays as the user left it.

## 17. Loading/submission

Not independently re-tested this pass beyond what's implicit in every successful/failed submission
above (the existing `submitInFlight` ref guard and `disabled={submitting}` on the confirm button
were read and confirmed present, unchanged, not newly added or newly verified under a deliberately
slow/double-click scenario).

## 18. RU/TG/EN matrix

Real browser evidence, not just key-presence checks:
- **RU** (default): every screen shown in §7/§16 is RU, all readable, no code-leaks anywhere.
- **EN**: real full step-1/step-2 walkthrough (§16 Flow E) — confirmed "Book now", "Price per
  night", "YOUR ACCOUNT", "Check-in"/"Check-out"/"Phone" labels, "Step 1. Details/Step 2. Payment/
  Step 3. Confirm", and critically **"Nights / Price per night / Total to charge"** — the exact
  three strings the user reported leaking RU — now correctly EN. One hotel-owner-authored field
  (`HotelPaymentMethod.instructions`, "Отправьте чек в чат после перевода") remained Russian — this
  is real content a hotel owner typed in, not a TajStay UI string, correctly left untranslated.
- **TG**: real spot-check (§16 Flow F) — page text confirmed TG throughout ("Брон кардан", "Қадами
  1. Маълумот", etc.). Noted one **pre-existing, unrelated quirk**: the native date-input's small
  hint text below each field ("1 декабря 2026 г.") rendered with Russian month names even in TG
  mode — this comes from `LocaleDateInput`, a component this block did not modify, and is flagged
  as separate debt, not fixed here (out of the audited defect list, discovered incidentally).
- Internal enum leakage (`WAITING_PAYMENT`, `PAY_NOW`, etc.) — confirmed absent from all
  user-facing text in every screenshot; the wizard only ever renders `labels.*`/`m(locale, ...)`
  strings to the user, raw codes are used only as hidden form field values and API payloads.

## 19. Accessibility (Wizard-scoped only)

- Added `aria-pressed` to both payment-option toggle buttons (previously purely visual selection
  state).
- Field labels already used semantic `<label>` wrapping (`<label className="grid gap-1">...`) —
  confirmed correct, not changed.
- Not audited this pass: focus-visible ring styling specifically, full keyboard-only walkthrough,
  screen-reader announcement of step changes, or icon-only-control accessible names (no icon-only
  controls exist in this component — every icon has adjacent text). This is a partial, not a full,
  Wizard accessibility gate.

## 20. Runtime flows A–H — actual results

| Flow | Result |
|---|---|
| A — Pay Now, real fixture method, create → WAITING_PAYMENT → chat | **PASS**, real HTTP+DB+browser |
| B — Pay at Check-in, opt-in hotel, create → CONFIRMED, no proof UI | **PASS**, real HTTP+DB+browser |
| C — No payment method, controlled UI | **PASS**, real browser |
| D — Conflict, real 409, data preserved, recovery understandable | **PASS**, real HTTP+DB+browser |
| E — EN, full step 1–2 walkthrough, no RU leak | **PASS**, real browser |
| F — TG, spot-check, no RU/EN leak (one unrelated pre-existing date-hint quirk noted) | **PASS** (with a noted, unrelated, non-blocking quirk) |
| G — Mobile 375×812, full flow A+B+C+D | **PASS**, real browser, real screenshots at every step |
| H — Desktop 1440×900 | **PARTIAL** — one representative screenshot confirming the fix applies outside mobile, not a full step-by-step desktop walkthrough |

## 21. Screenshot evidence

Every screenshot in this pass was taken against a real dev server, a real restored PostgreSQL
database, and real disposable fixtures (created and fully cleaned up afterward) — not static HTML,
not mocked data. Screenshots were not saved as separate files/attachments in this pass (the
evidence lives in this session's tool-call history); if you want the actual PNGs delivered as
files, say so and they can be re-captured and sent directly.

## 22. HTTP/DB evidence

All four runtime flows (A–D) produced real, checked HTTP status codes and real Postgres row
changes (`Booking.status`, `Payment` row presence/absence, `ChatMessage` rows with the correct
`eventType`), not just visual confirmation — screenshots and backend state were cross-checked
together, not substituted for each other, per the explicit instruction not to treat a screenshot
as backend proof.

## 23. Regression results

Every existing regression script re-run against the live restored database, **after** fixing the
one stale expectation found:

| Script | Result |
|---|---|
| `test-block52a-concurrency.ts` | ALL PASS |
| `test-block53-lifecycle.ts` | ALL PASS |
| `test-block53a-security.ts` | ALL PASS |
| `test-block53a-expiry-job.ts` | ALL PASS |
| `test-block54b-concurrency.ts` | ALL PASS |
| `test-block54b-security.ts` | **ALL PASS (10/10)** — fixed this pass, see §12/§24 below |
| `test-block55a1-completion-safety.ts` | Both defect scenarios still correctly blocked (unchanged from BLOCK DB-RECOVERY) |
| `scripts/test-block56d-static.ts` (pure-function, no DB) | 28/28 PASS, unchanged |

## 24. Stale test fixed (carried debt from BLOCK DB-RECOVERY, closed here)

`test-block54b-security.ts`'s completion sub-test used a hardcoded 2029 `checkOut` date, predating
BLOCK 5.5B's `checkoutReached()` gate on the pay-at-check-in completion branch. Fixed by moving
both `checkIn` (already simulated to "now" for the arrival-payment gate) and `checkOut` into the
past before the completion call — the same simulation technique the script already used for the
check-in gate, applied consistently to the checkout gate. **Production code was not weakened or
changed to accommodate the old test** — only the test fixture's dates were corrected to match the
already-shipped, already-proven-correct business rule. Result: 10/10 PASS, unambiguous again.

## 25. Static quality gates

```
npx tsc --noEmit        = PASS (clean)
targeted eslint          = PASS (clean, every touched file)
prisma validate          = PASS
npm run build (isolated) = PASS (exit 0)
scripts/test-block56d-static.ts = PASS (28/28, unrelated to this block but re-confirmed unbroken)
```
No destructive DB action was performed — the database was already healthy from BLOCK DB-RECOVERY;
this block only created and fully cleaned up disposable fixtures.

## 26. Remaining debt (named, not hidden)

- **Responsive breakpoints 320/360/390/430 not individually screenshotted** — only 375×812 was
  walked through with a real browser. The fixes are token/text substitutions on already-responsive
  utility classes, so risk is low, but this is not the same as having checked each width.
- **Desktop was not fully walked step-by-step** — one representative screenshot only.
- **Loading/submission edge cases** (double-submit race, CTA width jump under `loading`) were not
  independently stress-tested this pass; the existing guard (`submitInFlight` ref) was read and
  confirmed present, not freshly verified under adversarial conditions.
- **Accessibility gate is partial** — `aria-pressed` added to the payment toggle; focus-visible
  styling, full keyboard walkthrough, and screen-reader step announcements were not audited.
- **`LocaleDateInput`'s TG/EN date-hint text renders RU month names** — a genuine, pre-existing,
  unrelated bug discovered incidentally during the TG flow check. Not fixed (out of this block's
  audited defect list; flagged as new debt for the next i18n-focused pass).
- **7 chat-adjacent dark-palette components** (from BLOCK DB-RECOVERY §11) and **`BookingTimeline`
  hydration mismatch** — unrelated to the Wizard, untouched, unchanged, carried forward.
- Screenshots were not saved as deliverable image files this pass — available on request.

## 28. V1 CLOSURE — acceptance gaps closed with real evidence

Continuation of this same block, not a new one. Baseline for this pass: `HEAD` was
`9cba7c5db0b7ac3c7e7ae2323cb4cc2cda8d4f10`; a mid-session checkpoint commit `7454a063ac1a29f91c6bf613110347eaf147af7e`
(author: the user, same as prior checkpoints in this session — not created by this pass) captured
the original V1 report + implementation as a commit while this closure pass was starting. This
pass's additional changes exist as **uncommitted** changes on top of `7454a06`, per instruction —
not committed until your own visual review.

### 28.1 TG date localization — real bug, root-caused and fixed

Confirmed live, not assumed: `new Intl.DateTimeFormat("tg-TJ", {day, month, year})` produces
correct Tajik ("1 Декабр 2026") in Node's own ICU, but the actual browser runtime that renders
`LocaleDateInput`'s hint text (a `"use client"` component — this executes in the browser, not
Node) was falling back to Russian genitive ("1 декабря 2026 г."), confirming this is a real
browser-ICU inconsistency, exactly as you described, not something to wave off as "pre-existing."

**Fix**: added a small deterministic month-name table (RU/TG/EN) scoped to `LocaleDateInput.tsx`
only — this component has exactly one caller (`BookingWizard.tsx`), so zero blast radius on the
four unrelated server-rendered surfaces that call the shared `formatStayDay()` in
`src/lib/i18n/format.ts` (Trips history, owner subscription cards), which were left untouched
since Node's ICU already renders them correctly. Also fixed the hint text's own color
(`text-slate-400` → `--taj-color-text-muted`), a small leftover dark-glass value found while in
this file.

**Verified live, all three locales, same component**:
- RU: "1 декабря 2026" (correct genitive)
- TG: "1 декабр 2026" (correct Tajik, no Russian leakage, no "г." suffix)
- EN: unaffected, already correct

### 28.2 Responsive matrix — real runtime checks, all seven widths

Every width opened for real against the live restored database, not just described:

| Width | Result |
|---|---|
| 320×568 | **PASS** — no horizontal overflow, stepper labels wrap gracefully, payment method card and buttons fit |
| 360×800 | **PASS** — payment-option toggle wraps cleanly, no clipping |
| 375×812 | **PASS** (already covered in the original pass, re-confirmed) |
| 390×844 | **PASS** — no-payment-method state confirmed clean at this width too |
| 430×932 | **PASS** — hotel name now fits on one line, everything else unchanged |
| 1280×800 | **PASS** — Step 1/2/3 (Pay Now) all walked through, centered composition, no giant empty margins |
| 1440×900 | **PASS** — Step 1/2/3 (Pay Now), Pay-at-check-in step 3, and the real 409 conflict/error state all walked through |

No dead-end states, no overlap with shell chrome (bottom nav/assistant confirmed absent at every
mobile width, consistent with the `/booking` shell-suppression fix from the original pass).

### 28.3 Desktop closure — full step-by-step, not representative-only

Real walkthrough at both required desktop widths (see matrix above): Step 1 → Step 2 → Step 3 for
Pay Now, plus Step 2/3 for Pay-at-check-in, plus the real conflict/error state. All confirmed:
correct light tokens throughout, no dark surfaces, CTA always in the same predictable place,
`max-w-3xl` centered composition intentional (not a stretched mobile layout), summary/payment
hierarchy unchanged from the mobile fixes since the same component renders both.

### 28.4 Validation state — real gap found and closed

Found a genuine, previously-unaddressed gap while implementing this: the form has `noValidate`
(native browser required-field UI deliberately suppressed, since it can't be styled consistently
across browsers), but nothing replaced it — an unauthenticated guest could reach step 3 with an
empty name/phone and only learn about it from the server's rejection after final submit.

**Fix**: `step1Valid` check added (`nights` valid, `phone` non-empty, `guestName` non-empty when
unauthenticated) gating the step-1→2 transition; a readable inline error
("Проверьте номер, даты и телефон.", already an existing localized string, reused not invented)
appears when the guest tries to advance with missing fields, tied to the phone/name inputs via
`aria-describedby`/`aria-invalid`. Verified live: clicking Next with empty fields shows the error
without navigating; filling in both fields clears it automatically (via a `useEffect` watching
`step1Valid`); no layout collapse, no raw backend text shown.

### 28.5 Loading / double-submit — real proof, not inferred

Real double-click on the "Подтвердить бронь" button on step 3 (Pay Now, `hotelPaymentMethodId`
already selected). Result: **exactly one `Booking` row created** (verified by direct DB query,
`prisma.booking.count()` for the target room = 1, not 2) — the existing `submitInFlight` ref guard
holds under a genuine rapid double-click, not just in theory. This is real evidence, not a restated
assumption from the original pass.

### 28.6 Accessibility — scoped, real fixes added

- `CheckoutSteps`: added `aria-current="step"` to the active step's container.
- Payment-option toggle buttons: `aria-pressed` (added in the original pass, re-confirmed present).
- Guest-name and phone inputs: `aria-invalid` + `aria-describedby="step1-error"` when the new
  validation error is showing, so assistive technology can associate the error with the specific
  fields, not just display it visually.
- Not additionally audited this pass beyond what's listed: full keyboard-only walkthrough of every
  interactive element's tab order, screen-reader announcement testing with an actual AT tool, or a
  formal contrast-ratio audit (colors were reused from tokens already used elsewhere in the app,
  not independently re-measured for WCAG AA numeric compliance).

### 28.7 RU/TG/EN closure

RU and EN were already verified live in the original pass (§18) and re-confirmed unaffected by
this pass's changes (regression suite green, no i18n keys removed). TG was re-verified live this
pass specifically for the date-hint fix (§28.1) — the one concrete defect this block's acceptance
required to be treated as in-scope, now closed with evidence, not deferred.

### 28.8 Regression after closure fixes

Production code changed this pass: `LocaleDateInput.tsx` (date formatting), `BookingWizard.tsx`
(validation logic, `aria-*` additions), `CheckoutSteps.tsx` (`aria-current`). Full regression suite
re-run after these changes, against the live database:

```
test-block52a-concurrency.ts    = ALL PASS
test-block53-lifecycle.ts       = ALL PASS
test-block53a-security.ts       = ALL PASS
test-block53a-expiry-job.ts     = ALL PASS
test-block54b-concurrency.ts    = ALL PASS
test-block54b-security.ts       = ALL PASS (10/10, fix from the original pass still holds)
test-block56d-static.ts (unrelated, pure-function) = 28/28 PASS
```
`npx tsc --noEmit` = PASS, targeted `eslint` = PASS, isolated `npm run build` = PASS (exit 0).

### 28.9 Final closure matrix

```
BOOKING WIZARD CODE     = PASS
MOBILE 320              = PASS
MOBILE 360              = PASS
MOBILE 375              = PASS
MOBILE 390              = PASS
MOBILE 430              = PASS
DESKTOP 1280            = PASS
DESKTOP 1440            = PASS
PAY NOW UX              = PASS
PAY AT CHECK-IN UX      = PASS
NO PAYMENT METHOD       = PASS
VALIDATION              = PASS
409 CONFLICT            = PASS
LOADING/DOUBLE SUBMIT   = PASS
RU                      = PASS
TG                      = PASS   (RU-leakage in date hint found and fixed this pass, verified live)
EN                      = PASS
ACCESSIBILITY           = PARTIAL (scoped fixes added: aria-current, aria-pressed, aria-invalid/
                          aria-describedby; full keyboard/AT/contrast audit not performed)
REGRESSION              = PASS   (7/7 scripts)
VISUAL QA               = PASS
OVERALL                 = PASS for every acceptance item in the original V1 spec except a full
                          formal accessibility audit (WCAG-numeric contrast checks, AT-tool
                          testing, exhaustive keyboard walkthrough), which remains PARTIAL and is
                          named as such, not rounded up.
```

Not committing this pass's changes — awaiting your own visual review, per instruction. Not
starting Auth/Profile/Owner/Admin/Search/Map. Stopping here.

## 27. Final verdict (original pass — superseded by §28's closure matrix above for OVERALL status)

```
BOOKING WIZARD CODE       = PASS   (tsc/eslint/build clean, business logic untouched, confirmed by diff)
BOOKING WIZARD MOBILE     = PASS   (375×812 real browser, full flow A-D screenshotted)
BOOKING WIZARD DESKTOP    = PARTIAL (one representative 1440×900 screenshot, not a full walkthrough)
PAY NOW UX                = PASS   (real end-to-end HTTP/DB/browser evidence)
PAY AT CHECK-IN UX        = PASS   (real end-to-end HTTP/DB/browser evidence, false escrow claim fixed)
ERROR/CONFLICT UX         = PASS   (real 409 produced, data preserved, human-readable recovery)
RU                        = PASS
TG                        = PASS   (one unrelated pre-existing date-hint quirk noted, not blocking)
EN                        = PASS   (the exact reported "Nights/Price per night/Total to charge" leak fixed and verified live)
ACCESSIBILITY             = PARTIAL (Wizard-scoped, aria-pressed added; focus/keyboard/screen-reader not audited)
BOOKING/PAYMENT REGRESSION = PASS  (7/7 scripts, including one fixed stale test, 10/10 after fix)
VISUAL QA                 = PASS for every defect on the audited list; PARTIAL on responsive-breakpoint
                             and desktop breadth (not every viewport/step screenshotted)
OVERALL                   = PASS for the audited defect list and all four runtime flows with real
                             evidence; PARTIAL on breadth items named above — none of them are
                             regressions or open correctness questions.
```

Per your explicit closing instruction: this technical/screenshot evidence does not substitute for
your own visual judgment — please open the updated Booking Wizard yourself (mobile and desktop) to
confirm it actually looks the way you want before this is considered truly done.

Not starting Auth/Profile/Owner/Admin/Map. Stopping here per instruction, awaiting your review.
