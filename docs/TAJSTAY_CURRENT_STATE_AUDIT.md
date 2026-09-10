# TajStay — Current State Audit

**Status: FIRST PASS.** This document is a living audit, not a one-shot complete certification. This
pass covers full mechanical inventory (routes, API, data models, role guards) plus everything already
verified at runtime across this session's prior work. It does **not** yet cover a systematic
role-by-role, page-by-page click-through of all ~37 routes × 3 roles × 7 viewports × 3 locales that
the requesting brief asked for — that is many hours of work on its own and is listed explicitly as
NOT DONE below, not silently skipped. Read `.agent/STATE.md` alongside this for the day-to-day
commit-level trail; this document is the structural map.

- Base SHA: `797b83d`
- Branch: `feature/tajstay-full-ui-ux-rebuild`
- Environment for all runtime claims below: local dev server (`localhost:3000`), unless marked
  otherwise. Nothing in this pass was verified against a deployed environment.

---

## 1. Executive Summary

**Commercial readiness: early/mixed.** Core booking-adjacent data models and a real security
foundation (audit log, redaction, rate limiting, RBAC guards for 3 roles) already exist — this is not
a prototype at the data-model level. But large parts of the product surface (Owner finance/analytics,
Tours, Staff/Manager, Subscriptions, Theme) exist only as fragments (schema without UI, UI without
schema, or neither), and the visual system has had multiple duplicate/legacy CSS layers found and
partially fixed this session (see §9).

| Area | State |
|---|---|
| Architecture (routing, shells, guards) | MIXED — real foundations, one confirmed unresolved shell-leak defect |
| Consumer (search/booking/profile) | MIXED — core flows have real APIs; several Profile sub-features are UI-only or dead |
| Owner | PARTIAL — hotel/room/booking CRUD has real APIs (`lib/pms/*`); no Expense/Finance/Analytics backend found at all |
| Admin | PARTIAL — moderation/user-management APIs real; analytics computed ad hoc, one data-consistency defect open |
| Mobile/PWA | MIXED — real service worker with two now-fixed defects (stale chunks, cross-account cache); install/cookie sequencing fixed this session |
| Security | MIXED — real RBAC/audit/rate-limit foundation; no security response headers configured (CSP/HSTS/etc. — see §12); IDOR not systematically tested this pass |
| Performance | NOT AUDITED this pass |

---

## 2. Route Inventory (mechanical, complete)

37 page routes found under `src/app`. Grouped by shell:

**Public/Consumer** (root layout, Header/Footer/BottomNav via `src/app/layout.tsx`):
`/`, `/about`, `/apply/owner`, `/booking`, `/contacts`, `/faq`, `/favorites`, `/history`, `/hotel/[id]`,
`/map`, `/notifications`, `/offline`, `/payment/[code]`, `/policy`, `/search`, `/terms`, `/tours`,
`/chat/booking/[bookingId]`, `/dashboard/bookings`, `/dashboard/guest`, `/dashboard/guest/notifications`,
`/dashboard/messages`

**Profile** (nested under `/profile`, own subpages): `/profile`, `/profile/become-owner`,
`/profile/data`, `/profile/email`, `/profile/payments`, `/profile/personal`, `/profile/phone`,
`/profile/security`, `/profile/settings`, `/profile/subscriptions`, `/profile/support`,
`/profile/telegram`

**Auth** (own layout, `.taj-auth-page` scoped CSS): `/auth/sign-in` (handles both login and register
via `?mode=`), `/auth/forgot-password`, `/auth/reset-password`

**Owner** (`src/app/dashboard/owner/layout.tsx`, `requireOwner()` guard): `/dashboard/owner` — this is
a single route; owner sub-sections are rendered via `?section=` query param inside one page, not
separate Next.js routes (**finding**: means the "Owner route inventory" the brief asked for is
actually one route with client-side section switching, not ~15 separate URLs — re-scope future
Owner audits accordingly)

**Admin** (`src/app/dashboard/admin/layout.tsx`, `requireAdmin()` guard, plus
`/dashboard/admin/chat-archive`): same pattern — one primary route with internal sections, plus one
separate chat-archive route

