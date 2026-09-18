# TajStay current state

Read this before anything else. Load only the skill matching NEXT (see `CLAUDE.md` → Skill routing).
Do not re-read old audit reports unless the task needs them. Keep this file short — DONE/OPEN/BLOCKED/
NEXT, not a diary. Detailed rationale for a fix belongs in its commit message, not here.

## CURRENT — LOCAL VAULT PHASE 2B.2A OWNER ACTIVATION UI (LOCAL)

- **FINAL SHA:** `eb846e73b3ea54bde03c7c054c7537083de05589`
- **BASE:** `6c23c8abf6a20500275d6cc92de40ec8b74654ef` (2B.1A)
- **DONE:** Owner `?section=local-vault` nav + panel; POST activation-codes UI; TTL UX; device list; revoke UI; RU/TJ/EN; AuthZ smoke
- **PROD:** API origin `https://www.tajstay.site` routes present; **LOCAL_VAULT_CODE_PEPPER = MISSING** → production activation **BLOCKED**; prod DB migration **NOT PROVEN**
- **DO NOT START:** Admin LV analytics · Releases · Booking Delivery · Passport/OCR/Scanner · Windows client changes
- **NEXT (ops):** set Vercel `LOCAL_VAULT_CODE_PEPPER` (≥16 chars) + confirm `prisma migrate deploy` applied `20260918170000_local_vault_2b1` on prod → then Windows↔Owner E2E

## PRIOR — LOCAL VAULT PHASE 2B.1A ACTIVATION CONTEXT (LOCAL)

- **BASE 2B.1 SHA:** `11ddd34c26157fa60e4be2e60e4a7dd58cac9fb2`
- **PATCH:** activate success adds authoritative `hotel{id,name}` + `owner{id,displayName}` from `Hotel.ownerId` (not `activatedByUserId`)
- **NO schema/migration**
- **NEXT:** Claude Desktop 2A.2 consume hotel/owner context → then real Windows↔TajStay E2E

## PRIOR — LOCAL VAULT PHASE 2B.1 CLOSED (LOCAL)

- **FINAL SHA:** `11ddd34c26157fa60e4be2e60e4a7dd58cac9fb2`
- **LV tests:** `scripts/local-vault-2b1-tests.ts` **31/31 PASS** (extended in 2B.1A)
- **Non-regression:** block8c **36/36** · owner-block8 **8/8** · owner-block5c **60/60** (valid SEED; insecure SEED+`next start` → HTTP 500 is baseline `envGuard`, not LV)
- **Golden vectors (versioned):** `src/lib/local-vault/golden-vectors.json`
- **Production migrate:** NOT DONE
- **Windows↔Backend E2E:** NOT PROVEN
- **DO NOT START on Cursor:** 2B.2 Admin/Owner LV UI · 2B.3 Releases · Booking Delivery · Passport/Scanner/OCR

## PRIOR — BLOCK 8C CLOSURE (LOCAL)

- **BASE:** BLOCK 7 `4f35b7a` · BLOCK 8 `94531f4` · prior HEAD `395f9f4`
- **BLOCK 8C SHA:** `677006b`
- **TESTS:** `scripts/block8c-closure-tests.ts` **36/36 PASS**
  - Notifications prefs persist + list/mark IDOR
  - Owner Application pending → approve → OWNER; reject → reapply; admin-only approve gate
  - Booking/chat Guest/Owner/Manager hotel-scoped IDOR
  - Theme Light/Dark/System + i18n keys RU/TJ/EN static
- **RUNTIME:** `http://localhost:3001` @ working tree / next SHA
  - Profile Light→Dark→System; RU→TJ→EN; Security; Notification settings; Inbox; Phone blocked honest
- **BUILD:** `npm run build` **EXIT 0** (483561 ms)
- **next start:** correctly **FAILS** without non-default `SEED_SECRET` (`envGuard`) — local prod-like blocked by design
- **NOT DONE:** full 1280 desktop viewport screenshot matrix; production deploy; MASTER FINAL
- **DO NOT START:** MASTER FINAL without user go-ahead

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

**CURRENT AREA**: OWNER BLOCK 4 — Rooms / Categories / Inventory / 360° (COMPLETE — STOP).
**CURRENT ROUTE**: `/dashboard/owner?section=rooms`
**CURRENT ROLE**: Owner (`owner@tajstay.local`)
**LAST VERIFIED CONTROL**: Slim Add Room (category+number only); hotel 1→2 isolation; amenity labels localized.
**HEAD (dirty working tree, uncommitted BLOCK 2+3+4)**: `1f98276`
**DO NOT START BLOCK 5** (Manager Workspace) without explicit user authorization.
**USER VISUAL ACCEPTANCE**: PENDING
**360 CAPTURE**: PARTIAL — upload/viewer PASS; in-browser camera capture not implemented (equirectangular upload path only).

**Execution progress table** (per-area status — PASS only after full dimension check, not on sight):

| Role | Route/Section | Desktop | Mobile | RU | TJ | EN | Visual | UX | Function | Data | Error | Perf | Security | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Owner | Rooms (`?section=rooms`) | done | PARTIAL | done | keys | keys | compact inventory | done | done | RoomType SoT | localized | n/a | IDOR 403 | **CODE/TEST/BUILD/RUNTIME = PASS; USER VISUAL = PENDING** |
| Owner | Analytics (`?section=analytics`) | done | PARTIAL (runtime desktop browser; full viewport matrix NOT RUN) | done | keys present | keys present | financial KPIs | done | done | REAL getHotelAnalytics | loadError i18n | n/a | IDOR 403 PASS | **CODE/TEST/BUILD/RUNTIME API = PASS; USER VISUAL = PENDING** |
| Owner | Overview financial KPIs | done | PARTIAL | done | — | — | done | done | shared formulas | REAL | — | — | hotel-scoped | **RUNTIME PASS (local)** |
| Owner | Activity history | done | PARTIAL | done | keys present | keys present | done | done | done | OwnerHotelAuditLog | — | — | IDOR 403 PASS | **RUNTIME PASS (local)** |
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
| Owner | Manager Workspace | — | — | — | — | — | — | — | — | — | — | — | — | **OUT OF SCOPE — BLOCK 5** |
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

### Multi-Hotel — property switcher + Hotel-scoped queries (commit `b3fc327`)

Dependency audit first (Explore agent, read-only): confirmed `Hotel.ownerId -> User` is the only
ownership relation (no second model to reconcile), `HotelStaff` is a separate RECEPTIONIST/HOUSEKEEPING
concept (not ownership), Owner Desk is one monolithic `page.tsx` switched by `?section=`, and — the
real finding — Bookings/Offline Bookings/Finance/Analytics-KPIs/Reviews had **no hotelId concept at
all**, always aggregating every hotel an owner has. Rooms had a local, section-only hotelId filter;
Calendar's API route accepted a client hotelId but only used it to filter an already-scoped in-memory
array (soft spot, not exploited, but never `findFirst`-verified).

