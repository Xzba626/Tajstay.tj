# TajStay MASTER COMPLETION BLOCK — Progress checkpoint (PHASE A closed except one external blocker, PHASE B in progress)

This is a checkpoint report, not a final one — the master block spans 11 phases; this covers what
has been implemented and verified so far. Work continues into the rest of PHASE B next.

## PHASE A STATUS — PASS except one item genuinely blocked on missing input

- Home `min-h-screen` → `min-h-dvh` (real device scroll bug): **PASS**, verified in the previous
  turn (0px scroll range at 360/375/390/430, real content overflow at 320 which is expected).
- Search icon system (City/Check-in/Check-out/Guests, mobile + desktop): **PASS**, verified.
- App icon pipeline: **BLOCKED** — the new source asset still has not reached this session (no
  attachment, nothing new on disk, re-checked again this pass). Everything else in PHASE A does not
  depend on this, so it did not block moving to PHASE B, per the "continue independent work" rule.

## PHASE B STATUS — IN PROGRESS (real defects found and fixed, more remaining)

### B.1 — Profile hub structure: EXPECTED vs ACTUAL, fixed

```
EXPECTED       = Личные данные / Безопасность / Настройки / Уведомления / Поддержка /
                 Юридические документы / Выйти (+ Стать владельцем if not owner)
ACTUAL BEFORE  = Same list minus "Юридические документы" entirely — it did not exist anywhere in
                 Profile; Privacy/Terms were only reachable buried inside Settings, mixed with
                 unrelated app settings.
ROOT CAUSE     = Never built as its own section.
FILES          = src/app/profile/legal/page.tsx (new), src/components/profile/ProfileMockupView.tsx
DB             = none required
BACKEND        = none required — reuses existing live /policy, /terms content
FRONTEND       = new ProfileSubpageShell-based page, hub row added between Support and the
                 "Стать владельцем" promo/Logout
AUTHORIZATION  = requireUser(["GUEST","OWNER","ADMIN"]), same gate as every other profile subpage
I18N           = new `profile.legal` key, RU/TG/EN
MOBILE         = verified live at 390×844 (screenshot)
DESKTOP        = not re-verified this pass (no layout risk — reuses existing shell component)
TEST           = manual click-through this pass; no automated test added yet
BUILD          = PASS (next build, exit 0)
LOCAL RUNTIME  = PASS — real guest session, real click-through, screenshot evidence
DEPLOYED       = not deployed
REAL PRODUCTION RUNTIME = PENDING OWNER DEPLOYMENT (same access limitation as prior blocks)
EVIDENCE       = screenshot: hub shows "Юридические документы / Политика конфиденциальности" row
STATUS         = PASS (local)
```

### B.2 — Settings page: real defects found and removed, not cosmetic

```
EXPECTED       = Only real Settings: one language selector; no duplicate Security; no fake
                 Theme/Currency; no Privacy/Support mixed in; no "app version" row
ACTUAL BEFORE  = Duplicate Security row; a static language row duplicating the interactive
                 selector directly above it; a Theme row hardcoded to display "Тёмная"/"Dark" as
                 the CURRENT theme while the app always renders data-theme="light" (a literal lie
                 in the UI, confirmed by reading src/app/layout.tsx); a Currency row hardcoded to
                 "TJS" with zero conversion logic anywhere in the codebase (grepped, confirmed
                 absent); Privacy/FAQ/Contacts/Terms duplicated here AND in Support; a static
                 "v1.0.0" app-version row with no real build-info source.
ROOT CAUSE     = Settings page accumulated decorative rows over time without a real backend/
                 architecture behind Theme, Currency, or the version string.
FILES          = src/app/profile/settings/page.tsx
DB             = none
BACKEND        = none (this is a removal of fake UI, not a new feature)
FRONTEND       = rewritten, now only the real language selector
AUTHORIZATION  = unchanged
I18N           = no new leaks; nothing new to translate (rows removed, not added)
MOBILE         = verified live
DESKTOP        = not touched, no layout risk
TEST           = manual
BUILD          = PASS
LOCAL RUNTIME  = PASS
DEPLOYED       = not deployed
REAL PRODUCTION RUNTIME = PENDING OWNER DEPLOYMENT
EVIDENCE       = code diff removing 6 named defects, tsc/eslint clean
STATUS         = PASS (local) for the removal; Theme and Currency themselves are explicitly
                 BLOCKED PENDING ARCHITECTURE DECISION — not silently dropped, see below.
```

