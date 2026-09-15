# BLOCK ADMIN 6.1B — Production Shell & Notifications Final Correction

Root-cause implementation block, not an audit. Every fix below was reproduced locally first, then
root-caused, then fixed, then re-verified. No commit made — working-tree edits only, per this
project's practice.

## 1. Baseline

- Branch: `feature/tajstay-full-ui-ux-rebuild`
- Baseline SHA: `09aa2c8dbd6116c8e60251505f37b1ebac854238` (this already contains the accepted
  ADMIN 6.1/6.1A work — confirmed via `git log`)
- `git status --short` before this block: clean except the already-known ADMIN 6.1/6.1A
  untracked/modified files (no foreign uncommitted work found)
- No `reset`/`clean` run. No production DB touched. No migration run — Prisma schema untouched.
- Vercel CLI is not installed and no `.vercel/project.json` exists in this environment — I cannot
  trigger, inspect, or read logs from an actual Vercel deployment from here. This is stated
  up front because it directly limits what "PRODUCTION RUNTIME" can honestly claim below (§17).

## 2. P1 — Double mobile header: root cause, found and fixed

**Reproduced locally first**, exactly as described: loaded `/` (consumer shell), clicked through
to `/profile`, clicked the real in-app "Админ-панель" card (a `<Link href="/dashboard/admin">`,
client-side navigation) — the consumer Header + floating Assistant stayed mounted underneath a
second, newly-mounted `AdminHeader`. Confirmed on screen before touching any code.

**HEADER A** (public/consumer) = `src/components/layout/Header.tsx`, mounted by
`src/components/navigation/AppShell.tsx`, itself only rendered from `src/app/layout.tsx` when
`isConsumerShell` is true.

**HEADER B** (Admin) = `src/components/admin/AdminHeader.tsx`, mounted by
`src/app/dashboard/admin/layout.tsx`.

**Root cause**: `src/app/layout.tsx` (the App Router **root** layout) decides which of these two
trees to render using `headers().get("x-tajstay-shell")` — a value computed **per request** by
`middleware.ts`. That is correct for a hard navigation (typed URL, full reload), but Next.js 14's
client-side Router Cache can reuse an already-rendered **dynamic** layout segment for a window
after a soft (`<Link>`) navigation, because the root layout segment itself doesn't change between
routes like `/profile` and `/dashboard/admin` — only its `children` slot does. The root layout
Server Component simply doesn't re-execute for that navigation, so it keeps rendering whatever
shell it decided on the *previous* full load. This is a known Next.js App Router limitation, not a
bug in either header component — confirmed by the fact that `AppShell`'s own floating-Assistant
gating (`isWorkspaceRoute(pathname)`, driven by the always-reactive `usePathname()`) correctly
hides the Assistant even while the stale consumer Header itself remains mounted, proving the two
mechanisms (Server-Component headers() vs. Client-Component usePathname()) genuinely disagree
about "the current route" for a few seconds after a soft navigation.

**Fix — `src/components/layout/ShellBoundaryGuard.tsx`** (new): a tiny Client Component, mounted
once in `src/app/layout.tsx` inside `<body>`, that reads `usePathname()` (reliably reactive on
every client-side navigation, unlike `headers()`) and re-derives the correct shell for the
*current* URL via the same classification function the middleware uses. If that disagrees with
`serverShell` (the value the server actually rendered), it forces exactly one
`window.location.assign(window.location.href)` — a hard reload — guaranteeing the next render is a
fresh server render with a correctly re-evaluated `x-tajstay-shell` header. This was a deliberate
choice over the alternatives:
- Moving all ~40 consumer route folders into a route group with their own layout (the "textbook"
  Next.js fix) was rejected as disproportionate blast radius for a correction block explicitly
  scoped against large redesign.
- Upgrading to Next.js 14.2+ to use `experimental.staleTimes: { dynamic: 0 }` (the officially
  documented fix for this exact class of bug) was rejected — this repo pins Next `14.1.0`; a
  framework version bump is out of scope for a shell-correction block.
- No CSS/z-index/display hack was used, per the explicit instruction.