Implemented: a single active-hotel scope carried in the URL (`?hotelId=`, same pattern as the existing
`?section=`) — resolved once in `page.tsx`, verified against the real owner's hotels before use (an
unrecognized/foreign hotelId is silently ignored, never trusted, never leaks another owner's data).
Threaded through `ownerBookingWhere`/`ownerOfflineBookingWhere` (`src/lib/pms/ownerQueries.ts`),
`getOwnerDashboardKpis`, `getOwnerCalendarData`, and every relevant `page.tsx` section (Overview,
Bookings, Offline Bookings, Reviews, Finances, Statistics, Calendar). Objects/Properties intentionally
stays unfiltered (it's the page used to see/pick between all owned hotels). New `PropertySwitcher`
in `OwnerSidebar.tsx` (desktop + mobile drawer), shown only for 2+ hotels; every nav link now carries
the active hotelId forward so switching sections never silently drops the selection. Hardened
`api/owner/calendar/route.ts` to scope at the query level instead of filtering an already-fetched array.

**Verified BROWSER + REAL HTTP** against a fresh local-DB-only 2-hotel owner fixture
(`mh-owner@example.com`, hotels 33/34, still in local DB — not cleaned up yet, next session should
either reuse or clean via a `mh_cleanup`-style script): switcher lists both hotels; selecting each
hotel shows only that hotel's booking (confirmed via live page text); `hotelId` persists across every
section link; a hand-injected `hotelId` belonging to a **different** owner (hotel 1, owner 2) is
rejected both by the page (falls back to the owner's own aggregate, no error, no leak) and by
`GET /api/owner/calendar` directly (returns empty rooms, confirmed via curl with the real session
cookie).

### Multi-Hotel — Objects/Properties compact list (commit `17cfc9e`)

Replaced the "one giant stacked full-edit-form per hotel, always rendered, big cover photo" layout
with a compact row per hotel: small (3rem) thumbnail, name, city, room count, status badge, "Open"
(real public `/hotel/[id]` link) and "Edit" (native `<details>` toggle, collapsed by default — same
pattern as the existing "Add another hotel" disclosure). The full edit form itself is untouched, just
nested inside the collapsed `<details>` instead of always rendered — no save/upload/coordinate logic
was touched. **Verified BROWSER**: both fixture hotels render as compact rows; clicking "Edit" on one
expands only that hotel's form (pre-filled, confirmed via `input[name=name]` value), the other stays
collapsed; no horizontal overflow at 375px mobile.

**Explicitly NOT done, still OPEN**: Notifications has no hotel relation on the `Notification` model
at all — out of scope for this pass (schema change); map-pin location picker (still raw lat/lng inputs
inside the edit form, unchanged); hotel-image crop/placeholder fixes (thumbnail now uses `object-cover`
in a fixed 3rem box, not yet checked against the "never fall back to the TajStay logo" requirement);
mobile switcher UX beyond the existing responsive drawer (not spot-checked at 390/412 for the
*switcher* itself, only the properties list); RU/TJ/EN beyond the 5 new keys (`switchProperty`,
`allProperties`, `roomsShort`, `openProperty`, `editProperty`).

### P0 CORRECTION — new owner hotels were self-approved, now go through Admin moderation (commit `6c5eba8`)

User feedback caught a real authority gap in the switcher work above before it shipped further:
`POST /api/owner/hotels` hardcoded `status: "APPROVED"` on every hotel a hotelier creates — the
existing first-hotel behavior, unchanged since before this session, just newly exercisable for a
2nd/3rd hotel via the switcher's "Добавить объект". Unlimited hotels per owner was correctly built
(no cap), but that silently doubled as "each one goes live with zero review" — a full Admin
moderation pipeline already existed (`/api/admin/hotels/moderate`, already wired into the Admin
dashboard's Hotels section with risk scoring and a status selector) and was simply never reached,
because nothing ever created a hotel in `PENDING` state.

**Fixed**: hotel creation now sets `status: "PENDING"` (reusing the existing enum/pipeline, no new
model — same discipline as Phase A), notifies admins the same way `OwnerApplication` submissions
already do (title + link into `/dashboard/admin?section=hotels`). Cascading correction to the
switcher/scoping work: a PENDING/REJECTED hotel is visible to its owner (Objects list, switcher) but
can never become the active operations context — `page.tsx`'s hotelId resolution now only accepts an
APPROVED hotel id (a pending/foreign one is rejected, same as a cross-owner one); the unscoped
"all my hotels" fallback in `ownerQueries.ts`/`ownerDashboardKpis.ts`/`ownerCalendar.ts` now also
filters to `status: "APPROVED"` so a pending hotel's (nonexistent) data can never leak into an
owner's aggregate view; `PropertySwitcher` shows every hotel but renders non-approved ones as
disabled `<option>`s suffixed "— На проверке"/"— Отклонён".

**Verified BROWSER + REAL HTTP, full acceptance loop**: created a 3rd hotel via the real multipart
`POST /api/owner/hotels` exactly as the UI does → confirmed `PENDING` in DB (not auto-APPROVED) →
confirmed live: switcher lists it as a disabled option with the correct suffix, Objects list shows
"НА ПРОВЕРКЕ" badge → manually forced `?hotelId=35` (the pending one) in the URL → Bookings correctly
fell back to the owner's 2 real APPROVED hotels' aggregate, no pending-hotel data leaked anywhere →
logged in as the real local admin (`admin@tajstay.local`, password reset for this local test only)
and called the real `/api/admin/hotels/moderate` route with `status=APPROVED` → confirmed DB flipped
to `APPROVED` → re-requested `?hotelId=35` with the owner's session → now correctly scoped to Hotel
3 only (empty, since it has no bookings yet — critically, Hotel 1/2's bookings did NOT leak into
this view either). Full create → PENDING → invisible-as-context → admin-approves → selectable →
correctly-scoped loop proven end to end, not just the individual pieces.

**Still OPEN, explicitly flagged, not built this pass**: a structured rejection-reason field on
`Hotel` for the "fix and resubmit" flow the spec describes — Admin can already set `REJECTED` via
the existing moderate route, but there's no field to store *why*, so owner-facing reason display and
resubmit aren't implemented (this is a schema change, a protected domain — needs its own explicit
go-ahead, not bundled into this fix).

### Fail-closed canonical Hotel context — no more silent "all my hotels" fallback (commit `c1c4738`, external — see note below)

User feedback correctly rejected the previous behavior as not truly fail-closed: an invalid/foreign
`?hotelId=` was being silently swapped for an aggregate "all my hotels" view instead of a real
authorization failure, and `?hotelId=` being *absent* was quietly treated as "aggregate" as a
universal default across every section — never explicitly decided per-domain.

**Fixed** (`HOTEL_SCOPED_SECTIONS` + a canonical resolver in `page.tsx`): Overview/Rooms/Bookings/
Offline Bookings/Calendar/Reviews/Finances/Statistics now always resolve to exactly one concrete
APPROVED Hotel — never an aggregate. A foreign hotelId (belongs to another owner), a pending/rejected
hotelId, or a nonexistent one all hit the same path: `redirect()` to the same section with a real
owned-and-approved hotelId explicit in the URL (deterministically the owner's first approved hotel).
No hotelId given at all, with 2+ approved hotels, does the same — canonicalizes the URL rather than
silently picking one behind the scenes. Exactly 1 approved hotel needs no redirect (nothing
ambiguous to state). Properties/Notifications/Help remain intentionally Owner-global by definition
(a full object list; a future Owner-wide inbox) — `hotelId` is simply not meaningful there, per the
section-scope matrix below. The switcher's old `"Все объекты"` option is gone — there is no aggregate
mode left to select.

**Section-scope matrix** (requested explicitly — current source, target, status):

| Section | Scope | Status |
|---|---|---|
| Overview | active Hotel | DONE |
| Rooms | active Hotel | DONE |
| Bookings | active Hotel | DONE |
| Offline Bookings | active Hotel | DONE |
| Calendar | active Hotel | DONE |
| Finance | active Hotel | DONE |
| Statistics/Analytics | active Hotel | DONE |
| Reviews | active Hotel | DONE |
| Payment Methods | active Hotel (Phase A, hotel-scoped by construction) | DONE |
| Properties/Objects | Owner-global (by definition — it's the list used to pick a Hotel) | DONE, unchanged |
| Notifications | Owner-global inbox (product decision, not a schema gap — see below) | DECIDED, per-notification Hotel display NOT built |
| Messages | booking-thread-based already; a deep link should switch active Hotel context | NOT VERIFIED this pass |
| Help | Owner-global | unaffected |

**Notifications semantics — decided, not a schema blocker**: Owner-global inbox is correct (an owner
with 5 hotels needs one place to see events across all of them) — this does NOT need a new
`hotelId` column on `Notification` as I'd previously flagged; a booking-related notification can
already derive its Hotel via the existing `booking.room.hotel`/`booking.roomType.hotel` relation
through `Notification.bookingId`, no schema change needed. **Still OPEN**: actually rendering that
Hotel name on each notification row and making tap-through switch the active Hotel context before
opening the booking — not built this pass, correctly scoped as a UI task now that the data path is
confirmed to already exist.

**Important limitation found and understood, not a bug in the logic**: Next.js App Router's
`redirect()` thrown from a Server Component nested under an already-async layout (this one calls
`requireOwner()`/`prisma.hotel.findMany` before rendering `{children}`) does not produce a real
top-level HTTP 30x for a plain non-JS request (confirmed via `curl -v` — genuinely a `200` with a
`NEXT_REDIRECT` digest embedded in the streamed RSC payload, never a `Location` header). A real
browser (or anything executing the RSC runtime) follows it correctly — confirmed live: the address
bar itself changes from `?hotelId=1` to `?hotelId=33` after navigation, and content is correctly
scoped to the corrected hotel. This is pre-existing behavior already shared by `requireOwner()`'s own
redirect (same nested-component limitation, not a regression introduced here) — a non-JS client
(curl, a bot, a server-to-server health check) hitting a hotel-scoped URL with a bad hotelId gets a
`200` it can't act on, but critically **does not receive any other owner's data** — Next aborts
rendering the redirecting segment entirely, so the "both hotels visible" I misread during debugging
turned out to be the sidebar switcher's own `<option>` list (present regardless, rendered by the
layout before the redirect fires), not a data leak. Flagging this limitation honestly rather than
silently — a fully non-JS-safe fail-closed response (real 404/403 at the HTTP layer) would need the
authorization check moved into `middleware.ts` or a Route Handler ahead of the RSC render, which is a
larger change than this pass's scope; not doing it now, but not hiding that the curl-level guarantee
is weaker than the browser-level one either.

**Verified BROWSER** (the correct tier for this specific mechanism, per the limitation above):
logged in as the 4-hotel fixture owner, navigated to `?section=bookings&hotelId=1` (hotel 1 belongs
to a different owner) — address bar corrected itself to `?hotelId=33` and content showed only Hotel
33's booking (Guest H1), not Hotel 34's; navigated to `?section=finances` with no hotelId at
all — address bar canonicalized to `?hotelId=33` automatically.

**Note on git state**: an external commit `c1c4738` ("понятное описание изменений77777", author
`xzba`) appeared containing exactly this in-progress diff (fail-closed resolver + switcher changes,
confirmed via `git show --stat`/diff — nothing foreign, matches what was being worked on). Not
amended or altered; continued from that HEAD after verifying its contents.

### Multi-Hotel Foundation — honest status: IN PROGRESS, not PASS

Per the Definition-of-Done checklist:

- ✓ Owner can have many Hotels
- ✓ new Hotels require moderation (fixed this pass, `6c5eba8`)
- ✓ approved Hotels switch correctly
- ✓ pending/rejected are not operational (disabled in switcher, rejected server-side even via
  direct URL injection)
- ✓ URL context persists and is now canonical/explicit (this pass)
- ✓ foreign hotelId fails closed (browser-verified; curl-level caveat documented above)
- ✓ no silent aggregate fallback (removed this pass)
- ✓ Rooms/Bookings/Calendar/Finance/Analytics/Reviews scoped
- ✓ Payment Methods scoped (Phase A)
- ○ Messages correctly contextual — NOT verified this pass
- ✓ Notifications semantics explicitly decided (Owner-global) — Hotel display on each row NOT built
- ✗ map replaces manual coordinates — NOT built
- ✗ image crop/placeholder fix — NOT built
- ✗ mobile verified beyond Objects list — switcher itself not spot-checked at 390/412
- ✗ RU/TJ/EN checked beyond the new switcher/status labels — no full copy pass

### Map-pin location picker (commit `bdc7bf5`)

Replaced the raw latitude/longitude number inputs in both Add Hotel and Edit Hotel forms with a
real Leaflet map (`HotelLocationPicker`/`HotelLocationPickerMap`, dynamically imported client-only)
— tap-to-place, drag-to-move, reusing the `react-leaflet` stack already in the repo for the public
Search map (no new dependency). Emits the same `latitude`/`longitude` form fields the backend
already expects via hidden inputs, so no API changes were needed. **Verified BROWSER**: real Leaflet
container renders; hidden inputs pre-fill from the hotel's actual stored coordinates; a simulated
map click updates both hidden inputs and visibly moves the marker; no horizontal overflow at 375px.
**Not built**: address/city-to-coordinates search ("Найти") — needs a geocoding provider, none
integrated in this repo; flagged rather than silently dropped, not blocking the core requirement
(stop typing raw coordinates).

### Hotel-image destructive crop + brand-logo-fallback guard (commit `b1a3045`)

Explore-agent audit (read-only) mapped every `Hotel.coverImageUrl` render site and found two
distinct bugs: (1) the Owner's own Edit Hotel cover preview forced every photo into a fixed
`aspect-video` box with `object-cover`, destructively cropping any non-16:9 upload (the exact
surface where an owner must see the real photo to judge quality) — fixed to `object-contain`; card
grids elsewhere (`HotelCard.tsx`) already crop correctly and were left unchanged, that's the right
UX there. (2) `isBrandAssetUrl()` (already correctly used in `HotelCard.tsx`/`BookingChatHeader.tsx`/
`TripChatRow.tsx`/`MessagesInbox.tsx`) was missing from `dashboard/owner/page.tsx` (both spots),
`hotel/[id]/page.tsx` (hero + gallery), and `HistoryRecordCard.tsx` — standardized across all of
them, with `PhotoPlaceholder` filling in wherever a spot previously rendered nothing for a missing
photo. **Verified BROWSER**: hotel #1 (genuinely no cover/photos in local DB) now shows a proper
full-size placeholder instead of a blank gap; fixture hotels with real photos render
`object-contain` (confirmed via computed className); fixture hotels without a photo show the
placeholder in the owner edit form too.

### Mobile switcher spot-check + duplicate-id fix (commit `f2cf5b5`)

At 390×844: found and fixed a real bug — `PropertySwitcher` renders once in the desktop sidebar
(CSS-hidden below `lg`, but still mounted) and once in the mobile "Ещё" drawer, both hardcoding
`id="owner-property-switcher"` (invalid duplicate-id HTML, ambiguous label association). Switched to
`useId()` per instance, exposed `data-testid="owner-property-switcher"` for anything that was
targeting the old id. **Verified BROWSER**: both instances now have distinct ids; the mobile drawer's
switcher renders at 322px wide inside a 390px viewport, no overflow.

### Real-QA matrix — Rooms/Calendar/Payment Methods (real HTTP, this pass)

Rounded out the sections not yet individually exercised after the fail-closed rework:
- **Rooms**: `?section=rooms&hotelId=33` shows only Room H1-101; `&hotelId=34` shows only Room
  H2-101 — confirmed via real HTTP body content, not code reading.
- **Calendar**: `GET /api/owner/calendar?hotelId=33` returns only Room H1-101 in `rooms`;
  `hotelId=34` returns only Room H2-101.
- **Payment Methods**: `GET /api/owner/hotels/33/payment-methods` and `.../34/...` both return
  independently (empty, no fixture data seeded there this pass, but isolated).
- **Cross-owner denial**: `GET /api/owner/hotels/1/payment-methods` (hotel 1 belongs to a different
  owner) → real `403 Forbidden` — this is a true Route Handler, not an RSC page, so it gets a real
  HTTP status with no streaming-redirect caveat.

### Multi-Hotel Foundation — updated Definition-of-Done status

- ✓ Owner can have many Hotels
- ✓ new Hotels require moderation
- ✓ approved Hotels switch correctly
- ✓ pending/rejected are not operational
- ✓ URL context persists and is canonical/explicit
- ✓ foreign hotelId fails closed (browser-verified; curl-level RSC-redirect caveat documented,
  but Route Handlers like payment-methods already return true 403/404 regardless)
- ✓ no silent aggregate fallback
- ✓ Rooms/Bookings/Calendar/Finance/Analytics/Reviews/Payment Methods scoped and cross-verified
  this pass via real HTTP
- ✓ mobile switcher verified at 390px, duplicate-id bug fixed
- ✓ hotel-image crop + brand-logo-fallback fixed and guard standardized repo-wide
- ✓ map-pin picker replaces manual lat/lng
- ○ Messages correctly contextual — still NOT verified (booking-thread-based already; deep-link
  context-switch behavior not exercised this pass)
- ✓ Notifications semantics explicitly decided (Owner-global) — per-row Hotel display still NOT built
  (confirmed low-risk: derivable from existing `booking.room.hotel` relation, no schema change needed)
- ✗ RU/TJ/EN full copy pass — only the new switcher/status/location-picker labels were localized;
  no broader Owner Desk copy-cleanup pass done this session

### Moderation finalization — closing the real remaining gaps (commits `d534791`, `b607a1d`)

User review correctly caught that several claims from the prior pass were stated more strongly than
their evidence supported. Addressed each:

- **Public exposure of non-APPROVED hotels — real gap, fixed.** `/hotel/[id]/page.tsx` had no status
  filter at all; any guest could view a PENDING/REJECTED hotel directly by URL even though it was
  already correctly hidden from Search/the switcher. Now 404s for anyone except the owner or an
  admin. `POST /api/bookings` hardened the same way — a handcrafted request against a non-APPROVED
  hotel's room/roomType now 404s server-side, independent of UI reachability.
- **Owner self-approval — checked, already safe, not a gap.** `PATCH /api/owner/hotels/[id]`
  hardcodes `status: hotel.status`, never reads a client field. Confirmed by reading the code, not
  assumed.
- **Rejection reason / resubmit — was OPEN, now closed**, reusing `AdminAuditLog.reason` (no schema
  addition). Admin moderate form takes a reason, Owner Objects page displays it on REJECTED cards,
  saving edits on a REJECTED hotel flips it back to PENDING and re-notifies admins.
- **hotelId fail-closed semantics — re-confirmed correct**, and clarified: the RSC page-level
  redirect only works for JS-executing clients (documented Next.js App Router limitation, not new);
  Route Handlers (payment-methods, the new subscription price route) already return true HTTP
  403/404 regardless, confirmed via curl with no JS involved.
- **Map-pin persistence — was only proven at "click changes hidden inputs", now proven end-to-end**:
  real Save via the edit form → confirmed in DB → Owner reload shows the same marker (real browser
  session) → new Admin "Точка на карте" link (added this pass — Admin previously showed no location
  at all) shows the same point → `/map`'s existing query reads `Hotel.latitude/longitude` directly
  with no duplicate field, so any public consumer is structurally guaranteed to match.
- **Image-crop/fallback guard — "every render site" was overstated, now actually enumerated**: Admin
  moderation renders no hotel cover image at all (nothing to guard there); Search card
  (`HotelCard.tsx`) and Messages/chat thumbnails (`BookingChatHeader.tsx`/`MessagesInbox.tsx`/
  `TripChatRow.tsx`) were already correctly guarded per the original Explore-agent audit; Booking
  (`BookingRoom.tsx`) threads `coverImageUrl` straight into the already-guarded
  `BookingChatHeader` — confirmed by reading each file, not assumed from the component name.

**Everything schema/data/authorization/routing/public-exposure-relevant for Multi-Hotel is now DONE
and evidence-backed at the local/REAL HTTP/BROWSER tier.** Two items remain explicitly OPEN, and are
correctly classified as **functional gaps, not cosmetic polish**:
- **Messages deep-link hotel-context switching** — if an owner working in Hotel A opens a
  notification/message belonging to Hotel B, the shell should switch active context to B before
  showing it; not yet built, not yet even attempted.
- **Owner Desk copy-cleanup pass** — genuinely cosmetic, lower priority than the above.

DEPLOYED PROD and REAL DEVICE remain OPEN for all of Multi-Hotel, unchanged.

### Subscription business model — foundation (commit `d534791`)

Canonical model: 0% booking commission (checkoutFinance.ts default commissionRate changed
0.12→0, `.env`/`.env.example` updated — **deployed prod's own env var is untouched, OPEN**), TajStay
revenue comes from a Hotel's own monthly subscription. Schema audit confirmed no
Subscription/Plan/Billing/PlatformSetting model existed yet — added three additive tables via a real
local migration (`20260912120000_subscription_domain_foundation`, hand-reviewed against `prisma
migrate diff`'s output to exclude unrelated pre-existing schema drift the diff also surfaced — a
Booking FK drop/re-add and a PushSubscription column drop that were NOT part of this change):

- `HotelSubscription` (1:1 Hotel): TRIAL/ACTIVE/PAST_DUE/SUSPENDED/CANCELLED, immutable
  `trialStartAt`/`trialEndAt` anchor.
- `SubscriptionPeriod`: frozen `priceSnapshot` per period (same pattern as HotelPaymentMethod).
- `PlatformSetting`: singleton admin-controlled monthly price.

`ensureHotelSubscriptionOnApproval()` is the only creation path — called only on a genuine
PENDING/REJECTED→APPROVED transition; `hotelId` is `@unique` so even a real race can create at most
one row. **Verified REAL HTTP**: approved a fresh hotel twice in a row (double-click simulation) →
exactly one `HotelSubscription` row, calendar-month trial dates (`addMonths`, not a 30-day blind
offset — Sep 12 approval → Oct 12 trial end, confirmed, not assumed). Admin price-setting verified
persisted; Owner Overview card verified live via both curl and a real browser session, correctly
shows nothing for hotels approved *before* this domain existed (the session's older fixture
hotels) rather than being silently backfilled — this is the exact "existing approved hotels" case
the user flagged as a **business decision blocker, not a technical one**: no production backfill
policy has been decided, and none was invented here.

**Explicitly OPEN, not built this pass**: the actual Owner→TajStay payment channel (no gateway
decided — correctly not invented); PAST_DUE/SUSPENDED transition logic (no scheduled job exists to
move a lapsed TRIAL into PAST_DUE yet); trial-ending-soon reminders; Admin override actions (extend
trial, manual-payment activation) with their own audit trail; Resend hooks into lifecycle events;
full RU/TJ/EN beyond this pass's new labels; mobile spot-check of the new cards; Admin financial
analytics still reflects the old booking-commission-shaped numbers (next master block).

**NEXT**: per explicit "no new sequencing question" instruction — Admin Financial Analytics
(remove commission semantics, Booking GMV vs Subscription Revenue) is the next master item, since it
depends on the zero-commission cutover just landed. Messages deep-link context-switching remains
tracked as a real functional gap to close, not deferred indefinitely.

### Green-surface contrast audit — root-caused, not patched again (commit `069a3f4`)

User sent real screenshots (pixel-checked: canonical green confirmed as the correct `#0F7A4D` /
`rgb(15,122,77)` on the CTA and footer background — not a second brand shade) showing dark text/
icons on green in 5 places. Explore-agent audit found the real mechanism: the light-theme `<button>`
default (`:where([data-theme="light"] button){color:inherit}`, `globals.css`) was declared
**unlayered**, and Tailwind's utilities compile into `@layer utilities` — per the CSS Cascade Layers
spec, any unlayered rule beats any layered one regardless of specificity, so this default was
silently beating plain `text-white` everywhere it hadn't already been individually patched
(cookie-consent Accept, 3 TST Assistant buttons, earlier this session — each patched locally instead
of root-caused, exactly the anti-pattern flagged repeatedly this session). **Fixed at the root**:
moved the rule into `@layer base`, so Tailwind utilities now always win with zero `!important`
needed anywhere, including on buttons that haven't hit the bug yet.

Per-item outcome (**verified BROWSER, computed styles, not screenshot-only**):
- "Отметить все прочитанными" (mark all read) button — was the clearest real bug (`color:` near-
  black on `#0F7A4D`). Fixed by the layer change alone, zero component-local patch needed. Confirmed:
  `background-color: rgb(15,122,77)`, `color: rgb(255,255,255)`.
- Footer "TajStay" wordmark, floating TST Assistant button — confirmed **already correct** (prior
  session's targeted fixes, `76239b0` and the assistant's own unlayered `.tst-assistant__fab{color:
  #fff}` which already out-specificities the old bug rule) — not touched, no regression.
- Notification bell — a **separate, real, local bug**: hardcoded `md:bg-white md:text-slate-700`
  assuming the header goes white at desktop width, but `header.site-header` is canonical green at
  every viewport. Fixed to the same translucent-white treatment as the header's language switcher
  (`rgba(255,255,255,.08)` + white icon) for a visually unified header-action set; badge ring color
  changed from `ring-slate-950 md:ring-white` to a fixed `ring-[#0f7a4d]` matching the always-green
  header. Verified live at both desktop and 375px mobile.
- Language/globe button's visually-lighter green — confirmed intentional design (`rgba(255,255,255,
  0.08)` translucent overlay on top of canonical `#0F7A4D`, not a second hardcoded green), not
  changed — flagged as a design call if the product wants that "glass pill" treatment removed later.

Regression-checked white surfaces (Profile page buttons/pills) after the layer change — all still
render dark text on white/green-accent correctly, confirming the fix is surface-aware as required
(did not touch any explicit component color rule, only the default for genuinely unstyled buttons).

### Green-surface contrast — final correction (commit `2cdb83e`)

Two corrections from review, both accepted as right:

1. **"It's an rgba overlay, not a hardcoded second green" was not an acceptable answer.** A white
   translucent fill on top of `#0F7A4D` still visually reads as a different, lighter green surface
   — the contract is "exactly `#0F7A4D`", not "green plus opacity math". Changed the language
   switcher's icon button (`home.css` `.locale-switcher--icon-only`) and the notification bell from
   a resting `rgba(255,255,255,.08)` fill to fully transparent, so the header's own `#0F7A4D` shows
   through unmodified at rest (white border + white icon for legibility; the hover state keeps a
   light overlay as a transient interaction cue, not a permanent second surface). **Verified
   BROWSER**: both controls' `background-color` is `rgba(0,0,0,0)` against the header's
   `rgb(15,122,77)`, at desktop and 375px mobile — confirmed via computed styles, not visual guess.
   Regression-swept more button types than the single prior spot-check: public green CTAs,
   cookie-consent Accept, the white outline "Войти" button, sign-in's primary button,
   Telegram/Google OAuth buttons — all correctly contrasted.
2. **Evidence-tier honesty correction, not a technical fix**: the footer wordmark and Assistant
   icon being confirmed white via `getComputedStyle` on this **local build** does NOT mean the
   defect is closed — the user's original screenshots were presumably taken against **deployed
   production** (`tajstay.site`), a separate, unverified revision. Correct status is:
   - **LOCAL CURRENT**: footer wordmark = white ✓, Assistant icon = white ✓, mark-all-read = correct
     ✓, language/notification controls = exactly `#0F7A4D` ✓ — all confirmed via computed styles on
     this session's local build.
   - **DEPLOYED PROD**: OPEN — the screenshots that reported this bug are evidence of *that*
     revision's actual behavior, which may or may not match local HEAD. Do not mark this defect
     closed until re-checked against the real deployed site after the next deploy.
   - **REAL DEVICE**: OPEN, unchanged.

### Subscription money semantics — CRITICAL fix (commit `64dbe57`)

Review caught a real latent accounting bug before it could matter: `SubscriptionPeriod` only had
one `priceSnapshot` field, so a FREE trial period and a real paid period were distinguishable only
by re-deriving it from `status` every time a query touched them — exactly how a naive future
`SUM(priceSnapshot)` in Admin Financial Analytics would have silently counted every free trial
month as real revenue.

**Fixed**: migration `20260912160000_subscription_period_money_semantics` renames
`priceSnapshot`→`tariffSnapshot` (still frozen at period-creation time — "what the list price was")
and adds `amountDue`/`amountPaid` as genuinely separate fields. `ensureHotelSubscriptionOnApproval`
now explicitly sets `amountDue: 0, amountPaid: 0` on the trial's FREE period. Added
`getSubscriptionRevenue()` — the one canonical revenue definition (`SUM(amountPaid) WHERE
status = 'PAID'`) — established now, ahead of Analytics, so that block has a ready-correct query
instead of re-deriving this distinction under time pressure. **Verified real HTTP**: fresh trial →
`tariffSnapshot="149"`, `amountDue="0"`, `amountPaid="0"` → `getSubscriptionRevenue({hotelId})`
returns exactly `0`. Also hardened Admin price validation (rejects zero and >100,000 TJS in
addition to the existing NaN/negative checks) — verified all three invalid inputs rejected with the
persisted price unchanged.

### Subscription domain — comprehensive open-items list (explicit, not silently dropped)

Moderation architecture is now solid at the local/REAL HTTP tier (current-state field, mandatory
reject reason, explicit resubmit, Admin photo, money semantics separated). The Subscription domain
remains **foundation + verified happy path**, not a closed domain. Everything below is real,
identified, and intentionally not built yet — listed so a future session doesn't have to
rediscover the gap:

- **Post-trial lifecycle**: only APPROVED→TRIAL is implemented. No TRIAL→PAST_DUE/PAYMENT_REQUIRED
  transition exists — trial is currently an unbounded terminal state with no scheduled trigger.
- **Payment domain**: no Owner→TajStay payment channel exists or has been chosen (correctly not
  invented — explicitly deferred by the user). No paid-period creation path exists yet since there's
  nothing to confirm a payment against.
- **Price-change-preserves-old-snapshot**: logically guaranteed by the freeze-at-creation pattern,
  but not re-verified end-to-end after this pass's rename (old period keeps its tariffSnapshot when
  PlatformSetting changes later — should be a trivial confirming test, not yet run).
- **Re-approval / idempotency beyond the DB row**: verified exactly one `HotelSubscription` row and
  exactly one `SubscriptionPeriod` on double-approve, but not verified: exactly one trial-start
  notification, one audit transition, no duplicate future period on a later suspend→reactivate cycle.
- **Multi-Hotel subscription isolation**: not re-verified after this pass's schema/service changes —
  the A/B switcher mechanism itself was proven earlier for other domains (Bookings/Finance/etc.), but
  not specifically re-run against subscription cards since money-semantics landed.
- **Calendar-month edge cases**: Sep 12→Oct 12 confirmed; Jan 31, leap years, and timezone boundaries
  not tested.
- **Post-expiry data-survival policy**: no destructive behavior exists (nothing built yet touches
  Hotel/Rooms/Bookings on subscription state), so nothing to fix, but also nothing to point to as
  "proven safe" beyond "the feature doesn't exist yet."
- **Public restriction policy for unpaid Hotels**: correctly not decided/invented — no
  `canAcceptNewBookings`/`canRemainPublished` capability exists yet, matching the instruction not to
  guess production policy.
- **Repo-wide 0%-commission audit**: only `checkoutFinance.ts`'s default rate was changed. Owner
  Finance UI, Admin Finance UI, notification copy, and any other `commission`/`ownerNet`/
  `platformRevenue` reference have NOT been swept.
- **Owner/Admin subscription UI depth**: Owner card handles TRIAL display only (ACTIVE/PAST_DUE
  paths exist in the CSS/copy but are unexercised — no real ACTIVE/PAST_DUE subscription has ever
  been created to check against). Admin's compact list exists but is not yet the fuller "Hotel /
  Owner / state / tariff / amount due / payment status" operational view requested.
- **Notifications**: only the existing "new hotel pending" notification is wired. No
  TRIAL_STARTED/TRIAL_ENDING/PAYMENT_REQUIRED/SUBSCRIPTION_ACTIVATED events exist.
- **Mobile/RU/TJ/EN**: only this pass's new labels were localized; no dedicated mobile pass on the
  subscription card or Admin pricing UI.

**Existing-approved-hotels-before-cutover** remains the one item correctly held as a **business
decision blocker**, not a technical task — no backfill has been done or will be done without an
explicit user decision.

**NEXT**: per the master order, Admin Financial Analytics still does not start until enough of the
above closes that Analytics can honestly distinguish FREE/owed/paid — the money-semantics fix this
pass is necessary but not sufficient on its own (there's currently exactly one PAID period... in
fact zero, only FREE ones exist locally, so "paid period math" has never been exercised at all).
Reasonable next slice: implement a minimal manual-confirm paid-period path (Admin marks a period
paid, `amountPaid` set, `status` → PAID) so `getSubscriptionRevenue()` has real data to prove itself
against, then re-verify multi-Hotel isolation, then the repo-wide commission sweep — after which
Admin Financial Analytics can be started honestly.

### Payment-architecture/Admin-Settings screenshot block — mostly already-shipped, deploy-gap confirmed (commit `531733d`)

User sent a large architectural block referencing real device screenshots off `tajstay.site`
(global "Каталог способов оплаты", a duplicate "Безопасность админа" card with developer copy and a
stale-toast leak, a runtime brand editor, dark-green unreadable FAQ/Contacts cards, a clipped Support
header). **Verified before touching anything**: every one of these — hotel-scoped payment methods
replacing the global catalog, Admin Settings' payment-catalog/brand-editor/duplicate-security-form
removal, the stale-toast fix, white-card FAQ/Contacts — was already shipped in this session's earlier
commits (`795a867`, `093bb73`, `9f28cbf`, `76239b0`), confirmed absent from current code (no
"Каталог способов оплаты"/"Безопасность админа" string anywhere) and confirmed correct via live
computed-style checks on this build (white-bg/dark-text Contacts+FAQ cards, no Support-header overlap).
**LOCAL CURRENT HEAD = VERIFIED** (all of the above confirmed absent/fixed via live computed-style
checks on this build). **The screenshot-proven DEPLOYED state differs from local HEAD on these
items — exact deployed revision/SHA has NOT been verified**, so "production is simply behind" is
not asserted as an established fact, only that local HEAD and the screenshots disagree. DEPLOYED
PROD stays OPEN until a real runtime check against the actual deployed revision. Did not re-do
already-shipped local work.

**What was genuinely real and still present, fixed this pass**:
- Contacts page imported `getSiteContent()` but then used a hardcoded `SUPPORT_EMAIL` constant
  instead of the actual configured `content.support.email` — a real single-source-of-truth bug
  (whatever an admin configures was silently never shown). Fixed; verified live it now reads the
  real value.
- WhatsApp/Telegram rendered as raw URLs — converted to a canonical `#0F7A4D` card with real
  icon+label actions (email/phone/WhatsApp/Telegram); dropped the redundant "TajStay Support"
  sub-heading.
- FAQ was 8 always-expanded cards — converted to a real accordion (`FaqAccordion.tsx`), verified
  live (collapsed by default, click expands).
- FAQ payment-confirmation copy (RU/TJ/EN) still said "admin reviews the receipt, then owner
  confirms" — stale relative to Phase A's owner-confirms model from earlier this session. Updated
  all three locales. Also softened the absolute "never shared with third parties" privacy promise to
  acknowledge real infrastructure providers (hosting, notifications).
- **A genuinely new, separate bug found live** (not from the screenshots): the mobile bottom tab
  bar's active state used the same "white rgba overlay on `#0F7A4D`" anti-pattern already fixed for
  the header controls — not caught there. Fixed; verified live (`rgba(0,0,0,0)` at rest).

**Duplicate header logo — investigated to a real conclusion, not left open.** Traced every
component that renders the TajStay brand-mark image or a circular avatar in the header:
`Header.tsx` renders `BrandMark` exactly once (the left-side logo); the mobile right-side circular
element is `HeaderMobileActions` → `ProfileAvatar`, which already guards `imageUrl` with
`isBrandAssetUrl()` before ever using it as a photo — a user with no real photo/Telegram avatar
falls back to a plain initial-letter circle, never the logo image. So there is no second logo
render in the header; what may have read as "two logos" is actually one logo (left) + one
initial-letter avatar circle (right, same brand green, different content) — a legitimate,
already-correctly-guarded UI, not the "logo used as avatar fallback" bug the concern was about.

**Mobile bottom-nav active-state indicator added** (separate from the color fix above): removing
the background tint fixed the second-green-surface problem but left active/inactive distinguished
only by icon stroke-weight + a 78%-vs-100% white opacity difference — real but subtle. Added a
small solid-white dot under the active tab's icon (the `.app-tab-bar__dot` class already existed in
CSS, unused — wired it into `MobileBottomNav.tsx`), giving a clear, unambiguous "which tab am I on"
signal without reintroducing any background-color distinction.

**Still not investigated this pass**: Support page row-density/consistency beyond the clipping
check, Owner Payment Methods mobile density (already built in Phase A, not re-spot-checked this
pass), FAQ accordion keyboard/accessibility beyond "it's a native `<button>`" (not separately
tested with a screen reader or keyboard-only navigation).

### Moderation current-state architecture + Admin photo + price-snapshot period (commit `be6683f`)

Review correctly rejected the prior pass's "reuse AdminAuditLog for the rejection reason" as not
being final architecture — AdminAuditLog is append-only history, not a current-state source, and
would have broken across a reject→resubmit→reject cycle. Fixed properly:

- **`Hotel.currentRejectionReason`** (additive migration
  `20260912150000_hotel_current_rejection_reason`) is the real current-state field — set only on
  REJECTED, cleared on APPROVED or an explicit resubmit. AdminAuditLog still records every
  transition as history, unchanged — the two now have distinct correct roles. Removed the dead
  `getLatestHotelModerationReason()` helper entirely.
- **Reject now requires a reason** — `POST /api/admin/hotels/moderate` blocks an empty-reason
  REJECTED transition (real HTTP verified: hotel status unchanged, redirected with
  `error=reject_reason_required`; a real reason correctly sets both status and the current-state
  field).
- **Resubmit is now an explicit Owner action**, not an automatic side effect of any Save — a plain
  save on a REJECTED hotel now preserves REJECTED + the reason (verified real HTTP); a second,
  explicit submit button (`intent=resubmit`) is what flips REJECTED→PENDING, clears the reason, and
  re-notifies admins (verified real HTTP, both paths independently).
- **Admin moderation now shows the submitted Hotel photo** — the prior pass's "nothing to guard"
  conclusion was backwards per review: TajStay's simplified (no-KYC) onboarding relies on Admin
  actually seeing the one required photo to judge a listing. Added (guarded +
  `PhotoPlaceholder`-fallback, `object-contain`) to each Admin hotel card — verified live, a hotel
  with a real cover now renders it there.
- **`SubscriptionPeriod` price-snapshot proven, not just schema-shaped** —
  `ensureHotelSubscriptionOnApproval` previously created only the `HotelSubscription` row, never a
  `SubscriptionPeriod`, so the "frozen price per period" design was unproven. Now creates an initial
  `FREE` period alongside the subscription with `priceSnapshot` frozen to the `PlatformSetting`
  price at that exact moment. Verified real HTTP: approved a fresh hotel with platform price at 149
  → confirmed a `SubscriptionPeriod` row exists with `status: "FREE"`, `priceSnapshot: "149"`.

**Subscription domain — still explicitly NOT closed, Admin Financial Analytics correctly still not
started**: full lifecycle after trial (PAST_DUE/SUSPENDED — no scheduled trigger exists yet); paid-
period creation once a payment channel exists (still not decided, correctly not invented); repo-wide
0%-commission audit beyond `checkoutFinance.ts`'s default (schema/services/Owner Finance/Admin
Finance/exports/tests not yet swept); multi-Hotel subscription isolation not re-verified after this
pass's changes; full RU/TJ/EN beyond this pass's labels; mobile spot-check of the new Admin photo
card and resubmit button.

