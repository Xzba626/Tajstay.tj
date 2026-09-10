# TajStay current state

Read this before anything else. Load only the skill matching NEXT (see `CLAUDE.md` → Skill routing).
Do not re-read old audit reports unless the task needs them. Keep this file short — DONE/OPEN/BLOCKED/
NEXT, not a diary. Detailed rationale for a fix belongs in its commit message, not here.

## Governing instruction

**MODE = HUMAN PRODUCT RECONSTRUCTION** (execution protocol issued 2026-09-10, supersedes the plain
IMPLEMENTATION framing below for *how* work happens, not *what* — roadmap/phase order unchanged). Do
not wait for the user to name a defect: open each page/section as a real user, look at the full render,
click every control, check desktop+mobile+RU/TJ/EN+loading/error/empty+console/network, fix what's
wrong (visual, UX, functional, data, perf, security) even if never mentioned, then re-verify the whole
flow before marking it PASS. Do not close an area after one fix — mini-regression after ~5-10 related
fixes, full area regression before moving on. Every `?section=` on Admin/Owner is its own page for this
purpose, not "the same route already checked." Compile/typecheck is never PASS for user-facing work.
Session end is not a completion signal — update STATE.md with CURRENT AREA/ROUTE/ROLE/LAST VERIFIED
CONTROL/DONE/OPEN/BLOCKED/NEXT and the next session resumes exactly there. Only real stoppers: git
reset --hard/clean -fd/push --force, prod DB drop/reset/mass-delete, destructive irreversible prod
migration, prod payment mutation — everything else (safe implementation, refactor, backend, API,
security fixes) is authorized without asking.

**MODE = IMPLEMENTATION.** The user reviewed `docs/TAJSTAY_CURRENT_STATE_AUDIT.md` and issued
"TAJSTAY — END STANDALONE AUDIT / START IMPLEMENTATION" (2026-09-10): standalone audit phase is over,
the audit doc is now the **CURRENT SOURCE OF TRUTH** for actual project state (not to be re-run in
full — only targeted re-checks per phase when a specific unknown blocks that phase). Do not create new
audit skills. Do not expand audit scope for full pixel-perfect coverage of the old version.

- **AUDIT SOURCE** = `docs/TAJSTAY_CURRENT_STATE_AUDIT.md`
- **ROADMAP** = `docs/TAJSTAY_IMPLEMENTATION_ROADMAP.md` (created this pass — 11 phases, each with
  CURRENT PROBLEM/TARGET STATE/ARCHITECTURE/FRONTEND/BACKEND/DATA/SECURITY/MOBILE/QA/DEPENDENCIES/
  ACCEPTANCE, built directly from confirmed audit findings, not theoretical)
- **CURRENT PHASE** = Phase 1 (Architecture Foundation) — shell isolation **DONE this pass** (see
  DONE below), remaining Phase 1 work: eliminate remaining duplicate CSS "palette lock" blocks
  repo-wide, establish one canonical design-token file.

Per-phase loop (roadmap doc, same as before): audit reference → targeted re-check of only that phase's
unknowns → architecture/design decision → implement → typecheck/lint → runtime QA (desktop+mobile,
RU baseline + TJ/EN where i18n-visible) → fix → regression on touched areas → commit → next phase.
Compile success is never PASS for user-facing/security-sensitive work. Do not wait for a new prompt
between phases. Do not report "ready for next narrow block" and stop. Only stop for: destructive
production operations, real data-loss risk, a missing required secret, or a legal/business call that
can't be safely assumed. Session/turn limits are not a stopping reason.

Standing scope-discipline rule (explicit, repeated by the user): if implementation surfaces a genuine
unknown, investigate only that dependency, then continue — never fall back into another global audit
pass. Reuse confirmed-real subsystems, never rebuild them: custom `/api/phone-otp/*` (not Firebase, not
a new OTP system) for phone verification; `lib/pms/*` + `HotelStaff`/`staff.ts` foundation for Owner
Staff; `src/lib/trips/classify.ts` for History classification; `BOOKING_STATUS` enum as the single
source of booking-status truth.

Key corrections from the user in this specific contract (override earlier interpretations of the same
areas): no placeholder text ("Куда едете?" etc.) inside the city field when empty — label + icon +
empty tap/type area only; search field zones must be fully **borderless** internally (structure via
spacing/typography/icons, not lines); dates must render via TajStay's own display layer, never a bare
native `<input type="date">`, because real mobile browsers were showing it empty; mobile Home has its
own acceptance gate — first viewport (390/412px) must show headline + working Search with no scroll
required, hero copy cannot push Search below the fold; Profile's phone/avatar/email flows must reach
a **real** end state (or a named external blocker, e.g. "no SMS provider credential") — a permanent
"Скоro" disabled button is no longer acceptable as a final answer for those two specifically.