**Shared classifier extracted**: `src/lib/shell/classify.ts` (new) — a pure, dependency-free
`shellFor(path)` used by BOTH `middleware.ts` (server, decides the initial render) and
`ShellBoundaryGuard.tsx` (client, re-checks on every navigation), so the two can never drift out of
sync with each other. `middleware.ts` now re-exports it for backward compatibility with the ADMIN
6.1A test script's existing import. **Also hardened while touching this function**: the original
implementation used `path.startsWith("/dashboard/admin")`, which would also match a hypothetical
`/dashboard/administrator` route (a real, if currently harmless, prefix false-match — caught by the
new test suite, §15). Changed to a segment-boundary check (`path === prefix || path.startsWith(
prefix + "/")`), matching the same guard pattern already used elsewhere in this codebase
(`isShellHiddenRoute` in `src/constants/app-navigation.ts`).

**Re-verified fixed**: repeated the exact repro (home → profile → click "Админ-панель") — now
renders exactly one header, no Assistant, correctly and immediately (see §16 screenshots/evidence).

## 3. Brand / logo action

Root cause of "HEADER B logo does nothing": it linked to `/dashboard/admin` — the page it was
already on, so clicking it was a same-URL no-op with no visible change, which reads as "broken."
Changed `AdminHeader`'s brand link target from `/dashboard/admin` to `/` (public home), per the
explicit target behavior in the spec. Crossing from Admin to `/` now correctly triggers
`ShellBoundaryGuard`'s mismatch check (admin → consumer), forcing the same clean single hard
reload described in §2 — verified live: clicking the brand from `/dashboard/admin` lands cleanly on
the public Tajik homepage with no residual Admin chrome and no double shell.

## 4. P1 — Notifications 500 in production: root cause investigated, defensive fix applied

**Cannot access production logs** (§1) — no Vercel CLI, no project link, no way to read the actual
production stack trace from this environment. This section states a concrete, evidence-based
hypothesis and its fix; it does **not** claim certainty the hypothesis is the exact production
cause, exactly as this project's own evidence discipline requires (see ADMIN 6.0's precedent:
`HISTORICAL ROOT CAUSE = UNPROVEN`).

