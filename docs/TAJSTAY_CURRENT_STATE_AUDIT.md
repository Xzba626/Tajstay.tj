# TajStay — Current State Audit

**Status: IN PROGRESS / PARTIAL — explicitly NOT complete.** Per the user's correction, this document
may not be called "complete" until the full completion gate in the governing audit instruction is met
(structural inventory + anonymous/Guest/Owner/Admin runtime + auth flow + profile click-through +
booking + RU/TJ/EN + responsive + PWA + performance + security/authorization + deployed-vs-local, all
done). This pass is the **second layer**: code-traced findings (dead code, exact root causes, chain
tracing) added on top of the first layer's mechanical inventory. The full browser-runtime role-by-role
walkthrough, RU/TJ/EN pass, responsive matrix, and performance baseline are **still not done** — listed
explicitly in §9, not silently skipped. Read `.agent/STATE.md` alongside this for the day-to-day
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

## 6b. Phone Verification — Full Chain Traced (worked example, per the user's explicit request)

This is the level of answer the audit is meant to produce for any subsystem. Traced by reading every
file, not guessed:

**What exists, connected:**
- `User.phone` (schema field, unique), `User.phoneVerified` (boolean) — the only phone state actually
  read by the live UI (`ProfileMockupView`, `/profile/phone`, `/profile/personal`).
- Firebase Phone Auth (`firebaseUid` field on `User`, `/api/auth/firebase/config|register|session`
  routes) — this is what `phoneVerified` actually gets set by, per the schema comment "True when phone
  was verified via Firebase Phone Auth (or legacy OTP)."
- `PasswordRecoveryWizard.tsx` — real, used by `/auth/forgot-password`.

**What exists, built, but NOT wired to anything (dead/orphaned code — verified via
repo-wide grep, zero importers found for each):**
- `/api/phone-otp/request` + `/api/phone-otp/verify` and their duplicate aliases under
  `/api/auth/phone-otp/*` (`src/lib/auth/phoneOtpHandlers.ts`) — a complete custom OTP request/verify/
  rate-limit implementation with **zero UI callers anywhere in the codebase**.
- `OtpVerificationPanel.tsx` — a presentational OTP-entry component with **zero importers**.
- `TajikPhoneInput.tsx` — a Tajikistan-specific phone input with country/calling-code handling —
  **zero importers**.
- The Firebase phone routes (`/api/auth/firebase/config|register|session`) also have **zero
  frontend callers found** in `src/components` or `src/app` — meaning even the system that
  `phoneVerified` is documented to depend on is not currently invoked from any UI path found.

**Firebase client SDK trace — RESOLVED this pass (was the open question above).**
`src/lib/firebase/client.ts` is a complete, correctly-implemented `"use client"` wrapper module:
`getFirebaseClientAuth()`, `ensureRecaptcha()` (creates an invisible `RecaptchaVerifier` bound to a
DOM container id `"firebase-recaptcha"`), `sendFirebasePhoneOtp()` (calls
`signInWithPhoneNumber(auth, phone, verifier)`), `confirmFirebasePhoneOtp()` (calls
`pendingConfirmation.confirm(code)` then `getIdToken()`), plus teardown/reset helpers. This is real,
working Firebase Phone Auth client plumbing — not a stub.
- Repo-wide grep for its three exported entry points (`sendFirebasePhoneOtp`, `confirmFirebasePhoneOtp`,
  `initFirebaseRecaptcha`) found **zero call sites anywhere outside the file that defines them.**
- Repo-wide grep for the reCAPTCHA container id (`firebase-recaptcha` / `RECAPTCHA_CONTAINER_ID`) also
  found **zero matches outside that same file** — no page or component renders the
  `<div id="firebase-recaptcha">` this module requires to function, so even if a caller existed,
  `ensureRecaptcha()` would throw (`"reCAPTCHA container not found"`).
- **Classification: (A) DEAD/UNUSED PLUMBING.** Fully implemented, zero UI wiring, zero possibility of
  accidental invocation (missing DOM container is a hard blocker, not just a missing button).

