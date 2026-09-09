# TajStay current state

Read this before anything else. Load only the skill matching NEXT (see `CLAUDE.md` → Skill routing).
Do not re-read old audit reports unless the task needs them. Keep this file short — DONE/OPEN/BLOCKED/
NEXT, not a diary. Detailed rationale for a fix belongs in its commit message, not here.

## Governing instruction

The user has issued a **MASTER COMMERCIALIZATION / PRODUCT COMPLETION CONTRACT** (2026-09-10):
full architecture + product + UX/UI + mobile/PWA + Owner Hotel Desk + Admin CRM + performance +
security + QA, worked as a continuous `audit → implement → runtime QA → fix → re-QA` loop across
sessions, until the product is commercially ready. This supersedes prior narrower "blocks" as the
standing authorization — do not wait for a new prompt between phases, and do not report "ready for
next narrow block." Only stop for: destructive production operations, real data-loss risk, a missing
required secret, or a legal/business call that can't be safely assumed. Session/turn limits are not a
stopping reason — bank progress via this file and continue next session.

Phase order per the contract (§93): foundation/shells/nav → consumer flows → profile/auth/
notifications/support → Owner Hotel Desk → Admin → performance/PWA/cache → full security audit →
regression/commercial QA. Currently in: **foundation + consumer flows + profile** (early, not complete).

## Branch / SHA

- Branch: `feature/tajstay-full-ui-ux-rebuild`
- Base SHA (this pass): `72f4a17`
- Final SHA (this pass): `8d6c720`
- Local dev only — nothing deployed this pass. `localhost:3000` (also briefly tested on an ad-hoc
  port 3100 mid-session while port 3000 was held by another session; closed, do not reuse the pattern
  of starting a second `npm run dev` manually — prefer waiting for the port or asking the user).
- An external tool periodically auto-commits this working tree under the user's own git identity
  (not Claude Code) — commits like `efa962f`/`aaec9c0` with generic messages are that tool, already
  verified to contain only legitimate in-flight work, not something to be alarmed by.

## DONE (this pass)

- Profile root IA dedup: merged redundant group-label-duplicates-row-title pairs (ЛИЧНЫЕ ДАННЫЕ →
  Личная информация, БЕЗОПАСНОСТЬ → Безопасность) into one "АККАУНТ" group; collapsed 4 separate
  Support rows into one row → new `/profile/support` hub page.
- Personal Information: removed Пол/Язык (no schema field for gender; language belongs in Settings)
  and "Мои отзывы" (not identity data, was nonsensical for ADMIN/OWNER accounts too).
- Real name editing: `POST /api/profile/update-name` (own-user-only, session-scoped) +
  `PersonalNameEditor` client component with edit/save/cancel/loading/error. Verified round-trip on
  `localhost:3000` logged in as seeded `guest@tajstay.local`.
- Removed 3 dead controls (phone/email/telegram "change" links pointed at sign-in or nowhere real) —
  replaced with an honest disabled "Скоро" state instead of a fake link.
- Admin donut chart black-circle bug: root cause was `AnalyticsDonut.tsx` having zero CSS anywhere in
  the repo (SVG default fill, no legend spacing) — added the missing stylesheet. Verified on
  `/dashboard/admin` mobile+desktop.
- Public header flipped to canonical green `#0F7A4D` per binding decision, with light-mode CSS
  override for Admin/Owner workspaces (`body:has(.ts-workspace-light)`) so they don't go green via
  the still-open shell-leak bug. Fixed contrast on nav/language/auth-buttons/wordmark for white-on-
  green; fixed the mobile "Войти" pill (was solid green on now-green header, invisible).
- Hero: removed eyebrow badge + subtitle + duplicate CTA, single headline → search.
- Promo banner: fixed "Tajstay" casing and an external-domain CTA link bug (both file default and
  local DB `SiteContentState` row — **production DB still has the old wrong values**, needs the same
  fix via admin CMS UI, not a direct prod write).
- Public "О сервисе" page: removed a false claim that TajStay stores encrypted passport/document
  photos — contradicted the passport architecture decision below.
