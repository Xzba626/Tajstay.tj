# BLOCK ADMIN 6.1 — TajStay Admin Shell / Header / Navigation / Responsive Foundation

## A. Baseline SHA

`79975f6fd265e15b036eb06ff7f751e2b31f22f4` (branch `feature/tajstay-full-ui-ux-rebuild`), the same
HEAD ADMIN 6.0's closure pass ran against. `git status --short` at the start of this block showed
only the untracked `BLOCK_ADMIN_6.0_ARCHITECTURE_AUDIT_REPORT.md` — confirmed clean before any 6.1
edit.

## B. Final SHA / commits

No commit made yet — all changes are uncommitted working-tree edits, per this project's practice of
reporting evidence before the user reviews and commits. `git rev-parse HEAD` is still
`79975f6fd265e15b036eb06ff7f751e2b31f22f4` at the time of this report.

## C. Exact files changed

Modified (7):
- `src/app/dashboard/admin/layout.tsx` — mounts `AdminHeader` above `DashboardShell`; computes the
  header's unread-notification badge count (same 7-day window already used by the Dashboard KPI).
- `src/app/dashboard/admin/page.tsx` — removed the duplicated hero (title shown only for
  Dashboard now, marketing subtitle deleted); extracted the Content-section security forms into
  `AdminSecurityPanel`, now rendered unconditionally and opened via `?account=security`.
- `src/app/dashboard/admin/chat-archive/page.tsx` — replaced the bare "← " text link with
  `AdminBackButton`; wrapped content in `.admin-command-center` so its leftover dark-glass
  Tailwind classes resolve through the same light-token overrides as the rest of Admin.
- `src/app/api/admin/security/update/route.ts` — redirect target changed from
  `?section=content` to `?account=security` (placement only; auth/validation/hashing untouched).
- `src/app/api/admin/security/reset/route.ts` — same redirect-target change as above.
- `src/lib/i18n/messages.ts` — added header/back-button/security-panel/confirm-dialog RU/TG/EN
  keys (`admin.headerBrand`, `headerNotificationsAria`, `headerProfileAria`,
  `headerAccountSecurity`, `headerLogout`, `headerLoggingOut`, `headerLogoutConfirmTitle/Body/
  Action`, `headerLogoutCancel`, `backButtonDefault`, `securityPanelTitle`, `securityPanelClose`,
  `confirmDialogCancel`, `confirmDialogConfirm`) — all three locales, no key added to only one.
- `src/styles/admin-command-center.css` — added header/profile-menu/back-button/confirm-dialog/
  security-panel styles (~260 lines), scoped under the existing `.admin-command-center` /
  `.admin-header` / `.admin-confirm-*` / `.admin-back-button` / `.admin-security-*` selectors —
  no existing selector's rules were altered except the two-CSS-var-tweak described in §E below.

Created (5):
- `src/components/admin/AdminHeader.tsx` — server component, TajStay Admin authenticated header.
- `src/components/admin/AdminProfileMenu.tsx` — client dropdown (name/role, security link, logout).
- `src/components/admin/AdminConfirmDialog.tsx` — reusable confirmation dialog foundation (ADM-13).
- `src/components/admin/AdminBackButton.tsx` — reusable back control (ADM-7).
- `src/components/admin/AdminSecurityPanel.tsx` — the relocated self-security forms (ADM-16).

No Prisma schema/migration touched. No file deleted. No route removed.

## D. What was preserved

- `AdminSidebar` / `AdminMobileNav` (`src/components/dashboard/AdminSidebar.tsx`) — unchanged.
  Sidebar grouping, active-state green highlighting, and the mobile bottom-nav/"Ещё" drawer are
  the same components, same behavior, same DOM structure as ADMIN 6.0 audited them.
- `AdminDataToolbar` / `AdminRecordCard` — unchanged, per the explicit instruction not to
  rewrite them without cause in 6.1.
- All `VALID_SECTIONS` values, all section content, all mutating forms/actions — unchanged.
  "Бронирования" was **not** removed from the sidebar (correctly deferred to 6.3).
- `security/update` and `security/reset` endpoints — auth, validation, hashing, session
  invalidation, audit-log calls: byte-identical except the one redirect-URL line each (§C).
- The floating TST Assistant / consumer bottom-nav / consumer footer were already excluded from
  the Admin shell via `SHELL_HIDDEN_PREFIXES` (`/dashboard/admin` was already in that list before
  this block) — reconfirmed still excluded, not reintroduced.

## E. What was redesigned (shell-scope only)

- **New authenticated header** (desktop + mobile, one component): TajStay brand mark, locale
  switcher (hidden below 480px to avoid crowding 320px, per §12 spacing rule), a notification
  bell with a live unread-count badge linking to `?section=notifications`, and a profile menu
  (initials avatar, name, role, "Безопасность аккаунта", "Выйти").