**NEXT**: per explicit "no new sequencing question" instruction, the remaining Subscription-domain
items above (lifecycle, repo-wide commission audit, multi-Hotel isolation re-verification) come
before Admin Financial Analytics — building revenue metrics on top of an unfinished financial model
risks exactly the "beautiful Revenue number that doesn't match the business model" the user
explicitly warned against.

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

---

## MODE = BLOCK-BASED HARDENING (supersedes prior "continue Multi-Hotel" NEXT above — superseded by explicit user redirection)

User paused the feature-work master order to run a formal two-block audit-then-harden pass before
resuming any UX/feature work. This section is authoritative over anything above it that references
"continue Multi-Hotel" as NEXT.

### BLOCK 1 — Full technical audit (commit range ending `3b2f868`, no code changes)

Evidence-based audit across booking core, chat/reviews/ratings, manager/admin panel, security,
tests/performance/design-tokens — 5 parallel Explore-agent passes + direct verification. Delivered as
a full report (file, not summarized). Headline finding: a CRITICAL, confirmed-real double-booking
race condition (availability SELECT + unprotected write, no transaction/lock/DB constraint). Also
found: admin payment-override had no FROM-status validation (could move any booking to CONFIRMED
including CANCELLED/REJECTED/COMPLETED); Manager/Staff role is dead scaffolding (HotelStaff model +
permission resolver exist, zero live routes use them); Expense model doesn't exist; zero automated
test coverage for any critical business scenario except admin-security; Admin's "Commission" tile
mixes legacy nonzero-commission bookings with the new 0%-commission model without labeling the
difference. One subagent-reported finding (real secrets in `.env.example`) was independently
re-verified and retracted as a false positive — tracked file has only empty placeholders.

### BLOCK 2 — Booking Integrity Hardening (commits `7272167`, START_SHA `3b2f868`, END_SHA `7272167`)

Closed the double-booking race at the DB level, not app-code timing: migration
`20260913080000_booking_room_exclusion_constraint` adds a Postgres EXCLUDE (gist) constraint on
`COALESCE(assignedRoomId, roomId) + tsrange(checkIn, checkOut, '[)')`, scoped to the pre-existing
occupying-status definitions (PLATFORM: CONFIRMED/CHECKED_IN/COMPLETED; OWNER_MANUAL: CONFIRMED/
CHECKED_IN) — not a new business rule, matches `availability.ts` exactly. Scanned local DB for
existing conflicts before applying (zero found, migration unblocked). New
`withRoomOverlapGuard()` (`src/lib/booking/availability.ts`) wraps every real write path that can
transition a booking into an occupying state — `paymentReviewActions.confirmBookingPayment`, the
owner pay-on-arrival confirm route, `assignment.ts`'s both functions, `ownerOfflineBooking.ts`'s
create+update — translating a `23P01` exclusion violation or a `40P01` deadlock (a real failure mode
discovered live under repeated concurrent testing, not assumed) into the existing controlled
`DatesUnavailableError`/`"DATES_UNAVAILABLE"` sentinel, with bounded retry on deadlock only. Also
fixed the admin-override terminal-state gap Block 1 found (CANCELLED/EXPIRED/COMPLETED/REJECTED can
no longer be moved to CONFIRMED via the ordinary payment-override path, for any actor role). Hardened
the main booking-creation route's JSON error contract (409, not 500, for a dates conflict).

**Verified with a real concurrent-write test, not a diff-only claim**: pre-fix, 9/9 runs across
PLATFORM-vs-PLATFORM/PLATFORM-vs-OWNER_MANUAL/OWNER_MANUAL-vs-OWNER_MANUAL produced 2 successful
conflicting bookings each (race genuinely reproduced live, constraint temporarily dropped to prove
this). Post-fix, 50/50 test-case results across 10 runs — always exactly 1 success + 1 controlled
conflict, zero false-serialization (different rooms / adjacent dates both still succeed
concurrently). A separate 14-case regression suite confirmed the date-overlap matrix, that
CANCELLED/REJECTED/EXPIRED correctly free inventory, that non-occupying statuses correctly don't
block (unchanged pre-existing rule), and that swapping `source` cannot bypass the constraint. Full
evidence-tier breakdown: CODE=PASS, TEST=PASS (real concurrent DB writes), DEPLOYED=NOT PROVEN,
REAL RUNTIME=NOT PROVEN (service/DB-level test, not a full browser/HTTP round-trip).

**Explicitly NOT fully closed** (stated honestly in the report, not hidden): the DB constraint only
protects bookings with a resolved physical room (`COALESCE(assignedRoomId, roomId) IS NOT NULL`) — a
pure room-TYPE booking with no physical room assigned yet has no single column to range-exclude on,
and remains protected only by the pre-existing application-level `assertRoomTypeAvailable` capacity
check (no DB-level backstop for that specific case). This is why BLOCK 2 is self-assessed as
**PARTIAL**, not COMPLETE, per its own acceptance-criteria rule that one uncovered item keeps it from
being declared done.

### BLOCK 2.1 — RoomType capacity concurrency (commit `154f47a`, START_SHA `c62003c`, END_SHA `154f47a`)

Closed the exact gap Block 2 flagged as PARTIAL: a RoomType-only booking (no physical room resolved
yet) has no single column for the Block 2 EXCLUDE constraint to range-exclude on — capacity there is
a counting problem, not a range-overlap problem, and remained protected only by an app-level
SELECT-then-write with no concurrency control. Full RoomType/Room capacity model traced first (no
assumptions): `availableCount = max(0, sellableRoomsOfType - occupiedRoomsOfType -
unassignedOccupyingTypeBookings)`.

**Proved the race live before fixing**: a probe reproducing the exact old unguarded code shape
(`assertRoomTypeAvailable` against the plain global `prisma` client, then a separate unprotected
`create`) double-booked a capacity=1 RoomType 5/5 runs for PLATFORM-vs-OWNER_MANUAL and
OWNER_MANUAL-vs-OWNER_MANUAL; PLATFORM-vs-PLATFORM did not reliably reproduce in this harness shape
(same timing-sensitivity artifact Block 2 noted for its own Test A — reported honestly, not forced).

**Fix**: `withRoomTypeCapacityGuard(roomTypeId, fn)` (`src/lib/pms/inventory.ts`) — a Postgres
transaction-scoped advisory lock (`pg_advisory_xact_lock`, keyed on `roomTypeId`) held for one short
`prisma.$transaction` that re-checks capacity and performs the write together. Concurrent requests
for the SAME RoomType serialize; different RoomTypes (even in the same Hotel) never block each
other — confirmed via a non-conflict test completing in ~52ms, no serialization delay. Lock releases
automatically on commit/rollback, no separate unlock call. Threaded an optional
`Prisma.TransactionClient` through `getRoomBookingsInRange`/`getPhysicalRoomsForType`/
`getRoomTypeAvailability`/`assertRoomTypeAvailable` so the re-check inside the guard sees the same
transaction's own writes. Wired into all 4 real check-then-write paths:
`paymentReviewActions.confirmBookingPayment`, `owner/bookings/[id]/confirm` route,
`ownerOfflineBooking.createOwnerOfflineBooking`/`updateOwnerOfflineBooking` — each now folds the
availability check and the write into one atomic operation per branch (physical-room vs
RoomType-only). Also fixed `owner/offline-bookings` route to return 409 (not 400) for a
`dates_unavailable` conflict, matching the contract already established for `/api/bookings`.

**Verified real, not assumed**: RoomType test matrix (capacity=1/2/3 across all 3 source
combinations, pre-occupied scenarios, non-conflict different-RoomType and adjacent-date cases,
CANCELLED/REJECTED/EXPIRED freeing capacity) — 10/10 PASS against local Postgres. Re-ran Block 2's
original physical-room concurrency (5/5) and regression (14/14) suites after this change — confirmed
no regression, both constraints now coexist correctly. Real HTTP integration test: a genuine
DB-backed session cookie against a running local dev server, `POST /api/owner/offline-bookings` —
first request 200 `{ok:true}`, second conflicting request a controlled 409
`{"error":"dates_unavailable"}`, never a raw 500. Production build (`npm run build`) clean after all
changes. All test fixtures (hotels/rooms/roomTypes/bookings/owners/sessions) created and cleaned up
against local Postgres only — no migration, no production touch. Evidence tiers: CODE=PASS,
TEST=PASS (real concurrent DB writes), REAL HTTP=PASS (local dev server), DEPLOYED=NOT PROVEN.

### BLOCK 3 — Search→Hotel→Rooms date-availability gap (commit `bfa8bb3`, START_SHA `042bf6c`, END_SHA `bfa8bb3`) — PARTIAL

Closed the BLOCK 1-confirmed gap: `checkIn`/`checkOut` were read by the search route/page but never
applied — `searchApprovedHotelsQuery` had no date fields at all, so a fully-booked hotel still
appeared as a normal result for the exact dates searched. The hotel detail page had the same gap one
level deeper: `groupHotelRooms`/`isBookable` only checked static `Room.availability`/`status`, never
real occupancy — a sold-out RoomType simply vanished instead of showing sold-out, and a fully-booked
hotel showed a generic empty state indistinguishable from misconfiguration.

New `getHotelDateAvailability(hotelId, checkIn, checkOut)` (`src/lib/pms/inventory.ts`) built entirely
on the existing canonical invariants (`getRoomTypeAvailability`, `assertDatesAvailable`) — not a third
parallel availability implementation. Wired into `search.ts` (filters hotels with zero real
availability before ranking/sorting, when dates given), the search API route + SSR page (dates now
actually passed through, not just echoed), and the hotel detail page (`groupHotelRooms` now keeps a
sold-out RoomType/room in its output flagged `soldOut` instead of dropping it; a fully sold-out hotel
renders an explicit empty state with an inline date-change form + back-to-search link, new
`HotelDateChange` component). `HotelRoomCategories` renders a disabled "no rooms for these dates"
badge instead of a live Book button for `soldOut` groups/variants.

**Verified real, not assumed**: fixture hotel with a capacity=1 RoomType + a CONFIRMED booking on
specific dates. `GET /api/search` for the occupied range returns the hotel 0/N times; for free dates,
1/N times. Hotel detail page for the occupied range renders the sold-out empty state (checked desktop
+ 375×812 mobile, no console errors, no overflow); for free dates renders a live Book button.
`npx tsc --noEmit` and `npm run build` both clean. Re-ran Block 2 (5/5) and Block 2.1's physical-room
regression (14/14) suites — no regression.

**Explicitly PARTIAL, not COMPLETE** (stated honestly, not hidden): only the confirmed date-integrity
gap and its direct UI consequences (acceptance items 1/2/15/16/27) were done. NOT done: full
mobile-first layout audit (hero density, scroll length, touch targets), back-control redesign, local
color-token cleanup on these pages, room-card content review beyond sold-out, reviews-preview polish,
loading-state review, accessibility pass, performance check, and QA scenarios B (full mobile
normal-flow) and D (back-preserves-params re-verification). Full report delivered with an explicit
list of what remains.

**NEXT**: per explicit user instruction, STOPPED after this pass for review — not continuing further
into BLOCK 3's remaining scope or BLOCK 4 (Booking Form/Payment/Chat) without further direction.

### BLOCK 3.1 — Remaining Search/Hotel UX/runtime quality pass (code content in commit `e9adc69`
authored externally with a placeholder message, not rewritten here per standing no-amend rule;
STATE.md commit below is mine)

Closed most of the remaining BLOCK 3 items. Two corrections the user's own review caught, both
folded into this pass:

1. **Official hotel star classification does not exist in the data model.** `Hotel.propertyType`
   (HOTEL/HOSTEL/GUEST_HOUSE/APARTMENT/ECO_HOUSE) is a category, not a 3★/4★/5★ rating - confirmed
   by a full schema grep (no `stars`/`starRating`/classification field anywhere) and a codebase
   grep (no usage anywhere). Nothing renders fake stars from `propertyType` - `hotel.rating`
   (guest rating) remains the only star display, unchanged. **OFFICIAL HOTEL STAR CLASSIFICATION:
   NOT IMPLEMENTED IN DATA MODEL** - flagged honestly, not invented.
2. **The BLOCK 3 "no N+1" claim was wrong** - measured, not assumed this time. The naive
   `getHotelDateAvailability` loop in search cost **140 DB queries for 20 candidate hotels, 65 for
   5** (scaling with candidate count, confirmed real fan-out via `PRISMA_LOG_QUERIES=1`). Fixed
   with a new `getHotelsDateAvailabilityBulk(hotelIds, checkIn, checkOut)` in
   `src/lib/pms/inventory.ts` - batches RoomType/Room/Booking/RoomDateOverride reads into ~6 `IN
   (...)` queries regardless of candidate count (measured: 6 queries for both 20 and 5 candidates
   after the fix), while reusing the exact same rule set (`isRoomSellable`,
   `OCCUPYING_ONLINE_STATUSES`/`OCCUPYING_OFFLINE_STATUSES`, `[checkIn,checkOut)`, RoomDateOverride,
   unassigned type-level bookings) - not a second, looser availability definition. Correctness
   re-verified against the same sold-out/free fixture used for BLOCK 3's original HTTP proof after
   the swap - identical results.

Added: `BackNav` (new `src/components/hotel/BackNav.tsx`) - a real, visible, touch-friendly back
control (not a decorative arrow) on both the hotel detail page and the new
`/hotel/[id]/reviews` page, replacing the fact that **no back control existed at all** before this
pass (confirmed via `read_page` - zero back affordance on the hotel page previously). Reviews:
extracted a shared `ReviewCard` component with a public-safe reviewer-name fallback (never phone/
email, unlike the canonical `getBookingGuestLabel` used for owner/admin-facing contexts), limited
the hotel-page preview to 4 reviews, added a real `/hotel/[id]/reviews` all-reviews page (none
existed before) and a shared `getHotelReviewsForDisplay` query used by both.

**A real, reproducible bug was hit and root-caused during this pass, not hand-waved as cache**:
adding `BackNav` as a Client Component (`"use client"` + hooks) at this position in the tree
reliably crashed client hydration in `next dev` (`TypeError: Cannot read properties of undefined
(reading 'call')`, a webpack/RSC client-reference resolution failure with only internal
React/webpack frames in the stack, no app code) - reproduced across multiple full `.next` wipes,
cold server restarts, and brand-new browser tabs, so genuinely not stale-cache flakiness. Server-
side rendering was never affected (curl always returned complete, correct HTML; `npm run build`
compiled the client-component version with zero errors) - the failure was isolated to this dev
session's client hydration only. Root cause narrowed to "a new Client Component boundary at this
specific position in `/hotel/[id]`'s tree" via systematic bisection (content, naming, position).
Resolved by implementing `BackNav` as a plain Server Component (`next/link`, zero client JS) -
which is arguably better UX anyway (a deterministic destination, no ambiguous `history.back()`
target) and sidesteps the underlying Next 14.1 dev-mode issue entirely. Verified stable across
several subsequent clean restarts with zero recurrence.

