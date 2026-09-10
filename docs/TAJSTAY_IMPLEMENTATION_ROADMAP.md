# TajStay — Implementation Roadmap

Built from `docs/TAJSTAY_CURRENT_STATE_AUDIT.md` (current source of truth for what actually exists).
This is not a theoretical plan — every phase names the concrete files/subsystems the audit already
identified, so implementation starts from fact, not assumption. Work top to bottom; a later phase may
be pulled forward only if a hard dependency requires it (noted per phase).

**Working loop per phase**: audit reference → targeted re-check (only what's unknown for this specific
area, never a full re-audit) → architecture/design decision → implement → typecheck/lint → runtime QA
(desktop + mobile, local dev; RU baseline, TJ/EN where the area is i18n-visible) → fix → regression on
touched areas → commit → next phase. Compile success is never treated as PASS for user-facing or
security-sensitive work — see `CLAUDE.md` Evidence gates.

---

## PHASE 1 — Architecture Foundation

**CURRENT PROBLEM**: Consumer chrome (Header/Footer/MobileBottomNav/AppShell/Cookie/PWA prompts) was
unconditionally rendered in the root layout for every route, leaking into `/dashboard/admin` and
`/dashboard/owner`, which already have their own self-contained CRM shells. Two prior fix attempts
(client-wrapper around async Server Components) broke webpack. No canonical shared design-token layer;
multiple duplicate/legacy CSS "palette lock" blocks found and partially fixed (Auth screens) but not
eliminated at the foundation level.

**TARGET STATE**: Four cleanly separated shells — Public, Consumer (PWA), Owner CRM, Admin CRM — each
rendering only its own chrome, sharing one design-token source, one canonical brand color (`#0F7A4D`),
no duplicate/competing CSS "lock" blocks anywhere in `globals.css` / `auth-premium.css` / component
CSS.

**ARCHITECTURE CHANGES**:
- Shell isolation via `middleware.ts` route classification (`x-tajstay-shell` header: `admin` | `owner`
  | `consumer`) + root layout conditional render — **DONE this pass**, verified in-browser (admin
  dashboard shows zero consumer chrome, zero console errors; consumer Home unaffected).
- Audit and eliminate remaining duplicate CSS override blocks repo-wide (the "final palette lock"
  pattern found twice in Auth) — use the CSSOM-enumeration technique documented in `STATE.md` BLOCKED
  section, not source grep alone, since duplicates can hide across files.
- Establish one canonical design-token file (colors, spacing, radii, typography scale) that
  `globals.css`, `auth-premium.css`, and any dashboard-specific CSS all consume — no shell should
  define its own competing token set.

**FRONTEND**: Root layout, `middleware.ts`, `globals.css`, `auth-premium.css`, shared token file (new).

**BACKEND**: None (middleware header tagging only, no data/API change).

**DATA**: None.

**SECURITY**: Confirm middleware's existing `/dashboard/admin|owner` session gate still fires before
the shell-header logic (it does — verified: unauthenticated request to `/dashboard/admin` still
redirects to sign-in). No new attack surface introduced by the header (server-set only, not
client-controlled — a request cannot spoof `x-tajstay-shell` because middleware always overwrites it
before the layout reads it).

**MOBILE**: Verify Admin/Owner mobile nav (already shell-local) unaffected; verify consumer mobile
bottom nav still renders on all non-dashboard routes at 390/412px.

**QA**: Desktop + mobile runtime check per shell (Consumer Home, Admin Overview, Owner Overview) —
**partially done this pass** (Admin verified; Owner not yet logged into directly, same code path).
RU baseline only so far — TJ/EN pass still open.

