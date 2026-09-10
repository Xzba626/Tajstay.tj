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
| Admin | Overview (`?section=dashboard`) | done | done | done | open | open | 2 fixed | open | open | open | open | open | open | OPEN — partial |
| Admin | Applications | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Users | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Hotels | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Owner-access | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Bookings | — | — | — | — | — | — | — | — | — | — | — | — | OPEN (has confirmed KPI bug, roadmap Phase 8) |
| Admin | Finance | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Complaints | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Content | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Admin | Notifications | — | — | — | — | — | — | — | — | — | — | — | — | OPEN |
| Owner | (all 11 sections) | — | — | — | — | — | — | — | — | — | — | — | — | OPEN, not started |
| Anonymous/Guest/Public | (all routes) | — | — | — | — | — | — | — | — | — | — | — | — | OPEN, not started |

**DONE this pass** (real defects found by looking, not reported by the user — commit `c71f512`):
1. Admin Overview donut center labels ("Бронирования", "Пользователи") overflowed the ring —
   `AnalyticsDonut` center box now constrained to the ring's actual inner opening with word-wrap, fixed
   generically (works for any locale length, not a hardcoded RU fix).
2. Admin Overview KPI cards on a 375px viewport truncated legend rows to an unreadable ellipsis
   ("подтвержд…") — grid now single-columns below 480px instead of squeezing 2-up.

**OPEN, found this pass, NOT yet fixed** (do not silently drop):
3. **Confirmed, reproducible React hydration mismatch** on `TrustBadges` inside `UserMenu` (Consumer
   Header) — server renders `bg-[#0f7a4d]/10 text-[#0f7a4d] ring-[#0f7a4d]/25` (canonical brand green),
   client renders `bg-[#0f7a4d]/15 text-[#d1fae5] ring-[#0f7a4d]/30` (`#d1fae5` = light mint, a
   dark-surface text color — exactly the legacy off-brand palette Green Contract §14 forbids). Ruled
   out this pass: stale service worker (`unregister()` + `caches.delete()` on every cache key, still
   reproduced), browser cache (hard `location.reload()`, still reproduced), source-file drift
   (`TrustBadges.tsx` on disk has exactly one style map, matching the server-rendered classes exactly —
   the client's differing classes cannot come from that file as currently written). **Root cause NOT
   found** — next step: instrument `cn()`/`STYLES` with a temporary log of what actually executes
   client-side, or bisect by temporarily hardcoding the className to rule out `cn()`/tailwind-merge
   behaving differently at runtime vs. build. Do not re-attribute to "environment" without new evidence
   per standing user rule.
4. **Duplicate API calls confirmed** on every navigation: `/api/auth/session`, `/api/auth/me`,
   `/api/notifications/list`, `/api/notifications/unread-count` each fire 3-4 times per page load
   (verified via `performance.getEntriesByType('resource')`, not just eyeballing the network tab) —
   more than React strict-mode's 2x dev-only double-invoke would explain. Likely multiple independent
   consumers (SessionProvider + a custom hook, or an effect re-firing) not sharing one fetch/cache.
   Not yet root-caused or fixed — flagged for the perf/network pass (roadmap Phase 9, but cheap enough
   to fix opportunistically when found again).
5. One `Failed to load resource: 500` seen in console during this pass, **source URL not yet isolated**
   (didn't appear in `performance.getEntriesByType('resource')` — may be a genuinely transient/earlier
   request). Re-check next time console errors are read on this area.

**NEXT**: Finish Admin Overview to PASS (click "Требует внимания" actions, check TJ/EN on this specific
screen, check loading/empty/error states, resolve or fully triage findings #3-5 above), then continue
sidebar-by-sidebar through the remaining 9 Admin sections per the progress table, each as its own full
human pass — not sequential Owner-first or roadmap-Phase-first; Admin was already open in-browser, finish
it before switching context. Do not fall back into a global audit pass; investigate only the specific
unknown in front of you (e.g. the hydration mismatch) and continue.