## Branch / SHA

- Branch: `feature/tajstay-full-ui-ux-rebuild`
- Base SHA (this pass): `419fe9d`
- Final SHA (this pass): `12ed32a`
- Local dev only — nothing deployed. Server on `localhost:3000` via the project's own `preview_start`/
  launch.json config (port 3000 is pinned — `NEXTAUTH_URL` depends on it). Do not manually start a
  second ad-hoc `npm run dev` on another port again — it broke script execution in the browser tool
  this pass (crossed some origin/CSP boundary) and wasted significant time before being traced to that.
- **QA isolation**: created a dedicated test account not shared with other sessions —
  `qa-claude-session@tajstay.local` / `QaClaude123!` (id 33, role GUEST, local dev DB only). Use this
  instead of the shared seeded `guest@tajstay.local`/`owner@tajstay.local`/`admin@tajstay.local`
  accounts when evidence must be reproducible and uncontaminated by concurrent sessions. The shared
  seeded accounts remain fine for one-off manual spot checks where isolation doesn't matter.
- An external tool periodically auto-commits this working tree under the user's own git identity
  (not Claude Code, e.g. `efa962f`/`aaec9c0`) — not a cause for alarm, already verified benign.

## Correction contract received (2026-09-10, same day as Final Commercial Product Contract)

The user sent screenshots from a **deployed Vercel preview URL** (`tajstay-kayafrjhk-xzba626s-
projects.vercel.app`) showing several regressions/unfinished items: legacy dark-green Auth screens,
Cookie banner + TajStay install prompt shown simultaneously (explicitly forbidden), no "reject non-
essential" cookie option, Admin donut chart center labels not fitting ("15 Пользователи" overflow),
Admin analytics headline/legend numbers that don't add up (Hotels: headline 1 vs legend implying 4;
Bookings: headline 30 vs legend implying 7 — investigate data semantics before trusting these KPIs),
TajStay logo used as a user avatar fallback, mint verification pills/Admin-panel row still present, an
unidentified black floating widget on every route. **Important: that deployment has not been confirmed
to be running this branch's code** — do not assume screenshots from it reflect local commits, and do
not assume local fixes are live there either. Local dev (`localhost:3000`) is the only environment
actually verified this session.

## DONE (this pass — Phase 1, implementation mode)

- **Shell isolation fixed** (the top architectural blocker, two prior attempts had broken webpack).
  `middleware.ts` now tags every request with `x-tajstay-shell` (`admin`/`owner`/`consumer`), computed
  from the path alongside the existing session gate; root `layout.tsx` reads that header and only
  renders Consumer chrome (Header/Footer/MobileBottomNav/AppShell/CookieConsent/PwaClientShell) when
  the shell is `consumer`. Admin/Owner keep rendering their own existing self-contained
  `DashboardShell`-based layouts unchanged. Not CSS-hide — server decides what to render, nothing is
  mounted then hidden; avoids the prior failure mode entirely (no RSC passed as a client prop).
  **Verified in-browser**: logged in as seeded admin, `/dashboard/admin` shows only Admin's own
  sidebar/bottom nav, zero Consumer nav links, zero console errors; Consumer Home unaffected (Header +
  bottom nav present, zero console errors). Owner path uses identical code, not separately
  browser-verified with an owner login this pass (same mechanism, lower-risk to assume symmetric than
  to force a second manual login cycle this turn — flag for a quick spot-check next Owner-focused pass).
  Commit `8834d03`.

## DONE (this pass, continued)

- **Auth screens (`/auth/sign-in`, register mode)**: fixed the confirmed HARD FAIL from the user's
  deployed screenshot — dark-emerald card/inputs/heading, duplicate label+placeholder text on 4
  fields. Root cause of the stubborn dark input fields found and fixed (see the pattern note above).
  Verified via screenshot + direct computed-style/CSSOM inspection on a freshly rebuilt server.
  **Not done in this pass**: the decorative left-side promo panel (mountain photo, still dark by
  design choice per the "controlled brand section" allowance) — flag for a follow-up visual pass, not
  color-swapped blind. Also not yet checked: Forgot Password screen, Telegram/Google button states,
  OTP verification panel (`.taj-otp-cell-input` still has old dark styling, unrelated to what was
  visible in the reported screenshot).

## DONE (this pass)