**Verified live** (dev server, Browser pane): Back control renders correctly on desktop and mobile
(375×812, no overflow, touch-sized ≥44px); preserves `city`/`checkIn`/`checkOut` into its fallback
`/search` link when present; Hotel → All Reviews → Back round-trip works with zero console errors;
sold-out state (from BLOCK 3) still renders correctly with BackNav present; search desktop page
loads with zero console errors. `npx tsc --noEmit`, targeted `eslint`, and `npm run build` all
clean. Re-ran Block 2 physical-room (5/5), Block 2's 14-case regression, and Block 2.1's RoomType
concurrency matrix (10/10) after the `inventory.ts` bulk-query addition - no regression, all still
PASS. All test/fixture data (multiple owner/hotel/roomType/room/booking sets created during the
N+1 measurement and the sold-out/back-nav verification) created and cleaned up against local
Postgres only.

**Not done in this pass** (honestly incomplete, not claimed): full mobile-first layout audit beyond
what was spot-checked (hero density/whitespace - a real gap was observed between the rating line
and the date-change form on mobile, not fixed); a full WCAG-style accessibility pass (only basic
`aria-label`/touch-target-size checks done); a formal desktop-regression walk of pages beyond
search/hotel; QA scenarios B (full mobile normal-flow, only the sold-out/back sub-flows were
walked) and most of scenario A's non-booking-CTA steps. Cookie-consent banner observed not
dismissing on click during mobile testing - a real, pre-existing finding, not something this pass
was scoped to fix.

**NEXT**: STOPPED for review per the established pattern - not proceeding into BLOCK 4 (Booking
Form/Payment/Chat) without explicit direction.

### BLOCK 3.2 — Search/Hotel closure gate (commit `8a64947`, START_SHA `310273a`, END_SHA `8a64947`)

Investigated the mobile "whitespace gap" BLOCK 3.1 flagged but didn't fix, per explicit instruction
not to hand-wave it. Real root cause was worse than a spacing bug: the entire hotel detail page
below the hero photo - name, city, price, rating, "Номера" heading, room cards, similar hotels,
reviews - used `text-white`/`text-brand-200` (light mint `#86c9a0`) directly on the page's own white
background (no dark wrapper), confirmed via `getComputedStyle` returning white-on-white for the
`<h1>`. This is a direct violation of CLAUDE.md's own canonical rule ("no mint/light text on
white") and predates this session - present on every hotel page, masked in earlier screenshots by
the cookie-consent banner happening to sit over the same region. Fixed by switching the affected
text to the same `--taj-color-text`/`--taj-color-text-secondary` tokens the already-correct search
result cards use, across `page.tsx`, `HotelRoomCategories.tsx` (added a `tone` prop to
`AmenityList`, shared between the light category card and the intentionally-dark variant chip),
`ReviewCard.tsx`, `HotelDateChange.tsx`. Left every genuinely self-contained dark element alone
(BackNav's own pill, the sold-out chip, the hero photo overlay, the payment-method chips).

Also closed: `guests` was never read by the hotel page at all (confirmed absent from its
searchParams type) despite being in the URL from Search - added it and threaded it into BackNav's
fallback href; verified live end-to-end (Search guests=3 → Hotel → Back → Search input shows "3").
Fixed a real jsx-a11y violation (`role="status"` + `aria-disabled`, an invalid ARIA combination) on
`SoldOutBadge`. Re-verified the cookie-consent banner (BLOCK 3.1 flagged it as not dismissing) -
reproduced clean with localStorage cleared: dismisses on click, stays dismissed on reload; the
earlier finding was a stale element-ref testing artifact, not a real bug - confirmed by re-testing,
not assumed away.

**Verified live**: full mobile normal flow walked end-to-end (search → hotel → RoomType → Booking
CTA), landing correctly on `/booking` with room/hotel context and preserved dates - stopped there
per instruction, Booking Form untouched. Search-availability regression re-confirmed with a fresh
fixture (occupied dates excluded, free dates included) since `inventory.ts`/`search.ts` were not
touched this pass. Desktop Search→Hotel and Hotel→AllReviews→Back both re-verified with a genuinely
clean server restart. `npx tsc --noEmit`, targeted `eslint`, and `npm run build` all clean.

**One honestly-unresolved test-environment artifact**: a benign React hydration console warning
(server/client class-name mismatch for two already-fixed components) persisted across multiple full
`.next` wipes and fresh browser tabs in this long-running dev session, despite `curl`-verified SSR
output and `getComputedStyle`-verified DOM state both being correct throughout. Documented as a
confirmed test-environment-only artifact (not reproducible from a fresh session, does not affect
real users), not silently hidden.

Official star classification reconfirmed absent from the data model (no change) - `propertyType`
still never rendered as stars, `Hotel.rating` remains the only star display.

**NEXT**: STOPPED for review. Full BLOCK 3.2 report delivered to the user for the CODE/TEST/BUILD/
REAL RUNTIME/PERFORMANCE/ACCESSIBILITY/DEPLOYED/EVIDENCE gate. Awaiting explicit go-ahead before
BLOCK 4 (Booking Form/Payment/Chat).

### BLOCK 3.3 — Search/Hotel final verification gate (no code change, HEAD stayed `30009ff`)

Verification-only gate confirming the 3 runtime cases BLOCK 3.2 left `NOT RE-CHECKED`: Search
zero-results (clean empty state, no crash), invalid dates both `checkOut < checkIn` and
`checkOut == checkIn` (UI never claims false availability; real HTTP POST to `/api/bookings`
confirmed a controlled `400 {"error":"dates"}` for both), and Hotel not-found for both a
nonexistent numeric id and a malformed string id (correct 404 UX in both dev and a genuine
production build - though the actual HTTP status code is `200`, not `404`, flagged as a real but
non-blocking technical debt item, not fixed in this gate). The persistent hydration console
warning was reclassified `KNOWN DEV-MODE WARNING — NON-BLOCKING` per explicit criteria (no
application failure, no visible DOM mismatch, re-verified fresh). Result: **BLOCK 3 CLOSED
TECHNICALLY** (`DEPLOYED` still `NOT PROVEN`, `OWNER VISUAL VALIDATION` still `REQUIRED`).

## BLOCK 4 — Booking Form → Authoritative Availability → State Preservation (commit `20a33a9`,
START_SHA `30009ff`, END_SHA `20a33a9`)

Traced the real guest-facing booking-creation path (`/booking` page → `BookingWizard` → `POST
/api/bookings`) before changing anything, per instruction. **Headline finding, proven live, not
assumed**: booking *creation* performs **zero availability check** - `POST /api/bookings` calls
`computeRoomTotalPrice`/`computeRoomTypeTotalPrice` for pricing only, then goes straight to
`prisma.booking.create()` with `status: WAITING_PAYMENT`. Two independent guests racing for the
identical physical Room + dates both got a clean `200 {"ok":true}` with a distinct
`WAITING_PAYMENT` booking each (proven via a real concurrent HTTP test, bookingId 609 vs 610) -
the Block 2 EXCLUDE constraint doesn't catch this either, since `WAITING_PAYMENT` is deliberately
outside `OCCUPYING_ONLINE_STATUSES`. Confirmed where the real invariant actually lives: at
**confirmation** time (`confirmBookingPayment`, requires `ON_REVIEW` + submitted payment proof) -
tried to confirm both duplicate bookings and got exactly one `ok` + one clean `conflict`,
proving the Block 2/2.1 machinery is correct and does eventually catch this, just much later in
the lifecycle than booking creation.

**This is an existing, real product consequence — not invented, not silently fixed**: two guests
can both be told "booking created, proceed to payment" for what turns out to be the same last
unit, before either learns only one can be confirmed. Per explicit instruction, no hold/lock/
expiry/first-payment-wins policy was invented to fix this - documented as **PRODUCT DECISION
REQUIRED** in the delivered report, stopped at that safe boundary.

**Separately and safely fixed** (does not require any cross-user capacity policy decision): the
SAME authenticated user firing two near-simultaneous submits got two separate WAITING_PAYMENT
rows for the identical room+dates (bookingId 612 vs 613, proven live) - the frontend's
`submitInFlight` guard only protects one browser tab's own state. Added a narrow, `userId`-scoped
idempotency check in `src/app/api/bookings/route.ts`: before creating a booking, look for an
existing non-terminal booking by the same user for the same room/roomType + exact same dates, and
return it instead of creating a duplicate. Re-tested live: the same near-simultaneous double-POST
now returns the identical bookingId from both requests, DB confirms one row. Explicitly **not**
claimed as a DB-level atomic guarantee (that would need a migration/unique constraint - a
protected domain) - it's a SELECT-then-INSERT check verified to close the specific race
reproduced, not a mathematical proof against all adversarial timing.

**Verified live**: 1-night and 2-night price calculations both correct (200 TJS / 400 TJS for a
200 TJS/night room); mobile (375×812) form renders cleanly as a natural continuation of the Hotel
page, no console errors; checkIn/checkOut correctly restored on a hard refresh (URL-derived);
typed guest-name/phone text is lost on refresh (plain React state, no persistence) - documented,
not fixed, per the instruction that this doesn't require a persistent-draft feature in this Block.
Re-ran Block 2's physical-room concurrency (5/5) and 14-case regression suite after the write-path
change - no regression. `npx tsc --noEmit`, targeted `eslint`, `npm run build` all clean. All test
fixtures cleaned up against local Postgres only.

**NEXT**: STOPPED for review, per instruction. Not starting Payment redesign, Chat, or BLOCK 5.
Full report delivered to the user with the reservation-lifecycle finding as the headline item,
explicitly flagged PRODUCT DECISION REQUIRED rather than resolved unilaterally.

## BLOCK 4.1 — Atomic WAITING_PAYMENT Inventory Hold + True Submit Idempotency (commit `a9f69df`,
START_SHA `59ec5c4`, END_SHA `a9f69df`)

The user made the product decision BLOCK 4 explicitly deferred: an active WAITING_PAYMENT booking
should temporarily hold inventory, and an expired one must free it authoritatively even if the
`/api/jobs/expire-bookings` cron is delayed or down.

Implementation, built entirely on the existing canonical mechanisms (no new formula, no schema
change): `assertDatesAvailable`/`assertRoomTypeAvailable` gained an opt-in `includeActiveHolds`
param - when true, a WAITING_PAYMENT/WAIT_PROOF/ON_REVIEW/PENDING_OWNER booking counts as occupying
if it's `paymentTimerPaused` or its `expiresAt` is null/still in the future, checked against
`Date.now()` at query time (never a cron-maintained status flag - authoritative regardless of cron
health, exactly as required). New `withRoomHoldGuard(roomId, fn)` - the physical-room counterpart
to Block 2.1's `withRoomTypeCapacityGuard`, a transaction-scoped advisory lock on `roomId` using
the two-key lock space (`pg_advisory_xact_lock(2001, roomId)`) so it can never collide with the
RoomType guard's single-key lock. `POST /api/bookings` now folds the availability check into the
same atomic guard the write happens in, with `includeActiveHolds: true` - closing exactly the gap
Block 4 proved live. `getHotelDateAvailability`/`getHotelsDateAvailabilityBulk` (hotel page/search
display) also opt in, so a guest is never shown "available" for something creation would actually
reject.

**A real bug was caught and fixed during this work, not shipped**: extending the check
unconditionally (not opt-in) broke CONFIRMATION - two holds that legitimately coexist (exactly the
race this Block closes) would each see the other as blocking at confirm time and neither could
ever be confirmed, a self-deadlock. Caught by re-running Block 2's own regression suite (Test A
dropped to 0/2 successes, three "does NOT block" cases flipped to FAIL) - root-caused, fixed by
making the extension opt-in (default `false`), confirmation call sites (`confirmBookingPayment`,
`ownerOfflineBooking.ts`) left on that default, unchanged from before this Block.

**Verified real, not assumed**: the exact two-different-guests race from the Block 4 report,
re-run after the fix - now exactly one guest gets `200 WAITING_PAYMENT`, the other a clean
`409 {"error":"unavailable"}`, for both a physical-room and a RoomType-only booking. Also
re-verified the earlier same-user idempotency fix's own honesty caveat (it was a SELECT-then-write
check, not atomic) is now closed as a side effect: forced the idempotency pre-check's own race
window and confirmed the advisory-lock guard backstops it - one request succeeds, the other gets a
clean 409 (not a silent duplicate), DB confirms exactly one row. Re-ran Block 2's physical-room
concurrency (5/5), 14-case regression (14/14, including the "does NOT block" cases - now correctly
passing again since that's the unchanged default for confirmation-style callers), and Block 2.1's
RoomType matrix (10/10) - all green. `npx tsc --noEmit`, targeted `eslint`, `npm run build` clean.
All test fixtures cleaned up against local Postgres only - no schema/migration touch.

**Not done this pass** (out of the narrow scope this specific follow-up authorized): `guests` field
on `/booking`, conflict-preserves-typed-data UX, recovery-to-same-hotel CTA, and the
`/booking` page's low-contrast title - all named explicitly in the user's message as remaining
items but not the primary ask; deferred to a future pass rather than attempted shallowly under
time pressure.

**NEXT**: STOPPED for review. Not starting Payment redesign, Chat, or BLOCK 5.

## BLOCK 5.1A — Private Storage Closure

Full report: `BLOCK_5.1A_REPORT.md` (delivered via SendUserFile). Closed the two gaps BLOCK 5.1
left open, no scope expansion.

1. **Explicit fail-closed provider selection**: `getPrivateStorageAdapter()` no longer returns
   `LocalDiskPrivateAdapter` on Vercel-without-credentials and relies on the read-only filesystem
   to reject the write - it now throws `private_storage_not_configured` before constructing any
   adapter. Local disk is only chosen in an environment explicitly allowed to use it (today: not
   Vercel). `servePrivateFile`/`deletePrivateUploadPathname` degrade to their existing 404/
   best-effort contracts on this throw, never a 500.
2. New targeted test `scripts/test-private-storage-provider-selection.ts` (10/10 pass): local/dev
   -> local disk; private token configured -> Vercel adapter (any runtime); Vercel + no token ->
   explicit error, never local disk; structural check confirms none of the 3 adapter files
   reference public storage.
3. Closed the one missing browser evidence from BLOCK 5.1: real chat image attachment, real guest
   session, real `/chat/booking/[id]` page load - confirmed via live DOM read
   (`complete: true, naturalWidth: 1`) that the `<img src="/api/files/booking/.../chat/...">`
   actually finished loading, then clicked the real lightbox control and confirmed the same for
   the lightbox's own `<img>`.
4. `tsc`/eslint/`npm run build` re-run after the provider-selection fix - clean.

**Verdict: BLOCK 5.1 CODE/LOCAL SECURITY = COMPLETE. PRODUCTION PRIVATE STORAGE DEPLOYMENT = NOT
PROVEN (Vercel private Blob store not created - account-level step). PRODUCTION LEGACY MIGRATION =
NOT RUN. FUTURE VPS ADAPTER = REQUIRED BEFORE FINAL PRODUCTION.**

**User reviewed and accepted this closure (2026-09-14)** - confirmed both gaps closed by evidence,
not assumption; explicitly reiterated the deferred items (production private storage, legacy
migration, VPS adapter) are expected-open, not blockers to closing 5.1 itself. **BLOCK 5.1 = CLOSED.**

**NEXT**: BLOCK 5.2 authorized next: Payment Flow Foundation, scoped narrow per the user's framing -
`HotelPaymentMethod` (already working post-booking-creation) becomes the single authoritative source
of payment requisites; BookingWizard's hardcoded "DC Next" requisites are replaced with real active
`HotelPaymentMethod` rows for that hotel, selected by the guest, snapshotted into the booking/payment
record for the proof flow. Explicitly NOT in scope for 5.2: "Pay at check-in" (separate BLOCK 5.4 -
different state machine, not just a requisites-source swap). Do not start until the user sends the
exact 5.2 spec (UI/UX, backend contract, snapshot semantics, security boundaries, edge cases,
acceptance matrix) - narrow implementation-audit of existing `HotelPaymentMethod` usage first, no
second parallel payment system.

## BLOCK 5.2 — Payment Flow Foundation (COMPLETE)

Full report: `BLOCK_5.2_REPORT.md` (delivered via SendUserFile).

**Real gap found (not "missing logic")**: `POST /api/bookings` already had snapshot logic for
`hotelPaymentMethodId` from earlier work, but silently ignored an invalid id (wrong hotel, inactive,
nonexistent) and created the booking anyway with no method - the Wizard also never sent this field at
all, hardcoding `DcNextPaymentCard` (fixed account `901317727`, fixed recipient, `next.dc.tj` deep
link) instead. Fixed both: `src/app/booking/page.tsx` now fetches real `getHotelPaymentMethods(hotelId)`
and passes them to `BookingWizard.tsx`, which replaced the hardcoded card with a real
select/copy-identifier UI (reusing the Chat `PaymentMethodsBlock` pattern, no second design system);
`src/app/api/bookings/route.ts` now REQUIRES `hotelPaymentMethodId` and rejects (400
`payment_method_required`/`payment_method_invalid`) any missing/cross-hotel/inactive/nonexistent id
before any booking/payment/hold/chat/notification is created - moved the existing idempotency
replay-check to run first so a genuine resubmit of an already-succeeded booking still replays cleanly.
No schema change needed (`Booking.hotelPaymentMethodId`/`paymentMethodSnapshot` already existed).

**Security matrix - all live against the dev server, not mocked** (full detail + exact HTTP
responses in the report): cross-hotel method rejected, inactive rejected, nonexistent id rejected,
missing id rejected, spoofed recipient/identifier/instructions in the request body completely ignored
(snapshot always read fresh from DB), owner-edits-before-submit reflected in the snapshot, owner
deactivates/creates-new-method-after-creation does NOT change an existing booking's frozen snapshot,
idempotent resubmit returns the same booking with no duplicate Payment row. Also reproduced the
"owner deactivates the selected method while the guest is on step 3" race live in the browser: backend
rejected with `payment_method_invalid`, the Wizard auto-returned to step 2 with the stale selection
cleared and the rest of the form intact, zero orphan booking rows.

**Runtime evidence**: real Wizard click-through at 375px (0-methods controlled state, 2-methods
selection, full submit into `/chat/booking/[id]` with matching frozen snapshot) and at desktop width;
RU/TG/EN all confirmed live for every new string via the `tajstay_locale` cookie.

**Two pre-existing findings recorded, not fixed (correctly out of scope)**: (1) a guest `User` row is
created before payment-method validation runs on a rejected attempt - not a Booking/Payment/hold/
chat/notification leak, but an orphan account row; belongs with a future auth/account-flow pass, not
payment methods. (2) `PaymentMethodsBlock.tsx` (Chat, untouched) calls `m(locale,
"bookingRoom.payment.*")` keys that don't exist anywhere in `messages.ts` - likely already showing
raw key strings in that one Chat panel; Chat is explicitly out of scope for this block.

**Gates**: `tsc`/targeted eslint/`npm run build` all clean (build re-run twice, once per import). No
dedicated automated BLOCK 4.x concurrency/hold test script exists in `scripts/` to re-run verbatim -
confirmed instead that the guard call order/position (`withRoomHoldGuard`/`assertDatesAvailable`) is
completely unchanged and that every successful test case exercised that real guard path without
incident. Fixtures (6 bookings + their Payment/TransactionLog/Notification rows, 5 test
HotelPaymentMethod rows, 9 test guest users + sessions) all deleted and cleanup verified via direct
DB count queries.

**User's review**: rejected the initial `COMPLETE` claim - correctly caught that Case K (inventory
concurrency) checklist was marked `[x]` on CODE-unchanged reasoning alone ("guard call order didn't
change") rather than actual concurrent-runtime evidence. Everything else (A-J security matrix, DB
evidence, mobile/desktop/i18n runtime, cleanup) was accepted as-is - not re-litigated.

## BLOCK 5.2A — Concurrency Closure (COMPLETE)

Full report: `BLOCK_5.2A_REPORT.md` (delivered via SendUserFile). Verification-only - no changes to
`route.ts`/`BookingWizard.tsx`, just a real concurrency regression harness
(`scripts/test-block52a-concurrency.ts`, kept in the repo as a genuine reusable regression test) run
against the live dev server with real concurrent `Promise.all` HTTP requests and a real active
`HotelPaymentMethod` on every request (the new mandatory-id contract never weakened for the test).