**What I found**: every locale-aware formatter in `src/lib/i18n/format.ts`
(`formatDateTimeShort`, `formatStayDay`, `formatStayDateRange`, `formatNumber`) constructs
`new Intl.DateTimeFormat("tg-TJ", ...)` / `new Intl.NumberFormat("tg-TJ", ...)` directly, with
**no fallback**, whenever `locale === "tg"`. `formatDateTimeShort` is exactly what renders every
notification's "Вчера, 17:19" / "Дирӯз, 17:19" timestamp in the Notifications section. This
project **already found and fixed** the identical class of bug once before, browser-side
(`LocaleDateInput.tsx`, BLOCK V1 closure): `tg-TJ` is not reliably supported by every ICU build.
The server-side equivalent is just as real — some Node.js runtimes (a "small-icu" build, which
some serverless platforms use even when local `dev` doesn't) throw a `RangeError` constructing
`Intl.DateTimeFormat("tg-TJ", ...)`, which would crash the entire Notifications server component
for exactly the condition reported: **Admin set to Tajik**. This is a plausible, concrete,
previously-precedented explanation that had not been considered in the ADMIN 6.0 investigation
(which only checked `bookingId: null` and a missing null-guard, both already ruled out).

**Fix applied regardless of certainty** (safe either way): rewrote `format.ts` so every
`Intl.DateTimeFormat`/`Intl.NumberFormat` construction is wrapped in try/catch with a fallback to
the runtime's default locale (`undefined`), which is guaranteed to exist — the same defensive
pattern this file's own `formatMoney` already used for currency-symbol failures, now applied
uniformly. If the requested locale's ICU data is unavailable, the function now degrades to
default-locale formatting instead of throwing and taking down the whole server component. This
costs nothing if the hypothesis is wrong and directly fixes it if right.

**Local reproduction**: local Node has full ICU (confirmed — `tg-TJ` formats correctly), so this
could not be reproduced as a crash locally; the Notifications section, both before and after this
fix, renders identically locally (verified via screenshot, §16). The targeted test suite (§15)
verifies the new safety net itself doesn't throw for any of the three locales, and that direct
`Intl` calls with `tg-TJ` still succeed locally (proving the try path, not just the catch path,
still works correctly for the common case).

**Honest status**: `PRODUCTION ROOT CAUSE = HYPOTHESIS, NOT CONFIRMED` (no production stack trace
available). `DEFENSIVE FIX = APPLIED` (safe regardless). If the next production deployment still
shows a 500 on Notifications specifically, that would newly falsify this hypothesis and point
elsewhere — worth checking the actual Vercel function log for the exact exception at that point,
which I could not do from here.

## 5. Error boundary / localized error page

**Root cause of "TG admin, RU error screen" AND "AdminHeader disappears on the error screen"**:
this app had exactly **one** error boundary for the entire site — `src/app/error.tsx` — with
hardcoded Russian strings and no locale awareness at all. Because there was no error boundary
scoped to `/dashboard/admin`, any uncaught error there bubbled all the way to that single root
boundary, which sits **outside** `dashboard/admin/layout.tsx` — so the whole Admin layout
(AdminHeader + sidebar) unmounted along with the broken page, exactly matching the screenshot
("AdminHeader disappears, only the old header remains" — the "old header" being whatever the
[now-fixed] double-header bug had additionally left mounted).

**Fix**: added `src/app/dashboard/admin/error.tsx`, a sibling of `dashboard/admin/layout.tsx`.
Next.js's error-boundary insertion point means this new boundary replaces only the broken **page**
content, while the layout it's a sibling of (AdminHeader/AdminSidebar/AdminMobileNav) stays
mounted — verified live by throwing a real test error (§16). It reads the `tajstay_locale` cookie
directly (error boundaries are Client Components and cannot call the server-only `getLocale()`)
and renders through `m()` for RU/TG/EN, with a Retry button (`reset()`) and a real
`AdminBackButton` (reused from ADMIN 6.1, not a second incompatible component) pointing back to
`/dashboard/admin` — never forcing the admin out to the public Home. Added five new i18n keys
(`admin.errorBoundary*`) in all three locales. The site-wide consumer `error.tsx` is intentionally
**untouched** — its own contrast/copy issues are a separate, already-flagged MASTER AUTH/Auth
backlog item, not part of this Admin-shell block.

## 6. Admin Back / safe return navigation

Covered by §5's error boundary reusing the existing `AdminBackButton` (ADMIN 6.1) — no second,
incompatible Back component was created. The Chat Archive `AdminBackButton` usage from 6.1 was
re-verified unaffected (§16 screenshot).

## 7. Mobile "Ещё" drawer

**Root cause of the "duplicate shell" visual conflict**: entirely explained by §2's double-header
bug — once fixed, the drawer (unchanged component, `WorkspaceMobileDrawer.tsx`) renders correctly
under a single header with no competing layers (re-verified live, §16).

**Root cause of "Боз" reading as wrong/confusing** (this was a genuine *mistranslation*, not
truncation, clipping, or an unrelated bug): `admin.mobileMore` in the Tajik locale block was
literally the word "Боз" ("again," a temporal adverb) instead of "more" in the sense of "additional
menu items." This project's own messages table already has the correct word for exactly this
meaning — `"Бештар"` (used elsewhere, e.g. a generic `more` key) — confirmed via grep before
touching anything, not guessed. Fixed both occurrences (admin and owner Tajik blocks share the same
key name) to `"Бештар"`.

The drawer's close button (`workspace-mobile-drawer__close`) was inspected and found already
correctly light (32px, transparent background, subtle hover) — its own CSS was never the problem;
the "chрезмерно тяжёлый X" perception in the production screenshot is attributed to the same
double-header/duplicate-shell visual conflict from §2, now resolved. Re-verified: current drawer
close control is a normal, light SVG `X`, not heavy (§16 screenshot).

## 8. Excessive top whitespace — root cause found (desktop AND mobile), same cause, fixed

**Found via computed-style inspection, not guessed**: a global base-layer rule in
`src/app/globals.css` — `section { @apply py-10 md:py-14; }`, written for public marketing-page
`<section>` blocks (hero-style spacing) — has **no scoping** and therefore applies to every
`<section>` element site-wide, including every Admin section wrapper (`#dashboard`,
`#applications`, `#hotels`, ... all rendered as literal `<section>` elements in
`src/app/dashboard/admin/page.tsx` and `AdminDashboardOverview.tsx`). Measured directly in the
browser before any fix: `#dashboard`'s `padding-top` computed to `56px` (the `md:py-14` value, this
viewport being ≥768px) with an equal `56px` `padding-bottom` — on top of Admin's own intentional
`space-y-10` rhythm, producing a 96px gap between "Дашборд" and "Обзор системы" where ~40px was
intended. This is genuine unscoped "hero residue" leaking into the operational shell, exactly as
suspected in the spec's own diagnostic hints.