**Confirmed NOT rendered on Owner/Admin routes this session** (verified via `AppShell.tsx`
`isWorkspaceRoute()` check): TajStay Assistant FAB. **Confirmed STILL leaking onto Owner/Admin this
session** (verified via direct screenshot on `/dashboard/admin`): the public Header (with
Главная/Поиск/О сервисе nav and the consumer account popover) — this is the standing top BLOCKED item,
see §9.

---

## 3. API Route Inventory (mechanical, complete)

**100 API routes** under `src/app/api`. Full list captured in this session's raw tool output; grouped
by domain here (not reproduced route-by-route in this first pass — see NOT DONE):

- **Auth** (14 routes): email login/register, Google OAuth start, Telegram challenge/verify/session/
  status, Firebase phone config/register/session, phone-otp request/verify (two copies — see finding
  below), forgot/reset password, verify-reset-otp, logout, me
- **Admin** (16 routes): booking cancel/confirm-payment/payment-timer/complete/payment, chat archive/
  messages, complaints resolve, content (brand/home-banner/legal/payment-methods/support), hotels
  moderate, notifications cleanup, owner-applications approve/reject, security reset/update, users
  credentials/reset-password/update
- **Owner** (17 routes): applications, bookings (assign-room/check-in/confirm/payment-approve/
  payment-reject/reject), calendar, hotels, offline-bookings, onboarding, overrides (+bulk),
  payment-methods, room-types, rooms (+[id]/bulk)
- **Bookings** (7 routes, consumer-facing): create, cancel-by-guest, cancel, confirm-payment,
  document (**this is the `guestDocumentUrl` upload endpoint** — see §13), extend, reject-payment
- **Chat** (6 routes): archive, booking init/messages/stream/owner-soft-delete, inbox
- **Notifications** (5), **Favorites** (1), **Reviews** (2: create, reply), **Disputes** (1),
  **Complaints** (1: create), **Payments** (1: proof), **Push** (2), **Search** (1), **Locale** (1),
  **Profile** (1: update-name — added this session), **Cron** (2: archive-booking-chats,
  booking-reminders), **Jobs** (1: expire-bookings), **Health** (1), **Seed** (1 — see finding below),
  **Telegram webhook** (1), **tst/my-bookings** (1)

**Findings from this pass alone (not yet deeply verified, flagged for follow-up):**
- `/api/phone-otp/request|verify` AND `/api/auth/phone-otp/request|verify` both exist —
  `src/app/api/auth/phone-otp/request/route.ts` is a one-line re-export of the other
  (`export { POST } from "@/app/api/phone-otp/request/route"`). Not a duplicate implementation, just
  two URLs for one handler — low severity, but confusing API surface.
- **`/api/seed` exists as a route** — needs an explicit check of whether it's guarded (dev-only,
  env-gated) or reachable in a deployed environment. Not verified this pass. **P0/P1 candidate pending
  verification** — a reachable seed endpoint in production would be a real data-integrity risk.
- No `/api/owner/expenses`, `/api/owner/finance`, or `/api/admin/analytics` routes exist at all —
  confirms Owner Finance/Expenses and Admin deep analytics have no dedicated API layer. Whatever the
  Admin dashboard donut/KPI numbers currently show is computed inline in the Server Component, not via
  a reusable service — matches the data-inconsistency finding from earlier sessions (Hotels headline
  vs. donut legend disagreeing).

**NOT DONE this pass**: full per-route AUTH/ROLE/INPUT/VALIDATION/RATE-LIMIT/AUDIT table (§80 of the
brief) — this is ~100 rows of real verification work, not attempted here.

---

## 4. Data Model Inventory (mechanical, complete)

37 Prisma models: `User`, `Account`, `OwnerApplication`, `Hotel`, `RoomType`, `RoomTypePhoto`,
`RatePlan`, `Room`, `HotelStaff`, `RoomPhoto`, `RoomDateOverride`, `Booking`, `ChatMessage`,
`ChatArchive`, `HostProfile`, `Payment`, `Payout`, `Refund`, `TransactionLog`, `HotelPhoto`,
`HotelAmenity`, `Dispute`, `Review`, `Notification`, `PushSubscription`, `Complaint`, `Session`,
`VerificationToken`, `PasswordResetToken`, `EmailOtp`, `OtpChallenge`, `Favorite`,
`AdminSecurityState`, `SiteContentState`, `TelegramLoginChallenge`, `AuthAuditLog`, `AdminAuditLog`,
`OwnerPaymentMethod`.