**DEPENDENCIES**: None — this phase blocks meaningful visual work on Phases 6/7 (Owner/Admin), since
polishing a leaking shell is wasted effort (per the user's own framing).

**ACCEPTANCE**: Admin and Owner dashboards render zero Consumer-shell elements (Header, Footer, mobile
tab bar, cookie banner, PWA install prompt) at any viewport; Consumer/Public routes unaffected; zero
console errors on all three shells; no CSS-hide hack anywhere (verified: shells differ by what's
rendered server-side, not by `display:none`).

---

## PHASE 2 — Consumer Core

**CURRENT PROBLEM**: Search field has internal borders per section (target: borderless internal
zones); native `<input type="date">` shows empty on real mobile browsers; city field previously had
placeholder text (removed) but overall search-card mobile-viewport behavior not yet verified against
the "headline + Search with zero scroll at 390/412px" acceptance gate. Hotel detail/listing pages not
audited visually this pass.

**TARGET STATE**: Mobile Home shows headline + working Search with no scroll required at 390/412px;
Search fields borderless internally; custom date display layer (not bare native input) on all
supported browsers; Search results and Hotel detail pages consistent with the shared design tokens
from Phase 1.

**ARCHITECTURE CHANGES**: None expected — this is UI/UX work on existing routes (`/`, `/search`,
`/hotel/[id]`), not new architecture.

**FRONTEND**: `SearchBar.tsx`, Home page, `/search` results page, `/hotel/[id]` detail page, new date
display component (replaces bare `<input type="date">`).

**BACKEND**: None expected unless the search API's field contract changes (audit confirmed
`/api/search` returns `{hotels, filters}` — stable shape, no change needed for a UI-only pass).

**DATA**: None.

**SECURITY**: None (no new user input handling beyond what already exists).

**MOBILE**: Primary target — verify at 360/390/412px specifically against the zero-scroll gate.

**QA**: Runtime check at 360/390/412/768/1024px; RU baseline, then TJ/EN once copy is confirmed stable.

**DEPENDENCIES**: Phase 1 tokens (for consistent spacing/color once the shared token file exists).

**ACCEPTANCE**: Home passes the zero-scroll mobile gate; Search has no internal borders; date fields
render correctly on a real mobile browser (not just desktop devtools emulation); Search → results →
Hotel detail is a clean, un-erroring path in RU.

---

## PHASE 3 — Auth + Account

**CURRENT PROBLEM**: Auth screens' dark-theme bug fixed (duplicate CSS lock, Phase-1-adjacent, already
resolved). Profile has a genuinely unresolved client crash (`ProfileMockupView`, root cause NOT found
despite exhaustive elimination — see `STATE.md` BLOCKED). Phone verification: the audit conclusively
found the **custom `/api/phone-otp/*` subsystem** (rate-limited, hashed, timing-safe, fully working
server-side) has no UI caller — `/profile/phone`'s actual button target is unknown and must be checked
live. Firebase Phone Auth client wrapper is confirmed dead code (zero callers, no DOM container) — do
not wire it up as an alternative; the custom subsystem is more production-ready.

**TARGET STATE**: Sign-in/Register/Forgot-Password fully on the current design system; Profile crash
resolved (or root-caused and fixed, not glossed over); `/profile/phone`'s change/verify flow actually
calls the existing `/api/phone-otp/request` + `/api/phone-otp/verify` endpoints end-to-end; avatar
upload/change/remove has a real end state; Settings/Notifications/Support deduped per the standing
correction (no permanent disabled "Скоро" button for phone/avatar specifically).

**ARCHITECTURE CHANGES**: None — wiring existing subsystems, not building new ones.