- `docs/TAJSTAY_ARCHITECTURE_V2.md` §29: binding override — TajStay Cloud does not store passport
  scans/photos; hotels can export booking data; a future separate TajStay Hotel Vault product may
  handle offline local identity storage. Not implemented now, by design.
- Search field label duplication (city input) and 3 emoji icons in the search filter bar fixed
  (lucide-react MapPin/CalendarDays).

## OPEN (large, not started or partial — from the Master Contract's full scope)

- **`guestDocumentUrl` legacy passport-link feature** (`TripBookingCard.tsx`) — contradicts the V2
  §29 decision. Per the user's latest instruction this is no longer just "flag it": do a dependency
  audit (schema/API/storage/UI/reads/writes/tests) and safely disable the user-facing upload/view
  without destructive migration; backend/schema removal is a separate protected follow-up.
- Repo-wide emoji icons beyond the search bar (13+ files: `BookingWizard.tsx`, `NotificationBell.tsx`,
  `HotelCard.tsx`, `OwnerOnboardingExperience.tsx`, `OwnerOnboardingSidebar.tsx`, `GlobalToast.tsx`,
  `TstAssistant.tsx`, `PhotoPlaceholder.tsx`, `HomeSearchExtras.tsx`, `BookingChatPanel.tsx`,
  `app/page.tsx`, `app/offline/page.tsx`).
- Home search full recomposition (icon-only zones, no per-field borders, proportions).
- Auth screens (`/auth/sign-in`, register, forgot-password) — confirmed still legacy dark-emerald
  theme via screenshot, not touched yet.
- Settings page dedup (remove Security/Subscriptions/Privacy/Help/FAQ/Contact/Terms/About if
  duplicated there), language/currency single-control pattern, notification inbox vs settings split.
- TajStay Assistant visual cleanup (legacy dark-green/mint remnants) — not started.
- Mystery "black vertical panel" reported alongside the Assistant FAB — could not reproduce in this
  session's browser tool (looked like a fixed viewport-edge artifact across unrelated routes); not
  confirmed as app code, not touched.
- Cookie consent rework (Accept/Reject-non-essential/Customize, essential-vs-analytics split).
- Owner Hotel Desk, Admin deep analytics (revenue/bookings/users/hotels/complaints trend charts),
  performance/PWA/cache strategy, full security audit (§70-80 of the contract) — none started.
- Full responsive matrix (360/390/412/768/1024/1280/1440+) — only spot-checked at 2-3 breakpoints
  across all passes so far, not systematic.

## BLOCKED

- **Admin/Owner shell isolation** (Consumer Header/Footer/MobileBottomNav rendering on
  `/dashboard/admin` and `/dashboard/owner`). Two attempted fixes this branch's history both broke
  the dev server and were reverted: (1) a `"use client"` wrapper passing async Server Components as
  props — broke webpack module resolution; (2) a second attempt (see commit `d076570` revert) — also
  failed, reasons captured in that revert commit's message. Currently mitigated only by a CSS
  override that keeps the header light-colored on those routes — the wrong nav items still render
  there. The user has explicitly rejected a CSS-hide-only fix as the final answer: the next attempt
  must fix it at route/layout composition level (e.g. Next.js route groups splitting public vs
  admin/owner layouts, or a verified-safe Server Component pathname pattern), not global CSS.
- **Production `site-content` values** (banner casing/URL) — only local dev DB fixed; production
  needs the same fix via the admin CMS UI, not a direct prod DB write from a session.
- **Passport/identity backend removal** — architecture decision is written (V2 §29), but the actual
  `guestDocumentUrl` schema/storage cleanup needs its own dependency audit first (see OPEN) and any
  destructive part needs a separate authorized block.

## NEXT

Continue the Master Contract's phase order. Suggested immediate priorities: (1) shell isolation via
route groups (highest-leverage architecture fix, referenced by multiple other OPEN items), (2)
`guestDocumentUrl` dependency audit + safe disable, (3) Auth screen redesign, (4) Settings dedup,
(5) repo-wide emoji sweep, (6) Admin analytics real charts (revenue/bookings/users trends). Do not
stop after a handful of fixes and report back prematurely — this file plus each commit message is the
continuity mechanism across sessions/turns.