**Key findings:**
- **`HotelStaff` model already exists** (`hotelId`, `userId`, `staffRole: RECEPTIONIST | HOUSEKEEPING`)
  — directly contradicts an assumption made in an earlier session pass that staff/manager was
  "missing." Status: **BACKEND-ONLY**. It's used by `src/lib/pms/staff.ts` and `src/lib/pms/types.ts`
  (a whole `src/lib/pms/` service module: `amenities.ts`, `assignment.ts`, `bookingContext.ts`,
  `bulkRooms.ts`, `inventory.ts`, `migrate.ts`, `ownerQueries.ts`, `prismaIncludes.ts`, `staff.ts`,
  `types.ts`) but **no API route or UI page references `HotelStaff` or exposes staff invite/management**
  — confirmed via `grep` across `src/app`. So: real schema + real service-layer logic, zero product
  surface. This changes the recommended approach for any future "build Owner staff management" task
  — it's wiring existing plumbing, not building from zero.
- **No `Expense` model** — the earlier assumption (from a prior session/prompt) that a
  "MONTHLY/DAILY/WEEKLY expense semantics" system already existed and must not be broken appears to
  be **incorrect** for this codebase snapshot; no such model exists in `schema.prisma`. Either it was
  never built, or it lives somewhere this grep didn't catch (e.g. a JSON field on another model) — not
  fully ruled out this pass, but no dedicated model found.
- **No `Tour` model** — Tours has no backend data model at all. The `/tours` route's content is very
  likely fully static/placeholder. Not runtime-verified this pass.
- **No `Subscription` model** — the Profile "Подписки" feature has no dedicated backend table found.
  Likely UI-only or piggybacking on `Notification`/`User` preference fields — not confirmed.
- Two audit-log models exist: `AuthAuditLog` and `AdminAuditLog` — worth checking for overlap/
  redundancy in a future pass, not done here.

**NOT DONE this pass**: full ER relation map, LEGACY/UNUSED field-by-field pass, per-model
USED/LEGACY/UNKNOWN classification (§82-83 of the brief).

---

## 5. Role Inventory

**Enforced roles found**: `GUEST`, `OWNER`, `ADMIN` (via `requireAuth.ts`, `requireOwner.ts`,
`requireAdmin.ts` in `src/lib/auth/` — only 3 guard files exist). `User.role` is a plain `String`
field in schema (not a Prisma enum), default `"GUEST"`.

**`HotelStaff.staffRole`** (`RECEPTIONIST | HOUSEKEEPING`) is a **separate, unrelated string field on
a different model** — it is NOT part of the `User.role` authorization system, has no `requireStaff()`
guard, and (per §4) has no UI/API surface at all yet. Any future "Manager/Staff" work needs to decide
whether to build on this existing `HotelStaff` model or design a new one — do not assume it doesn't
exist, and do not assume it's ready to use as-is either (no auth-layer enforcement wired to it yet).

**NOT DONE this pass**: the full Role × Feature matrix (§12 of the brief) — VIEW/CREATE/EDIT/DELETE
per role per feature, systematically verified via direct HTTP requests on dedicated QA accounts. This
is real, valuable security work that was not attempted here given the time this mechanical inventory
already took.

---

## 6. Shell / Layout Architecture

- Root layout (`src/app/layout.tsx`): renders `Header`, `Footer`, `MobileBottomNav`, `CookieConsent`,
  `PwaInstallPrompt`, `AppShell` (which mounts `TstAssistant` conditionally) — **unconditionally**, on
  every route.
- `AppShell.tsx` uses `usePathname()` + `isWorkspaceRoute()`/`isShellHiddenRoute()` from
  `src/constants/app-navigation.ts` to hide the Assistant and the consumer `MobileBottomNav` on
  `/dashboard/admin`, `/dashboard/owner`, and `/auth/*` — **this part works correctly**, confirmed by
  this session's screenshots (no Assistant FAB visible on Admin).