- Fixed the real Cookie/Install sequencing bug confirmed in the deployed screenshots: `PwaInstallPrompt`
  had zero gating logic (showed instantly on `beforeinstallprompt`, could appear same time as the
  cookie banner). Now waits for cookie consent to resolve (via a `tajstay:cookie-consent-resolved`
  event or an already-resolved localStorage value), then a 15s engagement timer, before becoming
  eligible to show. Added the missing "Отклонить необязательные" cookie action (was Accept-only).
  Both components' legacy dark-navy/dark-green theme replaced with white surface + canonical
  `#0F7A4D` per the "green surface → white text/icons, white surface → dark text/green action" rule.
  **Not fully runtime-verified**: the reject button renders in the compiled JS bundle (confirmed via
  direct chunk inspection) but did not appear in the live DOM during this session's browser testing,
  despite a full service-worker unregister + cache clear + hard navigation with a cache-busting query
  param — same "compiled bundle correct, live DOM doesn't reflect it" symptom hit earlier with the
  `ProfileMockupView` crash investigation, and equally unresolved. Do not mark Cookie/Install PASS
  without re-verifying in a clean browser session next time.
- Removed the city-field placeholder per the user's correction (label alone is sufficient, no
  "Куда едете?"/"Куда вы хотите?" text) in `SearchBar.tsx`.
- Investigated the unidentified black floating widget: no matching component, package, or third-party
  script found anywhere in this repo (no `@vercel/toolbar`, no chat-widget SDK). Given the screenshots
  are from a `*.vercel.app` preview URL, this is most likely Vercel's own Preview Toolbar (auto-
  injected for authenticated Vercel accounts viewing team preview deployments) — not TajStay code, and
  not something an end user would see on the production domain. Not fixed because there is nothing in
  this repo to fix. Flag to the user for confirmation rather than continuing to investigate blind.
- **Real root-cause fixes** (not dismissed as environment), found via rigorous elimination after the
  user correctly rejected an earlier "environmental flake" claim:
  - `/profile` was passing raw Prisma `Booking` rows (with `Decimal`/`Date` fields) into a
    `"use client"` component that only used `.length` on them — fixed via `_count` instead of full
    relations. Confirmed via server log: the "Only plain objects can be passed to Client Components"
    warning is gone after the fix.
  - Service worker (`public/sw.js`) had two real defects: (a) `/_next/*` chunks were cache-first, but
    dev/some-deploy chunk URLs aren't content-hashed, so a stale chunk could be served forever after a
    rebuild — switched to network-first-with-fallback; (b) navigation HTML caching had no allowlist,
    so **authenticated pages like `/profile` were being cached in the shared offline cache** — a real
    cross-account privacy risk on a shared device. Restricted to an explicit public-route allowlist,
    bumped `CACHE_VERSION` to purge old poisoned caches.
  - `TrustBadges.tsx` had an unguarded `badges.length` with no default — hardened. Also fixed its
    verification-pill colors, which were still legacy pale-mint (`#d1fae5` on `#0f7a4d`) — now solid
    `#0F7A4D` on white.
- Profile root IA dedup, Personal Information field cleanup (removed Пол/Язык/Мои отзывы), real name
  editing (API + component), 3 dead phone/email/telegram links replaced with honest disabled states
  (**note**: per the new contract §36-38, "disabled + Скоро" is no longer sufficient for phone/avatar
  specifically — see OPEN), Admin donut chart CSS root-cause fix, green public header with Admin/Owner
  correctly kept light, hero simplified, promo banner bugs fixed, passport architecture decision
  written into V2 and a false public claim about passport storage removed — all from the prior pass,
  still standing, see previous commits for evidence detail.

## OPEN (large — from the Final Commercial Product Contract's full scope, essentially everything)

Restructured per the contract's phase order (§118) rather than a flat list — work top to bottom,
returning to earlier phases only if regression is found:

1. ~~Shell isolation~~ **DONE this pass**. Remaining Phase 1 work: eliminate remaining duplicate CSS
   "palette lock" blocks repo-wide (CSSOM-enumeration technique, see the note above), establish one
   canonical design-token file per `docs/TAJSTAY_IMPLEMENTATION_ROADMAP.md` Phase 1.
2. Mobile Home acceptance gate (§9, §119) — first viewport must show headline+Search with zero scroll
   at 390/412px; current state not verified against this specific gate yet.
3. Search field internals: remove all internal borders (§11), city placeholder removed this pass ✓,
   fix real-mobile-device date-empty-state bug with a custom date display layer (§14), fix search
   button proportions (§18).
4. Auth: sign-in/register card+fields+labels fixed this pass ✓. Still open: promo panel redesign,
   Forgot Password screen, form density pass (§6 of the correction — compact spacing, no giant gaps),
   OTP verification panel colors, RU/TJ/EN runtime check on Auth specifically.