**What actually sets `phoneVerified` today**: only the custom `/api/phone-otp/*` subsystem
(`src/lib/auth/phoneOtpHandlers.ts` + `src/lib/auth/otp.ts`), traced fully this pass:
- Storage: `OtpChallenge` Prisma model, keyed by normalized phone, storing `codeHash` (SHA-256, never
  plaintext), `expiresAt`, `attempts`, `lockedUntil`, `lastSentAt`.
- TTL: `OTP_EXPIRES_MS = 10 min`. Resend cooldown: `OTP_RESEND_COOLDOWN_MS = 60s`. Max attempts before
  lock: `OTP_MAX_ATTEMPTS = 5`, lock duration `OTP_LOCK_MS = 15 min`.
- Rate limiting (layered, `src/lib/security/rateLimit.ts`): on request — 20/min per IP, 5/10min per
  phone, 4/10min per IP+phone pair; on verify — 50/min per IP, 8/10min per phone, 8/10min per pair.
- Verify path uses `crypto.timingSafeEqual` on the hash (constant-time), plus an artificial 180ms delay
  on mismatch, plus hashes a dummy `"000000"` when the input format is invalid — all specifically to
  resist timing-based enumeration/brute force. In production (`NODE_ENV=production`) the raw OTP is
  never echoed in the response; in dev it is, for testability.
- On successful verify: creates or updates the `User` (sets `verified: true`, `phoneVerified: true`),
  issues a session cookie directly (`createSessionCookie`), logs an audit event
  (`otp_request`/`otp_verify_fail`/`register_phone`/`login_phone`), and fires notifications.
- **But this subsystem also has zero UI callers** (confirmed via grep for `/api/phone-otp` and
  `/api/auth/phone-otp` across `src/app` and `src/components` — only the route files and the handler
  module itself match). So `/profile/phone`'s actual "Изменить"/verify action, if it does anything at
  all today, calls neither this nor Firebase — **not yet identified this pass**; that requires a live
  click-through of `/profile/phone`, not more grep (queued for the role-walkthrough phase, §Guest
  Profile click-tree).

**What this means for "rebuild the phone flow" as a future task**: do **not** build a new OTP system
and do **not** wire up the dead Firebase plumbing by default. There is already a complete, well-secured,
unused `/api/phone-otp/*` implementation (rate limiting, hashing, timing-safe compare, lockout, audit
logging) that is objectively more production-ready than the Firebase path (which additionally requires
external Firebase project config/cost and has no DOM container wired). The real remaining work is:
(a) live-click `/profile/phone` to see what it currently calls, if anything, (b) decide custom-OTP vs.
Firebase as the one system to keep, (c) if custom OTP is chosen, `OtpVerificationPanel.tsx` and
`TajikPhoneInput.tsx` are ready-made UI, not scaffolding to throw away.

## 6c. Admin Analytics — Bookings KPI Mismatch, Root Cause Confirmed (not hypothesis)

Traced in `src/app/dashboard/admin/page.tsx` (lines ~165-220):

- `bookingTotal` = `prisma.booking.count()` — **all** bookings, no status filter (this is the KPI
  headline, e.g. "30").
- The donut's three segments are built by `sumBookingStatus()` against three hardcoded status lists:
  - Confirmed: `CONFIRMED, COMPLETED, CHECKED_IN, CHECKED_OUT`
  - Pending: `PENDING_OWNER, ON_REVIEW, WAIT_PROOF, PENDING`
  - Cancelled: `CANCELLED, REJECTED, EXPIRED`
- The canonical status enum (`src/lib/domain/booking.ts`, `BOOKING_STATUS`) includes
  **`WAITING_PAYMENT`** — explicitly commented as part of the "New premium chat-first lifecycle
  (2026)" — which **appears in none of the three buckets above**. It also references a status literal
  `"PENDING"` that **does not exist anywhere in the canonical `BOOKING_STATUS` enum** — almost
  certainly a leftover from an older status model.
- **Conclusion**: any booking currently in `WAITING_PAYMENT` status counts toward the headline total
  but is invisible in the donut — this is the exact, confirmed mechanism behind the "headline 30 /
  donut implies 7" observation from an earlier session. This is a code bug (stale status list, not
  data corruption or a semantic disagreement about what "bookings" means) with an unambiguous fix:
  update `sumBookingStatus` calls in `src/app/dashboard/admin/page.tsx` to use `WAITING_PAYMENT`
  (and drop the non-existent `"PENDING"` literal) — **not done this pass, this is a finding, not a
  fix, per the audit-only instruction.**
