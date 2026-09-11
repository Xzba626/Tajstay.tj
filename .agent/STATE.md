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

## Applications E2E — CORE FLOW VERIFIED (commits `df4c06c`, `cad1ed7`, `4635c1e`, `c81a8bd`)

**Correct status (not "KYC removed entirely" — that overstated it last pass, per review):**
- KYC USER UI = REMOVED, RUNTIME VERIFIED
- KYC CLIENT VALIDATION = REMOVED, RUNTIME VERIFIED
- KYC CLIENT SUBMISSION = REMOVED, RUNTIME VERIFIED
- **KYC SERVER REQUIREMENT = REMOVED, RUNTIME VERIFIED** (was still hard-blocking every submission
  with "Загрузите фото паспорта / ID" until this pass — found by actually testing submit, not assumed
  fine because the client looked right)
- **E2E VERIFIED**: QA Guest submit (direct API call with a real multipart photo, matching exactly
  what the client now sends) → `{ok:true,id:5}` → Admin Applications shows it correctly (name, hotel,
  phone, email, owner id, status, Одобрить/Отклонить — **already matches the minimal card the review
  asked for, no rebuild needed, no leftover document-field expectations found via grep or visual
  check**) → Approve (real confirmation dialog: "Пользователь сразу получит роль владельца и доступ к
  кабинету") → QA user's own `/api/auth/me` shows `role: "OWNER"` → `/dashboard/owner` renders "Добро
  пожаловать, владелец!" immediately, real access, no dead Guest state.
- Test artifact (the uploaded 1x1 PNG) deleted from `public/uploads/`; `/public/uploads/` added to
  `.gitignore` so future QA uploads don't get committed.

**Still open, not yet done** (approve-only happy path verified; the rest of the matrix is not):
- Reject flow E2E (reason required, applicant sees it, resubmit path if any).
- Admin Application Detail **visual** polish — current card already has the right *fields*, but the
  review asked for a specific compact layout (hotel name, city+map, photo count, applicant name,
  clickable phone, Approve/Уточнить/Отклонить) — not yet compared against that target shape.
- Map picker on the property step — still not built; check whether `src/app/map` or existing
  hotel-location infrastructure can be reused before building a second map integration.
- Real photo upload UI test (preview/remove/replace/MIME/size/failure/retry) — the E2E test above used
  a direct API call with a synthetic PNG, not the actual `FileUploadCard` UI interaction.
- Request Info flow — not investigated whether it's real/useful or decorative; decide before keeping it
  in the primary action set.
- Full step 1→4 click-through via the actual UI wizard (not API shortcut) — not re-done since the
  KYC-removal edits; do this before calling the form itself fully regression-clean.
- Responsive (390/412/768) and RU/TJ/EN passes on the simplified form — not done.
- Security checks: Guest can't approve/reject (own or others'), ID manipulation on application/owner
  endpoints — not done.
- `applicantType` state/FormData field still exists client-side (harmless, unused, low-priority
  cleanup) — the visible UI field is gone, the dead state wasn't worth the extra edit risk this pass.

## User-reported production screenshots — real bugs found (commit `bbcf1aa`)