5. Profile: real avatar upload/change/remove flow, real phone change+verification flow (or a named
   external blocker, not a permanent disabled button), Settings dedup, notification inbox vs settings
   split, Support consolidation — partially done, needs finishing per the stricter final-state bar.
6. Hotels/booking/reviews/chat, Tours visual pass, Owner onboarding redesign — not started.
7. Owner Hotel Desk (overview, calendar, rooms, bookings, finance, occupancy gauge, analytics, staff
   invite architecture) — not started.
8. Admin Command Center (deep analytics beyond the donut fix, operational queues, applications,
   users, complaints) — not started. **Data-integrity concern found in deployed screenshot, unverified
   locally**: Hotels KPI headline showed 1 but its donut legend implied 4 total; Bookings headline
   showed 30 but its legend (confirmed 6 + cancelled 1) implied 7. Before building more charts,
   check whether the KPI headline and its own donut are querying the same dataset/denominator —
   don't just make the numbers visually consistent, find why they currently disagree. Also fix donut
   center-label overflow for longer RU/TJ/EN words (e.g. "Пользователи" not fitting) with a
   bigger/responsive center area, and runtime-check every chart in all 3 locales, not just RU.
9. PWA install-prompt timing/theme — fixed this pass, not fully runtime-verified (see DONE).
10. Full performance audit (§87-91) — not started.
11. Full security audit (§101-113) — not started.
12. Full responsive/role/commercial regression (§126-127) — not started.

## BLOCKED

- ~~Admin/Owner shell isolation~~ **RESOLVED this pass** — see DONE above (`8834d03`). Two prior
  attempts (client-wrapper-around-async-Server-Components) broke the dev server; fixed instead via
  middleware header + conditional server-side render, no client-wrapper pattern involved.
- **`ProfileMockupView` client-only crash** (`Cannot read properties of undefined (reading 'length')`)
  — reproduces reliably on `/profile` only (confirmed NOT site-wide: `/search`, which shares the same
  header/UserMenu tree, renders fine). Investigated exhaustively this pass: verified SSR HTML is 100%
  correct (fetched and read the raw server response directly — full correct profile content, no
  error); verified the compiled client chunk on disk matches current source (grepped for
  `bookingsCount`/`favoritesCount`, present and correct); read every component in the render tree
  (`ProfileAvatar`, `TrustBadges`, `UserMenu`, `ProfileLogoutConfirm`) for unguarded `.length`/array
  access — found and fixed one real one (`TrustBadges`) but it didn't resolve this crash; ruled out
  stale service worker and stale `.next` build cache (full wipes, full restarts, dedicated fresh QA
  account, brand-new browser tabs, all still reproduced it). Root cause NOT found — do not mark this
  fixed, and do not re-explain it as environmental without new evidence. Next step: add explicit
  instrumentation (log full `componentStack`/props at the top of `ProfileMockupView`) or bisect by
  temporarily stripping the component tree down section by section until the crash disappears.
- **UPDATE — partially solved**: the "compiled bundle correct, live DOM wrong" pattern flagged last
  pass was NOT a caching/environment mystery for the CSS case. Root cause found via direct CSSOM
  enumeration (query every stylesheet, list every rule matching the live element, not just grep
  source files): `.taj-auth-page .taj-input-wrap`'s dark background survived every fix because a
  SECOND "final palette lock" block existed in `globals.css` (separate file, loaded after
  `auth-premium.css`, same selector, `!important`, old dark value) — the exact same
  duplicate-late-override pattern hit repeatedly this session (header, footer, etc.), just harder to
  spot because it spanned two files. Fixed (see auth commit). **Recommended technique for next time**:
  when a fix doesn't take effect visually, don't just re-grep the file you edited — run this in the
  browser console against the live element to see every matching rule across all loaded stylesheets:
  `Array.from(document.styleSheets).flatMap(s => { try { return Array.from(s.cssRules) } catch { return [] } }).filter(r => r.selectorText && el.matches(r.selectorText))`.
  The `ProfileMockupView` crash and the cookie reject-button-missing-from-DOM issue are a different
  failure mode (a JS error / an element absent, not a wrong style value) — this technique doesn't
  directly explain those, they're still open, but re-investigate them with the same "enumerate,
  don't assume" discipline before concluding they're environmental again.