**FRONTEND**: `/auth/sign-in`, `/auth/register`, `/auth/forgot-password`, `/profile/*` routes,
`ProfileMockupView.tsx` (crash), `OtpVerificationPanel.tsx` and `TajikPhoneInput.tsx` (ready-made,
currently-unused UI — reuse, don't rebuild).

**BACKEND**: `/api/phone-otp/request`, `/api/phone-otp/verify` (already implemented, just needs a real
caller) — no new endpoints expected unless `/profile/phone`'s live behavior turns out to need one.

**DATA**: `OtpChallenge` model (already exists, already used by the OTP subsystem) — no schema change
expected.

**SECURITY**: This phase touches Auth — load `tajstay-security` skill per `CLAUDE.md` routing table.
Verify the OTP wiring doesn't bypass the existing rate-limit/lockout logic when connected to a new UI
entry point. Decide (and document) what happens to the dead Firebase wrapper — delete or leave inert —
as an explicit decision during this refactor, not a silent side effect.

**MOBILE**: Auth forms and Profile must work cleanly at mobile widths (spacing/density corrections
already partially done — verify, don't assume held).

**QA**: RU/TJ/EN runtime pass specifically on Auth (flagged as not yet done in the audit). Security
review before merge (rate-limit still enforced, no PII leak in responses).

**DEPENDENCIES**: Phase 1 (design tokens); none on Phase 2.

**ACCEPTANCE**: `ProfileMockupView` crash resolved with a named root cause (not re-declared
"environmental"); phone change/verify flow reaches a real success/failure state through the existing
OTP subsystem; no third OTP system built; Firebase dead-code fate explicitly decided and recorded.

---

## PHASE 4 — Booking

**CURRENT PROBLEM**: Core booking data model and status enum (`BOOKING_STATUS` in
`src/lib/domain/booking.ts`) exist and are used correctly by the actual booking creation/assignment
code (`src/lib/pms/assignment.ts`, `inventory.ts`, `bookingContext.ts` — all confirmed real, wired
features). The known defect is downstream in Admin analytics (Phase 8), not in the booking engine
itself. Trips/History classification module (`src/lib/trips/classify.ts`) is canonical — do not
duplicate.

**TARGET STATE**: Search → Hotel → Booking → confirmation → Trips/History is a verified, working path
end-to-end on isolated QA data; receipts/reviews/chat linkage confirmed live, not just present in code.

**ARCHITECTURE CHANGES**: None expected — this phase is verification + finishing, not rebuilding (the
audit found the booking engine itself in good shape).

**FRONTEND**: Booking flow pages, `TripBookingCard.tsx`, `HistoryRecordCard.tsx` (canonical, don't
duplicate).

**BACKEND**: `/api/bookings/*`, `assignBookingToRoom`, `autoAssignBookingIfPossible` (already real,
verify not rebuild).

**DATA**: `Booking`, `RoomType`, `Room` models — no schema change expected unless a live-test finds a
genuine gap.

**SECURITY**: Booking engine invariants are a Protected Domain per `CLAUDE.md` — any change here needs
explicit user approval, this phase should mostly be verification + UI finishing, not invariant changes.

**MOBILE**: Full booking flow at mobile widths.

**QA**: End-to-end walkthrough on the dedicated QA account (`qa-claude-session@tajstay.local`), mapped
against the canonical status enum — this is the first real booking E2E test this audit cycle, still
outstanding from the audit's own completion gate.

**DEPENDENCIES**: Phase 3 (a working account/auth flow to book with).

**ACCEPTANCE**: A booking created on QA data moves through its real status lifecycle exactly as
`BOOKING_STATUS` defines, visible correctly in Trips/History, with reviews/chat reachable from it.

---

## PHASE 5 — Tours

**CURRENT PROBLEM**: Audit confirmed **no `Tour` model exists anywhere in the 37-model Prisma schema**.
Tours' actual data source (static/JSON/hardcoded/mock/external) was flagged as unclassified — this must
be resolved before any UI work, not after.

**TARGET STATE**: A real, named data architecture for Tours (even if intentionally minimal for v1 —
e.g. "static JSON, no backend yet, documented as such") before building product UI on top of it.

**ARCHITECTURE CHANGES**: Likely a new `Tour` Prisma model + migration, OR an explicit, documented
decision to keep Tours static/content-managed for now — this is a real architectural decision, not a
default to skip.

**FRONTEND**: `/tours` route and any tour-detail page — hold until data source is decided.

**BACKEND**: New API route(s) only if a real backend is chosen.

**DATA**: Protected domain if it touches production schema/migrations — needs explicit user approval
per `CLAUDE.md`.

**SECURITY**: Standard input-handling review if any new write path is introduced (e.g. an admin Tours
editor).

**MOBILE**: Tours UI at mobile widths, once data source is settled.

**QA**: Runtime check once built; RU/TJ/EN if tour content is user-facing copy.

**DEPENDENCIES**: None hard-blocking, but sequenced after Booking since Tours is a smaller, more
isolated surface — pulling it forward is fine if the user prioritizes it.

**ACCEPTANCE**: Tours' data source is named and documented (no more "unclassified"); no fake/mock
inventory presented as if real; UI matches whatever the chosen data source actually supports.

---

## PHASE 6 — Owner Hotel Desk

**CURRENT PROBLEM**: Owner dashboard is a single route (`/dashboard/owner`) with 11 client-side
`?section=` views, not real Next.js routes (per audit §6d) — Overview, Properties, Rooms, Bookings,
Offline-bookings, Calendar, Messages (real route), Reviews, Finances, Statistics, Help, Notifications.
Backend foundation for most of this already exists and is wired (`lib/pms/bookingContext.ts`,
`inventory.ts`, `amenities.ts`, `ownerQueries.ts`, `bulkRooms.ts`, `assignment.ts` — all confirmed real
call sites, not dead code). **`HotelStaff`/`staff.ts` is backend-foundation-only** — schema + full
permission logic (`resolveHotelAccess`, per-role permission arrays, PII masking) exist but have zero
callers, no API routes, no invite flow, no UI entry point (Owner sidebar has no Staff section at all).
No Expense/Finance backend model found in the schema.

**TARGET STATE**: Each of the 11 sections individually verified/rebuilt on the isolated Owner shell
(Phase 1); Staff management either wired to the existing `staff.ts` foundation (API routes + invite
flow + Owner sidebar entry, reusing the permission logic as-is) or explicitly deferred with that
decision documented — not silently ignored.

**ARCHITECTURE CHANGES**: Consider converting the 11 `?section=` views to real routes under
`/dashboard/owner/*` for shareable URLs/back-button correctness — a genuine architecture decision to
make explicitly this phase, not assume.

**FRONTEND**: `OwnerSidebar.tsx`, all 11 section views, new Staff UI if wired.

**BACKEND**: Reuse `lib/pms/*` wherever a section already has a working query (do not recreate). New:
Staff CRUD API routes + invite flow if Staff is wired this phase; Finance/Expense API only if that
model is added (see Data below).

**DATA**: No `Expense` model exists — adding one is a schema change (Protected Domain, needs explicit
approval, route via `tajstay-database-safety`).

**SECURITY**: `HotelStaff` wiring directly creates a new authorization surface (`resolveHotelAccess` is
exactly a permission gate) — load `tajstay-security` skill, verify PII masking (`maskGuestContact`)
actually gets exercised once staff can log in with reduced scope.

**MOBILE**: Owner shell mobile nav (already isolated in Phase 1) — verify each section at mobile
widths.

**QA**: All 11 sections clicked through individually with data/actions observed (explicitly not done
in the audit) — desktop + mobile, RU baseline then TJ/EN.

**DEPENDENCIES**: Phase 1 (shell), Phase 4 (booking data Owner sections read).

**ACCEPTANCE**: All 11 sections render real data/actions without error; Staff decision (wire vs.
defer) is explicit and documented; no duplicate PMS logic created where `lib/pms/*` already has it.

---

## PHASE 7 — Admin Command Center

**CURRENT PROBLEM**: Same single-route `?section=` pattern as Owner — 10 sections (Dashboard, Content,
Applications, Hotels, Users, Owner-access, Bookings, Finance, Complaints, Notifications), all on
`/dashboard/admin`. Analytics currently computed ad hoc per-section rather than from a shared semantic
layer (root cause of the Bookings KPI bug — see Phase 8, don't fix analytics semantics here, just the
shell/section work).

**TARGET STATE**: Dedicated, isolated Admin shell (done, Phase 1) with each of the 10 sections
individually verified; same real-vs-`?section=`-routes decision as Owner, made consistently between
the two CRMs.

**ARCHITECTURE CHANGES**: Same route-structure decision as Phase 6 — resolve consistently.

**FRONTEND**: `AdminSidebar.tsx`, all 10 section views.

**BACKEND**: Existing moderation/user-management APIs (confirmed real by audit) — verify, extend only
where a section is found incomplete.

**DATA**: None expected beyond what Phase 8's analytics work needs.

**SECURITY**: Admin is the highest-privilege surface in the app — `tajstay-security` skill required.
Audit log (`logAuthEvent` pattern, already used by phone-OTP) should be checked for coverage across all
10 admin action types, not just auth events.

**MOBILE**: Admin shell mobile verification, same bar as Owner.

**QA**: All 10 sections individually, desktop + mobile, RU baseline then TJ/EN — the audit specifically
flagged Admin Users donut label overflow in longer TJ/EN words ("Пользователи") as needing a
re-check once the section is touched.

**DEPENDENCIES**: Phase 1 (shell). Should immediately precede Phase 8 (Admin is where the KPI bug
lives).

**ACCEPTANCE**: All 10 sections render correctly across viewports and all 3 locales; donut/label
overflow issue re-verified and resolved if still present.

---

## PHASE 8 — Analytics Data Layer

**CURRENT PROBLEM (confirmed, not hypothesis)**: `src/app/dashboard/admin/page.tsx` computes
`bookingTotal` as an unfiltered `prisma.booking.count()`, but the donut buckets it into three hardcoded
status lists that **omit `WAITING_PAYMENT`** (a real, current status in `BOOKING_STATUS` — "New premium
chat-first lifecycle (2026)") and **reference a `"PENDING"` literal that doesn't exist** in the enum at
all. This is the exact, traced mechanism behind bookings appearing in the KPI headline but vanishing
from the donut. No other admin/owner KPI has been checked for the same class of bug yet — assume it's
possible elsewhere until verified area by area.

**TARGET STATE**: One canonical semantic definition per KPI — one status-bucket mapping, one
denominator, one period model, one query — consumed by every chart/headline that shows that number, so
a headline and its own donut can never disagree again.

**ARCHITECTURE CHANGES**: A shared analytics/KPI definition module (new) that both Admin and Owner
dashboards import from, replacing the current per-page ad hoc `sumBookingStatus`-style logic. This is
the actual fix for the audit-confirmed bug, not a cosmetic re-alignment of the numbers.

**FRONTEND**: Admin dashboard KPI cards/donuts, Owner Finances/Statistics sections — consume the new
shared definitions instead of local computation.

**BACKEND**: New shared query/definition module (e.g. `src/lib/analytics/*`), replacing scattered
status-list literals with references to canonical `BOOKING_STATUS` (or an explicit, documented KPI
bucket mapping derived from it — e.g. is `WAITING_PAYMENT` "pending" or its own bucket? that's a product
decision to make explicitly here, not silently default).

**DATA**: No schema change expected — this is a query/aggregation-layer fix, not a data model change.

**SECURITY**: Admin financial numbers (GMV, Platform Revenue, Refunds/Payouts) are sensitive — ensure
the new analytics layer doesn't accidentally expose owner-level financials to non-admin roles or
cross-owner data to a single owner's dashboard (an IDOR-class check, not just a display bug check).

**MOBILE**: Charts/KPI cards responsive at all target widths — donut center-label overflow (flagged in
audit for TJ/EN) must be fixed as part of this pass, not deferred again.

**QA**: For every KPI listed below, verify headline number and its own chart/breakdown agree, in all
3 locales:
- **Admin**: GMV, Platform Revenue, Bookings, Hotels, Users, Applications, Complaints, Refunds/Payouts.
- **Owner**: Revenue, Expenses (if that model exists by this point), Net Profit, Occupancy, ADR, RevPAR,
  Bookings, Cancellation rate, Reviews.

**DEPENDENCIES**: Phase 7 (Admin sections must be stable UI first); Phase 6 for Owner's Finance
section if that KPI set is tackled together.

**ACCEPTANCE**: Every KPI above has exactly one definition/query in the codebase; the specific
`WAITING_PAYMENT`/`PENDING` mismatch is fixed as part of this work (not before — fixing it in isolation
earlier would just be patching one symptom of the missing shared layer); no headline/donut disagreement
survives a fresh data snapshot in any of the 3 locales.

---

## PHASE 9 — PWA / Performance

**CURRENT PROBLEM**: Service worker (`public/sw.js`) already has two real fixes this session (stale
chunk cache, cross-account cache-privacy leak — cache version bumped, public-path allowlist added).
Cookie consent + install-prompt sequencing already fixed (15s engagement gate, consent-resolved event)
but not yet runtime-verified with real timestamps on fresh storage. No performance baseline exists at
all yet (dev vs. deployed, never measured this audit cycle).

**TARGET STATE**: Cookie/Install sequencing verified with real timing evidence; service worker caching
verified safe (no stale-chunk regressions, no cross-account leakage) under real reload/update
scenarios; a real performance baseline recorded (dev clearly separated from deployed) for Home/Search/
Hotel/Profile/Owner/Admin.

**ARCHITECTURE CHANGES**: None expected — this is verification + tuning of existing infrastructure.

**FRONTEND**: `CookieConsent.tsx`, `PwaInstallPrompt.tsx`, image optimization / code-splitting review
on the heaviest routes identified by the performance baseline.

**BACKEND**: None expected.

**DATA**: None.

**SECURITY**: Re-verify the cross-account cache-privacy fix holds under a real two-account browser
session (Guest A caches something, Guest B on the same device must never see it) — this was fixed by
inspection/cache-version bump, not yet confirmed by an actual two-account runtime test.

**MOBILE**: Install prompt behavior on a real mobile PWA install flow, not just desktop devtools.

**QA**: Timed sequencing test on fresh browser storage (cookie banner → 15s → install prompt, correct
order, no overlap); Lighthouse or equivalent baseline on dev AND on the deployed `tajstay.site`
(explicitly labeled as separate baselines, never averaged/conflated per `CLAUDE.md` Evidence gates).

**DEPENDENCIES**: None hard-blocking; benefits from Phases 1-8 being visually stable so the performance
baseline reflects the real target UI, not a UI about to change again.

**ACCEPTANCE**: Cookie/install sequencing has real timestamp evidence, not just code reading correct;
cross-account cache privacy confirmed under an actual two-account test; a documented performance
baseline exists for both dev and deployed, clearly separated.

---

## PHASE 10 — Security Hardening

**CURRENT PROBLEM (baseline from this audit, already evidenced)**: `/api/seed` is fail-closed and
deployed-runtime confirmed (403 on unauthenticated GET, 405 on POST, production `tajstay.site`) — SAFE,
not a finding to fix. Security response headers: HSTS present at the platform level; CSP,
X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all absent both in app
config and live deployed response; `X-Powered-By: Next.js` leaked. No `dangerouslySetInnerHTML` found
repo-wide (good sign, not proof of no XSS surface). Rate-limiting infrastructure real and used by
phone-OTP; not yet verified as applied universally across all sensitive routes. IDOR/BOLA not
systematically tested this audit cycle.

**TARGET STATE**: A configured, deployed CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/
Permissions-Policy set (via `next.config.mjs` `headers()` or `vercel.json`) appropriate to this app's
actual threat model (e.g. does anything legitimately need to iframe TajStay? if not, `frame-ancestors
'none'` / `X-Frame-Options: DENY` is safe); `X-Powered-By` suppressed; rate-limiting confirmed present
on every sensitive write path, not just phone-OTP; a real IDOR/BOLA pass completed on profile/booking/
message/notification/hotel/finance/staff endpoints using two isolated QA identities per role.

**ARCHITECTURE CHANGES**: Security headers config (new, in `next.config.mjs` or `vercel.json`).

**FRONTEND**: None expected unless CSP breaks an existing inline script/style pattern — if so, fix the
pattern (move to external/nonce'd), don't weaken the policy to accommodate it.

**BACKEND**: Rate-limit audit across all write-capable API routes; confirm `requireAuth`/
`requireOwner`/`requireAdmin` guards are present and correct on every route that should have them
(the audit noted RBAC is enforced via manual guard functions, not middleware-wide — verify no route
was missed).

**DATA**: None expected.

**SECURITY**: This entire phase — load `tajstay-security` skill for the full checklist (uploads, chat,
admin operations, audit log coverage, exports, secrets handling) beyond what's summarized here.

**MOBILE**: N/A (headers/backend work, not UI).

**QA**: Deployed-runtime header verification (repeat the `curl -sD` check from this audit post-fix, on
`tajstay.site`, to confirm headers actually changed in production, not just in code); IDOR test matrix
per role pair (Guest A vs Guest B, Owner A vs Owner B) — this was the audit's own "not yet done" item,
carried forward here as the implementation-phase target for it, per the user's own reprioritization
(exploratory IDOR checks belong inside this phase, not as endless standalone audit work).

**DEPENDENCIES**: Best done after Phases 6-8 (Owner/Admin/Staff surfaces stable) since IDOR testing
against a surface that's about to be rebuilt wastes effort; headers work has no dependency and could be
pulled forward if the user wants it earlier (it's low-risk, config-only).

**ACCEPTANCE**: Deployed response on `tajstay.site` shows CSP/X-Frame-Options/X-Content-Type-Options/
Referrer-Policy/Permissions-Policy set and `X-Powered-By` absent; IDOR matrix passes for every tested
role pair across the listed domains; every sensitive write route confirmed rate-limited.

---

## PHASE 11 — Commercial Regression

**CURRENT PROBLEM**: No full cross-role, cross-locale, cross-viewport regression pass has been run
this audit cycle — everything above was found via code tracing plus one partial Anonymous browser
check.

**TARGET STATE**: Full regression across Anonymous, Guest, Owner, Admin (and Staff, if Phase 6 makes it
user-accessible) × RU/TJ/EN × 360/390/412/768/1024/1280/1440+ with zero new console errors and no
regressions in anything fixed in Phases 1-10.

**ARCHITECTURE CHANGES**: None — this is verification only.

**FRONTEND / BACKEND / DATA / SECURITY / MOBILE**: N/A as new work — this phase verifies everything
above holds together, not additional feature work.

**QA**: The actual regression matrix — this is the heaviest QA phase, run last for exactly that reason
(no point regression-testing a UI about to change in the next phase).

**DEPENDENCIES**: All prior phases.

**ACCEPTANCE**: Every phase's own acceptance criteria still hold simultaneously, across every role,
locale, and viewport in the matrix above.

---

## Notes on scope discipline (per the user's explicit instruction)

- Do not re-run the full standalone audit. `docs/TAJSTAY_CURRENT_STATE_AUDIT.md` is the reference;
  only do targeted re-checks when a specific phase hits a genuine unknown.
- Do not build a third OTP system, a second PMS/staff permission model, or a second History/booking
  classifier — the audit already named the canonical modules to extend, not replace.
- Phase 1 (shell isolation) is done; do not re-litigate the architecture decision, extend it.
- If an unknown surfaces mid-phase, investigate only that dependency, then continue the phase — do not
  return to a global audit.