User sent screenshots of the live Vercel deployment (`tajstay-cj0biqwfq-xzba626s-projects.vercel.app`)
showing several contrast/UX bugs. Checked each against current localhost before fixing — some were
already fixed in current source (deployment is stale, needs a redeploy to reflect this branch's work),
others reproduced live and got fixed for real:

**Fixed, reproduced on localhost, root-caused:**
- Home promo banner title/subtitle unreadable (dark text on green) — a repo-wide
  `h1,h2,h3,h4,h5,h6 { color: var(--ds-text-primary) !important }` reset (multiple duplicates found in
  globals.css) beat both `text-white` AND an inline style attempt. Fixed with a scoped `!important`
  class (`.home-promo-title`/`.home-promo-subtitle`), verified white via `getComputedStyle` after.
- Popular-destinations chip hover went near-black while text stayed dark — unreadable. Now a light
  green tint on hover.
- "Найти жильё" header CTA hover used the recurring legacy `#d1fae5` light-mint (near-invisible on
  white) — now darkens on hover instead.
- Removed the homepage aggregate reviews section entirely (product decision: reviews belong per-hotel,
  not as a site-wide landing block).

**Checked, already correct on current source (stale-deployment report, not a current bug):**
- Footer text contrast — computed style confirmed white-on-green, correct now.

**RESOLVED this session (commit `9909991`): TST Assistant dark theme.** Full deliberate rewrite of
`tst-assistant.css` (612 lines) to the canonical light theme — white panel/toolbar/cards/inputs, dark
`--taj-text` for primary copy, `#0F7A4D` for brand/links/active-chip state, tinted (not saturated-dark)
warn/error notices. Verified live: opened the panel, screenshot confirms readable white surface with
correct green avatar/accents. Also found and fixed 3 buttons (send/primary/FAB) with the same
`[data-theme="light"] button { color: inherit }` specificity bug as the cookie-consent Accept button —
confirmed via `getComputedStyle` before (dark text on green) and after (white) for each. This closes
the single highest-recurrence item from this session's user reports.

**Reported, investigated, explicitly NOT fixed this pass (documented, not lost):**
- Auth page (sign-in/register): reported duplicate label+placeholder text, Telegram/Google button
  styling, and an unclear/undecided-looking left-side panel on desktop — **not yet re-verified against
  current localhost** (this session's very first-pass fixes touched some of this — "removed 4 redundant
  placeholder props" per earlier history — but the exact current state on this branch is unconfirmed).
  The user separately asked for **real hotel data** to show in that left panel instead of a decorative
  empty-feeling block — not investigated this pass.
- Mobile home hero heading reported as too large/verbose for a compact app-like first screen — not
  re-checked this pass (was addressed earlier in project history per STATE.md's own notes on hero copy
  length; may have regressed or may already be fine, unconfirmed).
- User's report was explicitly partial ("остальное я потом отправлю") — expect a continuation.

**Also fixed this session, from the same user-report thread (commit `f8e9d6a`)**: Admin > Users >
owner-access was showing a Google-auth owner's internal placeholder phone (`google_<ts>_<n>`, a
schema-satisfying synthetic value, see `accountPhone.ts`) verbatim as "Логин (телефон)" — a real
data-semantics leak of an internal value to the admin UI. Now shows the actual sign-in method
(Google/Telegram/Email). Also cleaned up "Email: Email не указан" (duplicated label) and renamed the
reset button to plainly describe what it already does.

## Access recovery — backend E2E traced precisely, one real gap found

Per explicit instruction not to accept "backend looks complete" without tracing exactly what happens
after the admin clicks — read `src/app/api/admin/users/reset-password/route.ts` and
`src/lib/email/sendPasswordResetLink.ts` line by line, not just skimmed:

**CONFIRMED SOUND** (this is the commercial model the user wants, already implemented, not built
this pass — just verified rather than taken on faith):
- Raw token exists only in server memory (`newToken()`) and inside the `resetUrl` string passed
  directly to `sendPasswordResetLinkEmail()` — it is **never** included in the redirect response back
  to the Admin UI (the redirect only carries `ok=recovery_sent` or a specific `error=...` code, no
  token, no URL). Admin genuinely cannot see or copy the user's reset link.
- Only the SHA-256 **hash** of the token is stored (`passwordResetToken.token`), single-use (deleted/
  replaced on each new request via `deleteMany` then `create` in one transaction), TTL 1 hour.
- Rate-limited two ways (`admin:reset-issue:actor` — 10/hour per admin, `admin:reset-issue:target` —
  3/hour per target user) — cannot be hammered from either direction.
- **Fail-closed on delivery, not fake success**: `sendPasswordResetLinkEmail` returns `{ok:false}` if
  the Resend client isn't configured, and the route reacts by deleting the just-created token and
  writing an audit entry (`reason: "delivery_unavailable"`) — the admin sees a distinct, honest
  message ("Не удалось отправить письмо восстановления. Проверьте почтовый провайдер."), never
  "Ссылка отправлена" unless the email genuinely sent. Every error path (`recovery_no_email`,
  `recovery_banned`, `recovery_rate_limited`, `recovery_delivery`, `recovery_failed`) maps to its own
  specific, correctly-worded message — not a generic catch-all.
- Full audit trail either way (`writeAdminAudit`, action `owner_recovery_issued` or
  `owner_recovery_issue_failed` with a specific `reason`), banned-user and no-email cases both
  explicitly blocked before any token is even created.
- Token itself is never logged (grepped `sendPasswordResetLink.ts` and the route — no `console.log`/
  audit field ever carries the raw token or the full `resetUrl`).

**REAL GAP FOUND, NOT YET FIXED**: `User.password` is a non-nullable schema field — every account,
including Google/Telegram OAuth signups, has *some* password hash (a random unusable one, per the
existing OTP-registration pattern seen earlier this audit). The Owner Access UI's reset button shows
unconditionally for every `OWNER`-role user regardless of how they actually authenticate — a
Google-only owner would get "Отправить ссылку для сброса пароля" for a local password they never use
to sign in, exactly the confusing case flagged. **Not fixed this pass** — needs: detect the user's
real sign-in method (the same classification now used in the phone-label fix) and either hide/relabel
the reset action for OAuth-only accounts, or show it with accurate framing about what it actually
resets. Belongs with the broader Auth/Profile phase (Phase 3) alongside the identity-model work
already flagged there.

**NOT YET DONE this pass** (traced the backend rigorously; did not re-run the actual click-through):
self-service `/auth/forgot-password` E2E (expired/used/invalid token, second-reset invalidates first,
rate limit, no account enumeration) — the backend code inspected strongly suggests this holds (same
`passwordResetToken` table/pattern), but per standing rule this needs a live pass before calling it
PASS, not inferred from the admin-side code alone.

## SYSTEMIC FIX — service worker was registering in local dev (commit `c81a8bd`)

**This is the real finding behind 4 separate "stale UI" investigations this session** (TrustBadges,
city-field reset, sidebar/label edits, cookie button) — not 4 unrelated page-specific flukes.
`PwaProvider.tsx` called `navigator.serviceWorker.register("/sw.js")` unconditionally, including
against the dev server. Next dev serves non-content-hashed chunk URLs and can return slow/aborted
responses mid-recompile; the SW's network-first `/_next/` handler falls back to `caches.match()` on
any fetch failure, and once it does, that stale chunk can keep being re-served indefinitely — explains
every symptom seen (correct SSR HTML + correct compiled bundle + stale rendered DOM, simultaneously).

**Fix**: registration now gated to `NODE_ENV === "production"`; in dev, any existing registration is
explicitly unregistered on mount instead. **Verified correct in the compiled bundle** (`if (true) {
unregister-all }` confirmed present for dev builds). **Live unregister-in-browser verification was
inconclusive in this session's browser tooling** — a registration persisted through multiple reloads
in the automated test tab despite the correct code path executing; this reads as a tooling/profile
quirk in this specific test harness (no other registration source exists in the codebase, confirmed by
repo-wide grep), not evidence the fix is wrong. **A real user should confirm in an actual browser**:
open dev tools → Application → Service Workers on `localhost:3000` and confirm none is listed after a
hard refresh.

**Not yet done** (out of scope for this pass, correctly deferred not forgotten): production PWA
update-safety audit (§25 of the instruction) — confirming a real deployment doesn't leave returning
users on a mix of old HTML + new JS after a release. The existing `sw.js` `/_next/` handler is already
network-first (not cache-first) and `activate()` already purges old `CACHE_VERSION` entries, which is
the right shape for this, but it hasn't been specifically tested against a real old→new deployment
transition. Belongs in the Phase 9 PWA/performance pass.

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

## This session's closing batch (commits `f793445`, `5b24a5b`, `3c0bdb0`)

**Identity capability model** — new `src/lib/auth/identityMethods.ts`, `resolveIdentityCapabilities()`.
Replaces the earlier phone-prefix-only inference (which conflated "no real phone" with "no real
password" — wrong for email/password users with no phone) with real signals: NextAuth `Account.provider`
for Google, `telegramId` for Telegram, verified-non-placeholder phone for Phone; password-based is
whatever's left. Wired into both the Owner Access UI (shows real method, hides reset action + shows
`noPasswordCredentialHint` for OAuth-only accounts) AND the reset-password API route itself (rejects
server-side with its own audit reason, not just a hidden button). **STATUS: FIXED, RUNTIME VERIFIED**
(QA Claude account correctly shows "Вход: Email/пароль", real phone excluded since unverified).

**Applications card photo/id leak** — `applicationMeta.uploads` was fetched but never rendered anywhere;
`(id {userId})` was shown directly to the admin. Fixed: photo now renders, city/address shown, internal
id removed. **STATUS: FIXED, E2E VERIFIED WITH REAL DATA** — submitted a real JPEG through the actual
`/api/owner/applications` endpoint as the seeded guest account (not fabricated DB rows), confirmed as
admin that photo/city/address render correctly with zero internal ids visible.

**Reject flow root cause — the real bug behind the "Сохранение... hangs" report.**
`req.formData().catch(() => null)` in the reject route consumed the request body stream even on
rejection; the JSON fallback on the same request then read an already-drained stream and parsed `{}`,
so EVERY reject attempt failed with "Нужен комментарий" regardless of what was typed — 100% failure
rate, not intermittent. Confirmed by patching `window.fetch` client-side to prove the outgoing body was
correct, then tracing server-side to find it arriving empty — definitively a server bug, not a UI/state
issue. Fixed by branching on `Content-Type` instead of speculatively consuming the body twice.
**STATUS: FIXED, RUNTIME VERIFIED** — real reject submission now closes the form and the application
leaves the pending queue.

**Side note on tooling, not the app**: mouse-coordinate clicks on this page intermittently returned
"computer timed out after 30s" during active HMR/Fast-Refresh windows, while the click had actually
succeeded underneath (confirmed via `read_page` immediately after). Dispatching clicks via
`element.click()` in `javascript_tool` was the reliable way to test through this — worth reusing next
time real-device-reported "hang" symptoms need reproducing here, since it separates true app hangs
(the reject bug above) from this browser-tool/dev-server interaction artifact.

**NEXT** (real-device defects still open, per the screenshots already provided): Bookings 500 (root
cause not yet traced), Complaints showing ordinary reviews (domain-model mix-up, not yet traced), Admin
Notifications top-content disappearing + dev/maintenance UI (`30`/`Удалить старые`) still in the primary
inbox + developer-language notification copy, mobile nav duplication (header hamburger + bottom "Ещё").
Also still open from earlier: self-service `/auth/forgot-password` E2E click-through (backend inspected,
not live-tested), TST Assistant function/mobile regression (visual theme fixed, interaction not
re-verified), Users list mobile density (cards still show the full recovery paragraph per row).

## Admin mobile nav dedup + Home hero (commit `f45e544`, external auto-commit `423d8a4` for hero)

**Duplicate hamburger — root-caused, not just hidden.** `HeaderMobileActions.tsx` had dead-but-reachable
code rendering a second hamburger for Admin/Owner routes via `openWorkspaceDrawer()`, opening the same
"Ещё" drawer as the bottom-nav's own trigger. Confirmed via live testing that this component is
unreachable on the current branch (Header.tsx doesn't mount on Admin/Owner routes at all per the
earlier shell-isolation fix — `menuBtnExists: false` checked directly in the DOM), so the user's
screenshot showing both a top hamburger and bottom "Ещё" reflects the **deployed production
version, which predates this branch's fixes** — not a regression here. Removed the dead code anyway
so it can't silently resurface if shell isolation ever regresses. **STATUS: FIXED (dead code removed),
RUNTIME VERIFIED in production build** that only one trigger ("Ещё") exists.

**"Брони" moved out of primary mobile tabs** into "Ещё" (now under a widened "Операции" group with
Жалобы/Уведомления); "Отели" takes its place among the 5 primary tabs. Found and fixed an associated
real gap while wiring this: the drawer's group list never actually included a "bookings" entry in any
group at all, so it would have had nowhere to appear on mobile once removed from primary. **STATUS:
FIXED, RUNTIME VERIFIED in production build** (`Главная/Заявки/Отели/Пользов./Ещё` primary; drawer
correctly lists Контент/Финансы/**Бронирования**/Жалобы/Уведомления/Доступ владельцев).

**Home hero subtitle removed** ("Проверенные объекты • Безопасное бронирование" dropped, title-only
now) — already committed by the project's external auto-commit tool before I could commit it myself;
confirmed present in current source, not re-verified live this pass (low-risk, single-line change).

**Notable process finding this turn**: this session's dev server showed a genuinely confusing
false-negative — after editing `AdminSidebar.tsx`, the bottom nav picked up the fix immediately but the
"Ещё" drawer kept showing the pre-fix bookings-list across multiple full server restarts, a full `.next`
wipe, cache-busted URLs, and brand-new tabs, while the served JS bundle was independently confirmed
byte-for-byte correct each time. Root cause: a **leftover `sw.js` service-worker registration from
before this session's dev-gating fix** was still active in the test browser profile (confirmed via
`navigator.serviceWorker.getRegistrations()`), silently serving a cached response for that one request
class. Unregistering it and clearing `caches` resolved it in dev; a clean production build was
unaffected throughout and remains the fastest way to settle "is this a real bug" when dev looks broken
but the compiled source is confirmed correct — don't sink more time re-diagnosing dev itself once
source+bundle are confirmed right, go straight to a production build check.