- **The public `<Header/>` and `<Footer/>` in root `layout.tsx` have no such conditional** — they
  render on every route unconditionally, including Admin/Owner. This is the confirmed, still-open
  shell-leak defect. Two prior fix attempts (a client component wrapping the async Server Components
  as props; a second attempt) both broke the dev server and were reverted — see `.agent/STATE.md` and
  commit `d076570` for exactly what was tried and why it failed. **Recommended next approach, not yet
  attempted**: Next.js route groups (physically move Admin/Owner routes into a layout tree that never
  imports `Header`/`Footer`, rather than a runtime conditional) — this is a structural fix, not a
  wrapper-component fix, and avoids the pattern that broke twice already.
- Owner/Admin each have their own `DashboardShell` (sidebar + mobile bottom-nav via `OwnerSidebar.tsx`
  / presumably an `AdminSidebar.tsx`) rendered as `{children}` inside the leaking public shell — so
  currently both the public AND the workspace chrome render simultaneously on those routes.

**NOT DONE this pass**: the full layout/shell diagram artifact the brief asked for (§6) — described in
prose above, not drawn as a diagram.

---

## 7. Known Runtime-Verified Findings (carried over from this session's prior work, all with evidence)

These were found and (where marked) fixed with real browser/CSSOM verification in this session,
**on local dev only** — not re-verified against any deployed environment:

| Finding | Status | Evidence |
|---|---|---|
| Admin donut chart rendered as solid black circles | **FIXED** | Root cause: `AnalyticsDonut.tsx`'s CSS classes had zero styles anywhere in the repo (SVG default fill). Added `ds-components.css` rules. Verified via screenshot pre/post. |
| Admin Hotels KPI headline (1) vs. donut legend (implies 4) mismatch | **OPEN, not investigated further** | Confirmed present in a deployed screenshot; not yet traced to the specific query in code this pass — see §3 finding that no dedicated analytics API/service exists, values are likely computed inline per-widget with inconsistent filters |
| `/profile` passing raw Prisma `Booking` rows (with `Decimal`/`Date`) into a Client Component | **FIXED** | Server console warning confirmed gone after switching to `_count` |
| Service worker: `/_next/*` chunks cache-first (stale-forever risk in dev) | **FIXED** | Switched to network-first-with-fallback in `public/sw.js` |
| Service worker: authenticated pages (e.g. `/profile`) cacheable in the shared offline cache | **FIXED — real cross-account privacy risk on shared devices** | Added an explicit public-route allowlist for navigation caching |
| Cookie consent: no "reject non-essential" option, shown simultaneously with the TajStay install prompt | **PARTIALLY FIXED** | Reject button added to source + compiled bundle (confirmed via CSSOM enumeration and chunk inspection) but **still does not appear in the live DOM** on a fresh rebuild + fresh tab — unresolved, not explained, do not claim fixed |
| Install prompt had zero gating logic (showed instantly, could overlap cookie banner) | **FIXED** | Added consent-resolved-event + 15s engagement timer gate |
| Auth screens (`/auth/sign-in`, register) legacy dark-emerald theme, duplicate label+placeholder | **FIXED** | Root cause: a second duplicate "palette lock" override block existed in `globals.css`, separate from the one fixed first in `auth-premium.css` — found via direct CSSOM rule enumeration, verified via screenshot + computed styles |
| `ProfileMockupView` client-only crash (`Cannot read properties of undefined (reading 'length')`) | **OPEN, unresolved** | Reproduces only on `/profile`, not site-wide; SSR HTML verified correct; compiled bundle verified correct; every component in the render tree read for unguarded array access (one real bug found and fixed in `TrustBadges`, did not resolve this crash) |
| Public "О сервисе" page falsely claimed TajStay stores encrypted passport/document photos | **FIXED** | Contradicted a binding architecture decision; copy corrected |
| Home promo banner casing ("Tajstay") + external-domain CTA link bug | **FIXED** locally + local DB; **production DB not fixed** | — |
| City search field had a redundant placeholder duplicating its own label | **FIXED** | — |

**Unidentified black floating widget** (visible in the user's deployed screenshots): no matching
component, package, or script found anywhere in this repo. Given the URL was a `*.vercel.app` preview
domain, most likely Vercel's own Preview Toolbar (shown only to the authenticated Vercel account
viewing it) — **not confirmed**, the user has not yet verified this theory.