- **Cookie reject button re-checked this pass with more rigor, still genuinely missing**: confirmed
  present in source (`CookieConsent.tsx`), confirmed present in the freshly-rebuilt compiled chunk
  (`grep` on `.next/static/chunks/app/layout.js` after a full `.next` wipe), confirmed clean browser
  console (zero errors/warnings), confirmed only one `CookieConsent` component and one usage exist in
  the codebase (ruled out a duplicate-component shadowing issue, which WAS the real cause of a similar
  auth bug this pass) — yet `document.querySelector('.cookie-consent__actions').innerHTML` shows only
  "Подробнее" + "Принять", no reject button element at all. This one is NOT explained by the CSS
  duplicate-override pattern above (nothing to enumerate — the element simply isn't in the tree).
  Genuinely unresolved; do not re-attempt without a new hypothesis (e.g. add a temporary
  `console.log(rejectLabel)` at the top of the component to check whether the prop itself is somehow
  throwing/undefined at runtime despite typechecking fine).
- **Production `site-content` values** (banner casing/URL) — only local dev DB fixed; production
  needs the same fix via the admin CMS UI, not a direct prod DB write from a session.
- **Passport/identity backend removal** (`guestDocumentUrl`) — architecture decision written (V2
  §29), dependency audit + safe UI disable not yet done (upgraded from "flag it" to "audit + disable"
  by explicit user instruction two passes ago — still not started).

## NEXT

**CURRENT AREA**: Admin Command Center — Overview section (`/dashboard/admin?section=dashboard`).
**CURRENT ROUTE**: `/dashboard/admin`
**CURRENT ROLE**: Admin (seeded `admin@tajstay.local`)
**LAST VERIFIED CONTROL**: Overview KPI cards (Отели/Пользователи/Бронирования/Оборот) — visual +
mobile pass done. Not yet clicked: "Требует внимания" panel actions, sidebar links to other 9 sections.

**Execution progress table** (per-area status — PASS only after full dimension check, not on sight):

| Role | Route/Section | Desktop | Mobile | RU | TJ | EN | Visual | UX | Function | Data | Error | Perf | Security | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin | Overview (`?section=dashboard`) | done (incl. 390/412) | done | done | done (bonus) | done | 6 fixed | done | done | FIXED (bookings, hotels, turnover, GMV definition documented) | empty-state verified clean; error path NOT exercised | not separately tested | n/a this screen | **PRODUCT/VISUAL/DATA/RESPONSIVE = PASS; ERROR PATH = NOT YET EXERCISED** |
| Admin | Applications | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Users | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Hotels | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Owner-access | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Bookings | — | — | — | — | — | — | — | — | KPI bucket bug fixed (see below) | — | — | — | OPEN |
| Admin | Finance | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Complaints | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Content | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Notifications | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Owner | (all 11 sections) | shell verified | — | — | — | — | — | — | — | — | — | — | — | OPEN, shell isolation confirmed, no section PASSed yet |
| Anonymous/Guest/Public | (all routes) | — | — | — | — | — | — | — | — | — | — | — | — | OPEN, not started |

**Status vocabulary from here on** (do not collapse these into "closed"/"fixed" loosely):
`ROOT CAUSE FOUND` (understood, nothing changed yet) · `FIXED` (code changed) ·
`RUNTIME VERIFIED` (fix confirmed live, in the actual product, not just by reading the diff) ·
`DEFERRED` (real fix identified, intentionally not done now, dependency named) · `OPEN` (unresolved).
"Found ≠ fixed. Fixed ≠ verified. Verified in one language ≠ PASS." — standing rule, not a one-off.

**Findings, commits `c71f512`, `9dfefad`, `02f6a34`, `4c9e0f7`** (all found by looking, none reported
by the user):

1. Donut center-label overflow — **FIXED, RUNTIME VERIFIED** (RU, TJ, EN all checked live).
2. 375/390/412px KPI-card legend truncation — **FIXED, RUNTIME VERIFIED** at all three widths.
3. Admin Bookings KPI bucket bug (`PENDING`/`CHECKED_OUT` phantom statuses, missing `WAITING_PAYMENT`)
   — **FIXED** in `src/app/dashboard/admin/page.tsx`, verified correct by enumeration against
   `BOOKING_STATUS`. **NOT runtime-verified against real data** — current dev DB has zero bookings in
   `WAITING_PAYMENT`, so no before/after count change was observable. Owed: create or find a booking in
   that status and confirm the donut/headline move together.
4. Admin Hotels KPI ambiguous fraction headline — **FIXED, RUNTIME VERIFIED** (RU/EN): headline/
   donut-center/legend all now read off `hotelTotal`, matching Users/Bookings. Accepted as correct
   semantics per review: "Отели = total" + breakdown by status, same pattern as Users/Bookings.
5. Admin 30-day Turnover summed ALL bookings' `totalPrice` regardless of status, so a cancelled/
   rejected booking inflated "Оборот" — **FIXED** (`status: notIn [CANCELLED, REJECTED, EXPIRED]`
   added), **RUNTIME VERIFIED** zero-state renders clean (no NaN%, no broken chart, plain "0 TJS").
   Not verified against a non-zero post-fix number — current dev DB's only booking is CONFIRMED, so the
   filter never had anything to exclude in this data set; correct by construction, same caveat as #3.
   Confirmed already-correct: GMV ("Оборот"/"30-day volume") and platform revenue (commission, shown
   separately with its own label and %) were never conflated — this part didn't need a fix.
   **CANONICAL DEFINITION now documented** (commit `3ec12da`, code comment in
   `src/app/dashboard/admin/page.tsx`) since a status filter alone isn't a complete metric
   definition: period anchor is `Booking.createdAt` (the only timestamp this model has — no
   `confirmedAt`/`paidAt` field exists, so a stricter "paid-only" GMV cannot be computed without a
   schema change, not approximated from existing fields); `WAITING_PAYMENT`/`PENDING_OWNER`/
   `ON_REVIEW`/`WAIT_PROOF` are deliberately INCLUDED — this is booking-creation volume/demand, not
   confirmed-and-paid revenue, which is exactly why it's labeled "оборот"/"volume", never "выручка"/
   "revenue". One metric, one definition, one query — documented so a future pass doesn't redefine
   it silently.
6. `TrustBadges` hydration mismatch — **PRODUCTION RUNTIME PASS / DEV-SERVER-ONLY ARTIFACT CONFIRMED.**
   `npm run build` (clean) → `next start` on a throwaway port with a local-only diagnostic `SEED_SECRET`
   → fresh tab → console: zero hydration warnings, correct `#0F7A4D` from first paint. Present in dev
   (multiple restarts this session), absent in prod — closed with evidence in both directions. Keep
   this note if it resurfaces: check dev-server module/HMR state, not the component source (verified
   correct in dev too — SSR and the final DOM were both already right; only the transient first
   client-render pass in dev showed the stale value).
7. Admin `headers()`/`x-tajstay-shell` — **ROOT CAUSE FOUND, verified not a regression.** Precise
   formulation: the pre-existing `getSessionUser()` call in root `layout.tsx` already called `cookies()`
   before Phase 1, which already forced the whole request tree dynamic — the new `headers()` call added
   no new dynamic dependency. (`npm run build` showing every route as `λ` is consistent with this, not
   independent proof of the pre-Phase-1 state, since the build was run post-Phase-1 — the cookies()
   read is the actual reason, confirmed by reading `src/lib/auth/session.ts`.)
   **New architecture finding for Performance/PWA phase (not a Phase 1 regression, not urgent now)**:
   because the root layout unconditionally reads session, essentially all of TajStay — including Public
   pages like Home/About/Tours that don't need per-user data — is force-dynamic with no static/cache
   eligibility. Worth revisiting in Phase 9: whether request-dependent chrome can move below a static
   public shell so those routes regain cacheability, without breaking auth/locale/shell behavior.
8. Duplicate identity API calls — **ROOT CAUSE FOUND, DEFERRED to Auth/Profile phase (roadmap Phase 3)
   or PWA/performance (Phase 9).** Two independent identity-fetching systems (NextAuth `useSession()` +
   custom `AuthStateSync` polling `/api/auth/me`) run in parallel without shared state. Not closed —
   remediation still owed, tracked here so it isn't lost.
9. Owner shell isolation — **FIXED (Phase 1), RUNTIME VERIFIED at desktop and 375px mobile.** Note:
   375px is useful signal but is not the two mandated mobile targets — **next real Owner pass must also
   check 390px and 412px specifically**, not just treat 375px as sufficient. Not blocking Phase 1 exit
   (Admin's shell fix, the actual architectural change, is verified at all three), just not yet proven
   at the exact target widths for Owner specifically.
10. One `Failed to load resource: 500`, source never isolated, not reproduced on repeat checks — OPEN,
    low priority, re-open only if it recurs with a capturable URL.
11. "Требует внимания" panel — checked against source, **confirmed NOT decorative**: every row is a
    real Prisma count (`ownerApplication`, `hotel` pending, `booking` on-review, `complaint`,
    `notification`) linking to a real filtered section route, conditionally rendered only when count>0.
    Current empty state ("Нет срочных задач") is clean, human copy — not developer language. No fix
    needed; this was already correct.
12. Users KPI — checked: `usersGuest + usersOwner + usersAdmin` should equal `userTotal` by construction
    only if `User.role` never holds a value outside those three; the schema field is a plain `String`
    (`@default("GUEST")`), not a true enum, so this is unenforced at the DB level. Currently sums
    correctly (3+1+1=5). **OPEN, low-priority, watch-item**: if a future role value appears (e.g. a
    staff role), the Users donut could silently repeat the exact class of bug just fixed in Bookings.
    Not fixed defensively this pass — flagging is the correct scope for now, not a speculative rewrite.

**ADMIN OVERVIEW = PRODUCT/VISUAL/DATA/RESPONSIVE PASS; ERROR PATH NOT YET EXERCISED** (precise status,
not blanket PASS, per review). Full cycle completed: desktop, 375/390/412px mobile, RU/TJ/EN, all 4 KPI
cards' data semantics checked (3 fixed with canonical definitions documented, 1 confirmed
already-correct), attention panel confirmed real, empty-state checked clean, console/network checked
(only the already-triaged dev-only hydration warning remains, zero new errors). **Loading state**: not
separately observed (page loads fast enough in dev that no distinct loading UI was seen — not the same
as verifying one exists and renders correctly). **Error state**: NOT exercised — no fault was injected
(no forced Prisma failure, no simulated network error); this is an honest gap, not silently assumed
covered. Not blocking progress to the next section — fault injection for a read-only dashboard is lower
priority than moving through the remaining sections, but recorded accurately rather than glossed over.

## Applications E2E — IN PROGRESS (commits `df4c06c`, `cad1ed7`, `4635c1e`)

**Product correction landed this pass**: Become Owner no longer has ANY KYC/document step —
identity/identityBack/selfie/propertyDoc/documentUrl removed entirely (UI, validation, state,
submission). Documents step is now a photos-only step ("Фотографии объекта"): facade required,
room/bathroom optional. Verification of new owners is a manual process (Admin calls the applicant,
cross-checks public listing info) — matches the already-recorded V2 decision against storing identity
documents, now actually enforced in the flow, not just documented as a future intent.

Also this pass: "ФИО по документу" → "Имя и фамилия" (RU/TJ/EN); removed the repeated "ОБЯЗАТЕЛЬНО"
badge per field in favor of a compact "*"; rewrote the sidebar from a dark navy/black promo panel to
canonical light theme and removed the decorative "TajStay Partners" eyebrow entirely; replaced an
unverified commercial promise ("Бесплатное размещение на старте") with a real, always-true feature
claim, since it wasn't confirmed as a fixed business policy; found and fixed a genuine cookie-consent
Accept-button contrast bug (`[data-theme="light"] button { color: inherit }` had higher specificity
than `.cookie-consent__accept`'s own white-text rule, confirmed via `getComputedStyle`, not source
reading alone — text was silently rendering dark-on-green).

**Dev-server rendering for this exact page is now confirmed unreliable across 4 separate instances
this session** (TrustBadges-class mismatch, city-field reset, full sidebar/label edits not appearing,
cookie button) — every single time, a fresh `npm run build` + `next start` on a diagnostic port showed
the fix was correct and the dev-only symptom didn't reproduce. This is now the established, trusted
verification method for `/profile/become-owner` specifically — don't re-litigate this in dev again for
this page; go straight to a production build check if something looks wrong here.

Per instruction: test Admin → Applications through the REAL user pipeline, not a direct DB insert —
QA Guest → Become Owner form → submit → Admin reviews/approves → Owner access check. This is
deliberately a cross-role, cross-page test (Guest UI → API → DB → Admin UI → Owner UI), not a
single-screen check.

**CURRENT STATE**: Logged in as `qa-claude-session@tajstay.local`, opened `/profile/become-owner`
(never opened before this session). Found and fixed real defects along the way, all by using the form,
none reported:

1. **Whole form was dark/near-unreadable** — `.owner-form-card`/`.owner-input`/`.owner-wizard-*`/
   `.owner-status-*` in `globals.css` were a stale, duplicate-competing legacy dark-theme definition
   (the Owner CRM has its own correct light version in `owner-command-center.css`, which this public
   route never loads — same duplicate-CSS anti-pattern flagged throughout this audit). **FIXED,
   RUNTIME VERIFIED**: rewrote to canonical light theme (#0F7A4D accents, white surfaces). Submit
   button was also off-brand lime/emerald gradient, now canonical `#0F7A4D`.
2. **City field silently invalid** — the empty-value placeholder `<option>` displayed the text
   "Душанбе" (reusing the `cityPh` label) while its real `value` stayed `""`, so the field looked
   filled but wasn't; pressing Next threw "fill required field" on a visibly-filled field. **FIXED**:
   defaulted `city` state to the real first canonical city + added a defensive mount-effect fallback.
   **RUNTIME VERIFIED in production build only** (`next build` + `next start`, fresh diagnostic port,
   throwaway `SEED_SECRET`) — city correctly shows "Dushanbe", zero hydration errors. In **dev** this
   page intermittently still shows the old empty value even with the fix compiled into the bundle
   (bundle-content-verified present) — same class as finding below, dev-only, not a real defect.
3. **Identity document (passport front) was hard-required**, blocking submission — heavy KYC has no
   place gating first commercial onboarding (matches the already-recorded V2 architecture decision to
   move away from storing identity documents). **FIXED**: made optional; `facade`/`room`/`bathroom`
   property photos remain required (legitimate for a hotel listing).
4. **New hydration finding on this page**, distinct from the already-triaged TrustBadges one — "Text
   content does not match server-rendered HTML" / "Switched to client rendering" (a Suspense-recovery
   path). **ROOT CAUSE FOUND: dev-server-only artifact, RUNTIME VERIFIED absent in production** — same
   evidence method as TrustBadges (clean `npm run build` → `next start` → fresh tab → console): zero
   hydration errors, city field correct from first paint. Not chased further to a dev-specific
   mechanism (would be the third such investigation this session) — the standing lesson is now: **this
   dev environment accumulates real hydration-adjacent staleness/mismatches across long sessions with
   many restarts; when one appears, verify against a production build before assuming it's a real
   defect, but don't assume it either — check every time.**

**NOT YET DONE** (this is where the E2E resumes — do not restart from data-entry, continue from here):
- Step 1 (Личные данные): fields pre-filled from QA account defaults; city bug fixed. Not yet
  re-clicked through end-to-end since the KYC-removal edits — do a fresh pass through step 1 first
  (fast, low-risk) before assuming it still advances cleanly.
- Step 2 (Объект/property): businessName, propertyType, address, roomCount, guestCapacity,
  propertyDescription — not yet filled or visually reviewed. Per this pass's product correction, do
  NOT add a map/pin control here unless `src/app/map` or existing hotel-location infrastructure
  already supports it cleanly — check before building a second map integration (instruction §6 asked
  for a map; not yet investigated whether one can be reused vs. is a real new-build task).
- Step 3 (Фотографии): now photo-only (facade/room/bathroom, only facade required) — need a REAL QA
  image upload test: preview/remove/replace/size/MIME validation/failure/retry.
- Step 4 (Отправка/review + consent) — not yet reached. Confirm the consent checkbox text is the
  short, human, non-legal-wall-of-text version the correction asked for, not a leftover heavier one.
- Submit — not yet attempted. After submit: check HTTP/API result (note: `/api/apply/owner` or
  equivalent route may still reference removed upload fields server-side — check the API route
  handler accepts the new, smaller FormData shape without erroring on missing identity/selfie/etc.,
  since only the client was changed this pass, not yet verified against the backend route).
- Admin side: log back in as `admin@tajstay.local`, open Applications, verify the new QA application
  appears, open detail — review whether Admin Application Detail still references/expects identity
  documents that no longer exist (instruction §12 asks for this screen to be rebuilt for the new
  model) — not yet checked, likely still shows old document fields expecting uploads that will now
  never arrive.
- Approve/Reject flow, post-approval Owner access check, responsive (390/412/768), RU/TJ/EN, security
  checks — unchanged from before, still all open.

**Dev server note**: restarted clean at the very end of this pass (serverId `fe60ecda...`, tab
`tab-1`); this exact page (`/profile/become-owner`) has shown dev-only stale-render symptoms 4 times
this session — verify via production build (see pattern above) before trusting a dev-only "still
broken" read on this specific route.

## Also still owed (Phase 1 design foundation, not lost)

Canonical design tokens; remaining duplicate "palette lock" CSS audit repo-wide; no legacy mint/
dark-green/navy brand surfaces (found and fixed several more this pass, in the onboarding form
specifically — worth a repo-wide sweep, not assumed exhausted); no global `!important` hacks. Do a
mini-regression across Public/Auth/Profile/Admin/Owner once that foundation work lands.

## Standing rules (do not relitigate each session)

For every new Admin/Owner KPI: definition → query → verification → chart, never decorate a number
before its semantics are checked. Do not mark anything PASS from one language, one viewport, or a
correct diff alone. When a hydration/console error appears: investigate for a real cause first, but if
suspicion points to dev-server staleness, verify against a clean production build before either
fixing blindly or dismissing as environmental — this session established the pattern three times
(TrustBadges, this page's Suspense mismatch, the city-default runtime gap) and it held every time.
Do not return for a new prompt between sections/steps. Do not fall back into a global audit pass.