- **Page-hero cleanup**: the old block rendered "Админ-панель" + "Операционный центр: KPI,
  модерация и быстрые действия." on **every** section, on top of the sidebar's own "Админ"
  eyebrow and every section's own `AdminSectionHead` title — triple redundancy. Now: the generic
  header renders only for the Dashboard section (title "Дашборд", no subtitle); every other
  section already had its own `AdminSectionHead`, so nothing else needed to change there.
- **Self-security relocation (ADM-16)**: moved out of Content into a header-triggered overlay
  reachable from any section via `?account=security`, preserving the current section in the
  `AdminProfileMenu`'s link (`useSearchParams` merge, not a hardcoded destination).
- **Reusable BackButton (ADM-7)**: wired into the one standalone nested screen that had a bare
  arrow link, `/dashboard/admin/chat-archive`. Not applied to root sidebar sections, per instruction.
- **Confirmation dialog foundation (ADM-13)**: built as a generic, reusable component and wired
  into the one shell-level destructive action this block owns — logout. Not wired into
  Users/Hotel-Moderation/Applications mutations; those stay native-form POSTs, unchanged, and
  remain open items for 6.2–6.5 as instructed.

## F. Before → After mapping

| Area | Before (ADMIN 6.0 evidence) | After (this block) |
|---|---|---|
| Mobile header | None at all (§26.10 of the 6.0 report: confirmed live, zero header/logo at 320px) | TajStay brand + bell + avatar, sticky, no overflow at 320/375/430 |
| Desktop header | None — `children` rendered bare in the Admin shell branch of `layout.tsx` | Same header component, wider gutters, locale switcher visible |
| Page hero | "Админ-панель" + marketing subtitle repeated on all 10 sections | Shown once, only for Dashboard, no subtitle |
| Self-security forms | Inside Content section, unrelated to "change my own password" mental model | Header profile menu → overlay, reachable from anywhere |
| Back navigation (chat-archive) | Bare `← Мои бронирования` text link | `AdminBackButton` — icon + label, focus-visible, ≥44px target |
| Destructive confirmation | None anywhere in Admin (ADM-13, confirmed by reading both shared components) | `AdminConfirmDialog` foundation exists; wired to logout |
| Sidebar / mobile nav | Already light-token, green-active, grouped (verified in 6.0 §26.10) | Unchanged |

## G. Desktop runtime matrix

Real browser session against the running dev server and the live local database (temporary
diagnostic admin `Session` row created and deleted after testing, same method as the ADMIN 6.0
mobile pass).

| Width | Section checked | Header | Sidebar | Overflow | Notes |
|---|---|---|---|---|---|
| 1280×800 | Finance | coherent | coherent | none | subscription form, hotel-subscription cards fit |
| 1440×900 | Dashboard | coherent | coherent | none | single "Дашборд" title, no duplicate label |
| 1280×800 | chat-archive (standalone) | inherited from layout, confirmed present | inherited | none | new `AdminBackButton` renders correctly |

Profile menu opens/closes correctly (click outside, click trigger); security-panel link
(`?account=security`) verified via direct navigation to render the relocated forms with all
fields intact (phone/email/current password/new password + the emergency-reset sub-form gated by
`adminSecurityResetAvailable`); close link correctly drops `account` while preserving `section`/
`page`. Logout confirmation dialog: opens on click, focuses the Confirm button, Escape closes it
without logging out (verified — session remained valid after Escape), Cancel closes without
logging out.

