# TajStay current state

Read this before anything else. Then load only the skill matching NEXT (see `CLAUDE.md` → Skill routing).
Do not re-read old audit reports or the full MASTER spec unless the task needs them.

## Branch / SHA

- Branch: `feature/tajstay-full-ui-ux-rebuild`
- Base SHA (as of this file, session start of the continuation pass): `a54c1eb`
- Final SHA (this pass): `aaec9c0` (auto-committed by an external tool under the user's git identity —
  not a Claude Code commit, but confirmed to contain exactly this pass's intended changes: see
  `git show --stat aaec9c0`)

## Current authorized block

**PRODUCT/UX/ROLE ARCHITECTURE CONSOLIDATION + FULL VISUAL CORRECTION** (supersedes/extends the prior
"FULL TAJSTAY VISUAL MIGRATION" block; local dev only, not deployed). Scope per user's 72-section brief
(2026-09-09): fix the systemic root causes behind the screenshot-evidenced defects (pale/illegible header
nav, mismatched greens, duplicate hero CTA, notifications mixed into account popover, raw-table profile
IA, weak footer, role-aware CTA correctness) across shared components — not per-screenshot CSS patches —
AND document (not yet implement) target architecture for Expense/Staff-invite/Review-entitlement/Receipt
models so later blocks build against V2 once, not twice. Explicitly NOT in this block's scope: any new
Prisma schema/migration, payments, staff invite backend, complaint system, review-entitlement gating,
Owner Hotel Desk rebuild — those are protected-domain/later-block work (see OPEN).

**Do not start P0-S2** (AuthZ / destructive-ops / RBAC prep) without explicit user authorization — still
true even once this visual/IA block is fully closed. Sequence after this block: P0-S2 (separately
authorized) → Owner Hotel Desk foundation → rest of V2 §63 / this block's §72 order.

## DONE

- P0-S1 security remediation: secret-word primitive removed as an authN factor; owner recovery
  invalidate + rate-limit + email-only (no plaintext UI token); credentials fail-closed;
  `AdminAuditLog` wired on recovery / credentials / admin self-security / emergency.
  Tests: `npx tsx scripts/security-p0-s1-tests.ts` — 15/15 PASS on local test DB.
- Lightweight Claude Code architecture set up (this session): root `CLAUDE.md`, `.claude/skills/*`
  (design, security, browser-qa, owner-crm, admin-crm, database-safety), this `STATE.md`.
- Added `docs/TAJSTAY_ARCHITECTURE_V2.md` (product architecture authority, pointed to from
  `CLAUDE.md`) — binding on product-scope decisions within whatever block is authorized here; does
  not itself unlock protected domains or P0-S2.
- **Legacy brand-color cleanup** (commit `9bddfa6`): all `emerald-*`/`mint-*`/`teal-*` Tailwind
  utilities and off-brand literal hex greens replaced with canonical `#0F7A4D` across chat, payment,
  owner-onboarding, trips, PWA, and layout components (62 files). Home promo banner:
  emerald/teal gradient → solid brand green. `CODE`: done. `TEST`: `npx tsc --noEmit` clean,
  `eslint` clean on touched files (only pre-existing unrelated `useMemo` dep warnings remain).
  `DEPLOYED`: local dev server only (`localhost:3000`), not yet pushed/deployed to a preview URL.
  `REAL RUNTIME`: manually walked `/` and `/search` in the in-app Browser pane at mobile (~390px)
  and desktop (1440x900) viewports — white canvas, single green `#0F7A4D` search surface, no
  console errors. `EVIDENCE`: screenshots taken this session (not saved as files) — see chat
  transcript, not yet an external deployment URL+SHA per the Evidence gates rule, since this was
  local-only. `STATUS: PASS (local runtime evidence only — needs a deployed URL+SHA pass before
  claiming ship-ready)`.
- **Decorative hero removal** (same commit): deleted dead `HeroTravelPreview.tsx`,
  `HeroTravelBackdrop.tsx`, `HomeHeroLuxury.tsx` (never imported), `Hero3DSceneGate.tsx`,
  `Hero3DScene.tsx` (dead 3D code, no importers). `TajstayHero3D` now renders text+CTA only, no
  globe/network visual. `premium-overhaul.css` hero backgrounds are flat white. Verified visually
  on `/` at mobile+desktop (see above). `STATUS: PASS (local runtime evidence only)`.