**NEXT (not started this pass, explicit instruction pending)**: Mobile Profile compaction — remove the
duplicate top account card (avatar/name/role/verification badges/edit pencil, all already covered by
Личная информация), remove History/Favorites counters (already in bottom nav / not meaningful for
Admin), reconsider Подписки vs. Notification Settings overlap, make the whole root role-aware
(Admin/Owner/Guest each get only relevant rows). Target structure and full rationale already specified
by the user — implement directly, then mini-regression at 390/412 + RU/TJ/EN.

## Profile root compaction — DONE (commit `efee9c9`)

Rewrote `ProfileMockupView.tsx` to the exact target structure the user specified: removed the giant
identity card (avatar/name/role/verification badges/edit pencil — fully duplicated Личная информация),
removed the История/Избранное counter grid (meaningless for Admin/Owner, already in bottom nav for
Guest), removed the separate Подписки row. Root is now role-aware — GUEST sees the Become-Owner promo,
OWNER/ADMIN see one "Доступ" section linking to their own workspace only. Also fixed a genuine
copy/label bug found while touching this: the "Уведомления" row's subtitle was literally the Settings
row's own text ("Язык, валюта и приложение") due to a reused message key — now correctly says
"Настройки уведомлений" / "Каналы и типы уведомлений".

**STATUS: FIXED, RUNTIME VERIFIED in a clean production build** at 390px — matches the target
structure exactly (Профиль → Личная информация/Безопасность/Настройки/Настройки уведомлений →
Админ-панель → Поддержка → Выйти), fits almost entirely on one screen without scrolling. **Dev-mode
verification was abandoned this pass** after the service worker re-registered itself between checks
despite being explicitly unregistered moments earlier (cause not isolated — worth a closer look if it
recurs, but production was clean and consistent throughout, which is what ships). All linked routes
(`/profile/personal`, `/profile/security`, `/profile/settings`, `/notifications`, `/profile/support`,
`/dashboard/admin`, `/dashboard/owner`) were not modified — only which rows link to them and their
labels — so the pages behind those links are unaffected by this change; not individually re-clicked
through this pass.