**BLOCKED — architecture decisions genuinely not made yet, not invented here:**
- **Theme (System/Light/Dark)**: real dark-mode CSS coverage does not exist (only ~11
  `data-theme="dark"` selectors in the entire stylesheet, vs. thousands of light-mode-only rules).
  Shipping a selector without the CSS behind it would let a user pick "Dark" and get a broken,
  half-themed app — worse than no selector. This needs its own dedicated Dark Mode CSS pass across
  the whole product (public, Admin, Owner, chat, booking wizard) before a toggle can be honest.
- **Currency (TJS/RUB/USD)**: no FX-rate source, refresh cadence, rounding rule, or canonical-vs-
  display price separation exists anywhere in this codebase. Per the master block's own §0 rule
  ("не выдумывать молча" business rules), I am not inventing one. This needs an explicit decision
  from you: which FX source, how often it refreshes, and the rounding rule — then it's a real,
  scoped implementation, not a guess.

### B.3 — Notification Preferences: real feature built end-to-end (not the fake one it replaced)

```
EXPECTED       = Profile → Уведомления as its own section; real categories (Security/login,
                 Booking status); a promotion a user dismissed must not repeat.
ACTUAL BEFORE  = /profile/subscriptions rendered SubscriptionsPrefsClient — six "topics" and three
                 "channels" (including SMS, which does not exist in this project) that only wrote
                 to localStorage. Toggling ANY of them had zero server-side effect — confirmed by
                 reading the component (no fetch/API call anywhere in it) and by grepping the whole
                 backend for any code that reads localStorage-shaped preferences (none exists).
                 Separately, the Profile hub's "Настройки уведомлений" row linked to /notifications
                 — the notification INBOX, not a settings page at all — a second, different defect
                 (wrong destination, not just a fake destination).
ROOT CAUSE     = No NotificationPreference data model ever existed; the hub link was wired to the
                 wrong route.
FILES          = prisma/schema.prisma, prisma/migrations/20260916120000_add_notification_preference/
                 migration.sql, src/lib/notifications/preferences.ts (new),
                 src/lib/notifications/create.ts, src/app/api/profile/notification-preferences/
                 route.ts (new), src/app/profile/subscriptions/page.tsx (rewritten),
                 src/components/profile/NotificationPreferencesClient.tsx (new, replaces the
                 deleted SubscriptionsPrefsClient.tsx), src/components/profile/ProfileMockupView.tsx
                 (hub link fixed), src/styles/profile-center.css (missing label/hint CSS added —
                 found live: label and hint text ran together with no spacing until fixed)
DB             = New table `NotificationPreference` (userId unique, security boolean, bookingUpdates
                 boolean, updatedAt) — additive only, no existing table altered, no data at risk.
                 Migration applied locally via `prisma migrate deploy` (the same command this
                 project's own Vercel build uses), not `db push` — a real, reviewable migration
                 file exists for production too.
BACKEND        = GET/POST /api/profile/notification-preferences, upsert on POST, real 401 on no
                 session, real 400 on malformed body (verified: only accepts boolean fields).
                 createNotification() now checks the preference before sending a PUSH notification
                 (not before creating the in-app Notification row — that always happens, so a user
                 can never fully erase security-relevant history from their own inbox by muting
                 push for that category — a deliberate, documented safety choice).
FRONTEND       = Real optimistic-update toggle component with rollback-on-failure and a visible
                 error message on save failure — not a silent no-op fake toggle.
AUTHORIZATION  = getSessionUser() gate in the API route; requireUser() gate on the page; a user can
                 only ever read/write their OWN preference row (userId comes from the session, never
                 from client input).
I18N           = 7 new keys × 3 locales (RU/TG/EN), all real per-locale text, not copy-paste
                 (confirmed distinct via the earlier test script's own "not all identical" check
                 pattern from the ADMIN 6.1B pass — same discipline applied here).
MOBILE         = verified live at 390×844: toggle renders, label+hint stack correctly after the
                 CSS fix, Push channel row shows the real browser-permission state
                 ("Разрешите уведомления в настройках браузера" — genuine PushSubscribeButton
                 behavior, not fabricated for the screenshot).
DESKTOP        = not re-verified this pass (component is responsive by inheritance, low risk;
                 flagged rather than silently assumed).
TEST           = No automated test added yet for this specific feature — flagged as a gap for the
                 next pass, not hidden.
BUILD          = PASS (next build, exit 0, /profile/subscriptions and the new API route both
                 compiled)
LOCAL RUNTIME  = PASS, with real end-to-end proof, not just "renders":
                 1. POST to the real API with {security:true, bookingUpdates:false} → 200 response
                    echoing the saved values.
                 2. Queried Postgres directly afterward: `NotificationPreference` row exists with
                    exactly those values persisted.
                 3. Reloaded the page (fresh server render, not client cache) → the checkbox for
                    "Статус бронирований" came back unchecked, matching the DB row — proving the
                    page actually reads the persisted preference on load, not just optimistic
                    client state.
                 4. Cleaned up the test row and diagnostic session afterward.
DEPLOYED       = not deployed
REAL PRODUCTION RUNTIME = PENDING OWNER DEPLOYMENT
EVIDENCE       = API response bodies, direct Postgres query output, before/after screenshots
                 (all captured this pass, described above)
STATUS         = PASS (local, real backend-to-frontend round trip proven)
```