- The Hotels KPI (headline "`{approved} / {total}`", donut center = approved, legend =
  approved+pending) does **not** appear to have the same bug on inspection — the apparent
  "headline 1 vs. donut implies 4" mismatch from an earlier session's screenshot is most likely a
  misread of the fractional headline format (`1 / 4`) rather than a real data inconsistency, but this
  is not yet confirmed with a fresh screenshot at readable resolution — flagged as UNVERIFIED, not
  closed.

## 6d. Owner/Admin Actual Section Lists (extracted from source, not assumed)

**Owner** (`OwnerSidebar.tsx`, `buildItems()`) — 11 areas, all client-side `?section=` switches on the
single `/dashboard/owner` route **except Messages**, which is a real separate route:
`overview`, `properties`, `rooms`, `bookings`, `offline-bookings`, `calendar`,
`/dashboard/messages` (real route), `reviews`, `finances`, `statistics`, `help`, `notifications`.
**No `staff` or `settings` section exists in the sidebar at all** — confirms Owner Staff management
has no UI entry point, consistent with `HotelStaff` being backend-only (§4).

**Admin** (`AdminSidebar.tsx`, section list) — 10 areas, all `?section=` on the single
`/dashboard/admin` route: `dashboard`, `content`, `applications`, `hotels`, `users`, `owner-access`,
`bookings`, `finance`, `complaints`, `notifications`.

**NOT DONE**: clicking through each of these 21 sections individually to verify render/data/actions —
only the navigation list itself was extracted from code this pass.

## 6e. `/api/seed` — Resolved (code-level) AND runtime-confirmed on production

Read `src/app/api/seed/route.ts` directly. Fail-closed and layered:
1. `NODE_ENV === "production"` → immediate 403, before anything else runs.
2. Requires `SEED_SECRET` env var to be set at all, or returns 503.
3. Requires the provided secret (query param or `x-seed-secret` header) to match.
4. Requires an active ADMIN session, unless `SEED_ALLOW_INSECURE_DEV=1` is explicitly set.

**DEPLOYED RUNTIME EVIDENCE (new, this pass)** — safe, non-destructive, no credentials supplied,
against production `https://www.tajstay.site`, commit `f63443c` (deployed revision assumed current;
not independently re-confirmed via Vercel dashboard):
- `GET https://www.tajstay.site/api/seed` (no headers, no session cookie) → **`403 Forbidden`**,
  body `{"error":"Forbidden"}`, `X-Matched-Path: /api/seed`, confirming the route resolved and the
  guard rejected the request before any side effect — not a 404/routing artifact.
- `POST https://www.tajstay.site/api/seed` (no body, no auth) → **`405 Method Not Allowed`**, empty
  body — POST is not even an accepted method on this route as deployed (mutation only reachable, if
  at all, through whatever method the guarded code path uses once past the 403 above — not tested
  further, since supplying a real secret would violate audit-only/non-destructive scope).
- No `Set-Cookie`, no stack trace, no debug info leaked in either response.

**Classification: CONFIRMED SAFE DEV-ONLY, verified at both CODE and DEPLOYED RUNTIME levels.** The
production deployment does have `NODE_ENV=production` in effect (the 403 fail-closed path is the one
actually executing, not a bypass) — this closes the "assumption not re-verified" gap noted in the
prior pass.

## 6f. Security Response Headers — Two Dimensions, Both Now Evidenced

**APPLICATION CONFIG: absent** (code-level, unchanged from prior pass). Checked all three places
headers could be set: `next.config.mjs` (`headers()` — only Cache-Control rules found),
`src/middleware.ts` (no header-setting logic of any kind), `vercel.json` (only
`buildCommand`/`installCommand`, no `headers` key at all). **Confirmed: this repository does not
itself configure CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy
anywhere.**

**DEPLOYED RESPONSE: actual headers** (new, this pass) — `curl -sD` against production
`https://www.tajstay.site`, commit `f63443c`:

| Header | `/` | `/auth/sign-in` | `/api/search` (representative API) |
|---|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000` | `max-age=63072000` | `max-age=63072000` |
| `Content-Security-Policy` | **absent** | **absent** | **absent** |
| `X-Frame-Options` | **absent** | **absent** | **absent** |
| `X-Content-Type-Options` | **absent** | **absent** | **absent** |
| `Referrer-Policy` | **absent** | **absent** | **absent** |
| `Permissions-Policy` | **absent** | **absent** | **absent** |
| `X-Powered-By` | `Next.js` (leaked) | `Next.js` (leaked) | not present on this route |
| `Server` | `Vercel` | `Vercel` | `Vercel` |
| `Cache-Control` | `private, no-cache, no-store, max-age=0, must-revalidate` | same | `public, max-age=0, must-revalidate` |

**Conclusion**: HSTS is present — added by the platform (Vercel), not this app's own config, since no
`Strict-Transport-Security` value appears anywhere in the repo. Every other standard security header
(CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) is **absent both
in application config and in the live deployed response** — platform defaults do not fill this gap.
`X-Powered-By: Next.js` is also leaked (framework fingerprinting), and is likewise not suppressed
anywhere in config (`poweredByHeader` not set to `false` in `next.config.mjs`). An authenticated route
and a POST/mutating API response were not separately checked this pass (GET-only, unauthenticated
requests, per audit-only/non-destructive scope) — headers are set at the Next.js/middleware layer
uniformly enough that a route-specific difference is unlikely but not proven. Severity/threat-model
judgment (iframe-embedding risk, XSS blast radius without CSP) still not assigned — that's a
`tajstay-security` skill judgment call for the implementation phase, not this audit.

## 6g. `src/lib/pms/*` and `HotelStaff` — Deepened, File-by-File Classification

Full call-site mapping across all 10 files (569 lines total), repo-wide grep for every import path:

| File | Exports (main) | Call sites | Classification |
|---|---|---|---|
| `bookingContext.ts` | `bookingHotel`, `bookingRoomTitle`, `bookingPhysicalRoomId` | 13+ call sites: chat init/access, trips history, payment page, admin chat archive, reviews, disputes, notifications reminders, owner dashboard | **REAL FEATURE** — core shared helper, load-bearing across booking/chat/review/dispute/notification subsystems |
| `prismaIncludes.ts` | `bookingWithHotelInclude` | 10+ call sites across chat/tst/bookings/disputes/admin API routes | **REAL FEATURE** — shared Prisma include shape, widely reused |
| `inventory.ts` | `assertRoomTypeAvailable`, `findAvailablePhysicalRoom`, `getRoomTypeDaySummary` | Owner offline-booking, booking pricing, owner calendar, admin booking actions, owner booking confirm, `assignment.ts` | **REAL FEATURE** — availability engine used by both consumer booking flow and Owner/Admin actions |
| `amenities.ts` | `parseAmenitiesJson`, `amenitiesToJson`, `AMENITY_CATEGORIES` | TST assistant intent parsing, hotel room grouping, `OwnerRoomTypesPanel.tsx`, `RoomTypeCards.tsx`, owner room-types API | **REAL FEATURE** — wired end-to-end (Owner UI → API → consumer-facing room cards) |
| `ownerQueries.ts` | `ownerBookingWhere`, `ownerOfflineBookingWhere` | Owner dashboard page, owner offline-bookings API | **REAL FEATURE**, small/thin but load-bearing for Owner Bookings section |
| `bulkRooms.ts` | `bulkCreatePhysicalRooms`, `expandRoomNumbers` | `/api/owner/rooms/bulk` only | **REAL FEATURE**, single call site — Owner bulk room creation, not dead |
| `assignment.ts` | `assignBookingToRoom`, `autoAssignBookingIfPossible` | `/api/owner/bookings/[id]/assign-room`, `/api/owner/bookings/[id]/confirm` | **REAL FEATURE** — Owner room-assignment API, wired |
| **`staff.ts`** | `resolveHotelAccess`, `hasPermission`, `maskGuestContact` | **Zero call sites anywhere outside this file** (repo-wide grep) | **BACKEND FOUNDATION ONLY — unreachable.** This is the *only* code in the repo that reads the `HotelStaff` model or checks staff permissions, and nothing calls it. |
| `migrate.ts` | `ensureRoomTypesForHotel` | **Zero call sites anywhere** | **LEGACY-UNUSED** — an idempotent one-off backfill helper (own comment: "backfill for dev / post-migration"), never invoked by any route, cron, or script found |
| `types.ts` | `STAFF_ROLE`, `HotelStaffRole`, misc type helpers | Imported only by `staff.ts` and `assignment.ts` (for unrelated booking-room-id helpers) | Support file, follows its consumers' classification |

**`HotelStaff` end-to-end conclusion**: the Prisma model (`hotelId`, `userId`, `staffRole:
RECEPTIONIST | HOUSEKEEPING`) exists in the schema, and a complete, well-designed permission system for
it exists in `staff.ts` (per-role permission arrays, PII masking for receptionists without
`view_guest_pii`, owner/admin full-access bypass) — but:
- **No API route creates, lists, updates, or deletes a `HotelStaff` record** (repo-wide grep for
  `hotelStaff` / `HotelStaff` found only the 2 files above — no `/api/owner/staff/*` or similar route
  exists at all).
- **No invite/setup flow exists** — no email/link/code generation for onboarding a staff member found.
- **No login differentiation for staff** — `HotelStaff.userId` implies a staff member is a `User`, but
  since `resolveHotelAccess` (the only code that would grant a staff member reduced-scope access) is
  never called from any authenticated route, a `HotelStaff` row today has **zero effect on anything a
  logged-in user can do** — their access is governed entirely by their `User.role` (GUEST/OWNER/ADMIN)
  via the existing `requireAuth`/`requireOwner`/`requireAdmin` guards, not by `HotelStaff`.
- Consistent with §6d: Owner sidebar has no "Staff" section, confirming no UI entry point either.
- **Classification: BACKEND FOUNDATION ONLY.** Not a bug, not partially wired — a complete,
  self-consistent subsystem (schema + permission logic) that the rest of the app simply does not call
  yet. Building "Owner → Staff management" as a future feature would mean writing the API routes, an
  invite flow, and a staff-scoped session/permission-check integration — the RBAC *logic itself*
  (`ROLE_PERMISSIONS`, `maskGuestContact`) would not need to be rewritten, just wired in.

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

## 11. Immediate Recommended Next Steps (dependency order)

1. ~~Verify whether `/api/seed` is reachable outside dev~~ — **RESOLVED this pass, see §6e: safe,
   fail-closed.**
2. ~~Trace the Admin Bookings KPI-vs-donut mismatch~~ — **RESOLVED this pass, see §6c: confirmed code
   bug (stale status list missing `WAITING_PAYMENT`), exact fix identified, not applied (audit-only).**
3. Resolve the shell-leak defect via route groups (blocks meaningful Admin/Owner work quality) —
   still open.
4. Decide whether to build Owner Staff UI on the existing `HotelStaff` model/`lib/pms/staff.ts` or
   design fresh — don't duplicate. Still open, now with a fuller picture (§6d: no staff/settings
   sidebar entry point exists at all).
5. Decide the phone-verification path per §6b (custom OTP vs. Firebase) before building anything —
   full chain now traced, decision not made (that's an implementation choice, not an audit output).
6. Add baseline security response headers (CSP at minimum) — confirmed absent across all 3 possible
   config locations (§6f).
7. A dedicated, focused pass on the two still-open runtime mysteries (`ProfileMockupView` crash,
   cookie reject button) since they've resisted two full investigation attempts each.

**Still required before this audit can be called complete** (per the completion gate in the governing
instruction — not started this pass, genuinely large remaining scope): anonymous/Guest/Owner/Admin
human-like runtime walkthrough (all 21 Owner+Admin sections individually, all Profile subroutes
individually per role), auth provider runtime verification (Google/Telegram/Firebase — configured?
working?), booking end-to-end walkthrough on isolated QA data, full RU/TJ/EN visual pass, full
responsive matrix, PWA/cache runtime re-verification, performance baseline, IDOR/authorization testing
on isolated QA data, deployed-vs-local diff (no deployed environment accessed this pass or any prior
pass this session).

No implementation should start on any of the above, or on redesign of Home/Profile/Admin, until the
user reviews this document and issues the next explicit instruction.