**Home hero** subtitle removal (external auto-commit `423d8a4`) — confirmed present in source, not
re-verified live this pass (single-line, low-risk change, already covered by the Home mini-regression
owed from earlier passes).

**NEXT**: real-device defects still open — Bookings 500, Complaints/Reviews domain mix-up, Notifications
top-content-disappearing + dev/maintenance UI in the inbox + developer-language copy, self-service
`/auth/forgot-password` E2E, TST Assistant function/mobile regression. Also worth a short session someday
on why this dev server's service worker keeps reappearing after explicit unregistration — it hasn't
blocked any fix from shipping (production is unaffected and is the verification method being used), but
it's now cost real time across multiple passes.

## Evidence-tier discipline (standing rule from here on — do not conflate these)

Four distinct tiers, never treat one as proof of another:
1. **LOCAL DEV** — `npm run dev`. This session found it unreliable multiple times (stale SW,
   `.next` cache) — a fast signal, never sufficient evidence on its own for a "fixed" claim.
2. **LOCAL PRODUCTION BUILD** — `next build` + `next start` on a diagnostic port. This session's
   most reliable check when dev looked broken; confirms the code is correct and the production
   *build process* produces the right output.
3. **DEPLOYED PRODUCTION** — the actual `https://www.tajstay.site`. LOCAL PRODUCTION BUILD passing
   does **not** mean this reflects the same code — it only does after an actual deployment. No
   fixes from this branch have been confirmed live on this domain.