**Fix**: `.admin-command-center section { padding-top: 0; padding-bottom: 0; }` in
`admin-command-center.css` — a scoped override, not a change to the shared marketing rule (which
still applies correctly everywhere else it's meant to). Admin's own compact vertical rhythm was
already fully handled by `.admin-section`'s `gap`/`space-y-*` utilities and never depended on this
padding.

**Re-measured after fix**: gap between page-header bottom and "Обзор системы" top is now exactly
`40px` (the intended `space-y-10` sibling margin) — down from 96px. Verified this is the entire
explanation for both the desktop and mobile whitespace complaints; no second whitespace source was
found once this one rule was scoped out (re-checked Dashboard, Users, Hotels, chat-archive — all
now show normal, tight vertical rhythm, §16).

## 9. Floating consumer TajStay Assistant in Admin

Entirely explained by §2 — `TstAssistant` is only ever mounted from `AppShell`, which is only
rendered when the root layout decides `isConsumerShell = true`. With `ShellBoundaryGuard` now
preventing the stale-shell state, `AppShell` (and therefore the Assistant) never mounts on a
genuine Admin render. Verified live: `document.querySelectorAll('[class*="assistant" i]').length`
returns `0` on `/dashboard/admin` after the fix (§16). No separate route-suppression code was
needed beyond fixing the root cause — `AppShell` already had correct `isWorkspaceRoute()` gating
before this block; it just never got the chance to run because the wrong tree was mounted at all.

## 10. Profile control / profile menu — visual weight

**Root cause**: a global bare-element rule in `globals.css` — `button, a[role="button"], .brand-
gradient, .ds-primary-btn { box-shadow: 0 10px 24px rgba(2,6,23,0.24), 0 2px 8px rgba(2,6,23,0.16);
}` — written for dark premium marketing buttons, applies to **every** `<button>` site-wide with no
scoping. `AdminHeader`'s profile trigger and notification bell are real `<button>` elements that
never declared their own `box-shadow`, so they inherited this heavy halo. Confirmed via
`getComputedStyle` before fixing (exact matching shadow values), not guessed.

**Fix**: added `box-shadow: none; border: none;` to both `.admin-header__profile-trigger` and
`.admin-header__icon-btn` — scoped overrides, not a change to the global rule (which is presumably
still wanted on the dark marketing buttons it was written for; touching it globally was out of
scope and risked an unrelated regression elsewhere). Effective hit target unchanged — still
44×44px, confirmed via `getBoundingClientRect()` again after the shadow removal.

**Role label ("Админ" under TG)**: checked the source — `roles.ADMIN` for the `tg` locale is
`"Админ"`, an existing, deliberate entry in this project's own translation table (the same Cyrillic
loanword pattern already used for other institutional terms in this locale, e.g.
`filter.admin: "Админ"` elsewhere in the messages file). This is **not** a raw enum leak (the raw
Prisma enum value is `"ADMIN"`, all-caps, never rendered directly here) and not something this
block invented — it is the project's own existing i18n choice, confirmed via `m("tg", "roles.
ADMIN")` returning a real, non-enum string. No change made, per the instruction not to start a
larger role-i18n redesign in this block; if the project owner wants a different Tajik word here,
that's a one-line follow-up, not a defect requiring root-cause work.

## 11. Notification control

