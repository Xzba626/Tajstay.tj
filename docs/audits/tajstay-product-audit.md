# TajStay — Phase 1: Human Product + UX + Visual Forensic Audit

**Mode:** READ-ONLY AUDIT (no code changes made)  
**Audit date:** 2026-08-29  
**Repository commit:** `4ebda0c8ffc82c7bd9790a333a52ce146510536a` (`4ebda0c` — Merge pull request #83 cleanup-project)  
**Environment:** Local dev `http://localhost:3000` (PostgreSQL + `npm run doctor` seed)  
**Primary viewport:** 390×844 (also 360/768/1280 spot-checks)  
**Evidence:** `/opt/cursor/artifacts/audit-screenshots/` (referenced below)

---

## Executive Summary

TajStay has a **coherent visual identity** (dark emerald premium shell, consistent bottom nav, working core traveler paths) and a **surprisingly deep owner/admin backend** for an early product. However, it does **not yet feel commercially ready** as a travel marketplace: missing photography everywhere, several production-config leaks, localization gaps, cookie-banner friction, and owner/admin surfaces that read like internal tools rather than products for non-technical users.

The product is best described as: **strong engineering foundation + premium skin + incomplete commercial polish + heavy owner onboarding**.

### Pre-flight status

| Check | Status | Notes |
|-------|--------|-------|
| `/setup` → `.better-web-ui.md` | **BLOCKED** | File not present; no `/setup` skill/script found in repo or agent environment |
| Playwright MCP in Cursor | **BLOCKER** | Not registered in dynamic tool namespaces. Audit used **real browser** via Playwright CLI (headless Chromium) + `computerUse` agents — not JSX simulation |
| App running | **PASS** | `npm run dev` on `:3000`, routes return 200 |
| Console/runtime errors | **PARTIAL** | React RSC warnings in dev logs; Telegram env warning rendered to users on `/auth/sign-in` |
| Commit pinned | **PASS** | See header |

---

## Overall Scores (0–10)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Clarity** | 6 | Core tabs understandable; owner/admin & booking steps less so |
| **Effort** | 7 | Search is OK; owner onboarding & calendar are high-effort |
| **Visual quality** | 6 | Consistent theme; undermined by empty photos, dense tables, mixed typography |
| **Trust** | 5 | Dev errors on login, no photos, verification warnings on profile |
| **Mobile UX** | 6 | Bottom nav works; cookie banner + grids harm touch UX |
| **Commercial readiness** | 5 | Feels like beta: tours placeholder, missing images, i18n/metadata gaps |

---

## Top 10 Product Problems

| # | ID | Sev | Problem | Route / area |
|---|-----|-----|---------|--------------|
| 1 | UX-001 | P1 | Cookie consent overlays block bottom nav, TST FAB, and social login taps | Global mobile |
| 2 | UI-002 | P1 | All hotel/room cards show **«Нет фото»** — destroys premium/trust perception | `/search`, `/hotel/[id]` |
| 3 | I18N-001 | P1 | `?lang=en` / `?lang=tg` query params **do not switch UI**; locale only via cookie API | Global |
| 4 | UX-003 | P1 | Telegram misconfiguration message shown to end users on login | `/auth/sign-in` |
| 5 | OWNER-001 | P1 | Owner application wizard shows false validation on City field; blocks progression | `/profile/become-owner` |
| 6 | OWNER-002 | P1 | Owner mobile dashboard repeats payment-methods form atop every section | `/dashboard/owner` |
| 7 | OWNER-003 | P1 | Occupancy grid unreadable on 390px — cannot answer “what’s free today?” quickly | Owner calendar |
| 8 | ADMIN-001 | P1 | Admin home is onboarding copy + raw KPIs, not an operational command center | `/dashboard/admin` |
| 9 | NAV-001 | P2 | Bottom nav highlights **History** during `/booking` flow (misleading context) | Booking |
| 10 | BOOKING-001 | P2 | Date inputs use `mm/dd/yyyy` on Russian UI — locale mismatch | `/booking` |

---

## Mobile Experience

**What works**
- Bottom nav (Home · Search · Tours · History · Profile) is visible, labeled, and switches routes.
- Home hero + inline search card communicate primary action on first screen (`01-home.png`).
- TST FAB is discoverable with tooltip «Нужна помощь с выбором отеля?».

**What fails**
- Cookie banner sits above bottom nav and intercepts taps on TST FAB (Playwright click failure log; `01-home.png`, `06-sign-in.png`).
- History tabs overflow horizontally; «Прошедшие» truncated (`25-history-auth.png`).
- Owner/admin mobile collapse navigation into «Разделы панели» dropdown — high cognitive load.
- Occupancy matrix requires horizontal scroll with tiny cells (`42-owner-calendar.png`).

**Scores (mobile traveler core):** Clarity 7 · Effort 6 · Visual 6 · Trust 5 · Mobile UX 6 · Commercial 5

---

## Traveler Experience

### Home `/`
- **First 5 seconds:** Brand, headline «Найди идеальное жильё», search card — **clear**.
- Trust bullets present but below fold on mobile.
- TST promo competes with search; acceptable but busy.
- **Good:** destination cards, premium gradient, single primary CTA (Поиск).

### Profile `/profile` (authenticated guest)
- Stats row, verification warnings (email/phone) reduce trust if left unresolved (`27-profile-auth.png`).
- Favorites accessible from profile (not bottom nav — by design per product map).
- «Сдавайте жильё» CTA present at bottom — good cross-sell.

### History `/history`
- Tabs: Подтверждённые · Неподтверждённые · Прошедшие · Отменённые · Все — **correct hub**.
- Seed guest booking appears under **Прошедшие (1)**, not Подтверждённые — logically correct per `classify.ts` but may confuse users expecting “confirmed trip” in first tab (`25-history-auth.png`).
- Empty state copy is clear; support link provided.

### Tours `/tours`
- Placeholder catalog with category tiles + «Каталог скоро расширится» (`03-tours.png`).
- **Commercial readiness:** honest placeholder, not fake inventory — good integrity, weak product breadth.

### Favorites `/favorites`
- Accessible when authenticated; empty state shown (`16-favorites.png`).

---

## Search

**Scenario:** Find stay in Dushanbe for 2 guests.

| Step | Action |
|------|--------|
| 1 | Open Search (bottom nav) OR use home search card |
| 2 | Enter city / pick destination |
| 3 | (Optional) Set dates, guests |
| 4 | Tap Поиск |
| 5 | Scan results |

**Minimum useful result:** **2 taps** (Search tab → scroll results) if defaults acceptable; **4–5 actions** with city + dates + guests.

**Removable friction (recommendations only)**
- Merge map CTA with results header.
- Remember last city/dates in session.
- Show result count + first result above fold without scroll (`02-search.png` shows count but cards start below cookie banner).

**States observed**
- Results: 6 hotels with ratings/prices (`15-search-dushanbe.png`).
- Loading: skeleton on slow routes (`45-owner-apply-step0.png` pattern).
- Empty/error: not fully exercised — **UNKNOWN** for no-results API state.

**Scores:** Clarity 7 · Effort 6 · Visual 5 (no photos) · Trust 5 · Mobile 6 · Commercial 5

---

## Property Experience

**Route:** `/hotel/1` (`17-hotel-page.png`)

### First 5 seconds — expected vs actual

| Expected | Actual |
|----------|--------|
| Hero photo | **Dark placeholder «Нет фото»** |
| Name + city | ✓ TajStay Dushanbe Premium, Rudaki Ave |
| Price signal | ✓ 550–820 TJS |
| Rating | ✓ 4.8 |
| Primary CTA | ✓ «Забронировать» per room |

**Missing for commercial parity:** real photography, map, review snippets, policies, gallery, date picker on property page.

**Issues**
- UI-002 (P1): no photos
- I18N-002 (P2): amenity tag `view` untranslated on Family Suite
- UI-003 (P2): «ACCEPTED PAYMENT METHODS» English heading on RU page
- UI-004 (P3): «1 номера» grammar (should be «1 номер»)

**Scores:** Clarity 6 · Effort 5 · Visual 4 · Trust 4 · Mobile 6 · Commercial 4

---

## Booking

**Route:** `/booking?hotelId=1&roomId=1` (`26-booking.png`)

**Steps:** 3-step wizard (Данные → Оплата → Подтверждение).

**Observed**
- Pre-filled account block — good.
- Date inputs `mm/dd/yyyy` on Russian UI (BOOKING-001).
- TST bubble overlaps phone field (UX-004 P2).
- Bottom nav shows History as active — misleading (NAV-001).
- Payment / confirmation steps not fully completed in audit — **partial UNKNOWN**.

**Scores:** Clarity 6 · Effort 6 · Visual 6 · Trust 6 · Mobile 5 · Commercial 5

---

## Owner Onboarding

**Route:** `/profile/become-owner` (guest) · `/apply/owner` redirects here.

### Step inventory (mobile wizard)

| Step | Title | Required inputs | Purpose understood? | Deferrable? |
|------|-------|-----------------|---------------------|-------------|
| 1 | Личные данные | ФИО, телефон, email, город, тип заявителя | Mostly yes | Partial (city could default) |
| 2 | Объект | Название, адрес, тип, optional counts/description | Yes | Some optional fields |
| 3 | Документы | ID, фасад, номер, санузел (+ optional back/selfie/property doc) | Partially — heavy | Some docs could be post-approval |
| 4 | Отправка | Consent checkbox | Yes | No |

### Counts

| Metric | Value |
|--------|-------|
| **TOTAL STEPS** | 4 |
| **TOTAL REQUIRED FIELDS** | 10 text/select + 1 consent |
| **TOTAL REQUIRED DOCUMENTS** | 4 uploads (identity, facade, room, bathroom) |
| **ESTIMATED COGNITIVE LOAD** | **HIGH** (approaching **EXTREME** on mobile with photo capture) |

### Critical findings

**OWNER-001 (P1)** — City field shows «Заполните обязательное поле» while filled «Душанбе»; wizard does not advance (`46-become-owner-step2.png`).

**OWNER-004 (P2)** — Long marketing scroll before form; partner value props good but delay time-to-action.

**OWNER-005 (P2)** — Re-entry of phone/email already in profile.

**OWNER-006 (P3)** — No map picker for property location; address text only.

---

## Owner Dashboard

**Route:** `/dashboard/owner` (seed owner, approved)

### Sections exercised
overview · properties · rooms · bookings · calendar · statistics

### Can a non-PMS user understand it?

**Partially.** Help tips and Russian copy help, but:
- Payment methods editor pinned at top of every mobile section (OWNER-002).
- Rooms list is long scroll of similar cards with «нет фото» (`42-owner-rooms.png`).
- Terminology mixes «категории», «номера», «объекты» — PMS-like.

### Database-like concepts exposed
- Room type vs physical room assignment
- Offline bookings vs online
- Date override grid with legend colors
- Raw TJS amounts without charts

### Room creation flow (from UI)
- Entry: «Добавить номер» at bottom of rooms section.
- Accordion sections: «Общая информация», «Описание и удобства».
- Filters: search + dropdowns — feels like admin table.
- **Screens:** multi-section single page + edit — **UNKNOWN** full create completion (not submitted in audit).

**Why complex:** many fields, photo upload, category system, no bulk import, no templates.

**Scores:** Clarity 5 · Effort 8 · Visual 5 · Trust 6 · Mobile 4 · Commercial 4

---

## Occupancy / Availability

**Question:** «Какие номера свободны сегодня?»

| Viewport | Answer speed | UX |
|----------|--------------|-----|
| Desktop | Moderate | Grid visible with legend |
| Mobile 390px | **Poor** | Horizontal scroll, tiny cells, skims 30 days (`42-owner-calendar.png`) |

**OWNER-003 (P1):** Occupancy matrix is UX debt for mobile owners.

**Recommendation direction:** Today/tomorrow summary cards + per-property vacancy counts before matrix.

---

## Admin Dashboard

**Routes:** `/dashboard/admin?section=*`

### Desktop (`53-admin-desktop.png`)
- Left sidebar IA is clear: Dashboard, Content, Applications, Hotels, Users, Owner access, Bookings, Finance, Complaints, Notifications.
- Main dashboard shows 3 instructional cards + 4 KPI tiles (hotels, users, bookings, 30-day turnover).
- **Does not answer:** what needs attention *right now* (pending applications count not prominent), what changed, alert feed.

### Mobile (`52-admin-dashboard.png`)
- Same instructional content; section switching via dropdown — tables not audited in detail on mobile — **partial UNKNOWN**.

**ADMIN-001 (P1):** Operational situational awareness weak.  
**ADMIN-002 (P2):** Mixed RU/EN («Finance» in sidebar).  
**ADMIN-003 (P2):** Analytics = raw numbers only; no trend, no segmentation.

**Scores:** Clarity 6 · Effort 7 · Visual 6 · Trust 7 · Mobile 5 · Commercial 5

---

## Analytics

| Area | Exists | Useful? | Notes |
|------|--------|---------|-------|
| Admin KPI tiles | Yes | Medium | Snapshot only |
| Admin charts | No | — | Would be decorative without time series data |
| Owner statistics section | Yes | Low–medium | Raw figures; not audited as charts |
| Owner calendar occupancy | Yes | High for ops | Poor mobile presentation |

**Decorative if added without action:** generic line charts of total users; pie charts of property types.

**Useful if added:** pending applications aging, unpaid bookings, conversion funnel search→book.

---

## AI / TST Assistant

**Evidence:** `31-tst-open.png`

### Closed state
- FAB + tooltip on most traveler routes; hidden on `/dashboard/admin|owner` (correct).

### Discovery
- Good: tooltip + Home integration.
- Risk: opens into **full-panel takeover** of home viewport.

### Opening
- Panel with suggestions: Подобрать отель, Найти по бюджету, etc.
- Input: «Напишите, что вам нужно…»

### Screen blocking
- **High** on mobile when open — essentially alternate home screen.

### Exit
- Backdrop labeled «Закрыть» exists; Playwright had difficulty clicking due to panel scroll intercept — **AI-001 (P2)** exit affordance unclear on small screens.
- Escape / browser back — **UNKNOWN** (not fully exercised).

### Content
- Suggestions relevant to search/booking.
- Page context parsing exists in code (`tstContext.ts`) — depth not fully tested in chat.

### Re-entry
- **UNKNOWN** — session persistence not fully tested.

### Floating assistant recommendations (future, not implementation)
- Reduce to bottom sheet 60% height, not full replacement of home.
- Persist last thread; don’t block cookie/nav interactions.
- Context chip showing current hotel/search.

**Scores:** Clarity 7 · Effort 5 · Visual 7 · Trust 6 · Mobile 5 · Commercial 6

---

## Navigation

**Canonical bottom nav (actual):** Home · Search · Tours · History · Profile — matches `app-navigation.ts`.

| Item | Notes |
|------|-------|
| Favorites | `/favorites` — via Profile, not tab (intentional) |
| `/apply/owner` | Redirects to `/profile/become-owner` |
| `/dashboard/bookings` | Legacy — should redirect to `/history` (not re-tested) |
| Unauthorized `/history` | Redirects to sign-in with `next=` (`04-history-guest.png`) |
| Auth dashboards | Hide bottom shell — correct |

**NAV-001 (P2):** Active tab detection includes `/booking` in history matcher — confusing during checkout.

**NAV-002 (P3):** Header «Войти» remains on auth page.

---

## Localization (ru / tg / en)

| Test | Result |
|------|--------|
| Cookie `tajstay_locale=tg` via `POST /api/locale` | ✓ Tajik headline «Манзили идеалии худро пайдо кунед» (`64-home-tg-cookie.png`) |
| Cookie `en` | ✓ «Find your perfect stay» (`64-home-en-cookie.png`) |
| `?lang=en` query | ✗ Still Russian (`62-home-en.png`) |
| Search page `<title>` | Hardcoded Russian regardless of locale (`search/page.tsx`) |
| Bottom nav with EN cookie | Partial — hero translates, some nav labels remain RU in samples |

**I18N-001 (P1):** URL `lang` param ignored — breaks shareable localized links.  
**I18N-003 (P2):** Metadata/titles not localized.  
**I18N-004 (P2):** Mixed EN strings in RU UI (payment methods heading, Finance menu).

---

## Visual Design

### Hierarchy
- Strong primary buttons (emerald). Secondary actions sometimes equal weight (outlined «Подробнее» vs «Принять»).

### Typography
- Serif headlines + sans body — premium intent; occasionally inconsistent sizes between dashboard and traveler shell.

### Spacing
- Generally generous; owner mobile sections feel dense despite padding.

### Cards
- Hotel cards uniform dark blocks — without photos all cards look identical (UI-002).

### Color
- Brand green used consistently; status colors in owner grid need legend study (cognitive load).

### Motion
- Not deeply exercised — **UNKNOWN**; no jarring animations observed in static audit.

### Premium perception blockers
1. Missing photography (largest issue).
2. Dev/error strings on login.
3. Skeleton loading on slow routes without branded loader.
4. Table-heavy owner calendar on phone.
5. Placeholder copyright years (2024 vs 2026).

---

## Accessibility Findings

| ID | Sev | Finding |
|----|-----|---------|
| A11Y-001 | P2 | Cookie dialog blocks pointer events to underlying interactive elements |
| A11Y-002 | P2 | Small occupancy grid cells unlikely to meet touch target size |
| A11Y-003 | P3 | Truncated tab labels in History horizontal scroller |
| A11Y-004 | UNKNOWN | Full keyboard/screen reader pass not performed (no Playwright MCP a11y tools) |

---

## Technical UX Findings

| ID | Sev | Finding |
|----|-----|---------|
| TECH-001 | P2 | React warning: non-plain objects passed to Client Components (dev console) |
| TECH-002 | P1 | Telegram env configuration surfaced in login UI |
| TECH-003 | P2 | `mm/dd/yyyy` date format not localized |
| TECH-004 | P3 | `package.json` engines Node 24 vs `ensure-node.mjs` requiring 18–20 — setup friction |

---

## Screenshot Evidence Index

| File | Route | Viewport | Issue |
|------|-------|----------|-------|
| `06-sign-in.png` | `/auth/sign-in` | 390×844 | UX-003 Telegram error visible |
| `17-hotel-page.png` | `/hotel/1` | 390×844 | UI-002 no photos |
| `25-history-auth.png` | `/history` | 390×844 | Tabs OK; confirmed empty |
| `26-booking.png` | `/booking` | 390×844 | BOOKING-001, NAV-001 |
| `31-tst-open.png` | `/` | 390×844 | TST full-panel |
| `42-owner-calendar.png` | owner calendar | 390×844 | OWNER-003 grid |
| `46-become-owner-step2.png` | become-owner | 390×844 | OWNER-001 validation bug |
| `52-admin-dashboard.png` | admin | 390×844 | ADMIN-001 |
| `53-admin-desktop.png` | admin | 1280×800 | ADMIN IA |
| `62-home-en.png` | `/?lang=en` | 390×844 | I18N-001 failure |
| `64-home-en-cookie.png` | `/` en cookie | 390×844 | I18N success via API |

---

## Issue Backlog (classified)

### P0 — Critical blockers
*None found that completely prevent booking in seeded environment.*  
If Telegram/Google login is primary in production, misconfiguration may be **de facto P0** for auth channels.

### P1
- UX-001 Cookie banner blocks navigation/FAB
- UI-002 No property photos
- I18N-001 `lang` query ignored
- UX-003 Telegram error on login
- OWNER-001 Owner apply city validation bug
- OWNER-002 Payment form repeated on all owner sections (mobile)
- OWNER-003 Mobile occupancy grid unusable
- ADMIN-001 Admin dashboard not operational

### P2
- NAV-001 Booking flow highlights History tab
- BOOKING-001 Date format locale mismatch
- UX-004 TST overlaps booking fields
- OWNER-004 Long pre-form marketing scroll
- I18N-003 Localized metadata missing
- I18N-004 Mixed EN/RU strings
- ADMIN-002/003 Admin analytics shallow
- AI-001 TST exit/back unclear on mobile
- A11Y-001/002 Pointer/touch issues

### P3
- UI-004 Grammar «1 номера»
- NAV-002 Login button on login page
- TECH-004 Node version mismatch in tooling
- UI-005 Copyright year inconsistency

---

## Flow Scorecards

| Flow | Clarity | Effort | Visual | Trust | Mobile | Commercial |
|------|---------|--------|--------|-------|--------|------------|
| Home → Search | 7 | 6 | 6 | 6 | 7 | 6 |
| Search → Hotel | 7 | 5 | 4 | 4 | 6 | 4 |
| Hotel → Booking | 6 | 6 | 6 | 6 | 5 | 5 |
| History hub | 7 | 5 | 7 | 7 | 6 | 6 |
| Owner onboarding | 6 | 9 | 6 | 5 | 5 | 4 |
| Owner calendar | 4 | 9 | 4 | 6 | 3 | 4 |
| Admin dashboard | 6 | 7 | 6 | 7 | 5 | 5 |
| TST assistant | 7 | 5 | 7 | 6 | 5 | 6 |
| i18n tg/en | 6 | 6 | 6 | 6 | 6 | 5 |

---

## Recommended Work Waves

> Roadmap only — **not executed** in this audit.

### Wave 0 — Critical functional & trust blockers
- Fix OWNER-001 wizard validation
- Hide/suppress dev env errors on login (UX-003)
- Fix cookie banner pointer blocking (UX-001)
- Seed/upload real hotel photos for demo & prod parity (UI-002)

### Wave 1 — Design foundation
- Photo pipeline + fallback art direction
- Locale-aware dates/numbers
- Consistent metadata i18n
- Touch targets & tab overflow on History

### Wave 2 — Traveler UX
- Search persistence & fewer taps to results
- Property page: hero, map, policies, reviews snippet
- Booking step indicator + correct nav active state
- Payment flow end-to-end UX review

### Wave 3 — Owner onboarding
- Reduce required docs / allow staged verification
- Fix mobile wizard validation & progress save
- Map-based property location
- Defer non-critical fields post-approval

### Wave 4 — Owner workspace
- Mobile-first “today/tomorrow vacancy” summary
- Demote payment methods to settings
- Simplify room creation with templates
- Replace raw grid with calendar UX on phone

### Wave 5 — Admin + analytics
- Action inbox: pending applications, disputes, unpaid
- Replace tutorial cards with live alerts
- Time-series KPIs where data exists

### Wave 6 — AI assistant
- Bottom sheet UX, non-blocking
- Clear close/back behavior
- Context chips per page
- Re-entry state test suite

### Wave 7 — Visual polish / motion
- Photography, skeleton branded loaders
- Typography scale audit
- Micro-feedback on taps submits

### Wave 8 — Accessibility, performance, regression
- a11y pass with automated tools (after Playwright MCP available)
- E2E critical paths
- i18n regression for tg

---

## What Is Already Good (fair credit)

- **History hub** architecture matches spec (tabs, payment badge separate, booking detail path).
- **Bottom navigation** stable and labeled in Russian.
- **TST** suggestion chips are relevant; FAB discovery is solid.
- **Tours** page honest about “coming soon” — avoids fake catalog.
- **Admin desktop IA** sidebar is logical for trained operators.
- **i18n system** works when locale cookie set — Tajik headline renders correctly.
- **Auth** email login API functional; role-based dashboard gating works.

---

## Unknowns / Not Verified

- Full payment completion `/payment/[code]`
- Google OAuth button flow
- Firebase phone OTP
- Deep link `?lang=` middleware (confirmed absent)
- Browser back across TST modal
- Production CDN images on Vercel
- Refresh on deep routes / redirect loops
- Complete room creation submit
- Admin table moderation workflows on mobile

---

## Auditor Notes

1. **Playwright MCP** should be registered before Ralph browser QA loop — current audit used CLI fallback.
2. **`/setup` / `.better-web-ui.md`** should be run manually in Cursor desktop to activate design critique skills if intended.
3. Do **not** start Ralph until this backlog is converted to `ralph/prd.json` with acceptance criteria per issue ID above.

---

*End of audit report.*