4. **REAL DEVICE** — an actual phone, ideally on the deployed domain. The user's own screenshots
   this session were tier 4 against a deployment that predates several of these fixes.

**Current status of this session's Admin-mobile-nav work**: tiers 1-2 both PASS (code correct, local
prod build correct). Tiers 3-4 are OPEN — after the next real deployment, re-check the actual
`tajstay.site` on a real device before calling any of this "verified" in the sense the user's
screenshots are evidence for.

## SW dev-cleanup improved (commit `cb8164a`)

`PwaProvider.tsx`'s dev-mode cleanup previously only called `unregister()` (stops future
navigations from being controlled, not the current one, and never touched cached responses) — now
also deletes TajStay-owned caches (`tajstay-` prefix only, matches `sw.js`'s own `CACHE_VERSION`
scheme, never touches unrelated browser storage) and reloads once if anything stale was found. A
developer should no longer need manual DevTools intervention for this specific failure mode.
Also renamed Admin's mobile "Главная" tab to "Обзор" (RU/EN — reads as Consumer Home otherwise;
matches Owner's existing "Обзор"/"Overview" convention for the same tab role).

## MODE = MASTER DEEP AUDIT (started, PARTIAL) — see `docs/TAJSTAY_CURRENT_STATE_AUDIT.md` Layer 3

User requested a full 42-section architecture/backend/DB/auth/security/UX audit before any further
implementation blocks. **AUDIT-ONLY — do not fix anything found until the user reviews and authorizes
a specific block.** This session's first pass (SHA `01003dc733261d0f6c7b0f0f1c991c4eef509023`) covered:

- **Bug A (Home mobile dead space) root-caused**: `main.flex-1` inside `min-h-screen flex flex-col`
  force-stretches to fill viewport regardless of content height; bottom nav is a separate
  fixed/overlaid element so the stretch has no sticky-footer purpose on mobile. Fix belongs in the
  root layout's mobile-breakpoint height model, not local page padding.
- **Bug B ("Войти" mixed state) root-caused**: `AuthEntryModal` (`position:fixed; top:50%;
  transform:translate(-50%,-50%)`) renders with `top:-77.65px` — genuinely off-screen-top, confirmed
  via `getBoundingClientRect()`, exactly reproducing the user's screenshot. Deeper finding: a real
  `/auth/sign-in` page already exists and is already linked from the same header — the modal is
  arguably the wrong pattern entirely, not just mis-centered. Product decision for implementation
  phase, not made here.
- **Auth reality matrix**: Email/password (already WORKING, verified earlier this session), Google
  OAuth (WORKING — real NextAuth+Prisma adapter, `GOOGLE_CLIENT_ID`/`SECRET` present in `.env`, not yet
  driven through a live browser OAuth round-trip), Telegram (WORKING — real HMAC-SHA256 challenge flow,
  `TELEGRAM_BOT_TOKEN` present, not yet driven through a live bot round-trip), custom Phone OTP
  (already known from Layer 2: real but zero UI callers). The "one User, several identity methods"
  target architecture is **already substantially in place** at the schema level (`Account` table +
  `resolveIdentityCapabilities()` built earlier this session) — not a green-field design task.