Bell kept as-is (icon, orange/gold badge, unread count) — only the touch-target and shadow fixes
from §§8/10 apply to it. Verified: badge does not overlap the icon at 1/2/3-digit counts (checked
10 and, via the pre-existing `unreadCount > 99 ? "99+" : unreadCount` clamp already in
`AdminHeader.tsx` from 6.1, confirmed still present and untouched) — bell still links to
`?section=notifications` and, after §4's fix, that route is more resilient to the tg-locale crash
hypothesis than before.

## 12–13. KPI redesign / future Admin IA — untouched, confirmed

No chart, donut, legend, KPI density, or analytics-query change was made. No sidebar item was
removed or reordered — "Бронирования," "Жалобы и споры," and "Финансы" remain exactly where ADMIN
6.1 left them, confirmed via a `git diff` of `AdminSidebar.tsx`'s `SIDEBAR_GROUPS`/`buildItems`
(only the earlier 6.1A `export` additions are present; no section list changed in 6.1B). KPI
truncation/density remains **locked ADMIN 6.6 backlog**, not touched.

## 14. Security / data safety

No production DB reset/drop/truncate/credential change. No Notification rows deleted. No
authorization logic touched — `requireAdmin()` in `dashboard/admin/layout.tsx` and `page.tsx` is
byte-identical to before this block. Re-verified live: an unauthenticated request to
`/dashboard/admin` (session cookie cleared) still redirects to `/auth/sign-in?next=%2Fdashboard%2
Fadmin` (§16) — the shell-boundary and error-boundary changes do not sit in front of or replace
this gate; `middleware.ts`'s session check runs first, unchanged, and both new files
(`ShellBoundaryGuard`, `dashboard/admin/error.tsx`) are presentation-only and carry no auth logic
of their own.

## 15. Targeted automated tests

Added `scripts/test-block61b-shell-correction.ts` (same plain-`tsx` pattern as the existing
`test-block56d-static.ts` / `test-block61a-admin-shell.ts` — no new test framework):

```
TSX_TSCONFIG_PATH=tsconfig.scripts.json npx tsx scripts/test-block61b-shell-correction.ts
→ 42 passed, 0 failed
```

Coverage: (A) `shellFor` from `src/lib/shell/classify.ts` and its `middleware.ts` re-export agree
on every case, including the newly-hardened prefix-boundary guard (this test is what caught the
`/dashboard/administrator` false-match during development — the guard was added *because* this
test failed first, not added blind); (D) the brand-link target (`/`) classifies correctly; (G)
every locale-dependent formatter (`formatDateTimeShort`, `formatStayDay`, `formatStayDateRange`,
`formatNumber`) is exercised for all three locales and asserted never to throw; (I) all five new
`admin.errorBoundary*` keys resolve to real, distinct, non-identical per-locale copy in RU/TG/EN,
not the raw key and not three copies of the same string; (J) `roles.ADMIN` is confirmed a real
translated string in both `ru` and `tg`, not the raw enum; plus a direct regression assertion that
`admin.mobileMore` (tg) is no longer `"Боз"` and now equals this project's own existing `"Бештар"`.
The ADMIN 6.1A test script (`test-block61a-admin-shell.ts`) was re-run afterward and still passes
24/24 with zero regressions from the `shellFor` signature/behavior change.

**Not covered by either script** (same honest limitation as 6.1A): live browser focus/keyboard
behavior, and — new to this block — actually reproducing an ICU `RangeError` (this would require a
small-icu Node build, which this environment doesn't have; the test instead proves the *safety net*
doesn't throw and that the *normal* path still works, which is the strongest static guarantee
available without that specific runtime).

## 16. Local runtime matrix — the five STATE scenarios, reproduced and re-verified

All five states from the spec were deliberately reproduced via the *exact* real user flow (client-
side `<Link>` navigation, not a typed-URL reload, which would have masked the bug) before the fix,
then re-verified after:

| State | Before (reproduced) | After (fixed) |
|---|---|---|
| 1. Mobile Dashboard | Two headers stacked (consumer + Admin) | Exactly one `AdminHeader`, confirmed via screenshot at 390×844 |
| 2. Mobile Dashboard + profile menu | Double header + profile menu | One header + profile menu, correctly positioned |
| 3. Mobile "Ещё" drawer | Duplicate shell conflict, "Боз" title | One shell, drawer title "Бештар" (TG), light close X |
| 4. Mobile bell click | (hypothesized) 500 in production | Notifications opens normally, TG timestamps render ("Дирӯз, 17:19"), no crash |
| 5. Desktop 1440 Dashboard | One header but 96px gap + floating Assistant | One header, 40px gap (measured), zero Assistant elements in the DOM |