- **Bug found & fixed in passing**: home page's AI recommendation section imported
  `@/components/ai/AIRecommendationLab`, a file already deleted in a prior commit (`8773d8d`) —
  this broke `npx tsc --noEmit`. Removed the dead import and the broken section (also aligns with
  V2 §14/§57 "remove legacy fake/random AI"). Not a new regression — was already broken before this
  session touched the file.
- Confirmed already-satisfied from the authorized block (no change needed): Owner/Admin mobile
  bottom nav + "More" drawer is already `position: fixed !important`, portaled via `BodyPortal`,
  high z-index (`workspace-mobile-shell.css`) — does not hide or jump. Mobile search results are
  already single-column (`grid-cols-1`), desktop is `md:grid-cols-2 lg:grid-cols-3`.

### Product/UX/Role consolidation block — continuation pass (2026-09-09, local dev only)

**Block is still NOT closed.** This pass fixed several confirmed-real bugs and found one more
significant one (shell leak) but did not land a fix for it — reverted a broken attempt rather than
ship a regression. Do not read this update as completion; see the updated table + remaining
FAIL/BLOCKED list below.

**Fixed and verified this pass:**
- Footer text contrast: `.site-footer` background is force-set to `#0f7a4d` via `!important` in
  `globals.css` (a rule I didn't find on the first pass) — the link/copyright text was using
  `--taj-text-secondary`/`--taj-text-muted` (dark grays meant for light backgrounds), nearly
  invisible on green. Added explicit light-text `!important` overrides right next to the
  background rule so they can't drift apart again. Verified on `/about` desktop screenshot.
- Footer showing in the mobile Consumer app shell: was only hidden on the home page
  (`body:has(.home-page) .site-footer`), so it still appeared under the bottom tab bar on `/history`
  and other consumer pages — confirmed by screenshot, contradicts spec §7/§21. Fixed by keying the
  hide rule off `.app-tab-bar` (the bottom nav's own class) instead of the home page specifically,
  so it's now hidden everywhere the Consumer bottom nav shows. Verified via screenshot on `/history`
  mobile viewport (~469px, an unintentionally-mobile fresh tab — useful free evidence).
- **Public "О сервисе" (About) page directly contradicted the new passport/identity decision**:
  RU and EN copy claimed "document photos uploaded during booking are stored encrypted and deleted
  after check-in." Fixed RU/EN strings in `messages.ts` (TG version never had this claim). This was
  live, user-facing text actively misrepresenting data handling — high-value find via manual
  page-by-page walkthrough, not something a grep for color values would have caught.
- **Role-aware header (`ADMIN` should not see "Стать владельцем") — moved from UNKNOWN to CONFIRMED
  PASS.** Logged in as the seeded `admin@tajstay.local` / `Admin123!` QA account (credentials found
  in `src/lib/seed/runDevSeed.ts`, local dev DB only — `127.0.0.1`, confirmed via `.env` before use)
  and opened the account popover on `/dashboard/admin`: shows Профиль / Уведомления / Мои
  бронирования / Избранное / **Админ-панель** / Выйти — no "Стать владельцем". The user's originally
  reported bug does not reproduce with this account. If it still reproduces for the user's own
  account, the cause is elsewhere (their specific user's `role`/`ownerApp` data), not this
  component's logic.

**Found but NOT fixed — needs a different approach next session:**
- **Shell leak, confirmed at runtime**: `/dashboard/admin` (and presumably `/dashboard/owner`) renders
  the full **Consumer** public `Header`/`Footer`/`MobileBottomNav` in addition to its own
  `AdminSidebar`/`DashboardShell` chrome, because `Header`/`Footer` are unconditional in the root
  `src/app/layout.tsx` — they don't check route. This violates `CLAUDE.md`'s own shell-separation
  rule and spec §41. **Attempted fix this pass**: a `"use client"` wrapper (`PublicShellChrome`)
  reading `usePathname()` and passing `<Header/>`/`<Footer/>`/`<MobileBottomNav/>` in as props to
  conditionally render them. This broke the entire dev server (`Invariant: missing bootstrap script`
  / webpack `options.factory` chunk errors on every route, survived a full `.next` cache wipe) — a
  real regression, not a cache artifact. **Reverted immediately** (`git checkout -- src/app/layout.tsx`
  + deleted the new file); app confirmed healthy again after revert. **Do not retry the
  RSC-passed-as-a-prop-into-a-client-wrapper pattern for this** without first understanding why it
  broke module resolution — possible leads: `Header`/`Footer` being `async` Server Components that
  call `cookies()`/dynamic APIs, combined with being handed to a Client Component as a prop, may not
  be safe in this Next 14.1.0 setup. A safer alternative to try: have `Header`/`Footer` each
  self-check the request path via `headers()` reading an `x-pathname` header set in `middleware.ts`
  (would require widening the middleware matcher to run globally — itself needs care since
  `middleware.ts` currently only guards `/dashboard/admin|owner`, i.e. touches
  auth-adjacent code) — or, lower-risk, give `AdminSidebar`/`OwnerSidebar`'s `DashboardShell` a CSS
  rule that hides `.site-header`/`.site-footer`/`.app-tab-bar` when a `.owner-command-center-shell` /
  admin-shell ancestor class is present (pure CSS, no new render-tree wiring, much smaller blast
  radius).

### Product/UX/Role consolidation block — evidence table (commit `dd19950`, local dev only)

Root cause found via targeted audit: `src/styles/home.css` header comment reads "Premium dark
emerald · mobile-first" — a leftover dark-theme stylesheet never fully migrated when the header/
footer moved to a white canvas. That explains most of the screenshot defects at once.

| AREA | CODE | TEST | REAL RUNTIME | EVIDENCE | STATUS |
|---|---|---|---|---|---|
| Design Tokens | Fixed 3 more off-brand greens found this pass (nav active state, locale dropdown active item, header signup gradient) on top of the prior 62-file sweep | tsc/eslint clean | Verified `/` desktop 1440x900 | Screenshot this session (chat transcript) | PASS (local only) |
| Desktop Header | Nav text/active state, sign-in/sign-up buttons, locale trigger fixed from dark-theme leftovers to readable neutral/green on white | tsc/eslint clean | Verified `/` desktop | Screenshot | PASS (local only) |
| Language selector | Icon was literal `color:#fff` on white bg (invisible) — fixed | tsc/eslint clean | Verified visible at desktop | Screenshot | PASS (local only); dropdown open-state + mobile sheet not re-verified this pass |
| Home Hero/Search | Deduped heroBadge/title/subtitle repetition of "жильё"; removed redundant scroll-CTA duplicating the visible search submit button | tsc/eslint clean | Verified `/` desktop | Screenshot | PASS (local only); serif display font retained (judgment call, not fixed — see OPEN) |
| Auth | Not touched this pass | — | — | — | **NOT DONE** |
| Role-aware Header | Read `UserMenu.tsx`: role gating (`GUEST`/`OWNER`/`ADMIN` → correct CTA, no `Стать владельцем` for ADMIN) is already correct in code | tsc clean | **Not verified with a real ADMIN test account** | none | UNKNOWN — code looks correct, needs runtime check with an actual admin session before trusting the user's screenshot report of this bug |
| Profile Menu / notifications separation | Removed embedded notification list + mark-read-all from account popover per spec; popover now links to `/notifications` with a badge only | tsc/eslint clean | Verified popover opens, avatar renders solid green | Screenshot | PASS (local only) |
| Personal Information | **Confirmed the exact "raw bordered database table" complaint** at `/profile/personal` — stacked bordered rows, not editable cards | n/a | Verified visually | Screenshot | **NOT DONE** — real redesign + edit-interaction work, deliberately not rushed blind this pass, top item in OPEN |
| Notifications (bell) | Not touched this pass (already separate from popover pre-existing) | — | — | — | Not re-verified |
| Settings IA | Not touched — spot-checked `/profile` overview, already card/grouped (not a raw table) so likely closer to spec than Personal Information | — | Verified `/profile` overview only | Screenshot | Partially OK, not audited in full |
| Security IA | Not touched this pass | — | — | — | NOT DONE |
| Help/Contact | Not touched this pass | — | — | — | NOT DONE |
| Footer | Superseded by continuation-pass fix above: text contrast (was invisible dark-gray-on-green) and mobile hide-rule (was leaking under bottom nav) both fixed | tsc clean | Verified `/about` desktop + `/history` mobile | Screenshots this pass | PASS (local only) |
| Assistant (FAB) | Confirmed already correctly gated off Admin/Owner via `isWorkspaceRoute()` in `AppShell.tsx` — no fix needed | n/a (read-only check) | Verified visible+positioned correctly on `/history` mobile | Screenshot | PASS (local only) |
| Consumer Mobile | Partial: `/history` verified at ~469px (footer hidden, FAB positioned correctly, nav readable) | tsc clean | `/history` only | Screenshot | Partial — full mobile matrix (360/390/412/768) still NOT DONE |
| Owner Entry | Not touched/verified this pass | — | — | — | NOT DONE |
| Admin Entry | **Role CTA confirmed PASS** (see above). **Shell leak confirmed FAIL**: public Header/Footer/bottom-nav render on top of the admin dashboard's own chrome | n/a | Verified via real admin login | Screenshot | **FAIL** (role logic) / **BLOCKED** (shell leak — fix attempt broke the app, reverted; needs a safer approach, see note above) |
| Security Findings | None newly found this pass beyond the shell-leak architecture bug (not a security hole, an IA/branding leak) | — | — | — | See shell-leak note |
| Passport/Identity architecture | User's binding decision (no cloud passport storage) written into `docs/TAJSTAY_ARCHITECTURE_V2.md` §29 override; found and fixed a live contradiction in the public "О сервисе" page copy (RU+EN) that claimed encrypted document-photo storage | tsc clean | Verified `/about` | Screenshot | PASS (docs + copy) — **`guestDocumentUrl` feature in `TripBookingCard.tsx` still exists in code and contradicts the new decision; flagged, not removed** (data-model change, out of this block's safe scope, needs explicit direction) |

**Target architecture documentation (§30/34-38/40-52 of the user's brief)**: not yet written up as an
addendum to `docs/TAJSTAY_ARCHITECTURE_V2.md`. Still pending — see NEXT.

## OPEN

- P0-S2 (AuthZ / destructive ops / RBAC prep) — not started, needs explicit authorization first.
  **Do not start even after the visual block closes** — user has explicitly said this must be a
  separate, separately-authorized step, ordered before Owner Hotel Desk foundation work.
- P0-R1 (500 traces + blank-panel root cause) — not started.
- Production secret-hash state after P0-S1 — UNKNOWN, needs runtime verification against production, not local.
- HTTP E2E Guest/Owner→admin 403 suite — not built.
- Pending phone/email verification flow — not built (intentionally fail-closed for now).
- Design System Foundation / shells visual migration — blocked on P0-S1+ closure per MASTER spec; current
  block above is the local visual pass, full Design System Foundation is still pending.
- Visual-migration block remaining items (not yet evidenced): Auth screen visual cleanup;
  Consumer/Admin/Owner nav & chrome full pass (beyond the already-locked bottom nav); TST Assistant
  positioning; hover/pressed/loading/focus/disabled state audit across primary buttons; full
  responsive matrix (360/390/412/768/1024/1280/1440+); human-like browser QA for Owner and Admin
  roles specifically (only Guest/consumer `/` and `/search` verified so far); a deployed
  preview-URL + SHA evidence pass (current evidence is local dev server only).
- **Top priority next**: `/profile/personal` redesign from raw bordered-row list to structured
  editable cards (user's §15/§62) — confirmed via screenshot this pass, deliberately deferred rather
  than rushed since it touches live edit interactions/forms.
- Role-aware header: `UserMenu.tsx` role-gating logic read as already correct
  (`GUEST`/`OWNER`/`ADMIN` → right CTA, no `Стать владельцем` for ADMIN) but **not verified against
  a real ADMIN session** — needs a runtime check before trusting or dismissing the user's report of
  this bug. If it reproduces, the bug is likely in how `role`/`ownerApp` is computed upstream
  (`getSessionUser`/`getOwnerApplicationNavState`), not in `UserMenu.tsx` itself.
- Settings/Security/Notification-settings IA audit for duplicated settings across pages (user's
  §14/§16-18) — not started.
- Help/Contact Us redesign (§19-20), Assistant FAB color/positioning per-role (§22) — not started.
- Consumer mobile, Owner entry, Admin entry — not re-verified with this pass's fixes; only desktop
  `/` and `/profile*` checked at 1440x900.
- Target-architecture documentation for Expense model, Staff-invite flow, step-up auth (no second
  static admin/owner password), "Квитанция TajStay" receipt model, rule-based (non-LLM) Owner
  Assistant insights, review entitlement (completed-stay-only, not open-to-any-account) — user gave
  explicit, opinionated architecture decisions on all of these in chat; needs writing up as a V2
  addendum before any of Owner Hotel Desk / payments / reviews blocks start, so they're built once
  against this target model rather than against old assumptions.

## DO NOT TOUCH without explicit approval

- Production database (schema, migrations, direct access)
- Authentication / authorization core
- Booking engine invariants
- Payment capture flows
- Security-critical env secrets / credentials

## NEXT

Block is still NOT closed — continue without asking for new permission, these are all inside the
already-authorized PRODUCT/UX/ROLE ARCHITECTURE CONSOLIDATION block. Priority order for next session:

1. **Shell leak fix (Admin/Owner showing Consumer header/footer/bottom-nav)** — highest priority,
   confirmed FAIL at runtime this pass. Try the CSS-scoped-hide approach noted above instead of the
   RSC-into-client-wrapper pattern that broke the dev server. Verify on both `/dashboard/admin` and
   `/dashboard/owner` after.
2. `/profile/personal` IA redesign (raw bordered-row list → structured editable cards) — confirmed
   FAIL via screenshot, still not started.
3. `guestDocumentUrl` / passport-scan-link feature in `TripBookingCard.tsx` contradicts the new V2
   §29 decision — flag to the user for direction (remove display? migrate data? out of this block's
   safe scope to decide unilaterally since it's a data-model question, not pure visual).
4. Auth screens (`/auth/sign-in`, `/register`) — confirmed via screenshot this pass to still be the
   legacy dark-emerald theme (`auth-premium.css`, ~30 off-brand-green occurrences), not yet fixed.
5. Settings/Security/Notifications/Help IA de-duplication audit — not started.
6. Full responsive matrix (360/390/412/768/1024/1280/1440+) with click/scroll/dropdown/focus/empty/
   error/loading checks per spec §10 — only partial mobile evidence gathered so far (`/history` only).
7. Owner entry browser QA — not done at all this pass (only Admin entry done).
8. Deployed preview-URL + SHA evidence pass — all evidence so far is local dev server only.

Do not mark the block fully closed on build/tsc/lint alone, and do not re-touch the already-fixed
Header/Hero/Footer/UserMenu/role-CTA areas without a found regression.

**Do not start P0-S2 (AuthZ/RBAC) even once the visual block is fully closed** — get separate
explicit authorization for it first. Only after P0-S2 is authorized and closed should Owner Hotel
Desk foundation work (V2 §21+) begin. Sequence is fixed: visual block → P0-S2/AuthZ → Owner Hotel
Desk foundation → rest of V2 §63 order.

From the next new product-scope block onward (post visual-migration), design against
`docs/TAJSTAY_ARCHITECTURE_V2.md` directly rather than the pre-V2 Owner/Admin architecture, so
Owner Hotel Desk and later blocks aren't built once against old assumptions and rebuilt again.

Product architecture authority is `docs/TAJSTAY_ARCHITECTURE_V2.md` (added 2026-09-09) — read it
only when a task needs product-scope detail beyond the current block; it does not change which block
is authorized right now or unlock P0-S2/protected domains on its own.

## Update discipline

Update this file only at the end of a logical block (not every small edit): move finished items DONE→,
adjust NEXT, and update SHA. Do not paste long specs here — link to the `.cursor/rules/*.mdc` file instead.