---

## 8. Security Surface — Partial Findings

- No `dangerouslySetInnerHTML` usage found anywhere in `src` (0 matches) — good sign against a common
  stored-XSS vector, though this doesn't rule out unsafe rendering via other means (not fully audited).
- A dedicated `src/lib/security/rateLimit.ts` exists and is used by at least phone-OTP handlers — real
  rate-limiting infrastructure exists, not universally verified across all sensitive routes.
- **`next.config.mjs` `headers()` only sets `Cache-Control` headers — no CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, or Permissions-Policy configured anywhere found.** This is a
  real, concrete gap, not yet triaged for severity against this app's actual threat model.
- The legacy `ADMIN_SECRET_WORD` primitive referenced in `src/lib/admin/auditLog.ts` is only present
  as an audit-log **redaction key** (a field name to scrub from logged values), consistent with a
  prior session's P0-S1 remediation ("secret-word primitive removed as an authN factor") — appears
  genuinely remediated, not an active auth bypass. Not independently re-verified end-to-end this pass.
- `AdminAuditLog` and `AuthAuditLog` both exist — real audit infrastructure, not evaluated for
  coverage gaps (which actions log, which don't) this pass.

**NOT DONE this pass** (all explicitly requested in the brief, none attempted): IDOR/BOLA testing via
direct HTTP requests, input validation audit, file-upload security audit, CORS audit, third-party
integration inventory, environment-variable inventory, `/api/seed` reachability check.

---

## 9. What This Pass Did NOT Cover

Being explicit rather than silent, per the brief's own instruction that UNKNOWN must not remain
unexplained: the following sections of the requested 142-point audit were **not attempted** this pass,
due to the scope being genuinely multi-session work:

- Role-by-role (GUEST/OWNER/ADMIN) click-through of every route with screenshots
- Full RU/TJ/EN visual QA pass
- Full responsive matrix (360-1440px) per page
- Auth provider flow verification (Google/Telegram/Firebase — configured? working? credential
  present?)
- Booking flow end-to-end walkthrough
- Hotel detail, Tours, Reviews content-source verification (real vs. mock data)
- Owner Overview/Finance/Calendar/Rooms/Bookings/Messages runtime walkthrough
- Admin Applications/Hotels/Users/Bookings/Complaints/Finance/Content runtime walkthrough
- Performance baseline (bundle size, network waterfall, duplicate requests)
- Accessibility audit
- Timezone audit
- Test suite coverage inventory
- Local vs. deployed diff (no deployed environment was accessed this pass)

These remain the actual next steps for a deeper audit pass, not implementation work.

---

## 10. What Should NOT Be Rewritten (early signal, not exhaustive)

Based only on what was inspected this pass:
- The role-guard foundation (`requireAuth`/`requireOwner`/`requireAdmin`) is simple, consistent, and
  looks sound — keep as-is.
- The audit-log redaction system (`auditLog.ts`'s sensitive-key denylist) is a good pattern — keep.
- `src/lib/pms/*` is a real, apparently coherent service layer for hotel/room/staff/inventory logic
  that's more complete than its UI surface — worth building future Owner features on top of, not
  replacing.
- The service worker's overall structure (install/activate/fetch event separation) is sound — this
  pass fixed two specific strategy bugs within it, not the architecture.

---

## 11. Immediate Recommended Next Steps (dependency order, not started)

1. Verify whether `/api/seed` is reachable outside dev — real risk if not gated.
2. Resolve the shell-leak defect via route groups (blocks meaningful Admin/Owner work quality).
3. Trace the Admin Hotels/Bookings KPI-vs-legend data mismatch to its actual query before building
   more analytics on top of unverified numbers.
4. Decide whether to build Owner Staff UI on the existing `HotelStaff` model/`lib/pms/staff.ts` or
   design fresh — don't duplicate.
5. Add baseline security response headers (CSP at minimum) — currently entirely absent.
6. A dedicated, focused pass on the two still-open runtime mysteries (`ProfileMockupView` crash,
   cookie reject button) since they've resisted two full investigation attempts each.

No implementation should start on any of the above, or on redesign of Home/Profile/Admin, until the
user reviews this document and issues the next explicit instruction.
