# TajStay current state

Read this before anything else. Load only the skill matching NEXT (see `CLAUDE.md` → Skill routing).
Do not re-read old audit reports unless the task needs them. Keep this file short — DONE/OPEN/BLOCKED/
NEXT, not a diary. Detailed rationale for a fix belongs in its commit message, not here.

## Governing instruction

The user has issued a **FINAL COMMERCIAL PRODUCT CONTRACT** (2026-09-10, 130 sections) — this
**supersedes** the earlier "Master Commercialization Contract" as the standing authorization. Full
architecture + UX/UI + mobile app experience + Owner Hotel Desk + Admin Command Center + analytics +
PWA + performance + security + human-like QA, worked as a continuous
`audit → implement → visual review → runtime QA → fix → re-QA → next area → regression` loop across
sessions until the product is commercially ready per its acceptance gates (§119-124). Do not wait for
a new prompt between phases or areas. Do not report "ready for next narrow block" — that phrasing and
its variants are explicitly forbidden by the contract. Only stop for: destructive production
operations, real data-loss risk, a missing required secret, or a legal/business call that can't be
safely assumed. Session/turn limits are not a stopping reason — bank progress via this file and
continue next session without waiting for a new user prompt.

Phase order (§118): 1 architecture/route-map/tokens/shell-isolation → 2 mobile foundation/header/
home/search → 3 auth/registration → 4 profile (personal/avatar/phone/email/settings/security/
notifications/support) → 5 hotels/booking/reviews/chat → 6 tours → 7 owner onboarding → 8 Owner Hotel
Desk/finance/analytics/staff → 9 Admin Command Center/analytics/operations → 10 PWA/cookie/install/
cache/performance → 11 full security audit → 12 full regression/commercial QA.
**Currently in: Phase 1 (shell isolation still open) + early Phase 2/4 work.**

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

1. **Shell isolation** (Phase 1, still the top blocker — see BLOCKED). Also Phase 1: full route/
   layout/shell/role inventory has never been formally built — the contract explicitly wants an actual
   map (§3) before further UI work, not just ad-hoc fixes.
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

- **Admin/Owner shell isolation** — unchanged from before, still the top architectural defect. Two
  attempted fixes (client-wrapper-around-async-Server-Components; a second attempt, see revert
  `d076570`) both broke the dev server. The user has explicitly rejected CSS-hide as an acceptable
  final answer — next attempt must be genuine route/layout composition (e.g. Next.js route groups).
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

Continue the Final Commercial Product Contract's phase order. Immediate priorities: (1) finish the
`ProfileMockupView` crash root-cause (highest-priority unresolved defect, actively investigated this
pass), (2) shell isolation via route groups, (3) build the actual route/shell/role inventory the
contract asks for before more ad-hoc UI work, (4) mobile Home acceptance gate, (5) search field
border/placeholder/date fixes per the corrected spec. Do not stop after a handful of fixes — this file
plus each commit message is the continuity mechanism across sessions/turns, not a reason to return to
the user for direction.