Additionally verified beyond the five states: brand-link click from Admin correctly crosses to the
public Tajik homepage with a single clean reload and no residual chrome; a real thrown error on
`/dashboard/admin` renders the new localized (Tajik, in this test) error boundary with AdminHeader
and sidebar still mounted, Retry and "Бозгаштан ба админ-панель" both present; unauthenticated
access to `/dashboard/admin` still redirects to sign-in; Users/Hotels/chat-archive sections
re-checked for whitespace and layout regressions from the `section` padding fix — all clean.

**Quality gates**:
```
npx tsc --noEmit                         → PASS (zero errors)
npx eslint <every touched/created file>  → PASS (zero errors/warnings)
TSX_TSCONFIG_PATH=... test-block61a...   → PASS (24/24, no regression)
TSX_TSCONFIG_PATH=... test-block61b...   → PASS (42/42)
npm run build (next build)               → PASS, exit code 0 (verified twice, once mid-pass and
                                             once after the final edit/cleanup)
```

## 17. Production runtime — cannot be independently verified from here

Stated plainly, per the spec's own escape-hatch instruction: **I cannot deploy this to Vercel or
read its logs from this environment** (no CLI, no project link, no API token configured). Claiming
`PRODUCTION RUNTIME = PASS` without having actually opened the deployed URL myself would be exactly
the kind of inference-as-proof this project's evidence discipline forbids — the same discipline
that caught the original "local 200 vs. production 500" gap this whole block exists to close.

```
PRODUCTION RUNTIME = PENDING OWNER DEPLOYMENT
```

**Deployment verification checklist for you, after this branch is deployed:**

DESKTOP (`/dashboard/admin?section=dashboard`, ~1440px):
1. Exactly one header (TajStay Admin, bell, avatar) — no second header above or below it.
2. No floating Assistant anywhere on the page.
3. Small, tight gap between "Дашборд" and "Обзор системы" (not the old large empty band).
4. Click the bell → Notifications opens with real content, no 500 page.
5. Click the brand/logo → lands on the public TajStay homepage (not a no-op).

MOBILE (real phone or device emulation, ~390px):
6. Exactly one header on first load, on refresh, and after navigating away and back via the app's
   own links (not just a typed URL) — this specific repro path is what exposed the original bug.
7. Tap the bell → Notifications opens, no 500, even with the interface set to Tajik.
8. Tap "Ещё" → drawer opens with the title "Бештар" (not "Боз"), light close X, no double shell
   visible behind it.
9. Tap the profile avatar → menu opens with a light (not heavy-shadowed) trigger.
10. If anything throws an error on this route family, the error screen should still show the
    Admin header/sidebar around it, in the interface's own language, with a "Вернуться в
    админ-панель" button.

If **all ten** check out on the real deployment, USER VISUAL ACCEPTANCE for the shell/notifications
correction can close. If the Notifications bell still 500s in production specifically, that
falsifies §4's hypothesis — the next step would be pulling the actual Vercel function log for that
request (something I have no access to from here) to find the real exception.

## 18. Final status

