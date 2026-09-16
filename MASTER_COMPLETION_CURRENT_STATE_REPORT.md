# TajStay MASTER COMPLETION BLOCK — Current State Report

Full honest status against the master scope, as requested: every area is marked PASS, PARTIAL,
BLOCKED, or **UNVERIFIED** — UNVERIFIED means genuinely not yet touched in this pass, not assumed
fine. Nothing below is rounded up.

## PHASE A — Home/PWA 7.0

| Item | Status | Evidence |
|---|---|---|
| Home mobile meaningless-scroll fix | **PASS (local emulator only)** | `min-h-screen`→`min-h-dvh` in `layout.tsx` + `globals.css`; 0px scroll range measured at 360/375/390/430; 320 has genuine content overflow (expected). **Not yet confirmed on your real phone** — an emulator cannot reproduce the real mobile-browser-chrome-collapse bug this was root-caused from, so per your own rule this stays open until you personally check it on-device after deployment. |
| Search icon system (City/Check-in/Check-out/Guests) | **PASS (local)** | All 4 fields have matching lucide icons, mobile + desktop, verified via DOM query and screenshot. |
| Date input mobile legibility | **PASS (local)** | Checked via computed style — was already correct, no fix needed. |
| New TajStay app icon / PWA pipeline | **BLOCKED** | Source asset never reached this session — re-checked again, still nothing on disk or attached. Full pipeline audit done and ready to execute the moment the file arrives (icon.png, apple-icon.png, manifest icons, maskable variants, versioned filenames for cache-busting). **Old dark-green square icon is still what installs today.** |

## PHASE B — Profile (in progress, NOT complete)

| Item | Status | Evidence |
|---|---|---|
| Legal section added to Profile hub | **PASS (local)** | New `/profile/legal`, real Privacy/Terms links, screenshot. |
| Settings cleanup (removed duplicate Security, fake language row, false "Dark" theme claim, fake "TJS" currency claim, mixed-in Privacy/FAQ, fake version row) | **PASS (local)** for the removal. Theme/Currency selectors themselves are **BLOCKED PENDING ARCHITECTURE DECISION** (no dark-mode CSS coverage exists; no FX-rate/rounding rule exists) — not built, correctly not built. |
| Notification Preferences (real backend, replacing the old localStorage-only fake toggle matrix) | **PASS (local)** | New Prisma model + migration, real API, real enforcement in `createNotification`, proven via direct Postgres query after toggling, not just UI. "Promotions" category intentionally not exposed — no sending mechanism exists yet. |
| Personal page dead-end navigation (Phone/Email/Telegram unreachable) | **PASS (local)** | Now real links, verified click-through. |
| False "SMS code" claim on Phone page | **PASS (local)** | Was actively describing a non-existent SMS flow this project explicitly forbids inventing; corrected to an honest "coming soon" string, all 3 locales. |
| Photo upload | **UNVERIFIED — not started.** `ProfileAvatar` is confirmed display-only, zero upload capability exists. |
| Name/surname edit (`PersonalNameEditor`) | **UNVERIFIED** — component exists and looked real on inspection, but not re-driven end-to-end (save/validation/persistence/error state) this pass. |
| Email change flow (5-min TTL code, survives app-switch) | **UNVERIFIED / confirmed not built** — `/profile/email` is a self-labeled "Coming soon" page; the actual verification-code system does not exist. |
| Telegram re-link flow + the previously-reported false-expired-on-first-attempt bug | **UNVERIFIED** — not investigated this pass. |
| Phone change cooldown policy | **UNVERIFIED / confirmed not designed** — no existing configurable value found; not invented. |
| Security section (active sessions list, known-password change, forgot-password via Email/Telegram) | **UNVERIFIED — not started this pass.** |
| Support ticket system (Problem/Suggestion categories, real submission, Admin queue) | **UNVERIFIED — not started.** Confirmed the current `/profile/support` is only 4 static links (FAQ/Contacts/Policy/Terms); the actual ticket system does not exist anywhere. |
| Logout button visual weight | **UNVERIFIED** — not checked against spec ("compact, not a huge destructive card") this pass. |

## PHASE C through K — Owner application, Support/Complaints architecture, Disputes, Chat, Reviews,
Owner Panel, Admin (Applications/Moderation/Users/Owner Access/Notifications/Dashboard/Content/
Settings/IA), full Search/Hotel/Booking regression, Security master pass, i18n master pass,
human-like E2E, visual QA at all breakpoints

**ALL UNVERIFIED — not started in this pass.** Explicitly not claiming any of these PASS. This
includes every item from your own production screenshots not already covered above:

- Admin KPI density/truncated legends ("одоб...", "ожид...") — **UNVERIFIED**, not touched since the
  ADMIN 6.1B shell-correction pass. The shell/header/whitespace/notification fixes from that pass
  are the only Admin work done; the Dashboard/Analytics visual rebuild itself has not started.
- Admin production Notifications 500 — **UNVERIFIED on production.** Defensive ICU fallback shipped
  locally; the actual production exception was never obtained (no log access from this
  environment) and no confirmation has come back that a redeployed build resolved it for real.
- Admin Bookings → Disputes IA change — **UNVERIFIED**, not started.
- Complaints/Support separation in Admin — **UNVERIFIED**, not started (depends on the Support
  ticket system above existing first).
- Chat real runtime closure — **UNVERIFIED**, not re-driven this pass.
- Reviews real runtime closure — **UNVERIFIED**, not re-driven this pass.
- Owner Dashboard/mobile, Owner room/category UX — **UNVERIFIED**, not touched.
- Currency display across Search/Hotel/Room/Booking/History — **BLOCKED**, same architecture-
  decision reason as the Settings currency row.

## What IS proven, with real evidence, right now

Everything marked PASS (local) above was: implemented, opened in a real browser session with a
real authenticated account, exercised through the actual UI (not typed URLs bypassing navigation),
and where a backend claim was made, independently confirmed via a direct Postgres query — not
inferred from the UI alone. `tsc`, `eslint`, and `next build` all pass on the current working tree.

## What is explicitly NOT proven

Nothing above PHASE B has been touched. Every real-device mobile claim (Home scroll, PWA icon,
Admin mobile density) is local-emulator-only until you check it on your own phone against the
actual deployment, exactly as your new acceptance rule requires. No visual QA pass at the full
320/360/375/390/430/1280/1440/1920 matrix has been run against the current build for any of these
screens except the two narrow items called out above.

## Files changed this session (cumulative, PHASE A + B work only)

```
Modified: prisma/schema.prisma, src/app/globals.css, src/app/layout.tsx,
          src/app/profile/personal/page.tsx, src/app/profile/settings/page.tsx,
          src/app/profile/subscriptions/page.tsx, src/components/SearchBar.tsx,
          src/components/home/HomeSearchCompact.tsx, src/components/profile/ProfileMockupView.tsx,
          src/lib/i18n/messages.ts, src/lib/notifications/create.ts,
          src/styles/premium-overhaul.css, src/styles/profile-center.css
Deleted:  src/components/profile/SubscriptionsPrefsClient.tsx
Created:  prisma/migrations/20260916120000_add_notification_preference/migration.sql,
          scripts/test-block7-home-search.ts,
          src/app/api/profile/notification-preferences/route.ts, src/app/profile/legal/page.tsx,
          src/components/profile/NotificationPreferencesClient.tsx,
          src/lib/notifications/preferences.ts
```

No Admin/Owner/booking/payment/auth/chat file touched in this Profile-focused pass beyond what was
already in the working tree from the prior ADMIN 6.1B session.

Ready for your point-by-point comparison against the screenshot-defect list and the master scope.