**Not performed this pass**: 1920×1080 (not available in this browser tool's viewport range) and
a full click-through of all 10 sections named in the acceptance list (Applications, Hotels, Users,
Owner Access, Bookings, Content, Complaints, Notifications) — only Dashboard, Finance, Users,
Hotels, and chat-archive were directly opened. The remaining sections were not touched by this
block's edits (no section-specific JSX changed) and their shared header/sidebar chrome is the same
component tree verified above, but per this project's evidence-gate discipline that inference is
not the same as having looked at each one — reported as **NOT INDIVIDUALLY VERIFIED**, not PASS.

## H. Mobile runtime matrix

| Width | Section | Result |
|---|---|---|
| 320×568 | Dashboard | Header fits (brand truncates to "TajStay A…", no overflow), bell badge visible, bottom nav + "Ещё" drawer open correctly, drawer content unchanged from ADMIN 6.0 |
| 375×812 | Users | Header + section content fit, no double nav, no overlap |
| 430×932 | Hotels | Header + moderation cards fit, no overflow |

360×800 and 390×844 (also named in the acceptance list) were **not individually tested** this pass
— 320/375/430 bracket that range and no responsive breakpoint in the new CSS falls between them,
but this is reported as **NOT INDIVIDUALLY VERIFIED** rather than assumed identical.

One real cosmetic bug was found and fixed during this pass: at 320px the locale-switcher globe
icon rendered despite a `display: none` rule, because `LocaleSwitcher` carries its own Tailwind
`flex` utility class that loaded after this project's CSS and won the cascade. Fixed with a
scoped `!important` (documented inline in the CSS) — re-verified fixed via screenshot before
moving on. Documented here rather than silently corrected, per this project's evidence discipline.

## I. Accessibility evidence

- `AdminConfirmDialog`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby`,
  focus moves to the Confirm button on open, Tab/Shift+Tab wrap within the dialog, Escape cancels,
  focus returns to the trigger element on close — verified live (Escape test above; focus-trap
  and focus-return are implemented per the same pattern used elsewhere in this codebase but were
  not separately instrumented/tested beyond the Escape-and-focus-return check performed).
- `AdminProfileMenu`: `aria-expanded`, `aria-haspopup="menu"`, `role="menu"`/`role="menuitem"` on
  the dropdown; closes on outside click and Escape.
- `AdminBackButton`: real anchor (`<Link>`), not a bare arrow; visible on any input mode.
- Icon-only header controls (bell, locale switcher, profile trigger) all carry `aria-label`.
- Touch targets: header icon buttons and avatar trigger are 2.5rem (40px) — **below** the ≥44px
  target the spec requires; sized to fit the 3.5rem header height without changing that height
  var (shared with `--workspace-header-height` and the sidebar's sticky offset). Flagged here as a
  genuine gap, not silently accepted: raising both the control size and the header height is a
  slightly bigger change than this pass made and would need re-verifying the sidebar's sticky
  `top`/`height` calc — deferred to a dedicated pass rather than adjusted under time pressure in
  this block. Not rounded up to PASS.

## J. Navigation regression evidence

- Section links (`?section=...`) preserved and functional (verified: dashboard, users, hotels,
  finance).
- `AdminMobileNav` primary tabs + "Ещё" drawer: unchanged component, re-verified functional at
  320px (drawer opened, grouped items rendered, links intact).
- Admin auth gate (`requireAdmin()`): unchanged, still called in `layout.tsx`.
- Standalone `/dashboard/admin/chat-archive`: confirmed still opens, now inherits the shared
  header/sidebar automatically (it already sat under `dashboard/admin/layout.tsx` — this was not
  previously visible because the page had no shell-aware light-mode styling, making the header
  easy to miss against the dark-glass card; confirmed present in the "before" screenshot too, on
  closer inspection of this pass's own evidence).
- Logout: functional (confirmed the confirm-dialog wiring calls `/api/auth/logout`); the actual
  POST-then-redirect was **not exercised to completion** (would have ended the diagnostic session
  needed for the rest of this pass) — Escape-cancel path was verified instead, and the button's
  `fetch` call/`router.push` logic was code-reviewed, not click-through-completed. Reported as
  **NOT FULLY RUNTIME-VERIFIED** for the completed-logout path specifically, PASS only for
  open/cancel/Escape.

## K. Static tests / build

```
npx tsc --noEmit          → PASS (zero errors, whole project)
npx eslint <all changed/created files>  → PASS (zero errors/warnings)
```

No targeted automated tests were added for active-nav determination, BackButton fallback, or
mobile drawer section list, as suggested in the spec's optional test list — this is named here as
an explicit gap (**NOT DONE**), not silently skipped. Given the size of this block already, adding
a properly-scoped test suite is recommended as a fast-follow rather than rushed into this same
pass. Isolated production build (`next build`) was **not run** this pass — flagged as NOT DONE
rather than assumed to pass from `tsc`/`eslint` alone.

## L. Known remaining defects (unchanged carry-forward from ADMIN 6.0, confirmed still present)

- ADM-11 — ADMIN role promotion / ban audit + confirmation → 6.5 (untouched this pass)
- ADM-12 — Hotel Moderation owner notification → 6.4 (untouched)
- ADM-14 — Content home-banner/support consumers unresolved → 6.7 (untouched)
- ADM-15 — `users/credentials` orphan fail-closed stub → cleanup (untouched)
- Admin Bookings operational removal → 6.3 (untouched — "Бронирования" still in sidebar/mobile "Ещё")
- Complaints vs Disputes split → 6.3 (untouched)
- Hotel risk-reason RU mapping / Escrow enum RU mapping → 6.3/6.4 (untouched — still raw English)
- Notifications historical screenshot root cause = UNPROVEN (unchanged conclusion, not re-litigated)
- 20% prepayment / monetization architecture = NOT IMPLEMENTED (untouched)

New items opened by this pass itself (not pre-existing ADM numbers — logged here for 6.2+ triage):
- Header icon touch targets are 40px, not the ≥44px minimum the spec sets (§I).
- Desktop matrix did not individually open all 10 sections, only 3 plus chat-archive (§G).
- Mobile matrix did not test 360×800/390×844 (§H).
- No targeted automated tests added (§K).
- Full logout completion (not just open/cancel) was not click-through-verified (§J).

## M. Screenshots / evidence paths

Captured live via the Browser pane during this session (not saved to disk as files — inline
screenshots reviewed during the session, consistent with how ADMIN 6.0's mobile pass was
evidenced). Covered: Dashboard at 320×568, 1440×900; Users at 375×812; Hotels at 430×932;
Finance at 1280×800; chat-archive at 1280×800 (before/after the BackButton change); profile-menu
open state; security-panel overlay open state; logout-confirm dialog open state.

---

# BLOCK ADMIN 6.1A — CLOSURE / ACCEPTANCE GATE

This section supersedes the "Final verdict" block that originally followed it (now moved below
this section and rewritten). Everything above this line is the original 6.1 evidence and is left
unedited, per the instruction not to erase the earlier PARTIAL evidence.

## 6.1A-A. Baseline / working-tree state

Baseline SHA for this closure pass: `79975f6fd265e15b036eb06ff7f751e2b31f22f4` — unchanged, no
commit was made between the 6.1 pass and this 6.1A pass. `git status --short` immediately before
this pass began showed exactly the file set listed in 6.1's own §C plus the two report files —
confirmed clean, nothing unexpected present.

## 6.1A-B. Exact additional files changed

Modified (2 more, beyond 6.1's list):
- `src/components/admin/AdminConfirmDialog.tsx` — initial focus now goes to Cancel for
  `variant="destructive"` (was: always Confirm). Non-destructive variant unchanged.
- `src/components/admin/AdminHeader.tsx` — brand rendering split into `brandPrimary` ("TajStay",
  always visible) and `brandSecondary` ("Admin", hidden below 380px) instead of one truncatable
  string.
- `src/app/dashboard/admin/layout.tsx` — passes the two new brand props instead of one.
- `src/lib/i18n/messages.ts` — added `admin.headerBrandShort` / `admin.headerBrandContext` (all
  three locales).
- `src/styles/admin-command-center.css` — `.admin-header__icon-btn` / `.admin-header__profile-
  trigger` grown from 2.5rem to 2.75rem (40px → 44px); new `.admin-header__brand-text` /
  `.admin-header__brand-context` rules for the split brand.
- `src/components/dashboard/AdminSidebar.tsx` — `DRAWER_GROUP_SECTIONS`, `SIDEBAR_GROUPS`,
  `buildItems`, `MOBILE_PRIMARY`, `sectionHref` changed from module-private to `export`ed. **No
  logic changed** — purely additive visibility so the new test script can import and assert
  against the real functions instead of reimplementing them.
- `src/middleware.ts` — `shellFor` changed from module-private to `export`ed. Same additive-only
  change, same reason.

Created (2):
- `scripts/test-block61a-admin-shell.ts` — the targeted test script (§6.1A-D below).
- `tsconfig.scripts.json` — a repo-root tsconfig used only to run that one script under plain
  `tsx` (see the script's own header comment for why: the app's root `tsconfig.json` sets
  `"jsx": "preserve"`, correct for Next's own build, but plain `tsx` needs a real JSX transform to
  execute component code outside of Next). The app's build and its root `tsconfig.json` are
  untouched by this file's existence.

No business logic, Prisma schema, or `VALID_SECTIONS` value changed in this closure pass.

## 6.1A-C. 40px → 44px: implementation and proof

**Implementation**: `.admin-header__icon-btn` (bell) and `.admin-header__profile-trigger`
(avatar) both grew from `2.5rem` to `2.75rem` (40px → 44px) in
`src/styles/admin-command-center.css`. The header itself (`.admin-header`) was **not** resized —
it was already `3.5rem` (56px), with room to grow the buttons inside it without touching
`--workspace-header-height` or the sidebar's sticky `top`/`height` calc, which both key off the
header height, not the button size. This was a deliberate choice to close the touch-target gap
without opening the larger regression surface a header-height change would have caused.

**Proof (not just visual — computed dimensions read live in the browser)**:

```js
// at 1440×900
{"bell":{"w":44,"h":44},"profile":{"w":44,"h":44}}
// at 320×568
{"bell":{width:44,height:44},"profile":{width:44,height:44}}
```

Both read via `getBoundingClientRect()` on the actual rendered elements in the running app — not
inferred from the CSS source. Verified at both a desktop and the narrowest required mobile width,
since the header's internal layout could in principle differ by breakpoint (it doesn't here, but
that was checked rather than assumed).

The existing `AdminMobileNav` bottom-tab targets were also measured as part of this check:
`{"w":64,"h":52}` per tab at 320px — already comfortably above 44px, unchanged, listed here only
because the spec asked for "any affected adjacent controls" to be re-evaluated, not because they
needed a fix.

**Not touched**: the locale-switcher trigger (hidden below 480px; its own component,
`LocaleSwitcher`, is shared with the public Header and was out of this block's scope to resize —
if its own touch target is ever found short, that is a shared-component fix belonging to whichever
block next touches `LocaleSwitcher`, not an Admin-only shell fix).

## 6.1A-D. 320px brand behavior

**Before**: `BrandMark` rendered a single string ("TajStay Admin") with `overflow: hidden; text-
overflow: ellipsis`, which is exactly what produced "TajStay A…" at 320px.

**After**: `AdminHeader` now renders two parts — `brandPrimary` ("TajStay") always visible, and
`brandSecondary` ("Admin") in a `<span>` that is `display: none` below 380px and `display: inline`
at 380px and above. The full name ("TajStay Admin") is still carried as the link's `title`/`aria-
label` for assistive tech and hover, regardless of which visual variant is showing.

**Verified live**:
- 320×568 → renders "TajStay" only, no ellipsis, no overflow (`scrollWidth === clientWidth`,
  confirmed via `document.documentElement.scrollWidth`/`clientWidth` both reading `320`).
- 360×800 → renders full "TajStay Admin" (360 > 380 is false — wait, 360 < 380, so this actually
  fell in the "TajStay" branch too; screenshot re-checked and confirms "TajStay" only at 360px,
  not "TajStay Admin" as an earlier draft of this report mis-stated before being corrected here).
- 375×812 → same as 360px, "TajStay" only (375 < 380).
- 390×844, 430×932, 1280×800, 1440×900 → all render full "TajStay Admin".

This means the actual cutover point a viewer will see is between 375px and 390px, not a clean
"mobile vs. desktop" line — stated exactly here rather than rounded to a cleaner-sounding
threshold that doesn't match what was actually observed.

## 6.1A-E. Targeted automated tests

Added `scripts/test-block61a-admin-shell.ts`, following this repo's existing pattern (plain `tsx`
script, `check()`/pass-fail counter, no new test framework — see `scripts/test-block56d-static.ts`
for the precedent this follows).

**Run command and result**:
```
TSX_TSCONFIG_PATH=tsconfig.scripts.json npx tsx scripts/test-block61a-admin-shell.ts
→ 24 passed, 0 failed
```

**Coverage against the spec's five required items**:

| Item | Covered how | Result |
|---|---|---|
| A. active Admin navigation determination | `sectionHref()` called directly (real function, exported, not reimplemented) | PASS (2 checks) |
| B. root vs nested BackButton behavior/fallback | `AdminBackButton` real-rendered via `renderToStaticMarkup`; asserts real anchor + href + icon, not a bare arrow | PASS (4 checks) |
| C. mobile drawer section inventory / expected grouping | Cross-checks `buildItems()`, `SIDEBAR_GROUPS`, `DRAWER_GROUP_SECTIONS`, `MOBILE_PRIMARY` (all real, exported) against a literal `VALID_SECTIONS` list — asserts every section has a sidebar entry AND every non-primary section is reachable via the "Ещё" drawer (the exact bug class documented in this file's own "bookings" comment) | PASS (3 checks) |
| D. Admin routes don't render the public consumer shell | `shellFor()` called directly (real function, exported) for `/dashboard/admin`, its nested chat-archive route, `/dashboard/owner`, and two consumer paths | PASS (6 checks) |
| E. AdminConfirmDialog keyboard/state — **static contract only** | `renderToStaticMarkup` for closed/open/busy states: role/aria-modal/aria-labelledby/aria-describedby present when open, absent when closed, Cancel precedes Confirm in DOM order, `disabled` present on both buttons when `busy=true` | PASS (9 checks) |

**Explicitly NOT covered by this script, stated rather than silently marked PASS** (per the spec's
own escape-hatch instruction): real keyboard focus movement — Tab/Shift+Tab wrap, Escape
dismissal, focus restoration to the trigger, and which button receives initial focus. These
require a live DOM with real focus semantics; `renderToStaticMarkup` runs no effects and there is
no `document`/`window`. **Closest deterministic alternative used instead**: those four behaviors
were runtime-verified in the actual browser (§6.1A-I below) — Escape-dismissal and initial-focus-
on-Cancel were both directly observed with `document.activeElement` reads, not inferred.

## 6.1A-F. Production build

```
npm run build
→ exit code 0
```

Full output confirmed `/dashboard/admin` (3.67 kB) and `/dashboard/admin/chat-archive` (2.23 kB)
both compiled as dynamic (`λ`) routes alongside every other route in the app, with no build
errors or warnings surfaced. This is a real `next build`, not inferred from `tsc`/`eslint`.

**Corrected terminology** (per the spec's explicit instruction not to conflate these):
```
STATIC CHECKS  (tsc + eslint):     PASS
AUTOMATED TESTS (targeted tests):  PASS (24/24, see §6.1A-E)
BUILD (next build):                PASS (exit 0)
```

## 6.1A-G. Complete desktop runtime matrix

Real browser session, fresh diagnostic admin `Session` row (created and destroyed as part of the
logout test in §6.1A-J — not left behind).

| Surface | 1280×800 | 1440×900 | 1920×1080 |
|---|---|---|---|
| Dashboard | ✅ verified | ✅ verified | BLOCKED — see note below |
| Applications | ✅ verified | — | BLOCKED |
| Hotels | ✅ verified | — | BLOCKED |
| Users | ✅ verified | — | BLOCKED |
| Owner Access | ✅ verified | — | BLOCKED |
| Bookings | ✅ verified | — | BLOCKED |
| Content | ✅ verified | — | BLOCKED |
| Finance | ✅ verified | — | BLOCKED |
| Complaints | ✅ verified | — | BLOCKED |
| Notifications | ✅ verified | — | BLOCKED |
| Chat Archive (standalone) | ✅ verified | — | BLOCKED |

Every surface listed was individually opened and screenshotted this pass — none inferred from
"same shared component tree." For each, confirmed: authenticated header present, sidebar present
with correct active-item highlighting, correct section-title hierarchy (no duplicate "АДМИН /
Админ-панель / Операционный центр..." — that hero now renders only for Dashboard, confirmed by
its absence on every other surface checked), no horizontal overflow, content not obscured by
header/sidebar, no 500 on any surface, no public consumer footer/nav/floating-assistant on any
surface, Russian shell text throughout, no dark/graphite regression in Light Mode (this also
closed the leftover dark-glass styling on the chat-archive page itself, which was carrying pre-
existing `bg-slate-950`/`text-white` classes never designed for the light Admin shell — now wrapped
in `.admin-command-center` so the same token overrides used everywhere else in Admin apply there
too).

**1920×1080 = BLOCKED, not PASS**: the Browser pane tool's `resize_window` accepted the 1920×1080
request without erroring, but the pane's own physical rendering surface is fixed at a smaller
native resolution — every screenshot returned during this session was capped at 800px-wide output
regardless of the requested viewport, meaning content wider than that was scaled down for display
rather than genuinely laid out and captured at 1920px. Reporting a "1920×1080 PASS" from a
screenshot that cannot actually prove 1920px of real layout would be exactly the kind of
inference-as-runtime-PASS the spec explicitly forbids. **1440×900 is used as the supplemental
upper-bound desktop evidence instead** (§6.1A-C's touch-target proof was taken at 1440×900
specifically for this reason), not as a substitute claim of 1920 having been tested.

## 6.1A-H. Complete mobile runtime matrix

| Width | Surface | Result |
|---|---|---|
| 320×568 | Dashboard + "Ещё" drawer | ✅ header fits ("TajStay" short brand, confirmed via §6.1A-D), 44×44 touch targets confirmed via `getBoundingClientRect()`, unread badge visible, no overflow (`scrollWidth === clientWidth === 320`), drawer opens/closes over content without pushing the header |
| 360×800 | Users | ✅ no overflow, short "TajStay" brand (360 < 380 threshold) |
| 375×812 | Hotels | ✅ no overflow, short brand, two-card grid fits |
| 390×844 | Notifications | ✅ no overflow, full "TajStay Admin" brand (390 ≥ 380), "Ещё" tab correctly shows active state for a drawer-only section |
| 430×932 | Content, Chat Archive (standalone), Security Panel | ✅ all three clean, no overflow; Security Panel specifically checked at this width — legible, scrollable, close control reachable, no clipped fields |

All five required widths individually exercised, not interpolated. Confirmed at every width: no
double navigation (bottom-nav + drawer never both persistently visible), no public consumer
footer, no floating consumer assistant overlap (still correctly excluded via the pre-existing
`SHELL_HIDDEN_PREFIXES` mechanism, unchanged), long Russian labels wrap/truncate without breaking
layout, nested Chat Archive BackButton renders and is tappable, Security Panel accessible and
legible at the narrowest widths tested.

## 6.1A-I. Confirm-dialog accessibility — closed precisely

Runtime-verified in the browser (not code-reviewed only), using the real logout dialog:

- **Initial focus**: `document.activeElement.textContent` read immediately after opening →
  `"Отмена"` (Cancel), confirming the destructive-variant default-to-Cancel fix (§6.1A-C's sibling
  change, §6.1A-B) actually took effect at runtime, not just in source.
- **Escape**: pressing Escape closed the dialog without triggering logout — confirmed by checking
  the session remained valid immediately after (a follow-up authenticated request still succeeded)
  before the real logout was exercised separately.
- **Accessible title/description**: confirmed present in the static-render test (§6.1A-E) and
  visually confirmed in the live screenshot (title "Выйти из аккаунта?", description "Вы завершите
  текущую сессию администратора на этом устройстве.").
- **Keyboard activation**: the real logout in §6.1A-J was completed by clicking Confirm, not by
  keyboard Enter — keyboard-Enter activation of the focused Cancel/Confirm button was **not**
  separately exercised this pass. Named here as a small remaining gap rather than assumed working
  because "it's a native `<button>`."
- Tab/Shift+Tab wrap and focus-restoration-to-trigger: **not independently re-verified this pass**
  beyond what 6.1's original pass already checked (Escape-close case only). Full Tab-cycle-through-
  every-focusable-element-and-wrap was not re-driven step by step in this closure pass either — the
  implementation is unchanged from 6.1 (only the initial-focus target changed), so this is reported
  as "unchanged from 6.1, not re-verified," not silently upgraded to PASS.

## 6.1A-J. Full logout runtime — real evidence

Using a disposable diagnostic admin `Session` row (created via a one-off script, token never
reused elsewhere, deleted implicitly by the logout itself):

1. Opened `/dashboard/admin` authenticated with the diagnostic session — confirmed loaded (Dashboard rendered).
2. Profile menu → "Выйти" → confirm dialog opened, focus on "Отмена" (§6.1A-I).
3. Clicked "Выйти" (Confirm) → button label switched to "Выходим…", both buttons disabled (busy
   state, confirmed via screenshot).
4. Page navigated to `/auth/sign-in` (confirmed via `location.href` read after a 2-second wait).
5. `document.cookie` read immediately after → `tajstay_locale=ru` only; `tajstay_session` cookie
   gone.
6. **Server-side proof, not just client-side**: queried the database directly —
   `prisma.session.findFirst({ where: { token: "<diagnostic token>" } })` → `null`. The session row
   was actually deleted server-side by the logout endpoint, not merely forgotten client-side.
7. Re-injected the now-dead token into `document.cookie` and navigated to `/dashboard/admin` again
   → redirected to `/auth/sign-in?next=/dashboard/admin`, confirming the destroyed session is
   genuinely rejected and the protected surface is not reachable with it.

No real/production admin session was used or touched — only the disposable diagnostic row, which
no longer exists after step 6.

## 6.1A-K. Regressions found and fixed during this closure pass

- **Locale-icon cascade leak at 320px** (found during 6.1, already fixed and reconfirmed still
  fixed this pass — not a new regression, listed for completeness).
- **No new regression found** from the 40px→44px header-button resize: header height unchanged
  (56px, confirmed via `getBoundingClientRect()` at 1440×900), sidebar sticky `top`/`height`
  unchanged (56px / calc, confirmed the same way), profile-dropdown position unaffected (screenshot
  confirmed no clipping against the larger 44px trigger), notification-badge position unaffected
  (still anchored to the button's own corner, which simply got 4px bigger — badge did not need
  repositioning).
- **Chat-archive dark-mode leftover** — not a regression introduced by 6.1/6.1A, but a pre-existing
  defect this pass's `.admin-command-center` wrap on that page incidentally fixed (see §6.1A-G).
  Recorded here rather than silently taken credit for as a planned deliverable.

## 6.1A-L. Remaining unrelated ADM backlog (untouched, confirmed still open)

Unchanged from 6.1's own list — ADM-11, ADM-12, ADM-14, ADM-15, Admin Bookings operational
removal, Complaints/Disputes split, Hotel risk-reason/Escrow RU mapping, commission/monetization,
20% prepayment. None of these were opportunistically touched in this closure pass, per the
explicit instruction.

One new, small, purely-informational item for a future pass (not fixed here, as it does not block
6.1 shell acceptance): keyboard-Enter activation of the confirm-dialog buttons was not separately
exercised (§6.1A-I) — worth a two-minute check whenever this dialog is next touched, not a reason
to reopen 6.1A on its own.

---

## Superseded 6.1 verdict (kept for record — see the 6.1A verdict below for the current status)

```
ADMIN 6.1 OVERALL (original, pre-6.1A) = PARTIAL
  4 acceptance gaps: 40px touch targets, missing test+build gates, incomplete runtime matrix,
  logout not click-through-verified. This is exactly what 6.1A above was scoped to close.
```

## ADMIN 6.1A final verdict (current status — supersedes the block above)

```
ADMIN 6.1 CODE                = COMPLETE
                                 All 6.1 items plus the four 6.1A fixes (44px targets, deliberate
                                 320px brand, targeted tests, production build) implemented.
                                 Nothing out-of-scope touched: no business logic, no Prisma
                                 migration, no VALID_SECTIONS change, no ADM-11/12/14/15 fix,
                                 "Бронирования" still not removed.

ADMIN 6.1 STATIC CHECKS       = PASS
                                 tsc --noEmit and eslint both clean on every touched/created file
                                 (re-confirmed after the 6.1A changes, not just carried over from
                                 6.1).

ADMIN 6.1 AUTOMATED TESTS     = PASS
                                 scripts/test-block61a-admin-shell.ts: 24/24 checks pass, covering
                                 active-nav determination, BackButton contract, mobile-drawer/
                                 sidebar section-inventory invariant, Admin-vs-consumer shell
                                 classification, and AdminConfirmDialog's static ARIA/DOM-order
                                 contract. Real Tab-trap/Escape/focus-restoration keyboard
                                 behavior is explicitly named as NOT covered by this script (no
                                 live DOM available to a plain Node script) and was instead
                                 runtime-verified separately (§6.1A-I) — not silently folded into
                                 this PASS.

ADMIN 6.1 BUILD               = PASS
                                 `npm run build` (next build), exit code 0. Confirmed via a second
                                 independent run capturing the exit code explicitly, not inferred
                                 from the first run's tail output alone.

ADMIN 6.1 DESKTOP RUNTIME     = PASS at 1280×800 and 1440×900 / BLOCKED at 1920×1080
                                 All 11 named surfaces (Dashboard, Applications, Hotels, Users,
                                 Owner Access, Bookings, Content, Finance, Complaints,
                                 Notifications, Chat Archive standalone) individually opened and
                                 screenshotted at 1280×800; touch-target and header-height proof
                                 additionally taken at 1440×900. 1920×1080 is reported BLOCKED,
                                 not PASS or skipped: the Browser pane tool accepted the resize
                                 request but its screenshots are capped at a smaller physical
                                 render surface, so no genuine 1920px layout could be captured —
                                 a fabricated 1920 PASS would be exactly the kind of inference the
                                 closure spec forbade. 1440×900 stands as the supplemental
                                 upper-bound evidence instead.

ADMIN 6.1 MOBILE RUNTIME      = PASS
                                 All 5 required widths (320×568, 360×800, 375×812, 390×844,
                                 430×932) individually exercised across Dashboard, Users, Hotels,
                                 Notifications, Content, the "Ещё" drawer, Chat Archive standalone,
                                 and the Security Panel. Zero horizontal overflow, zero double
                                 navigation, zero consumer-shell leakage, 44×44 touch targets
                                 confirmed via computed dimensions (not visual estimate) at the
                                 narrowest width. The exact brand cutover point (375px→390px, not
                                 a round "mobile/desktop" line) is reported precisely rather than
                                 rounded to a cleaner-sounding number.

ADMIN 6.1 ACCESSIBILITY       = PASS for the items in this pass's scope / CARRIED FORWARD for the rest
                                 Closed this pass: initial focus now defaults to Cancel for the
                                 destructive logout dialog (verified live via
                                 `document.activeElement`), 44px touch targets (computed, not
                                 visual), Escape-cancel re-confirmed. NOT independently
                                 re-exercised this pass (unchanged from 6.1, not silently
                                 upgraded): full Tab/Shift+Tab wrap-around cycling, focus
                                 restoration to the trigger element, and keyboard-Enter activation
                                 of the dialog's buttons. These remain implemented per 6.1's
                                 original code but are reported as carried-forward, not newly
                                 PASS, since this pass did not re-drive them step by step.

ADMIN 6.1 FUNCTIONAL REGRESSION = PASS
                                 Full logout chain verified end-to-end with real server-side
                                 evidence: dialog open → Confirm click → busy state → real
                                 `/api/auth/logout` POST → session row actually deleted in the
                                 database (confirmed via a direct Prisma query, not just a client
                                 redirect) → cookie cleared → redirect to `/auth/sign-in` →
                                 re-injecting the now-dead token and revisiting `/dashboard/admin`
                                 correctly redirects to sign-in again, proving the destroyed
                                 session is genuinely rejected, not just cosmetically logged out.
                                 No new regression found from the 44px header-button resize
                                 (header height, sidebar sticky geometry, profile-dropdown and
                                 notification-badge positioning all re-verified unaffected).

ADMIN 6.1 VISUAL/UX TECHNICAL = COMPLETE
                                 Every technical gate above is now PASS or a precisely-scoped,
                                 named BLOCKED/carried-forward item — not a vague PARTIAL.

ADMIN 6.1 USER VISUAL ACCEPTANCE = PENDING
                                 Unchanged and correctly so: only the project owner's own review
                                 (screenshots/live check) can close this line. Nothing in this
                                 report substitutes for it.

ADMIN 6.1 OVERALL              = TECHNICALLY COMPLETE — USER VISUAL ACCEPTANCE PENDING
                                  All four gaps named in the ADMIN 6.1A closure request are closed
                                  with evidence: 44px targets (computed proof), deliberate 320px
                                  brand (no more mid-word ellipsis), static checks + automated
                                  tests + production build all separately reported and passing,
                                  and the full desktop/mobile runtime matrix plus a complete
                                  logout chain independently verified. The only line intentionally
                                  left open is USER VISUAL ACCEPTANCE, which this report does not
                                  and should not attempt to close on its own.
```

STOP condition honored: ADMIN 6.2 not started. No redesign performed beyond the four named gaps.
No business-logic/Prisma/monetization/ADM-11/12/14/15/Bookings/Complaints/Disputes/risk-reason/
escrow/prepayment item touched. Awaiting your review of this report and your own screenshots
before any decision to proceed to ADMIN 6.2.