```
ADMIN 6.1B CODE                     = COMPLETE
                                       Every item in the correction block's scope implemented:
                                       double-header root cause fixed (ShellBoundaryGuard +
                                       shared classify.ts), brand link corrected, Notifications
                                       ICU-crash hypothesis defensively fixed, Admin-scoped
                                       localized error boundary added, "Боз"→"Бештар" mistranslation
                                       fixed, excessive section padding root-caused and scoped out,
                                       button box-shadow leak fixed on two header controls. Nothing
                                       out of scope touched: no KPI/chart/analytics change, no
                                       sidebar IA change, no Prisma/business-logic/monetization/
                                       ADM-11/12/14/15 change, no Next.js version bump.

ADMIN 6.1B STATIC CHECKS            = PASS
                                       tsc --noEmit and eslint both clean on every touched/created
                                       file.

ADMIN 6.1B AUTOMATED TESTS          = PASS
                                       42/42 new (test-block61b-shell-correction.ts) + 24/24
                                       carried-forward (test-block61a-admin-shell.ts, re-run,
                                       zero regressions).

ADMIN 6.1B BUILD                    = PASS
                                       npm run build, exit code 0, confirmed twice (mid-pass and
                                       after final cleanup).

ADMIN 6.1B LOCAL DESKTOP RUNTIME    = PASS
                                       1280×800 and 1440×900: single header, no Assistant, correct
                                       spacing, bell→Notifications works, brand-link works, error
                                       boundary verified via a real thrown test error (removed
                                       afterward) — all reproduced via real client-side navigation,
                                       not just typed-URL loads.

ADMIN 6.1B LOCAL MOBILE RUNTIME     = PASS
                                       390×844 (and spot-checked at other 6.1A-verified widths for
                                       regression): single header on fresh load AND after the exact
                                       client-navigation repro path, bell/Notifications, "Ещё"
                                       drawer with corrected title, brand link, no Assistant.

ADMIN 6.1B PRODUCTION DESKTOP RUNTIME = PENDING OWNER DEPLOYMENT
                                       No Vercel access from this environment — see §17's
                                       checklist.

ADMIN 6.1B PRODUCTION MOBILE RUNTIME  = PENDING OWNER DEPLOYMENT
                                       Same reason — see §17's checklist.

ADMIN 6.1B NOTIFICATIONS            = LOCAL PASS / PRODUCTION HYPOTHESIS FIXED, NOT CONFIRMED
                                       Local: 200, renders correctly in all three locales, both
                                       before and after this pass (could not reproduce the crash
                                       locally — full-ICU Node). Production: a concrete, evidence-
                                       based hypothesis (tg-TJ ICU RangeError, matching this
                                       project's own precedent bug) has been defensively fixed
                                       regardless of certainty. Cannot be marked PASS on production
                                       until you confirm the bell no longer 500s on the actual
                                       deployment.

ADMIN 6.1B I18N                     = PASS
                                       "Боз"→"Бештар" fixed and tested; five new error-boundary
                                       keys added and tested in all three locales; roles.ADMIN
                                       confirmed intentional, not a leak.

ADMIN 6.1B ACCESSIBILITY            = PASS for items in this pass's scope
                                       44px targets re-confirmed unaffected by the shadow-removal
                                       fix; error boundary uses a real AdminBackButton (keyboard/
                                       focus-visible, per 6.1's existing implementation) rather
                                       than a new incompatible control. Full keyboard-cycle
                                       re-verification of AdminConfirmDialog was not repeated this
                                       pass (unchanged since 6.1A) — carried forward, not silently
                                       upgraded.

ADMIN 6.1B SECURITY REGRESSION      = PASS
                                       requireAdmin() unchanged; unauthenticated access to
                                       /dashboard/admin still redirects to sign-in, re-verified
                                       live after all fixes.

ADMIN 6.1B USER VISUAL ACCEPTANCE   = PENDING
                                       Always PENDING until you personally review the actual
                                       deployed production build — this report does not and should
                                       not attempt to close this line.

ADMIN 6.1B OVERALL                  = CODE/LOCAL COMPLETE — PRODUCTION VERIFICATION PENDING
                                       Every reported production defect was reproduced locally
                                       (where technically possible), root-caused with concrete
                                       evidence (not guessed), fixed, and re-verified locally. The
                                       one item that cannot be closed from this environment is
                                       actual production confirmation, because I have no deployment
                                       or log access here — reported exactly that way, not rounded
                                       up to a claim I can't back with evidence.
```

## 19. Stop condition

STOP. ADMIN 6.2 not started. ADM-11/12/14/15, Admin Bookings, Complaints/Disputes, Hotel risk-
reason/Escrow labels, commission/monetization, and the 20% prepayment item were not touched, per
the explicit instruction to fix only what directly prevented this shell/notifications correction.
Awaiting your deployment, your walk-through of the §17 checklist, and your screenshots before any
further Admin work continues.