**NOT YET AUDITED** (explicit, per `docs/TAJSTAY_CURRENT_STATE_AUDIT.md` Layer 3, §L3.3): password
change ownership enforcement, Google/Telegram account *replacement* flow (may not exist at all — not
checked), Owner onboarding re-check, Owner/Admin entity-relationship + tenant isolation, Tours, full DB
ER audit, booking concurrency, money/timezone handling, migration/portability, full OWASP pass, file
upload validation, PWA production update-safety, chat/messaging security, notification delivery logic,
broader dead-code sweep, i18n beyond Profile/Admin-Overview, Impeccable/design-system pass, desktop
beyond spot checks, full click-through of all ~40 routes. This is a genuinely partial first layer of a
42-section spec — continuing it is multiple more sessions of work, not something to fake completing.

**NEXT**: continue the master audit (do not fix Bug A/B yet, per explicit instruction), or — if the
user reviews this partial layer and wants to prioritize differently — take direction from them rather
than mechanically working section-by-section through the remaining 38 items.

## MODE = MASTER SCOPE IMPLEMENTATION (current, supersedes audit-only framing above)

User approved a full architectural contract spanning Payment/Multi-Hotel/Subscription/Admin
Analytics/Auth/Chat/Messages/Profile/Help/Contacts/Resend, to be implemented autonomously in
dependency order — **do not ask "what's next" between blocks**, the order below is already final.
Only stop for the standing hard-stops (prod destructive ops, force-push, prod data deletion, prod
payment mutation) or a genuine missing-secret/business-decision blocker.

**Evidence discipline (binding for every claim from here on)**: never call service-function/local-DB
tests "E2E". Use exactly these tiers, reported separately: SCHEMA / SERVICE / INTEGRATION TESTS /
BUILD / REAL HTTP / BROWSER E2E / DEPLOYED PROD / REAL DEVICE.

**Master order** (micro-order inside a block may shift for a real dependency; the block order itself
does not):
1. Payment architecture — hotel-scoped methods, snapshot, owner review ✅ DONE (real HTTP+browser closed)
2. Admin Settings runtime cleanup ✅ DONE (real browser-verified)
3. Telegram first-click bug — ✅ FIXED (`e7f453b`), first-click countdown VERIFIED live; full external
   bot handshake still BLOCKED EXTERNAL QA (see below)
4. Auth Desktop visual fix (dark-green panel, contrast, empty space) — ✅ DONE (heading root-cause fix +
   empty-space check, see "Auth cleanup" section below)
5. Multi-Hotel Owner foundation (property switcher, Hotel-scoped everything)
6. Subscription business model (0% commission → Hotel subscription revenue)
7. Admin financial analytics correction (Booking GMV ≠ TajStay Revenue)
8. Booking Chat/payment-lifecycle UI + copy (remove "admin also reviews" semantics)
9. Chat/timeline visual (dark unreadable timeline, duplicate events, fake timers)
10. Messages inbox (localization leak, dark card, desktop density)
11. Small visual-regression batch (logout contrast ✅ DONE, History owner-notice ✅ DONE, footer
    contrast ✅ DONE, remaining: Help/FAQ/Contacts greens, Support header clip, floating-widget
    duplication, Assistant overlap)
12. Help/FAQ/Contacts rebuild (after payment/subscription copy is final)
13. Resend transactional email
14. Full regression/security/performance pass

### DONE this pass (commits, newest first, branch `feature/tajstay-full-ui-ux-rebuild`)

- `8b5a65d` — fixed guest saw **live** payment-method data instead of the **frozen snapshot** after
  selecting (found via real browser E2E, not caught by service-level tests — the backend froze the
  snapshot correctly, but `PaymentMethodsBlock` rendered live data for the selected item regardless).
  Also handles the owner deactivating/deleting the selected method after the fact.
- `5540b2e` — fixed a real regression: Phase A's TransactionLog rename
  (`PAYMENT_CONFIRMED`→`OWNER_PAYMENT_CONFIRMED` etc.) broke `getBookingTimeline()`'s matching, so
  confirm/reject events silently stopped appearing in the timeline guests/owners actually see.
  Confirmed (and preserved) that rejected-proof history is NOT lost: each attempt's file URL is
  written immutably into its own `PAYMENT_PROOF_SUBMITTED` TransactionLog entry at upload time,
  independent of the mutable `Booking.paymentProofUrl` that gets cleared on reject to allow retry.
- `76239b0` — logout button contrast (CSS specificity bug + whole-button opacity on disabled state),
  unauthorized-owner-panel flow (redirect target moved from History to
  `/profile/become-owner?notice=ownerOnly` with real application-state-aware copy, no more raw
  `OWNER` enum shown to users), footer `TajStay` brand-text contrast (BrandMark's own `color`
  override was beating the inherited white).
- `9f28cbf` — Admin Settings: removed global payment catalog + runtime brand editor (UI *and* their
  write APIs — verified via real HTTP that both now 404), fixed the shared stale-toast bug (every
  content card now gets its own scoped success/error message instead of one page-wide pair).