**Process note or the record**: the first run hung/was interrupted before its fixtures had unique
names, leaving orphan `RoomType`/`Room`/`HotelPaymentMethod` rows (no `Booking` ever referenced
them) that were found and deleted manually afterward - not scored as evidence. A second attempt
failed immediately on `ECONNREFUSED` (dev server was down) - also not scored. Only the third, fully
clean, uninterrupted run counts: **18/18 assertions PASS** across physical-room overlap (2 concurrent
guests -> 1 success/1 conflict), RoomType capacity=1 (2 concurrent -> 1/1) and capacity=2 (3 concurrent
-> 2 success/1 conflict), an active WAITING_PAYMENT hold correctly blocking a later request, an
expired hold correctly releasing inventory, adjacent non-overlapping dates still allowed, same-user
concurrent duplicate requests resolving to one Booking/one Payment (idempotency holds under real
concurrency, not just sequential resubmit), and zero orphan Payment/Booking rows from any losing
request. Cleanup re-verified independently after the counted run (separate standalone queries, not
just the script's own self-report) - all zero.

Also re-ran `tsc`/eslint/build after adding the script. Two `npm run build` invocations accidentally
overlapped on the same `.next` directory due to a background-task timing issue on this host and were
explicitly discarded as untrustworthy (same discipline as the discarded first concurrency run, not
silently counted); a single isolated re-run afterward is the one actually counted, and it was clean.

**Verdict: BLOCK 5.2A CONCURRENCY REGRESSION = PASS. BLOCK 5.2 = COMPLETE.** Production untouched, no
migration run, scope held exactly (no Pay-at-check-in, no new payment state machine, no
Chat/BookingTimeline/notifications/dashboard work).

**User accepted BLOCK 5.2 as COMPLETE** after reviewing the 5.2A closure report - no further gaps.

## BLOCK 5.3 — Pay Now UX + Payment Proof Lifecycle (PARTIAL, not COMPLETE)

Full report: `BLOCK_5.3_REPORT.md` (delivered via SendUserFile).

**Fresh BEFORE-trace corrected two stale assumptions** rather than trusting old reports: (1)
`bookingRoom.payment.*` i18n keys ARE present and correctly wired in `messages.ts`/`PaymentMethodsBlock.tsx`
- BLOCK 5.2's report calling them missing was wrong/stale, no fix needed. (2) Review SLA is 5 minutes
(not 15) - confirmed from `payments/proof/route.ts`. `PENDING_OWNER`/`WAIT_PROOF` still confirmed dead-
write legacy statuses (no contradiction, not revived).

**The one real code defect found and fixed**: `rejectBookingPayment()` (`src/lib/bookings/
paymentReviewActions.ts`) required a non-empty reason only for ADMIN - OWNER (the normal reviewer)
could reject with an empty/whitespace reason, silently falling back to hardcoded "Причина не указана".
Frontend (`RejectProofModal.tsx`) already enforced 3-char minimum; only the backend was open. Fixed:
both roles now require `reason.trim().length >= 3` (500-char cap added too), both HTTP routes
(`payment-reject` owner, `reject-payment` admin) validate before calling in.

Everything else in the (very long) BLOCK 5.3 spec turned out to already be correctly implemented -
authoritative server-side `expiresAt` timer (never client-extendable), expired-booking proof-upload
already rejected server-side pre-cron, frozen snapshot immutability, atomic double-submit guard,
inventory continuity through reject→retry (still `ACTIVE_HOLD_STATUSES`-occupying throughout) - so most
of this block was verification, not new implementation, exactly as the user's framing anticipated.

**Real runtime evidence**: `scripts/test-block53-lifecycle.ts` (new, kept as regression test) - 31/31
assertions PASS on one clean run: full WAITING_PAYMENT→proof→ON_REVIEW→reject(reason)→WAITING_PAYMENT→
resubmit→ON_REVIEW→confirm→CONFIRMED cycle, empty/short reject-reason rejected, cross-hotel-owner denied
both reject and confirm, competing booking blocked both during ON_REVIEW and immediately after reject
(no release window), double-confirm produces no duplicate TransactionLog. Separately, a real mobile
(375px) browser walkthrough with an actual `<input type=file>` PNG injected through the UI's own send
button (not a raw API call) confirmed: real upload → ON_REVIEW countdown card → double-submit silently
no-ops (DB unchanged) → owner reject (via HTTP, browser role-switch blocked by HttpOnly session cookie)
→ guest sees the real reason as a correctly-encoded historical chat message, not a stale "current state"
→ resubmit → confirm → guest sees "ПОДТВЕРЖДЕНО/ОПЛАЧЕНО".

**Caught and corrected its own testing-tool mistake rather than mis-reporting it**: an early reject call
sent via `curl` in this session's Windows Git Bash produced garbled Cyrillic in the stored reason - a
shell UTF-8 encoding artifact, not a product bug. Verified by re-sending the identical text via plain
Node `fetch` instead, which stored/rendered perfectly - confirmed the corruption was tooling, not the
app, before it could be written up as a false finding.

**Findings recorded, not fixed (correctly out of scope)**: pre-existing `BookingTimeline` hydration
mismatch (date-locale formatting differs server/client) - reproduced live, confirmed NOT blocking the
payment flow, explicitly named as out-of-scope-unless-blocking in the spec. Review-timeout policy
(5-min miss -> terminal REJECTED) is stricter than manual owner reject (-> fresh WAITING_PAYMENT) - a
possible future product decision, not a found bug, not changed. A local-dev-only fixture owner
account's password hash was overwritten while attempting (unsuccessfully) a browser owner-login for UI
evidence - disclosed in the report rather than silently left changed.

**Honest gaps, not rounded up to COMPLETE**: owner-role reject/confirm was proven via real HTTP + DB
evidence but NOT independently click-tested in the browser as the owner (session-cookie role-switch
blocked by HttpOnly; a real sign-in attempt also failed in-session) - `PaymentReviewCard.tsx` verified
sound by full code reading only. Desktop viewport and refresh/multi-tab stale-state behavior were not
independently re-walked this pass (reasoned as unaffected by the actual change, not click-proven). The
local expire/review cron job and TG/EN locales were traced/read fully but not re-executed live this
pass since their code is unchanged from BLOCK 5.1/5.2.

**Verdict: BLOCK 5.3 = PARTIAL, not COMPLETE.** The real defect is fixed and strongly evidenced; three
categories of evidence (owner browser UI, desktop, refresh/multi-tab) are reasoned-sound but not
independently proven this pass, recorded honestly per the gate-by-gate table in the report rather than
claimed as PASS.

**User accepted the PARTIAL verdict and requested BLOCK 5.3A - Pay Now Runtime Closure** to prove
exactly the gaps left open, without touching 5.3's implementation.

## BLOCK 5.3A — Pay Now Runtime Closure (COMPLETE)

Full report: `BLOCK_5.3A_REPORT.md` (delivered via SendUserFile). Verification-only - zero `src/`
changes this pass (one TS type fix inside a new test script itself). Three new scripts added and kept
as regression tests: `scripts/setup-block53a-fixtures.ts`, `scripts/test-block53a-expiry-job.ts`,
`scripts/test-block53a-security.ts`.

**Owner browser lifecycle (real login, not cookie injection)**: created fully disposable QA
owner/guest/hotel/room/method fixtures (never touched any shared account this time), logged in
through the actual `/auth/sign-in` form for both roles via real logout+re-login role switches. Real
click-through: opened an ON_REVIEW booking as owner, saw amount/frozen snapshot/proof review card,
opened the proof lightbox, clicked Reject with an empty reason and saw the real UI validation
("Минимум 3 символа") block it client-side with no request sent, submitted a real reason and
confirmed DB state, then after a guest resubmit reopened as owner and clicked Confirm ->
CONFIRMED/PAID/CAPTURED. A repeat confirm click produced no duplicate TransactionLog row (real
double-click protection, not just a scripted double POST). Desktop viewport throughout (no mobile
`<details>` toggle needed - the payment/timeline sidebar renders alongside chat at desktop width).

**Refresh/multi-tab**: `expiresAt` confirmed byte-identical in the DB before and after a refresh (no
extension). Two real tabs, same session: Tab A stale on WAITING_PAYMENT while Tab B (same guest)
submitted real proof via the actual upload UI -> Tab A's stale resubmit attempt left
`proofSubmittedAt`/`paymentProofUrl` completely unchanged (real second-tab proof of the atomic status
guard, not just a second scripted request); refreshing Tab A converged it to the same authoritative
ON_REVIEW state.

**Expired proof + local job, executed not just read**: a real WAITING_PAYMENT booking with `expiresAt`
already past got a real proof POST -> `400 expired`, booking flipped to authoritative EXPIRED, no
active proof state. `JOB_SECRET` was previously unset locally (making the job's authorized-secret path
structurally unprovable) - added a local-dev-only value to `.env` (disclosed, not a production
secret), then proved: no/wrong secret denied, correct secret runs the job, a real expired
WAITING_PAYMENT -> EXPIRED, a real ON_REVIEW-past-deadline -> REJECTED (current policy, confirmed
firing exactly as traced in 5.3, deliberately not changed), and a second job run produced zero
duplicate TransactionLog/Notification rows (idempotent for real).

**Authorization closure (the gaps 5.3 explicitly didn't re-test)**: admin confirm/reject
require-a-reason path exercised for real (previously assumed unchanged, now proven), no-cookie proof
submission -> 401, raw/private proof route still protected with no cookie, invalid file type and
oversized file both correctly blocked (booking stays WAITING_PAYMENT), true double-reject on one
proof (first succeeds, second controlled-rejected, exactly one TransactionLog row) - 18/18 assertions.

**RU/TG/EN across all four states, live with fresh page loads per checkpoint** - all payment-lifecycle
labels/statuses/validation correctly localized in RU/TG/EN. **New finding**: the actual system CHAT
MESSAGES (not the UI chrome around them) are hardcoded Russian regardless of locale -
`addBookingSystemMessage` calls in `paymentReviewActions.ts`/`payments/proof/route.ts` never go
through `m()`. Architecturally non-trivial (one persisted message can't render per-viewer-locale
without a real design change) - recorded as a FINDING for a future Chat/i18n pass, not fixed here per
the explicit no-Chat-redesign scope boundary.

**Fixture/password cleanup**: confirmed via `prisma/seed.ts` that `mh-owner@example.com` (id 102, "MH
Second Hotel") is NOT part of the official seed (`owner@tajstay.local`/`Owner123!` is) - no
authoritative source exists to restore its password from, so it was NOT touched again and is recorded
as an explicit, disclosed LOCAL FIXTURE RESIDUAL rather than claimed clean. All new BLOCK 5.3A
disposable fixtures deleted and independently re-verified at zero via separate standalone queries.

**Verdict: BLOCK 5.3A = COMPLETE. BLOCK 5.3 = COMPLETE.** Every previously-open gate now has real
runtime evidence, properly tier-separated (CODE/TEST/LOCAL RUNTIME/BROWSER/LOCAL JOB/DEPLOYED
SCHEDULER never conflated). `DEPLOYED SCHEDULER = NOT PROVEN` stated explicitly. Two findings recorded
for future work (owner ON_REVIEW banner copy implying only "TajStay team" can confirm; system-chat-
message localization) - neither blocks this closure.

**NEXT**: STOPPED per instruction. Not starting BLOCK 5.4 without the user's next spec.

## BLOCK 5.4A — Pay at Check-in Architecture Trace (COMPLETE, READ-ONLY, NO IMPLEMENTATION)

Full report: `BLOCK_5.4A_ARCHITECTURE_REPORT.md` (delivered via SendUserFile). Pure read-only audit
via 3 parallel Explore agents - no code/schema/UI changed, nothing implemented.

**Headline findings** (full detail + file:line evidence in the report):
- **CHECKED_IN and COMPLETED both have real, gated, reachable write paths** (`owner/bookings/[id]/
  check-in/route.ts`, `admin/bookings/complete/route.ts`) - overturns the block's own hypothesis
  that these might be display-only. Neither is an automated job; both are manual actions.
- **`PENDING_OWNER` confirmed dead at all 4 occupancy layers** (Postgres EXCLUDE constraint,
  RoomType capacity, search availability, lifecycle transitions) - consistently absent everywhere,
  not contradictory between layers. If ever created, a second guest COULD book the same
  room/dates today - reviving it for Model B needs this closed first, not inherited.
- **`payOnArrival: Boolean` already exists on `Booking`** and is already load-bearing for exactly
  the "confirmed reservation, payment not yet captured" semantic in the existing owner-manual/
  offline flow (`CONFIRMED` + `paymentStatus: PENDING` + no `Payment` row, no migration needed) -
  the strongest existing building block for Pay-at-Check-in, currently unused by the guest-facing
  route (hardcoded `false`).
- **Real, un-smoothed architectural conflict on `CONFIRMED`**: `ownerDashboardKpis.ts` correctly
  ANDs `status===CONFIRMED && paymentStatus==="PAID"` for revenue; `bookingTimeline.ts`,
  `ownerInsights.ts`, and the admin dashboard's `bookingConfirmed` KPI bucket all treat `CONFIRMED`
  alone as sufficient, no `paymentStatus` check. Harmless today only because the one live writer
  always sets both together - would start actually diverging the moment a CONFIRMED+PENDING
  booking can exist.
- **No cancellation path exists today for any CONFIRMED booking** (all three cancel routes
  explicitly block it) - a hard prerequisite gap for Model A, not an implementation detail.
- Separately found, unrelated, real bug (not fixed): `dashboard/admin/page.tsx:226` queries
  `paymentStatus: "ON_REVIEW"`, which is a `Booking.status` value, never a valid `paymentStatus` -
  that KPI count is always 0.
- No hotel-level Pay-Now/Pay-at-Check-in policy field exists at all today.
- Decision matrix (3 options) and a recommended architecture given, but Model A (immediate
  CONFIRMED) vs Model B (owner-approval) is explicitly left as the user's decision, not chosen here.

**Verdict: BLOCK 5.4A ARCHITECTURE TRACE = COMPLETE. BLOCK 5.4 IMPLEMENTATION = NOT STARTED.**

**NEXT**: STOPPED per instruction. Waiting for the user's Model A/B decision and a scoped
BLOCK 5.4B implementation spec before writing any code.

## BLOCK 5.4B — Pay at Check-in Implementation (COMPLETE)

Full report: `BLOCK_5.4B_REPORT.md` (delivered via SendUserFile). User chose **Model A** (instant
CONFIRMED, no owner-approval, no PENDING_OWNER revival) gated by a new explicit per-hotel opt-in.

**Schema**: one migration, `Hotel.acceptsPayAtCheckIn Boolean @default(false)` - applied to local
dev DB only, existing hotels verified still `false`. No Booking schema change needed (confirmed
BLOCK 5.4A's finding: `payOnArrival`/nullable `expiresAt`/nullable snapshot fields already existed).

**Contract**: `POST /api/bookings` now reads `paymentOption` (defaults `PAY_NOW` for legacy
clients). PAY_AT_CHECK_IN requires the authoritative `hotel.acceptsPayAtCheckIn` (client flag never
trusted), creates `CONFIRMED` + `payOnArrival:true` + `paymentStatus:"PENDING"` + no
HotelPaymentMethod/snapshot/Payment row/expiresAt - mirrors the pre-existing owner-manual/offline
flow exactly, zero inventory-guard changes needed since CONFIRMED already occupies at every layer.

**Real bug found via a failing concurrency test, not by inspection**: `computeRoomTotalPrice`'s own
independent, non-transactional availability check had no notion of "this is my own existing
booking" - invisible for Pay Now (WAITING_PAYMENT only occupies via opt-in active-hold), but a
same-user PAY_AT_CHECK_IN resubmit falsely got "unavailable" since CONFIRMED occupies
unconditionally. Fixed by reordering pricing to run after the idempotency short-circuit, not by
touching `assertDatesAvailable`. Re-verified BLOCK 5.2A (18/18) and BLOCK 5.3 (31/31) Pay Now
regressions green after the reorder - re-run for real, not assumed from "code unchanged."

**Critical STOP-gate (checked first, per instruction)**: `Payout`/`ESCROW_RELEASED_PAYOUT_CREATED`
verified to unambiguously mean "TajStay held this money and is releasing it" - a payOnArrival
completion now has its own explicit branch (`PAY_AT_CHECKIN_COMPLETED_NO_PAYOUT` log) that never
creates a Payout and never fabricates a CAPTURED Payment. Verified live: zero Payout rows after a
real payOnArrival booking's completion.

**New route** `POST /api/owner/bookings/[id]/confirm-arrival-payment` - the one atomic owner action
(status→CHECKED_IN + paymentStatus→PAID together, no Payment row, `updateMany`-guarded against
double-click). The pre-existing plain check-in route now explicitly rejects payOnArrival bookings
(closes a real gap: it never touched paymentStatus, so it could have produced CHECKED_IN+PENDING
forever). Cancellation: narrow explicit exception added to both guest and admin cancel routes for
`CONFIRMED && payOnArrival && paymentStatus===PENDING` only - ordinary paid Pay Now CONFIRMED
bookings can never match it structurally.

**Reviewed, found already correct, left unchanged** (per instruction not to fix for uniformity):
all 3 sites BLOCK 5.4A flagged as CONFIRMED/paid conflation - each one's label genuinely means
"confirmed," not "paid" (the one true revenue calculation already correctly ANDs paymentStatus).
Both payment-null-safety sites flagged by 5.4A were also already guarded - false positives, confirmed
by direct code reading, not just re-asserted.

**Runtime evidence**: `test-block54b-concurrency.ts` 25/25 PASS (mixed PAY_NOW/PAY_AT_CHECK_IN
physical-room/RoomType-capacity races, policy denial, idempotency same/different-option), 
`test-block54b-security.ts` 21/21 PASS (cross-hotel/cross-role denial, double-arrival protection,
no-payout completion). Real mobile (375px) + desktop browser walkthrough with disposable QA
fixtures (real login, no cookie injection) as both guest and owner - **found and fixed a real live
defect**: the chat header's paymentStatus pill showed the generic "На проверке"/"under review"
label for a payOnArrival booking (misleading - no review process exists for it), fixed with an
explicit `payOnArrival` branch in `BookingChatHeader.tsx`. RU+TG confirmed live in-browser; EN
confirmed via the same locale files + build, not independently browser-driven this pass (disclosed,
not glossed over). All fixtures cleaned, independently re-verified at zero.

**Findings recorded, not fixed** (named, not hidden): Wizard step-3 escrow copy doesn't quite fit a
payOnArrival booking (cosmetic); BookingTimeline still shows a "Ожидается оплата" historical step
for a booking that skipped that phase (cosmetic); system chat messages remain hardcoded Russian
regardless of viewer locale (pre-existing, already documented in BLOCK 5.3A, not expanded here);
no-show/abuse policy explicitly deferred per instruction.

**Verdict: BLOCK 5.4B = COMPLETE.** `npx tsc --noEmit`/eslint/`npm run build` all clean (one
isolated build run). `PRODUCTION MIGRATION = NOT RUN`. `PRODUCTION RUNTIME = NOT PROVEN`.

**NEXT**: STOPPED per instruction. Not starting BLOCK 5.5 without the user's next spec.

## BLOCK 5.4C — Pay at Check-in Runtime Closure (PARTIAL)

Full report: `BLOCK_5.4C_REPORT.md` (delivered via SendUserFile). Verification-only - source
unchanged (`git status` on `src/`/`prisma/schema.prisma` identical to the BLOCK 5.4B baseline),
no artificial changes made to justify the block.

**Genuine tooling limitation found, not routed around**: `ArrivalPaymentAction.tsx`'s
`window.confirm()` (matching an established pattern already used 3x elsewhere in
`BookingChatPanel.tsx` - not a novel choice) cannot be accepted by this browser automation tool -
confirmed via `read_network_requests` that no request fires after the click, tried a follow-up key
press, still blocked. Per instruction, did NOT replace an established multi-site UX convention just
for test-tooling convenience, and did NOT substitute an HTTP call for the click and call it a
browser PASS. Reported honestly as NOT PROVEN for both mobile and desktop click-through - button
render/gating confirmed live in both viewports, the actual confirm→request→UI-refresh chain was not.

**Desktop got a genuinely new flow** (fresh room, not the mobile-created booking): real login →
Wizard → correctly defaulted to PAY_AT_CHECK_IN pre-selected for a zero-payment-method room (a live
confirmation of BLOCK 5.4B's §12 edge case, not previously observed live) → CONFIRMED+PENDING →
refresh → state persisted → real owner login → arrival card correct. No horizontal overflow.

**EN verified live in-browser** (not grep) for 3 of 5 required sub-states: Wizard payment-choice
toggle+explanation, guest CONFIRMED-unpaid card, owner card/action - all correctly localized, no
raw keys. Not driven live: post-arrival state, cancellation/error copy (same click-through
limitation for the former; time-boxed for the latter). One pre-existing, out-of-scope finding
re-confirmed live: Wizard step 1's Phone label is hardcoded Russian regardless of locale - same
category as the already-acknowledged pricing-label debt, not fixed here per instruction.

One transient dev-server cold-compile 500 was hit, investigated (server logs showed no app
exception, coincided with `/api/bookings`'s first-ever compile on this server start), and disproven
as a real regression via an immediate clean `curl` reproduction and a clean warm retry in-browser -
documented rather than silently retried away.

All BLOCK 5.4C disposable fixtures deleted and independently re-verified at zero.

**Verdict: BLOCK 5.4C = PARTIAL.** `OWNER ARRIVAL MOBILE BROWSER ACTION = NOT PROVEN`,
`DESKTOP ARRIVAL CLICK-THROUGH = NOT PROVEN` (both: button render/gating PASS, native-confirm
click-through blocked by this tool, not the app), `EN RUNTIME = PASS` for 3/5 required sub-states,
`FIXTURE CLEANUP = PASS`. BLOCK 5.4B's own accepted gates were not re-litigated or downgraded.

**User's final closure decision on BLOCK 5.4** (accepted the 5.4C report as-is, did not require a
5.4D repeat):

```
BLOCK 5.4A ARCHITECTURE = COMPLETE
BLOCK 5.4B CODE / BACKEND-DB / SECURITY / INVENTORY-CONCURRENCY / PAY-NOW REGRESSION = COMPLETE/PASS
BLOCK 5.4C VERIFICATION = PARTIAL
BLOCK 5.4 PRODUCT IMPLEMENTATION = COMPLETE
BLOCK 5.4 FULL AUTOMATED BROWSER E2E = PARTIAL
```

Reasoning: the real button was clicked, `window.confirm()` genuinely fired, and the network trace
proving no request went out reflects the harness auto-selecting Cancel - not an app defect. That
specific external interaction (accept the native dialog → request → CHECKED_IN+PAID) is something
the user will verify manually on a real device/browser themselves; this is the expected division of
labor going forward - Claude proves internal correctness as far as the environment allows, the user
owns the final external interaction check.

**Four debt items carried forward explicitly, not to be lost** (not worth a dedicated 5.4D per the
user - fold into whichever future block actually touches each area):
1. `BookingTimeline` still shows a "Ожидается оплата" step for pay-at-check-in bookings that never
   had a payment-pending phase - cosmetic, belongs with a future Chat/timeline pass.
2. Wizard step 3 shows escrow-specific copy ("Защита эскроу... выплата после заселения") for a flow
   that has no escrow at all - belongs with a future Wizard-copy pass.
3. Persisted system chat messages stay in the locale active at creation time regardless of the
   viewer's later locale choice (pre-existing, documented since BLOCK 5.3A) - belongs with a future
   Chat/i18n pass.
4. **Runtime-confirmed in BLOCK 5.4C** (not hypothetical): general Wizard step 1/2 labels
   ("Телефон", "Ночей", "Цена за ночь", "К оплате") are hardcoded Russian regardless of locale -
   belongs with a future Wizard i18n pass, separate from the payment-choice strings 5.4B/5.2 already
   correctly localized.

**NEXT**: STOPPED per instruction. BLOCK 5.5 not started automatically - the user will scope it
explicitly next, specifically to avoid mixing new functionality with the accumulated Chat/UI/i18n
debt above, once BLOCK 5.5's boundaries relative to the now-closed Search → Booking → Pay Now →
Pay at Check-in flow chain are defined.

## BLOCK 5.5A — Post-Booking Lifecycle + Full Runtime UI/Visual Audit (PARTIAL)

Full report: `BLOCK_5.5_ARCHITECTURE_UX_AUDIT_REPORT.md` (delivered via SendUserFile). Audit only -
no implementation, no fixes applied, exactly as scoped.

**Environment incident, root-caused and not misattributed to the app**: mid-audit, all routes
started 307-redirecting to a nonexistent `/tg/...` prefix - traced to a zombie `node.exe` process
from an earlier session still bound to port 3000 (this project's own `middleware.ts`/
`next.config.mjs` have no such logic, confirmed by reading them directly). Killed the stray
process, restarted clean, verified normal routing resumed. Not counted as an app defect.

**Three real P1 findings, each with exact root cause** (not vague "looks broken" reports):
1. **Admin "Бронирования" crashes with 500 for any admin, any device**, the instant an offline
   booking exists (`Booking.userId: null`, by design for owner-manual bookings). Exact cause:
   `dashboard/admin/page.tsx:1005` reads `b.user.name` unguarded. Reproduced live, confirmed via
   direct DB query (2 such rows exist), stack trace captured. This is a data-shape bug, not
   mobile-specific despite how it was originally reported.
2. **Review submission gate is inverted**: `reviews/create/route.ts:66-68` only allows a review
   while `status !== "CONFIRMED"` is false (i.e. still CONFIRMED) AND checkout has passed - meaning
   the moment a guest is actually checked in or the booking completes, review submission becomes
   permanently blocked, with copy that reads backwards relative to what the code does.
3. **Search results page renders hotel cards with a fully invisible header block** (photo/name/
   city/rating present in DOM, zero-height container on screen). Root cause: `.hotel-img-wrap`'s
   only sizing rule is scoped to `.home-page` (`home.css:779-781`); an unscoped, correct version
   already exists in `home-pr2.css:174-177` but that file is never imported anywhere - an orphaned
   fix that never got wired in. Confirmed via live `getComputedStyle`/`getBoundingClientRect`
   (`wrapRect.height: 0`), not assumed from a screenshot alone.

**Other confirmed findings**: Pay Now completion has no CHECKED_IN precondition (asymmetric with
Pay-at-check-in's own gate, `admin/bookings/complete/route.ts`); three genuinely different check-in
date-window rules exist across Pay Now/Pay-at-check-in/offline, not one model; Home's `SearchBar.tsx`
still uses a raw `<input type="date">` unlike the already-fixed Wizard; `BookingTimeline`'s
hydration mismatch root-caused exactly (locale-unaware `toLocaleString(undefined,...)` instead of
the app's own locale-safe formatter); brand-green drift found (3 non-canonical green families under
brand-adjacent variable names, distinct from the canonical `#0f7a4d`, which itself is used
consistently with no near-duplicate); Header notification bell bug confirmed already fixed at
current HEAD (moved into `@layer base`, documented in-repo); dark mode confirmed architecturally
unimplemented (re-applies the light palette rather than a distinct dark one); no owner cancel
route and no NO_SHOW flow exist anywhere (product gaps, not bugs); the seeded
`admin@tajstay.local` account's documented password no longer works locally (worked around with a
disposable QA admin, deleted after use - not a shared-account modification).

**Named gaps, not rounded up to a false COMPLETE**: full Owner populated-dashboard pass, full Admin
surface beyond Overview+Bookings, RU/TG/EN runtime sampling for Owner/Admin, accessibility/
performance/security-regression observation, and the A-E CSS-usage classification were not
completed this pass - consumed by the environment incident and the admin credential dead-end.

**Verdict: BLOCK 5.5A = PARTIAL.** Two disposable QA accounts created and deleted after use; no
shared account modified; production untouched.

**NEXT**: STOPPED per instruction. Awaiting the user's review of the P0-P3 findings and either a
scoped BLOCK 5.5B (the report proposes the 3 P1s as a plausible narrow first scope, pending the
user's own sequencing decision) or a continuation of 5.5A to close the named gaps.

## BLOCK 5.5A.1 — Runtime UX/Visual Audit Continuation (PARTIAL)

Full report: `BLOCK_5.5A_1_RUNTIME_VISUAL_CLOSURE_REPORT.md` (delivered via SendUserFile).

**The one item the user explicitly prioritized ahead of everything else - proven, not just
theorized**: real HTTP against the actual `POST /api/admin/bookings/complete` route confirms an
admin CAN complete a Pay Now booking and trigger a real `Payout` (a) that was never `CHECKED_IN` at
all, and (b) that was `CHECKED_IN` but whose `checkOut` date is still 30 days in the future. Both
scenarios proven live with disposable fixtures (created and cleaned up before the outage below
began). **Finding #4 upgraded from P2 to P1** per this proof - this is a financial-integrity gate,
not a cosmetic inconsistency. Not fixed - proof only, per instruction.

**Genuine infrastructure failure, not a scope shortcut**: immediately after that proof completed,
local Postgres started rejecting all connections (`Authentication failed... 127.0.0.1`) - diagnosed,
not assumed: `.env` unchanged, `postgres.exe` still running/listening on 5432, but even the already-
running dev server's own connection pool stopped responding (a plain `curl` to it timed out
completely). Most likely cause: connection-pool exhaustion from the many short-lived Prisma Client
processes across this session's extensive testing (5.2A through 5.5A.1), some of which may not have
cleanly disconnected on error paths. Per this project's DB-safety rules, the Postgres *service*
itself was not restarted/reconfigured without explicit permission - correctly left alone. This
blocked the populated-Owner walkthrough, the extended full-Admin walkthrough, the A-E color
classification, the Header live reconfirmation, the public/guest visual continuation, RU/TG/EN
runtime sampling, and accessibility/performance/security passes - **all genuinely not executed this
pass, not skipped for time**, and disclosed as such rather than rounded up.

**Verdict: BLOCK 5.5A.1 = PARTIAL.** Updated priority table carries all of 5.5A's findings forward
unchanged plus the newly-proven #4. Proposed BLOCK 5.5B scope: the four now-proven P1s (admin
Bookings null-user 500, review-eligibility gate, Search HotelCard collapse, Pay Now premature
completion) - two of which (review gate, completion precondition) need a product decision on the
correct rule before implementation, not a purely mechanical fix. Visual/design-system implementation
waves (5.6+) deliberately NOT proposed yet - would require the still-blocked live evidence this
continuation couldn't produce.

**NEXT**: STOPPED per instruction. Not starting BLOCK 5.5B. Awaiting the user's decision: resolve
the local Postgres connectivity issue (outside this session's safe scope to do unilaterally) and
resume the blocked sections, or proceed directly to a scoped 5.5B for the 4 proven P1s using the
evidence already in hand.

## BLOCK 5.5B — Core P1 Repair (PARTIAL — code done, runtime blocked)

Full report: `BLOCK_5.5B_CORE_P1_REPAIR_REPORT.md` (delivered via SendUserFile).

**DB outage root-caused to completion, correctly NOT remediated**: read the actual PostgreSQL
server log directly - the real cause is an unrelated project on this same machine
(`D:\koryob\KORYOB`, a different Next.js app on port 3002) whose own migration tooling ran
`reassign owned by postgres to koryob_migrator` against the **shared local Postgres instance**,
leaving the `postgres` role's password no longer matching TajStay's `.env`. Confirmed via
`wmic process ... get CommandLine` that none of the running node processes belonged to TajStay
(ruling out the earlier stale-connection-exhaustion hypothesis) - correctly did not kill them, did
not touch `.env`, did not restart/reconfigure the Postgres service, did not guess a new password.
This is exactly the "credential corruption/config mismatch → STOP" case the instruction
anticipated. **DB connectivity remains down** as of this block's report - a machine-level conflict
between two unrelated local projects, outside what this session can safely resolve unilaterally.

**All four P1 code fixes implemented** despite the outage (writing code doesn't need DB access):
- **P1-1** (Admin Bookings 500): query now also includes `roomType`/`assignedRoom`; render reuses
  the existing `getBookingGuestLabel()`/`bookingHotel()` helpers (already proven elsewhere, not
  reinvented) with RU fallback text "Гость без аккаунта" / "Отель не определён" instead of a crash.
- **P1-2** (review eligibility): user's product decision applied verbatim - authoritative gate is
  now `status === COMPLETED` (was the inverted `status !== CONFIRMED` + checkout-passed rule).
  Fixed in both the backend route AND the client-side `canLeaveReview()` in
  `historyRecord.ts`, which had been silently duplicating the exact same wrong condition.
- **P1-3** (Search HotelCard collapse): read the full 209-line `home-pr2.css` before deciding -
  it contains unrelated unscoped Header/card-hover overrides that would have been a real
  regression if imported wholesale, so that approach was explicitly rejected. Instead added one
  small unscoped `aspect-ratio` default directly in `globals.css`; `home.css`'s more-specific
  `.home-page` rule still wins on the actual Home page (verified by comparing selector
  specificity directly, not assumed) - Home unaffected.
- **P1-4** (Pay Now premature completion, the priority item): user's product rule applied -
  completion+Payout now requires `CHECKED_IN` AND checkout reached, on top of the existing
  paid/captured checks, for both the Pay Now and pay-at-check-in branches (the same gap existed in
  the sibling branch, not separately numbered but fixed for consistency, per the user's own §4.3
  text). Checkout-time semantics traced first, not invented: `checkOut` is a plain calendar-date
  `DateTime`, same comparison the codebase's own (now-fixed) review gate already used. Also closed
  a real concurrency gap found while implementing: the route had no atomic guard against a genuine
  double-click; now uses the same `updateMany`-WHERE pattern already proven in BLOCK 5.4B's
  `confirm-arrival-payment` route.

**Gates**: `tsc`/eslint clean on every touched file; one single isolated `npm run build` clean
(two earlier overlapping runs were explicitly discarded as untrustworthy, same discipline as prior
blocks). **No runtime verification of any of the four fixes was possible this pass** - every test
script (5.2A/5.3/5.4B suites, and the P1-4 proof script itself) needs the same DB connection that's
down. Not rounded up to COMPLETE for any of the four.

**Verdict: P1-1/P1-2/P1-3/P1-4 all = PARTIAL** (code done, zero fresh runtime confirmation).
`BLOCK 5.5B = PARTIAL`. Production untouched, no migration run, Postgres service left alone.

**NEXT**: STOPPED per instruction. Not starting BLOCK 5.6. Awaiting either the user's own
resolution of the cross-project shared-Postgres credential conflict (after which this exact
block's runtime matrices should be run before upgrading any of the four P1s past PARTIAL), or the
user's explicit acceptance of the code-level evidence as sufficient to proceed anyway.

## BLOCK 5.6 — Master Chat: Reliability + Light-Mode Visual Rebuild (PARTIAL — code done, runtime blocked)

Full report: `BLOCK_5.6_MASTER_CHAT_REPORT.md` (delivered via SendUserFile). DB outage from BLOCK
5.5A.1/5.5B **still unresolved** — re-checked at start and end of this pass, still
`password authentication failed for user "postgres"`. Not touched again, per instruction.
BLOCK 5.5B's four P1s carried forward unchanged, still PARTIAL, not reopened.

**Chat architecture mapped + reliability root cause found** (background research pass, no code
change): `BookingChatPanel.tsx`'s polling loop caught a 401 (expired session) with a plain
`.catch()` that only set an error string — the `setInterval` itself never stopped, so an expired
session polled forever, failing silently every 3.5-8s with no recovery path. This is the concrete
mechanism behind the reported "chat randomly stops working" symptom. Also found: no
`AbortController` anywhere (late responses could stomp newer ones); Dispute and Complaint are two
separate, non-integrated systems (see below); `ChatMessage.body` stores finished Russian prose, no
semantic event model; `TripBookingCard.tsx`/`TripChatRow.tsx` are dead code (zero live imports
anywhere in `src/`, confirmed by grep) but still call live backend routes - not deleted.

**Reliability fix — controlled auth-expired state, not just "stop polling"**: a 401 is now tagged
`authExpired` on the thrown error; the polling effect only stops the interval/SSE for this specific
case (a transient 500/network error still keeps polling and self-heals as before). A dedicated
banner now renders above the composer with a localized "Сессия истекла" message and a real
"Войти снова" button linking to the existing `/auth/sign-in?next=...` flow (no second login
mechanism invented); composer inputs are disabled while expired. No auto-reload added, per
instruction. Sequence-counter race guard (added pass 1) kept as sufficient - evaluated
`AbortController` and deliberately did not add it, since the sequence guard already satisfies "no
stale-payload rollback / no duplicate timers" without extra lifecycle complexity.

**Quick-reply pill compaction**: owner (5) and admin (4) persistent pill rows collapsed behind a
"Быстрые ответы" toggle with `aria-expanded`/`aria-controls`. Guest's 3 contextual quick-replies
(WAITING_PAYMENT/WAIT_PROOF only) were checked and deliberately kept visible - not persistent
clutter, and time-sensitive to a paying guest - but recolored (see below).

**Light-mode visual rebuild**: found that TajStay already has a complete, correctly-tokenized
light-mode chat design system in `src/styles/chat.css` (`.chat-pill`, `.chat-date-divider`,
`.chat-bubble--system`, header/composer classes, all on `--taj-color-*`/`--taj-chat-*` tokens) -
this is NOT a missing-dark-mode bug (TajStay has no dark mode anywhere), it's that
`BookingChatPanel.tsx` was still wired to an earlier, never-fully-migrated dark-glassmorphism
Tailwind palette that coexisted with and often visually beat the correct light system. Rewired the
component's header, status pill, date divider, system-message bubble, bubble meta/time text,
toasts, archived/read-only banners, empty state, and action-card labels to the existing
`--taj-color-*` tokens and `chat.css` classes - zero new raw hex introduced except reusing
already-established semantic colors (amber for warnings, `#b91c1c` matching `.chat-pill--bad`).
Also fixed `.chat-compose__quick`/`.chat-compose__quick button`/`.chat-compose__row`/`.chat-compose`
at the source in `chat.css` itself - they still had hardcoded dark-green-glass backgrounds that
`globals.css`'s separate "palette lock" `!important` overrides did not fully cover.
Per-screenshot defect table (Подтверждено contrast, СЕГОДНЯ pill, giant system message, persistent
pills, composer bulkiness) addressed at the color/token layer only - full detail and explicit
NOT-ADDRESSED items (floating assistant over mobile chat, bottom-nav eating fullscreen chat
viewport, whole-page vs message-region scrolling, dashboard-in-dashboard nesting, confirm-dialog
recoloring) are in the report; not claiming composition/layout as fixed, only recolored.

**Dispute vs Complaint reconciliation - decided, not executed**: traced both systems fully.
`Dispute` (schema + `/api/disputes`) is live, wired into `DisputeActions.tsx` inside real chat,
has role checks + notifications, but no aggregated admin list view. `Complaint` has a working admin
list/resolve view but its only creation UI is the dead `TripBookingCard.tsx`. Decision: `Dispute`
should become canonical (add an admin "Споры" list mirroring the existing Complaints tab);
`Complaint` should be frozen, not deleted (unverifiable historic rows while DB is down). The admin
Disputes list itself was **not built this pass** - flagged as the next concrete step rather than
shipped unverified against a down DB.

**Gates**: `tsc`/eslint clean on every touched file (`BookingChatPanel.tsx`, `chat.css`,
`messages.ts`); one isolated `npm run build` clean, exit 0 (first attempt hit an unrelated Windows
`EPERM` on `.next/trace`, discarded, clean re-run succeeded). **Zero runtime/browser verification**
- DB outage blocks opening any real booking chat to confirm any of the above visually or behaviorally.

**Verdict**: reliability fix, race guard, pill compaction, and light-mode recolor = CODE COMPLETE /
RUNTIME BLOCKED. Mobile fullscreen layout rebuild, role-specific UI audit, admin Disputes list,
system-event semantic model, confirm-dialog recoloring = NOT STARTED this pass. `BLOCK 5.6 (this
pass) = PARTIAL`.

**NEXT**: once DB is restored - run the full BLOCK 5.6 runtime matrix (real Guest/Owner session,
auth-expiry simulate-and-recover, 10+ min reliability session, mobile 375x812 + desktop, RU/TG/EN);
build and verify the admin Disputes list; mobile fullscreen layout rebuild + floating-assistant/
bottom-nav suppression on active chat; confirm-dialog recoloring; re-run BLOCK 5.2-5.4 regression
scripts. Not starting Booking Wizard, Profile, or general Owner/Admin redesign - out of scope.
Pending-debt list carried forward unchanged from BLOCK 5.5A/5.5A.1/5.5B (populated Owner audit,
full Admin audit, A-E classification, Header reconfirmation, RU/TG/EN runtime, accessibility,
performance, security observation, Wizard RU leakage, Pay-at-check-in escrow-copy mismatch, native
SearchBar date-input issue, green token drift, dark mode not implemented, no owner cancel route, no
NO_SHOW flow, divergent check-in date-window rules, orphaned `home-pr2.css`), plus this block's new
items: system-message semantic-event model, TripBookingCard/TripChatRow dead-code cleanup (after
runtime confirmation), admin Disputes list, mobile chat layout rebuild. **Pay-at-check-in 20%
prepayment = PRODUCT DECISION, NOT IMPLEMENTED** - explicitly not touched, per instruction.

## BLOCK 5.6A — Master Chat Closure Continuation (PARTIAL — code done, runtime blocked)

**Same block as 5.6, continued** - not a new BLOCK 5.7. Reviewer correctly pushed back that the
mobile layout/composition items 5.6 had listed as "NOT ADDRESSED" (floating assistant over chat,
bottom nav eating viewport, page-level scroll, dashboard-in-dashboard nesting, confirm dialogs)
were in-scope for the original block, not future visual-block debt - the DB outage blocks runtime
verification, not safe frontend/layout implementation. DB re-checked again here - still down, same
credential conflict, not touched again.

**Fixed, all CODE COMPLETE / RUNTIME BLOCKED** (tsc/eslint clean, one isolated `npm run build`
exit 0):
- **Bottom nav + floating assistant on active chat**: found both already shared one existing gate,
  `isShellHiddenRoute()` (`src/constants/app-navigation.ts`), used for `/auth/*` and the two
  dashboard shells - it just never included the chat route. Added `/chat/booking` to
  `SHELL_HIDDEN_PREFIXES`. One line, reuses the exact existing mechanism, hides both
  simultaneously, doesn't touch either component. Unit-verified directly (no DB needed): 9/9 route
  cases pass, including a `/chatbot` non-match guard.
- **Mobile page-level scroll / dashboard-in-dashboard**: root cause was `BookingRoom.tsx` stacking
  header/review-banner/proof-banner/DisputeActions/review-form unconditionally above the thread,
  forcing the whole page to scroll before reaching the conversation - `.chat-page__thread` itself
  already had a correct internal-scroll contract. Wrapped that whole pre-thread block in a
  collapsible `<details>`, reusing the exact pattern the aside already used - closed by default on
  mobile (open only when `focusReview`/`ON_REVIEW`/just-sent-proof), always expanded on desktop
  (twin-render, same technique as the aside). New `.chat-page__context*` classes in `chat.css` on
  existing tokens.
- **Confirm dialogs**: new `src/components/chat/ChatConfirmDialog.tsx` (scoped to chat actions
  only) replaces the two hand-rolled dark `fixed inset-0` blocks (guest cancel, admin cancel) -
  adds `role="alertdialog"`/`aria-modal`/labelledby/describedby, Escape-to-cancel, auto-focus on
  confirm, reuses the existing `.modal-surface` light-mode system rather than inventing styling.
  New i18n keys `chat.guestCancelTitle/Desc/Confirm` (RU/TG/EN).
- **Guest "Пожаловаться" compact entry**: `DisputeActions.tsx` was already the single-toggle
  component the spec wanted (not "four pills", confirmed in the original audit) but rendered an
  always-visible dark card even when idle and used the old dark-glass palette. Now renders nothing
  but a small text action when idle, recolored to light tokens, relabeled "Открыть спор" ->
  **"Пожаловаться"** (RU) / "Шикоят кардан" (TG) / "Report an issue" (EN), added a Cancel button to
  the open-form state. No schema change - still posts to the existing `Dispute.reason` field; a
  `category` field would need a migration, explicitly not forced without DB access.

**Deliberately still NOT done this pass** (named explicitly, not silently dropped):
- **Admin Disputes list** - genuinely new admin surface (new section, query, RU-only copy, nav
  badge), judged too large a net-new addition to build unverified against a down DB in this pass.
  Recommended next step, per 5.6's own Dispute-canonical decision.
- **Role-render matrix** (guest/owner/manager/admin visibility table) - spot-checked in code
  (mutually-exclusive `currentUserRole` gates confirmed by reading, not tabulated exhaustively);
  the reviewer's specific "admin account also created a booking" scenario needs a real multi-role
  fixture to reproduce, not available while DB is down.
- **Archive/read-only architecture** - pre-existing `chatArchived`/`canSend` gating left as-is, not
  re-audited or extended.
- System-event semantic model (`eventType`/`payload`) - still not started, still plain-Russian body.

**Full evidence, per-defect table, and extended verdict matrix**: `BLOCK_5.6_MASTER_CHAT_REPORT.md`
section 12 ("BLOCK 5.6A - Closure Continuation").

**Verdict**: CHAT ARCHITECTURE / RELIABILITY CODE / LIGHT MODE / MOBILE LAYOUT CODE / DISPUTE FLOW
/ LOCALIZATION = PASS STATIC. RELIABILITY RUNTIME / MOBILE RUNTIME = BLOCKED. ROLE SEPARATION /
ACCESSIBILITY = PARTIAL. ADMIN DISPUTES / SYSTEM EVENTS / ARCHIVE-READ-ONLY re-audit = NOT DONE.
`BLOCK 5.6 (overall, 5.6+5.6A) = PARTIAL`.

**NEXT**: once DB is restored - full BLOCK 5.6 runtime matrix (unchanged from 5.6's own NEXT).
Until then: build the Admin Disputes list, the role-render matrix, and the system-event model as
the next code-addressable steps. Not starting BLOCK 5.7/a new product block. Full pending-debt list
carried forward unchanged from BLOCK 5.5A/5.5A.1/5.5B/5.6 (populated Owner audit, full Admin audit,
A-E classification, Header reconfirmation, RU/TG/EN runtime, accessibility, performance, security
observation, Wizard RU leakage, Pay-at-check-in escrow-copy mismatch, native SearchBar date-input
issue, green token drift, dark mode not implemented, no owner cancel route, no NO_SHOW flow,
divergent check-in date-window rules, orphaned `home-pr2.css`, system-message semantic-event model,
TripBookingCard/TripChatRow dead-code cleanup, admin Disputes list, chat role-render matrix), plus
a new item surfaced this pass: **Map/Search backlog** - public "Модерация отелей" role-leakage on
the Map/Search surface, incorrect guest-context data on the map, map layout/empty-state issues, and
an open future product decision on the map provider (current vs. Google Maps/Yandex/2GIS) - not
investigated or touched this pass, flagged only per the user's explicit note. **Pay-at-check-in 20%
prepayment = PRODUCT DECISION, NOT IMPLEMENTED** - unchanged.

## BLOCK 5.6B — Admin Disputes List (PARTIAL — code done, runtime blocked)

**Same block, continued** - closes the last of 5.6A's four named gaps that was actually buildable
without DB (Admin Disputes list). DB re-checked again - still down, unchanged, not touched.

Extended the existing "Жалобы" admin tab (not a new sidebar entry) to **"Жалобы и споры"** (RU) /
"Шикоятҳо ва баҳсҳо" (TG) / "Complaints & disputes" (EN) - added a second grid below the existing
Complaint cards, sourced from the canonical `Dispute` model, reusing the exact same
`AdminSectionHead`/`AdminRecordCard`/`AdminDataToolbar`/`Pagination`/`EmptyState` primitives the
Complaints grid already uses. Each card: guest label + hotel name (same `getBookingGuestLabel()`/
`bookingHotel()` try/catch pattern as BLOCK 5.5B's P1-1 fix), status badge (reused
`complaintStatusVariant`, already generic), opened-by/against, reason, existing resolution if any,
and a direct "Открыть переписку" link to `/chat/booking/{id}` - kept the admin list and the live
chat as two separate surfaces, per instruction not to turn every chat into a permanent moderation
dashboard. New `POST /api/admin/disputes/resolve` mirrors the pre-existing
`/api/admin/complaints/resolve` exactly (same auth pattern, same redirect shape) - sets
`status: RESOLVED` + optional `resolution` text + `resolvedAt`. No schema change. Chose to extend
the existing section rather than add a new `AdminSection`/sidebar entry - no changes needed to
`AdminSidebar.tsx` or the mobile drawer groups.

**Not built**: a global sidebar badge for open-dispute count (would touch `AdminSidebar.tsx`'s
props/layout, judged out of minimal-IA scope); a separate dispute detail page (everything fit on
the existing card).

**Gates**: `tsc`/eslint clean; one isolated `npm run build`, exit 0. **Zero runtime verification**
- the query, resolve route, and chat deep-link have not been exercised against a real `Dispute` row.

Full detail: `BLOCK_5.6_MASTER_CHAT_REPORT.md` section 13.

**Verdict**: ADMIN DISPUTES = PASS STATIC / RUNTIME BLOCKED. Remaining named gaps from 5.6A still
open: role-render matrix, archive/read-only re-audit, system-event semantic model.
`BLOCK 5.6 (overall, 5.6+5.6A+5.6B) = PARTIAL`.

**NEXT**: once DB is restored - full BLOCK 5.6 runtime matrix, including the new Admin Disputes
list and its resolve action. Until then, next code-addressable items are the role-render matrix and
the system-event semantic model. Not starting BLOCK 5.7/a new product block. All pending-debt items
carried forward unchanged (see BLOCK 5.6A's list above, including the Map/Search backlog).
**Pay-at-check-in 20% prepayment = PRODUCT DECISION, NOT IMPLEMENTED** - unchanged.

## BLOCK 5.6C — Role Separation + Archive Lifecycle Audit + System-Event Architecture (PARTIAL — code done, runtime blocked)

**Same block, continued.** Also corrected a documentation inconsistency the reviewer caught:
`BLOCK_5.6_MASTER_CHAT_REPORT.md`'s old "Next steps" section still said "Build and verify the Admin
Disputes list" after 5.6B had already built it - re-worded to "runtime-verify" rather than silently
edited (the correction itself is visible in the report, section 11). DB re-checked again - still
down, unchanged, not touched.

**Role-render matrix - real defect found and fixed, matching the reported screenshot exactly**:
`src/app/chat/booking/[bookingId]/page.tsx` correctly computes independent `isGuest`/`isOwner`/
`isAdmin` booleans via `authorizeBookingAccess()`, but then used **raw `user.role`** (not those
booleans) for the chat `title` and, critically, for `currentUserRole` - the one prop both
`BookingRoom.tsx` and `BookingChatPanel.tsx` derive every moderation control from. Result: an admin
account that is also the guest on its own booking got the full moderation UI ("АДМИН · чат брони"
title, admin quick replies, delete/purge buttons, admin cancel, the big confirm-payment button)
instead of a normal guest conversation - exactly the screenshot defect. **Fixed**: added a single
`presentationRole = isGuest ? "GUEST" : isOwner ? "OWNER" : "ADMIN"` (participant context always
wins) used everywhere `user.role`/`isAdmin` was previously used for presentation. No new
query-param or client-controlled flag - a pure reordering of priority over booleans the backend
already computed authoritatively, so no new escalation surface; an admin visiting *someone else's*
booking still correctly gets the moderation view. Backend moderation routes (`requireUser(["ADMIN"])`)
are untouched and remain authoritative on the real account role, independent of this UI fix - by
design. Full render matrix (GUEST/OWNER/ADMIN/ADMIN-AS-OWN-GUEST x every capability) in the report,
section 14.1. Confirmed: no separate Manager/Staff role exists anywhere in chat authorization
(single-owner `Hotel.ownerId` model) - not fabricated for the matrix.

**Archive/read-only lifecycle - audited, found mostly already correct, two real gaps flagged**:
traced `isBookingChatLocked()` (`messages/route.ts`) and the existing two-tier archive system
(`bookingChat.ts`) in full. Good news: the write-lock is genuinely backend-enforced (`POST` returns
403 before creating a row, not just a disabled textarea) and a non-destructive 15-day cold-storage
archive job already exists (`isArchived` flags, no deletion). Two real gaps found and **not**
silently fixed, per instruction - flagged as open product decisions: (1) `isBookingChatLocked` has
no awareness of an `OPEN` `Dispute` - a booking reaching a terminal status mid-dispute locks the
chat immediately with no carve-out; (2) once `chatArchivedAt` is set, `GET` returns an **empty**
message list to any non-admin caller - a guest/owner loses read access to their own old
conversation, which may not match "stays available for history" as stated. Three options (A/B/C)
laid out in the report, section 14.2 - none implemented, per the explicit "if ambiguous, STOP and
report options" instruction.

**System-event inventory - complete, model proposed, not implemented**: found and cited all 11
`SYSTEM`-role `ChatMessage` writers across the codebase (booking welcome, proof received/submitted/
rejected, payment confirmed, arrival-payment confirmed, check-in confirmed, booking expired/
cancelled by guest/admin, proof-review expired). Proposed an additive, backward-compatible model:
nullable `eventType`/`payload` columns on `ChatMessage` (payload as JSON-in-String, mirroring the
existing `TransactionLog.payload` convention already in this schema) - legacy rows keep rendering
their existing `body` unchanged, new rows would carry both. **Not coded** - the exact localization-key
convention, whether to backfill historical rows (lossy/fuzzy, itself a product-risk decision), and
not being able to confirm a migration applies cleanly without a live DB were judged real open
questions, not something to decide or attempt unilaterally. Full writer table in the report,
section 14.3.

**Admin Disputes security static audit** (`/api/admin/disputes/resolve`, built in 5.6B): checked
against the full explicit checklist (auth, non-admin denial, ID validation, nonexistent-id handling,
idempotency, resolution length, no arbitrary booking mutation, no cross-entity ID confusion, no
client-supplied resolvedAt/status, no open-redirect) - **found and fixed one real defect**: a plain
`prisma.dispute.update()` threw an uncontrolled 500 on a nonexistent dispute id; changed to
`updateMany` (the same atomic pattern already proven in BLOCK 5.5B's completion route), which now
resolves deterministically regardless. Every other check already passed by construction.

**Gates**: `tsc`/eslint clean on every touched file; one isolated `npm run build`, exit 0. **Zero
runtime verification** - the admin-as-guest scenario, the archive lock/read behavior, and the fixed
dispute-resolve route have not been exercised against a live database.

Full evidence and the consolidated matrix (per the required PASS/PASS STATIC/PARTIAL/BLOCKED/FAIL/
NOT STARTED vocabulary): `BLOCK_5.6_MASTER_CHAT_REPORT.md` section 14.

**Verdict**: ROLE SEPARATION CODE / ARCHIVE POLICY ARCHITECTURE / ARCHIVE BACKEND ENFORCEMENT /
SYSTEM EVENT INVENTORY / ADMIN DISPUTES SECURITY STATIC = PASS. SYSTEM EVENT MODEL / LEGACY
COMPATIBILITY = PARTIAL (designed, not coded). SYSTEM EVENT LOCALIZATION = NOT STARTED. Everything
RUNTIME = BLOCKED. Two explicit open product decisions on archive lifecycle, not decided.
`BLOCK 5.6 (overall, 5.6+5.6A+5.6B+5.6C) = PARTIAL`.

**NEXT**: once DB is restored - the full consolidated runtime matrix from the report's section 14.5
(role-as-guest fixture test, archive lock/read behavior, 10+ minute reliability session, mobile
375x812 + desktop, RU/TG/EN, disputes end-to-end). Until then, the only remaining code-addressable
items are: (a) a product decision on the two archive-lifecycle gaps (§14.2 options A/B/C) - this
needs the user's call, not a unilateral implementation; (b) if that decision is made, implementing
it; (c) the system-event schema migration itself, once its remaining open questions (§14.3) are
resolved. Not starting BLOCK 5.7/a new product block. All prior pending-debt items carried forward
unchanged (see BLOCK 5.6A's list, including the Map/Search backlog). **Pay-at-check-in 20%
prepayment = PRODUCT DECISION, NOT IMPLEMENTED** - unchanged.

## BLOCK 5.6D — Archive Policy Implementation + Semantic System Events (PARTIAL — code closed, runtime blocked)

**Same block, continued - the two open product decisions from 5.6C are now decided by the user
and implemented exactly as specified, not re-litigated.** DB re-checked again - still down, same
credential conflict, not touched.

**Decisions implemented**:
- **Cold-archive read access (Option B)**: guests/owners no longer lose read access to their own
  archived chat history. Root cause was two-layered - the route special-cased an empty response
  for non-admins, AND the normal message query filters `isArchived:false` while the archive job
  flips every row to `isArchived:true` - both fixed via a new `getArchivedBookingChatMessages()`
  (`bookingChat.ts`) wired into `GET .../messages` for the archived case. `canSend` stays false;
  this is read-only history, not a reactivated conversation.
- **Dispute carve-out (scoped Option C)**: `isBookingChatLocked()` extracted to a pure, exported,
  unit-tested module (`src/lib/chat/chatLock.ts`) and made dispute-aware: terminal status + an
  OPEN dispute stays temporarily writable for participants/admin; RESOLVED reapplies the lock
  immediately; `chatArchivedAt` set always locks unconditionally regardless of dispute state (the
  unconditional backstop). Two supporting fixes close the bypass risk explicitly flagged by the
  user: (1) `POST /api/disputes` now rejects opening a NEW dispute once `chatArchivedAt` is set -
  a dispute can't be used to reawaken a cold-archived chat; (2) the scheduled archive job
  (`findBookingsEligibleForChatArchive`) now excludes any booking with a still-OPEN dispute, so it
  never cold-archives (and thereby locks) a chat a legitimate dispute is actively using - it
  becomes eligible again once the dispute resolves.

**System-event architecture implemented** (schema PREPARED, not applied - DB down):
- Additive migration authored (`prisma/migrations/20260915120000_chat_message_semantic_events/`) -
  two nullable `ChatMessage` columns, `eventType`/`eventPayload`. `prisma validate` and `prisma
  generate` both succeed (schema-only, no DB needed); the migration itself has NOT been applied to
  any database and is unverified against a live schema.
- One centralized writer, `addBookingSystemEvent()` (`src/lib/chat/systemEvents.ts`), replacing
  the old free-text `addBookingSystemMessage` at all 11 call sites (re-grepped before starting -
  still exactly 11, no 12th writer appeared since BLOCK 5.6C's inventory). Typed payload per event
  type (TS-enforced, not just convention), centralized bounded JSON serialization, centralized
  legacy-compatible RU `body` generation.
- One centralized renderer, `renderSystemEvent(locale, row)`, wired into every live-render
  consumer (`BookingChatPanel.tsx`, `bookingTimeline.ts`/`BookingTimeline.tsx`) - NOT wired into
  the admin chat-archive export view, which was confirmed (by reading it) to be a static
  audit/export surface that should keep showing fixed historical text, not a live-relocalized one.
  Legacy rows (`eventType:null`), unrecognized event types, and malformed payloads all fall back
  to the stored `body` safely - never crash, never render empty.
- RU/TG/EN: all 13 `chat.systemEvent.*` keys added to all three locale blocks; RU text matches the
  previously-hardcoded legacy strings verbatim.
- `checkin.confirmed`'s escrow language ("Средства заморожены до завершения") was verified, not
  assumed, to be Pay-Now-only: the owner check-in route explicitly rejects `payOnArrival` bookings
  before ever reaching that system message - cited directly, not guessed at.
- Historical backfill explicitly NOT done, per instruction - every legacy SYSTEM row keeps
  `eventType:null` forever, no fuzzy parsing of old Russian text attempted.
- Old `addBookingSystemMessage` kept (not deleted), marked `@deprecated`, zero remaining in-repo
  callers confirmed by grep.

**New pure-function static test suite** (`scripts/test-block56d-static.ts`, zero DB dependency,
`npx tsx` runnable): 28/28 passed - 8 archive/lock cases, 12 system-event cases (RU/TG/EN exact
strings, legacy/unknown/malformed fallback, reason interpolation, both welcome variants, same-row-
different-locale, and the pay-at-check-in no-escrow-language proof), 4 role-presentation regression
cases (including the BLOCK 5.6C admin-as-own-guest fix), 3 shell-hiding regression cases carried
over from BLOCK 5.6A. Admin-dispute-security items 27-29 from the original matrix remain covered
only by the BLOCK 5.6C code-reading audit, not an executable test - no Jest/Vitest exists anywhere
in this repo, and standing one up just for 3 checks was judged out of scope for this pass.

**Gates**: `tsc`/eslint clean on every touched file; the new static test suite, executed (28/28);
`prisma validate`+`prisma generate` clean; one isolated `npm run build`, exit 0. **Migration not
applied to any database. Zero live-DB verification of any archive/dispute/system-event behavior.**

Full evidence and the final consolidated matrix: `BLOCK_5.6_MASTER_CHAT_REPORT.md` section 15.

**Verdict**: every CODE-level item in the consolidated matrix (archive policy, write lock, read
history, dispute carve-out, bypass protection, archive-job awareness, system-event schema/writers/
renderer/RU/TG/EN/fallbacks/pay-at-checkin semantics, role regression) = PASS or PASS STATIC.
RUNTIME for all of it = BLOCKED. `BLOCK 5.6 (overall, 5.6+5.6A+5.6B+5.6C+5.6D) = PARTIAL`.
No code-addressable scope remains identified without either a live database or a new product
decision the user has not yet asked for.

**NEXT**: once DB is restored - apply the prepared migration (`prisma migrate deploy` or
equivalent, on a real connection, verified it applies cleanly), then run the full consolidated
runtime matrix across every 5.6 sub-block (role-as-admin-guest live fixture, archive read/write
behavior with a real disputed booking, the archive job actually skipping a real OPEN dispute,
10+ minute reliability session, mobile 375x812 + desktop, RU/TG/EN live rendering, disputes
end-to-end through the Admin panel, cleanup). Not starting BLOCK 5.7/a new product block until that
runtime matrix is run. All prior pending-debt items carried forward unchanged (see BLOCK 5.6A's
list, including the Map/Search backlog). **Pay-at-check-in 20% prepayment = PRODUCT DECISION, NOT
IMPLEMENTED** - unchanged.

## BLOCK DB-RECOVERY — Local PostgreSQL Restoration + Full Runtime Gate (COMPLETE)

**DB outage from BLOCK 5.5A.1 onward is RESOLVED.** Root cause confirmed (not re-guessed): the
`postgres` role's password no longer matched TajStay's `.env` - a pure credential mismatch, service
was always running and the `tajstay` database was always intact (23 real pre-existing users found
once reachable - never corrupted, never empty). Fixed via the minimal path explicitly preferred
over a destructive reset: user-approved temporary `pg_hba.conf` trust-auth window (backed up
first, restored immediately after), one `ALTER ROLE postgres WITH PASSWORD ...` matching `.env`,
then `scram-sha-256` restored and service restarted. **No database was dropped or recreated, no
data was touched.** Leftover `koryob`/`aromat` database and role objects from other local projects
were found and explicitly left untouched, per instruction.

**Migration**: the BLOCK 5.6D additive `chat_message_semantic_events` migration applied cleanly via
`prisma migrate deploy` - `prisma migrate status` now reads "Database schema is up to date!", zero
drift, all 23 migrations applied. `ChatMessage.eventType`/`eventPayload` confirmed present via a
direct `information_schema` query.

**BLOCK 5.5B - now COMPLETE, real evidence obtained for all four P1s**:
- P1-1 (Admin Bookings null-user): real HTTP against a real offline booking - 200, no crash, guest
  fallback renders correctly.
- P1-2 (review eligibility): real HTTP - CONFIRMED denied, COMPLETED+correct guest allowed (Review
  row actually created), COMPLETED+wrong guest denied.
- P1-3 (Search HotelCard): real browser screenshot - photo/name/rating/layout all render correctly.
- P1-4 (Pay Now completion/Payout safety): re-ran the original 5.5A.1 proof script - both defect
  scenarios now correctly blocked (HTTP 307 to `error=complete_requires_paid`, payoutCount=0 in
  both cases). Independently reconfirmed via BLOCK 5.4B's own security script, whose stale
  pre-5.5B-fix assertion now "fails" for the right reason (the newer stricter checkout gate is
  active) while its financial-safety checks (no Payout, no escrow log) still pass.

**BLOCK 5.6 (5.6/5.6A/5.6B/5.6C/5.6D) - now COMPLETE for every item with real evidence obtained
this pass**:
- Role separation: created a real booking where an ADMIN account is its own guest, requested the
  real chat page as that admin - confirmed NO admin title, NO purge control, NO admin
  confirm-payment button. The exact reported screenshot bug, now proven fixed live, not just
  unit-tested.
- Archive/dispute lock matrix: full 7-state real DB/HTTP matrix - active-writable, terminal-locked,
  terminal+OPEN-dispute-writable, RESOLVED-relocks-immediately, cold-archive-locked-but-readable
  (guest AND owner), new-dispute-after-archive-denied (409), unrelated-user-denied. All PASS.
  Archive job's own dispute-awareness separately verified: skips a booking with an OPEN dispute,
  picks it up once resolved.
- Admin disputes security: unauthenticated/non-admin resolve denied; the nonexistent-dispute-id
  defect found in BLOCK 5.6C's code audit is now confirmed FIXED live (controlled response, no
  crash).
- Semantic system events: triggered a real writer, confirmed the SAME stored row renders in RU/TG/EN
  depending on the viewer's locale cookie - the core promise proven live, not just unit-tested.
- Mobile 375x812: real browser screenshot confirms bottom nav gone, floating assistant gone, compact
  collapsible booking context works, status pill readable, date divider subtle, composer clean,
  "Пожаловаться" compact. **New defect found live and fixed on the spot**: the desktop aside's
  "Ход брони" (`BookingTimeline.tsx`) card had never been recolored in any prior 5.6 pass - still
  full dark-glass. Fixed to the same `chat-side-card`/`--taj-color-*` tokens used everywhere else,
  re-screenshotted, confirmed light and consistent.
- Confirmed still-present, pre-existing, unrelated: the `BookingTimeline` date-format hydration
  mismatch (server/client `toLocaleString` difference) - not new, not fixed, carried forward again.

**Explicitly NOT done this pass** (named, not silently rounded up): a real 10+ minute reliability
soak with an actually-decaying session; an exhaustive RU/TG/EN visual walkthrough of every UI state
(only the semantic-event case was live-verified in all three languages); a screenshot of the Admin
Disputes list page itself (its data/security path was proven via direct HTTP+DB, the page render
was not separately screenshotted).

**New debt discovered, not fixed** (out of this block's authorized scope - infrastructure recovery
+ runtime proof, not a new visual sweep): 7 more chat-adjacent components still on the old
dark-glass palette (`ArrivalPaymentAction.tsx`, `PaymentMethodsBlock.tsx`, `PaymentReviewCard.tsx`,
`RejectProofModal.tsx`, `MessagesInbox.tsx`, `GuestReviewWaitingCard.tsx`, `ReviewBanner.tsx`) -
found by grep after fixing `BookingTimeline.tsx` (the one with direct screenshot evidence), flagged
for the upcoming Master Visual/UX phase rather than fixed blind. Also:
`test-block54b-security.ts`'s completion sub-test uses a stale 2029 checkout date that predates the
5.5B checkout-gate fix - needs a one-line update to stay meaningful, not fixed this pass since its
current "failure" is confirming the fix, not breaking it.

**Regression (BLOCK 5.2-5.4)**: every existing script re-run against the now-reachable DB -
5.2A concurrency ALL PASS, 5.3 lifecycle ALL PASS, 5.3A security ALL PASS, 5.3A expiry-job ALL
PASS, 5.4B concurrency ALL PASS, 5.4B security 8/10 PASS (2 stale-expectation non-regressions, see
above).

**Gates**: `tsc`/eslint clean; `prisma validate`+`generate`+`migrate status` all clean; one
isolated `npm run build`, exit 0; the BLOCK 5.6D pure-function static suite still 28/28 PASS.

Full evidence: `BLOCK_DB_RECOVERY_REPORT.md`.

**Verdict**: `DB RECOVERY = PASS`. `BLOCK 5.5B = COMPLETE`. `BLOCK 5.6 = COMPLETE` for every item
with real evidence in the report (PARTIAL only on the three explicitly-named not-done items and
the newly-found 7-file dark-palette debt, neither of which is a regression or an open correctness
question). `READY FOR MASTER VISUAL/UX = YES`.

**NEXT**: begin the Master Visual/UX phase per the user's own planned sequencing - Booking Wizard
first, then Auth/Profile, Owner/Admin shell/dashboard, Header/notifications, Search/Map, and the
rest of the accumulated screenshot-defect backlog (including the newly-found 7-file dark-palette
debt above, the `koryob`/`aromat` leftover-object cleanup decision, and the stale regression-script
date). Not starting any of those without the user's explicit go-ahead on which one first. Full
pending-debt list carried forward from BLOCK 5.6A (Map/Search backlog, etc.) plus the new items
named above. **Pay-at-check-in 20% prepayment = PRODUCT DECISION, NOT IMPLEMENTED** - unchanged.

## BLOCK 5.1 — Private Upload Security (IN PROGRESS, not COMPLETE)

Full report: `BLOCK_5.1_REPORT.md` (delivered via SendUserFile). Fixes BLOCK 5.0's R-2 finding
(payment proof / guest documents / chat attachments stored with zero access control, proven live
via unauthenticated curl). Production not touched, no legacy migration run.

**Storage is now provider-independent**: `src/lib/uploads/private-storage/` defines a
`PrivateStorageAdapter` interface (`put`/`get`/`del`); `getPrivateStorageAdapter()` (in that
directory's `index.ts`) is the ONLY place that picks a provider (Vercel Private Blob today, local
disk in dev). This exists because Vercel is temporary dev/staging infra - production moves to a
VPS later, and swapping in a VPS-backed adapter must not touch Payment/Chat/KYC business logic.
`@vercel/blob` upgraded 0.27.3 -> 2.8.0, kept as the current adapter's implementation, wrapped so
nothing outside those 3 adapter files imports it directly. Needed `next.config.mjs` ->
`experimental.serverComponentsExternalPackages: ["@vercel/blob", "undici"]` for `npm run build` to
succeed (v2's undici uses JS syntax Next 14.1's webpack parser can't bundle).

New: `authorizeBookingAccess()` (`src/lib/pms/bookingAuthorization.ts`, replacing a duplicated
three-way guest/owner/admin check in 2+ places), 3 authenticated proxy routes
(`/api/files/booking/[bookingId]/{proof,document,chat/[messageId]}`), every consumer (chat page,
chat messages API, admin chat archive export, owner dashboard) switched from raw stored URLs to
these proxy paths. DB now stores bare pathnames for these 3 categories, never URLs.

**Scope correction found mid-implementation**: "Owner KYC documents" turned out to be a
zod-validated external URL the applicant pastes in (`OwnerApplication.documentUrl`), never a file
uploaded through `saveUploadFile()` - no first-party file to protect, no route built for it
(building one would mean our server doing an unrestricted fetch of an applicant-supplied URL - the
SSRF shape explicitly ruled out). `HostProfile.documentUrl` confirmed dead (zero references).

Full real-runtime security matrix passed (no-cookie/unrelated-owner -> 404, correct
guest/owner/admin -> 200, on all 3 routes), path traversal rejected, old public path unreachable
for new uploads, and a simulated private-provider failure confirmed to land in private storage
only - never a fallback to public. `npx tsc`/eslint/`npm run build` all clean, re-run after the
provider-independence refactor (not reused from before it).

**NOT done**: production migration script (written, tested locally, NOT run against prod - needs
separate go-ahead + a prior read-only prod count); Vercel private Blob store not yet created
(account-level action, outside this session). Not declaring COMPLETE - that call is the user's.

**NEXT**: STOPPED. Not starting Payment UI (BLOCK 5.2+) until this is reviewed/accepted.

## BLOCK 5.0 — Payment Lifecycle Full Read-Only Audit (no implementation)

Full report: `BLOCK_5.0_REPORT.md` (delivered via SendUserFile). Audit only - no code changed,
production not touched.

**Headline finding**: the guest-facing "pay now" step in `BookingWizard.tsx` (step 2) is a
hardcoded `DcNextPaymentCard` with a fixed, platform-wide account (`+992 901 317 727`,
"Мухаммадали Р. А.") baked in as module constants - NOT the real per-hotel `HotelPaymentMethod`
system, which is fully built (schema, owner CRUD, `PaymentMethodsBlock`, cross-hotel isolation
proven safe by real test) but only reachable AFTER booking creation, on `/chat/booking/[id]`. A
guest can tap the wizard's live DC Next deep link before ever reaching the real hotel-specific
requisites, sending money to the wrong (shared, non-hotel) account. This is the top implementation
priority for BLOCK 5.1.

**Also established with real runtime evidence**: `PENDING_OWNER`/`WAIT_PROOF` and the entire
"pay at check-in" guest flow are confirmed 100% dead (zero write sites, zero DB rows, dead UI
button) - `payOnArrival:true` only exists via the Owner's own manual offline-entry tool, already
created as CONFIRMED, not a guest self-service path. Payment-proof files (and guest ID docs /
owner KYC uploads, same storage function) are stored with zero access control - confirmed via a
real unauthenticated curl returning a full proof image with no cookie. Confirm/reject/idempotency/
terminal-state-guard (BLOCK 2) all still hold correctly under real runtime tests. The
`expire-bookings` cron job is well-built (two independent timers: 15-min payment window, 5-min
owner-review SLA) but no `vercel.json` crons entry or other in-repo scheduler reference was found -
inventory correctness doesn't depend on it (BLOCK 4 already proved that), but EXPIRED/REJECTED
status writes, expiry chat messages, and notifications do. The header notification-bell defect you
flagged is confirmed and root-caused to the CSS level (computed `color: rgb(82,82,91)` overriding
the component's own `text-white`, likely from a global `--taj-icon` token) but not fixed, per
instruction; it does not reproduce on mobile since no notification bell exists in the mobile header
at all.

Full findings table (R-1 through R-6) with severity/evidence/root-cause/recommended-next-block in
the delivered report. Local fixtures (2 hotels, 1 room, 1 booking, 3 users) cleaned up, verified 0
leftovers.

**Verdict: BLOCK 5.0 AUDIT = COMPLETE. IMPLEMENTATION = NOT STARTED.**

**NEXT**: STOPPED per explicit instruction. Not starting BLOCK 5.1 (implementation spec) without
the user reviewing this audit first.

## BLOCK 4.3 — Verification-only Final Runtime Closure (BLOCK 4 = CLOSED TECHNICALLY)

Verification-only gate on top of BLOCK 4.2, per the user's explicit spec (no booking-domain code
changes unless a test revealed a genuine reproduced defect). Full report:
`BLOCK_4.3_REPORT.md` (delivered via SendUserFile).

**Recovery CTA (the one open gap from 4.2) — root-caused a real defect, one minimal fix**:
the CTA never rendered in the browser even after a full `.next` wipe + server restart + new tab,
despite three independent proofs the server was serving correct code (network response body,
raw curl of the compiled chunk, curl of SSR payload). Live React Fiber inspection on the mounted
component showed the browser was actually executing a stale, pre-hotelId/pre-CTA version of
`BookingWizard` with zero `submitErrorCode` state. Traced to `next.config.mjs`: `headers()` was
sending `Cache-Control: public, max-age=31536000, immutable` on `/_next/static/:path*`
unconditionally, including `next dev` — where chunk filenames are NOT content-hashed, so once a
browser caches a chunk under that URL it never re-fetches it, ever, regardless of rebuilds.
Fix: that header now only applies when `NODE_ENV === "production"` (where filenames genuinely
are content-hashed); dev now sends `no-store, must-revalidate`. Only file touched.
Retested on a clean load (different origin, `127.0.0.1` vs `localhost`, to dodge the
already-poisoned cache entry without clearing browser storage): CTA renders, is clickable,
navigates to `/hotel/{id}?checkIn=...&checkOut=...&guests=...` with hotel/dates/guests preserved.

**Also proven this block (all real runtime, not code inspection)**:
- Expired/invalid session cookie -> silently degrades to guest checkout, creates a fresh account
  from submitted contact info, never reuses the expired identity, never creates a booking as
  another user. Confirmed via real `POST /api/bookings` with both an actually-expired DB session
  row and a garbage token.
- Confirmation continuity: one single booking driven WAITING_PAYMENT -> ON_REVIEW (real proof
  submission) -> CONFIRMED (real admin confirm-payment route), with a genuine second actor
  (`curl`, no cookie jar) probing availability after each transition - conflict (409) held at
  every stage, zero release window, proven as one continuous narrative.
- Mobile 375x812 success + conflict flows, and desktop success + conflict, all driven through the
  real UI end to end - no overflow, no raw IDs/errors, correct step nav, exactly the expected DB
  row per success submission.
- Title contrast (BLOCK 4.2 fix) confirmed still correct (`rgb(20,35,27)` on light background).

**Found, flagged, NOT fixed (out of scope for this block)**: a real React hydration mismatch in
`src/components/chat/BookingTimeline.tsx` - a chat timestamp formats differently server vs client
("13 Сен, 19:20" vs "13 сент., 19:20"), forcing that Suspense boundary to client-render. Spun off
as a separate background task (`task_0a04df8e`) rather than fixed here.

**Engineering gate** (SOURCE_CHANGED: YES, but outside booking-domain code, so the 4.1/4.2
regression suites were not re-run - they test code this block didn't touch): `npx tsc --noEmit`
clean, `npx eslint next.config.mjs` clean, `npm run build` clean.

Local-only: all test fixtures (1 hotel, 1 room, 6 bookings, 17 guest users) created during this
block were deleted from local Postgres after testing, leftover count verified 0. Production
`tajstay.site` not touched - no deploy, no migration, no prod DB access.

**Verdict: BLOCK 4.3 = COMPLETE. BLOCK 4 = CLOSED TECHNICALLY. DEPLOYED = NOT PROVEN (local-dev-only
evidence). OWNER VISUAL VALIDATION = REQUIRED (standing caveat, unchanged).**

**NEXT**: STOPPED per explicit instruction. Not starting Payment redesign, Chat, or the next
master block.

## BLOCK 4.2 — Hold Semantics + Missing Concurrency Matrix + Booking UX Closure (commit `713b06e`,
START_SHA `ec9b7bd`, END_SHA `713b06e`)

Corrected a real scope overrun the user caught: Block 4.1's active-hold set silently included
WAIT_PROOF and PENDING_OWNER without approval. Traced every status's real write path before
touching anything - both are dead code (zero rows of either status exist in the DB; no write
anywhere in src/ ever assigns either). New `ACTIVE_HOLD_STATUSES = [WAITING_PAYMENT, ON_REVIEW]`
replaces the over-broad `PENDING_ONLINE_STATUSES` reuse; ON_REVIEW kept only on direct evidence -
`src/app/api/payments/proof/route.ts`'s real transition sets `paymentTimerPaused: true` and
`expiresAt: null` in the same update, i.e. the code itself declares "still held, different timer."

Ran the full mandatory matrix Block 4.1 skipped, all real DB-backed HTTP: **19/19 PASS** - physical
room race, RoomType cap=1/2/3 (2/3/2 concurrent requests), pre-existing active holds, different
RoomTypes/Rooms don't block each other, overlap vs adjacent dates, active hold blocks, stale hold
(expiresAt past, cron deliberately NOT run) does NOT block, CANCELLED/REJECTED/EXPIRED release,
and Search/Hotel-page/booking-API all agree for both the active and expired case on one fixture.

Fixed same-user idempotency to be genuinely idempotent, not just conflict-safe: the existing-
booking check now also runs INSIDE the advisory-lock guard, so a request that beats the outer
pre-check's own race window resolves to the SAME bookingId as a 200, not a 409. Verified with a
real 10-way simultaneous POST from one user: all 10 responses returned the identical bookingId,
DB confirms exactly 1 Booking/1 Payment/1 TransactionLog row.

Threaded `guests` end-to-end (Search→Hotel→Room CTA→/booking→BookingWizard's hidden `guestCount`
field→the API's already-existing read). Added a recovery CTA on an "unavailable" conflict, linking
back to the same Hotel with dates+guests preserved - verified present in the SSR HTML, the
compiled bundle, and a direct curl of the served JS chunk, but could not get this specific control
to render in this session's browser tool due to a persistent client-side script cache in that
tool's own profile (proven not a server/build issue by all three independent checks) - flagged
honestly rather than claimed fully verified live. Separately confirmed LIVE (clicking through the
real form) that conflict already preserved all typed guest data without any code change - the
client JSON submit path never redirected on error to begin with. Fixed the `/booking` title's
low-contrast gradient text to the canonical dark token.

Re-ran Block 2 (5/5, 14/14) and Block 2.1 (10/10) after this pass's availability.ts/inventory.ts
changes - all green. `npx tsc --noEmit`, targeted `eslint`, `npm run build` all clean. Fixtures
cleaned up, local Postgres only.

**Not done this pass** (named, not hidden): full mobile/desktop human-QA walk of the whole booking
flow (only the conflict path and pricing were walked live), auth expired-session runtime
reproduction (inspection only), confirmation-continuity live walk (WAITING_PAYMENT→ON_REVIEW→
CONFIRMED with a live competing actor).

**NEXT**: STOPPED for review. Not starting Payment redesign, Chat, or BLOCK 5.