**Deliberately NOT included, and why (not an oversight):** a "Promotions" category. No promotional-
notification sending mechanism exists anywhere in this codebase yet — showing a toggle for a
feature that cannot yet fire anything would itself be the exact "decorative control" this block
requires eliminating. This is the correct place to build it once Owner-assigned discounts + a
Favorites-triggered nudge (both still unbuilt, per §8 of the master spec) actually exist — not
before.

## Static gates (this pass)

```
npx tsc --noEmit           → PASS (zero errors)
npx eslint <all touched>   → PASS (zero errors/warnings)
npm run build (next build) → PASS, exit code 0
prisma migrate deploy      → PASS, 1 new migration applied cleanly, no drift-related statement included
```

### B.4 — Personal page: dead-end navigation fixed, one actively-misleading string fixed

```
EXPECTED       = Phone/Email/Telegram rows on /profile/personal are reachable and lead somewhere
                 real (even a "coming soon" state is fine — a dead end is not).
ACTUAL BEFORE  = All three rows were plain <div>s with no <Link> anywhere near them — confirmed by
                 reading the file; the /profile/phone, /profile/email, /profile/telegram routes
                 existed but were unreachable from normal navigation.
ROOT CAUSE     = Rows were built as static InfoRow display components, never wired to the
                 subpages that already existed for them.
FILES          = src/app/profile/personal/page.tsx, src/styles/profile-center.css (new
                 --link/__chevron rules)
STATUS         = PASS (local) — verified live: clicking each row navigates to its real subpage.
```

**Separately found while verifying this: an actively misleading string, not just an unreachable
route.** `/profile/phone`'s hint text read *"Изменение номера через подтверждение SMS-кодом при
входе"* ("Number change via SMS code confirmation at login") in all three locales — describing an
SMS verification flow that **does not exist anywhere in this codebase** and that this master
block's own §0 explicitly forbids inventing. This wasn't a "coming soon" placeholder — it was a
concrete, false claim about how the feature will work. Fixed to a locale-correct, honest "coming
soon from your profile" string in RU/TG/EN, with no invented mechanism.

```
STATUS = PASS (local) — verified live, screenshot shows the corrected string, no SMS reference
         anywhere in Personal/Phone/Email/Telegram pages.
```

## What's still open in PHASE B (continuing next, not stopping here)

- Personal data (`/profile/personal`): navigation dead-end and the false SMS claim are now fixed
  (see B.4). Still open: photo upload (currently zero upload capability — ProfileAvatar is
  display-only), name/surname edit already exists and was not touched (PersonalNameEditor appears
  real, not yet re-verified end-to-end this pass), the actual email-change flow (real 5-minute TTL
  code + external-app-switch persistence — /profile/email is honestly self-labeled "Coming soon",
  the flow does not exist yet), Telegram re-link flow (including the previously-reported
  first-attempt-false-expired bug — not yet investigated this pass), phone cooldown policy (not
  yet designed — no existing configurable value found).
- Security (`/profile/security`): active sessions list with real revoke, known-password change
  flow, forgot-password via Email/Telegram (not SMS).
- Support (`/profile/support`): currently just four static links (FAQ/Contacts/Policy/Terms) — the
  actual ticket-submission system (Problem/Suggestion categories, subject, description, attachment,
  Admin-side "Обращения" queue) does not exist yet. This is a real, separate vertical slice, same
  size as the Notification Preferences work just finished.
- Logout control visual weight (spec asked for "compact modern button, not a huge destructive
  card") — not yet checked against the current `ProfileLogoutConfirm` component.

None of these are silently dropped — they're the explicit next steps.