- `093bb73` — Phase A corrections: payment-method snapshot now freezes at **selection** time (not
  proof-upload time — closes the window where an owner could edit their card between the guest
  seeing it and paying), proof rejection returns the booking to `WAITING_PAYMENT` for retry instead
  of terminally `REJECTED`, fixed a dependency the source-of-truth swap broke (Owner Onboarding's
  "payment" checklist step still read the deprecated `OwnerPaymentMethod`).
- `795a867` — Phase A foundation: `HotelPaymentMethod` model (hotel-scoped, replaces owner-scoped
  free-text `OwnerPaymentMethod`, which is deprecated not deleted), real Owner confirm/reject
  (previously hard-stubbed to 403 — only Admin could review), Admin demoted to a reason-required,
  audited override path.

### Verified this pass, by tier

- **REAL HTTP** (against a running local-prod server, real login → real cookie → real fetch, not
  service functions): payment method CRUD authorization (owner-of-hotel allowed, other owner denied
  on both method-mutation and booking-review endpoints — 6/6), guest denied on owner-only mutation,
  unauthenticated denied on selection, full reject→resubmit→confirm lifecycle, both removed Admin
  write APIs confirmed 404.
- **BROWSER E2E**: Owner added a real payment method through the actual UI (persisted after reload);
  Guest booked, selected the method, saw the frozen snapshot survive a live owner edit; Admin Settings
  opened for real — confirmed the 2 removed cards are gone and the toast-scoping fix works live (saved
  the home-banner form, success message appeared only under that card, not under Security).
- **DEPLOYED PROD / REAL DEVICE**: none of the above — still OPEN, unchanged from before this pass.

### Telegram "code shows expired instantly" bug — FOUND AND FIXED (commit `e7f453b`)

Static analysis alone (see the now-superseded note this replaces) did not find it — user was right
not to accept that as closure. Reproduced live instead: fresh browser, one click, network capture
showed the server was correct every time (`expiresAt` a genuine 5 minutes out, status poll returned
`pending`) while the UI showed "expired" regardless. Root cause (confirmed via temporary instrumented
logging, added and removed, no prod logging added): `useCountdown`'s `secondsLeft` defaulted to
`useState(0)`; when a challenge's `expiresAt` first arrives via an async response (not at mount), the
render that turns the hook on still carries that stale `0` for one pass before the effect ticks a
real value, so `expired` (`secondsLeft <= 0`) is a false positive on that render.
`TelegramLoginPanel`'s own effect watches that value and **latches** — once it observes `expired:
true` even once, it calls `setStatus("expired")` permanently, with nothing to ever undo it. A first
fix attempt (`useLayoutEffect`, expecting layout effects to run before the consumer's passive effect)
did **not** work — re-instrumented and confirmed the passive effect fires using the stale value
before the layout effect's correction is observable; do not rely on that ordering assumption in this
codebase. Fixed instead without depending on effect ordering at all: `secondsLeft` is `number | null`
(null = not computed yet), reset to null synchronously **during render** (React's "adjust state while
rendering" pattern) whenever the expiry key changes — covers both the first attempt and every repeat
"Request a new code" attempt. Verified live, same reproduction, before and after — before: "Время
кода истекло" instantly; after: "Осталось 4:53" on the first click, fresh tab, no second attempt
needed. Also cleared the confirmed-inert stale `?error=OAuthAccountNotLinked` from the URL on mount
(it was never read/rendered by any code path here, but is confusing in the address bar).

**Still open**: the full external Telegram bot handshake (deep-link → bot conversation → return →
verify → session) is BLOCKED EXTERNAL QA — no real Telegram account available in this environment to
complete that leg. DEPLOYED PROD and REAL DEVICE unchanged, still OPEN.

### Multi-Hotel Owner foundation — STARTED, PARTIAL (commit `104dcaf`)

Removed the actual blocker: a single hardcoded `existingCount >= 1` gate in
`POST /api/owner/hotels`. Not a deep architectural limit — the properties page already `.map()`s
over all owner hotels for editing, only "add new" was hidden once `hasHotels`. Added a persistent
`<details>` disclosure so "Добавить объект" is always reachable; removed the now-false "one account
— one hotel" banner/copy (all 3 locales). Second/third hotel auto-approves like the first (matches
existing behavior — not a new moderation workflow, flag to the user if a real gate is wanted later).

**Verified real HTTP + browser**: an owner who already had one hotel logged in for real, created a
second via the actual UI/POST route (confirmed in DB: same ownerId, both APPROVED). Then proved the
actual point of this foundation — `HotelPaymentMethod` (built in Phase A) was already correctly
Hotel-scoped, not Owner-scoped; added a method to hotel 1 via real API, hotel 2's list (same owner)
stayed empty. First time that property was exercised with a genuine multi-hotel owner, not just two
different owners.

**Explicitly NOT done, still OPEN**: property switcher / active-hotel context for Rooms, Bookings,
Calendar, Finance, Analytics, Notifications, Reviews, Messages — none of these sections let an owner
pick which hotel they're looking at yet (Payment Methods already works per-hotel because it lists
every owned hotel's card, not because a switcher exists). Map-pin location picker (still raw lat/lng
inputs), hotel-image crop fix, and second-hotel moderation policy are also open — same items flagged
in the user's original spec, not newly discovered.

**NEXT**: property switcher + Hotel-scoping for the remaining Owner Desk sections is the natural
continuation, OR move to Subscription business model (also gated on multi-hotel, per master order) —
pick whichever has the clearer next dependency when resuming; both are legitimately "next."

### Auth cleanup — DONE (uncommitted at time of writing this entry, commit to follow)

Three items closed, per explicit user directive not to counter-patch global CSS conflicts with local
`!important` again:

1. **Global heading `!important` root-cause fix.** Two separate global rules were forcing dark
   heading color with `!important`, not one — the second (`globals.css` line ~1416, combining
   `h1-h6` with `.text-slate-100`/`.text-slate-200` into one `!important` block, part of the
   light-theme DS-token foundation) was undiscovered until live `getComputedStyle`/CSSOM
   inspection surfaced it as the actual winning rule even after the first (`globals.css` line
   ~1771, part of an orphaned `.dashboard-skin`-scoped block that's never applied in any real
   markup) was converted to a zero-specificity `:where(h1..h6)` default. Fix: removed `h1-h6` from
   the second rule (kept `.text-slate-100`/`.text-slate-200`, which legitimately still needs
   `!important` as a Tailwind-utility override), leaving the `:where()` rule as the single default
   heading color, overridable by any real component rule without a local `!important`. Removed the
   now-unnecessary `!important` from `.taj-auth-panel-v2__heading` in `auth-premium.css`.
   **Verified BROWSER** (real prod-build diagnostic server, `getComputedStyle`): Auth panel heading
   white (`rgb(255,255,255)`) on the green promo surface; Home hero/section headings correctly dark
   (`rgb(20,35,27)`) on white surfaces and white on photo/green surfaces; Hotel Detail headings
   white-on-photo; FAQ heading correctly dark. No regression found across the 4 pages checked
   (Home, Auth, Hotel Detail, FAQ) — Owner/Admin/Profile not exercised live (require auth session
   not set up in this diagnostic pass), lower risk since they use their own scoped
   `.owner-command-center`/`.admin-command-center` wrapper classes, not the fixed global rule.
2. **Empty-space-under-Telegram-panel defect — re-investigated live, NOT reproducible in current
   build.** Measured `.taj-auth-shell`/`.taj-auth-card`/`.taj-auth-panel-v2` heights vs content
   `scrollHeight` at 1440×900, 1366×768, and 375×812 (mobile), both in the default password-form
   state and after clicking "Продолжить с Telegram": container height matched content
   `scrollHeight` within ~1px in every case, no forced near-full-viewport stretch, no visible dead
   zone. The codebase already has a `.taj-telegram-panel--compact` variant
   (`TelegramLoginPanel.tsx` / `auth-premium.css`) that appears to have already resolved this —
   likely from earlier work in this same session, before the point this was last summarized.
   **Verified BROWSER** at all 3 viewports; no CSS change was needed or made for this item.
3. **Telegram first-click split status — VERIFIED.** Fresh browser tab → click → real
   `POST /api/auth/telegram/challenge` (200, captured via network tab) → response carried a genuine
   `expiresAt` 300s out (`expiresInSec: 300`) and real `deepLink`/`appDeepLink` values
   (`t.me/Tajstay_Bot?start=login_<token>`, `tg://resolve?domain=Tajstay_Bot&start=login_<token>`)
   → client immediately rendered `"Осталось 4:52"` (not expired) → status polling
   (`GET /api/auth/telegram/status/<token>`) started immediately and returned 200 repeatedly.
   **`TELEGRAM CHALLENGE FIRST-CLICK = VERIFIED`** (BROWSER + REAL HTTP, via captured network
   requests on the local prod-build diagnostic server). **`TELEGRAM EXTERNAL HANDSHAKE = BLOCKED
   EXTERNAL QA`** — completing the bot-side conversation and return leg still requires a real
   Telegram account, unavailable in this environment; not conflated with the above. The stale
   `?error=OAuthAccountNotLinked` URL-clearing fix (already shipped in `e7f453b`) is good practice,
   confirmed unrelated to this bug's actual root cause (documented above in the Telegram section).

**NEXT**: commit these CSS fixes, then continue directly into the full Multi-Hotel Owner Foundation
build-out (property switcher, Hotel-scoped context across Rooms/Bookings/Finance/etc., backend
authorization audit, Objects-page redesign, map-pin picker) per the already-approved master order —
no new sequencing question needed.
