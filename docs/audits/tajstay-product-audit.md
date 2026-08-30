# TajStay — Phase 1 Product + UX + Visual Forensic Audit

**Mode:** READ-ONLY  
**Audit date:** 2026-08-29  
**Git commit:** `5166e303bcb1a38c840049f806bd44cd2782674b` (`cleanup-project`) — `fix: auto-derive DIRECT_URL for Vercel Prisma migrate`  
**Environment:** local dev `http://localhost:3000` (server started successfully)

---

## Pre-flight status

| Check | Status | Notes |
|-------|--------|-------|
| `/setup` → `.better-web-ui.md` | **NOT DONE** | File missing. Design skill context not persisted for this repo. |
| Playwright MCP (`.cursor/mcp.json`) | **CONFIGURED** | `@playwright/mcp@latest` in project config. |
| Live browser QA | **PARTIAL** | `cursor-ide-browser` used for Home (`/`). Full mobile walkthrough interrupted when execution backend dropped. **Not all flows live-verified.** |
| Dev server | **OK** | `npm run dev` → Ready on port 3000. |
| Console/runtime errors | **UNKNOWN** | No systematic console capture completed before backend failure. |
| Owner / Admin / Booking live | **UNKNOWN** | Requires authenticated sessions + seed data; not completed in this audit run. |

**BLOCKER (process):** Without completing browser walkthrough at 390×844 for all critical flows, several sections below combine **code review + partial live evidence**. Items marked **UNKNOWN** must be re-verified in Phase 1b with Playwright MCP + test accounts.

---

# Executive Summary

TajStay has **solid backend architecture** (History hub, booking classification, TST intent routing, Profile Center IA) but **uneven commercial UX** between traveler, owner, and admin surfaces.

**Strengths**
- Clear product map emerging: bottom nav Home · Search · Tours · History · Profile; Favorites inside Profile.
- History hub (`/history`) with tab model in `classify.ts` is coherent for guests.
- Profile Center redesign (`profile-center`) reads as a real account hub (code + structure).
- TST Assistant has explicit close paths (X, backdrop, Escape, link navigation) and auth gates for sensitive actions.
- Owner application collects real verification data (appropriate for marketplace trust).

**Critical gaps**
- **Mobile Home is intentionally thin** — most discovery/reviews/AI/trust sections are `hidden md:block`; mobile footer hidden on home. First-time mobile users see essentially hero + search only.
- **Owner onboarding + owner dashboard** carry **extreme cognitive load** (11+ required fields, 4 mandatory uploads, then 1500+ line single-page dashboard with 11 sections).
- **Tours** is an honest placeholder but occupies primary nav — sets expectation of a product that is not there yet.
- **i18n leaks** (hardcoded English aria-labels, brand casing `Tajstay` vs `TajStay`).
- **Admin/owner UIs** are operationally capable but **table-first**, not “what needs my attention now?” for non-technical users.

**Verdict:** TajStay is a **functional beta / early commercial platform**, not yet a **premium unified travel product** across all personas. Traveler mobile experience and owner workspace are the largest product gaps.

---

# Overall Scores

Scores 0–10. **Evidence mix:** code architecture + partial live Home snapshot. Re-verify in browser for final sign-off.

| Persona / Area | Clarity | Effort (10=high) | Visual Quality | Trust | Mobile UX | Commercial Readiness |
|----------------|---------|------------------|----------------|-------|-----------|-------------------|
| Guest — Home (mobile) | 6 | 4 | 6 | 6 | **5** | **5** |
| Guest — Search | 6 | 6 | 6 | 6 | 6 | 6 |
| Guest — Property page | 7 | 5 | 7 | 7 | **UNKNOWN** | 6 |
| Guest — Booking | 6 | 7 | 6 | 6 | **UNKNOWN** | 6 |
| Guest — History | 7 | 4 | 7 | 7 | 7 | 7 |
| Guest — Profile | 8 | 3 | 7 | 7 | 7 | 7 |
| Guest — Tours | 5 | 2 | 6 | 5 | 6 | **4** (placeholder) |
| Owner — Application | 5 | **9** | 6 | 6 | 6 | **4** |
| Owner — Dashboard | 4 | **9** | 5 | 5 | 5 | **4** |
| Admin — Dashboard | 5 | 7 | 5 | 6 | 4 | 5 |
| TST Assistant | 7 | 4 | 6 | 7 | 6 | 6 |

---

# Top 10 Product Problems

| Rank | ID | Severity | Problem |
|------|-----|----------|---------|
| 1 | UX-001 | P1 | Mobile Home hides most content (featured, destinations, reviews, AI, trust); footer hidden on home — feels empty vs desktop. |
| 2 | OWNER-001 | P1 | Owner application: 4 wizard steps, 11 required inputs + 4 mandatory photo uploads before admin review — EXTREME cognitive load. |
| 3 | OWNER-002 | P1 | Owner dashboard is one monolithic page (~1,577 lines) with 11 sections — PMS concepts without guided workspace. |
| 4 | NAV-001 | P2 | Tours in primary nav is a placeholder — creates false product expectation. |
| 5 | I18N-001 | P2 | Hardcoded English `aria-label="Trust highlights"` in hero (`TajstayHero3D.tsx`). |
| 6 | UI-001 | P2 | Brand inconsistency: `Tajstay` vs `TajStay` in components/copy. |
| 7 | AI-001 | P2 | TST uses dark emerald panel + body scroll lock — competes with page; mobile leaves gap above bottom nav (by design) but reduces usable app context. |
| 8 | ADMIN-001 | P2 | Admin landing is KPI counts + tables — weak “what needs attention now?” story vs applications/complaints/risk flags. |
| 9 | BOOKING-001 | P2 | Multi-step booking wizard + separate payment/chat paths — high step count for casual traveler (code: 3 wizard steps + post-submit routes). |
| 10 | UX-002 | P3 | Home empty state uses admin copy keys (`admin.emptyResults`) for guest featured strip when no hotels seeded. |

---

# Mobile Experience

## Code-based architecture

- Bottom nav: **Home · Search · Tours · History · Profile** (`src/constants/app-navigation.ts`).
- **Favorites** not in bottom nav — correct IA; entry via Profile → `/favorites`.
- Shell hidden (no bottom nav, no TST) on `/auth`, `/dashboard/admin`, `/dashboard/owner`.

## Live evidence (Home `/`, browser — viewport likely desktop at capture)

- **Route:** `/`
- **Observed:** Search form (city, dates, guests), bottom nav labels RU, duplicate heading level-1 text “Найди идеальное жильё”, sections for popular objects / destinations / AI visible (suggests desktop layout at snapshot time).
- **Expected at true 390px (from CSS):** Only `HomeHeroMobile` + `SearchBar`; featured/reviews/AI/trust blocks hidden.

## Issues

### UX-001 — Mobile home content starvation (P1)

**PROBLEM:** On viewports `<768px`, `page.tsx` hides featured hotels, destinations, reviews, AI lab, and trust grid (`hidden md:block`). Mobile home ≈ title + search only.

**EVIDENCE:** `src/app/page.tsx` sections 2–5; `src/styles/home.css` hides footer on home mobile.

**USER IMPACT:** New mobile user sees minimal discovery, no social proof, no “why trust us” on scroll — product feels unfinished.

**ROOT CAUSE:** Desktop-first home composition; mobile-first CSS trims hero but does not substitute mobile discovery blocks.

**RECOMMENDED DIRECTION:** Mobile-specific compact modules (featured carousel, 2 trust bullets, one review) without duplicating desktop density.

---

### UX-003 — Footer hidden on mobile home (P2)

**PROBLEM:** `body:has(.home-page) .site-footer { display: none; }` on mobile.

**EVIDENCE:** `src/styles/home.css` lines 12–16.

**USER IMPACT:** Legal/support links harder to find from home; feels app-like but reduces trust anchors.

**RECOMMENDED DIRECTION:** Keep compact footer or link row on mobile home.

---

# Traveler Experience

## Profile (code review — Profile Center implemented)

- Hub: stats row + aside (avatar, badges, edit) + sectioned menus (`ProfileMockupView.tsx`).
- History link → `/history` (no duplicate history UI) — **good IA**.
- Logout confirm dialog — **good trust pattern**.

**Scores (code):** Clarity 8, Commercial 7.

**UNKNOWN live:** Badge states, notification badge count, scroll on small screens.

---

## History (code review)

- Auth required; owner role redirected to owner dashboard with message.
- Tabs: confirmed / unconfirmed / past / cancelled / all via `classify.ts`.
- Cards: `HistoryRecordCard` — dedicated component (not HotelCard).

**Scores (code):** Clarity 7, Commercial 7.

**UNKNOWN live:** Tab switching, empty states per tab, payment CTA visibility.

---

## Tours

- Placeholder page with category tiles + “coming soon” (`src/app/tours/page.tsx`).
- Narrow `mockup-screen` layout — consistent with legacy mockup shell, not full product page width.

**NAV-001 (P2):** Primary nav slot for non-product.

---

# Search

## Flow (code)

1. Home `SearchBar` GET → `/search?city&checkIn&checkOut&guests`
2. `SearchExperience` + `MobileSearchPanel` — **13 filter dimensions**, debounced `/api/search`
3. Results: `HotelCard` grid + optional map overlay

## Actions to useful result

Minimum guest path (estimated):
1. Open Search (or submit from Home) — **1**
2. Set city — **2**
3. Set dates — **3–4**
4. Submit / wait debounce — **5**
5. Scan results — **6**
6. Open hotel — **7**

**Potentially reducible:** default city (Dushanbe), smart date defaults, popular city chips (hidden on mobile in `SearchBar` — `home-search-popular` is `hidden md:flex`).

### UX-004 — Mobile search lacks visible popular city chips (P2)

**EVIDENCE:** `SearchBar.tsx` line 104 — popular cities desktop only.

**RECOMMENDED DIRECTION:** Expose 2–3 tappable city chips on mobile search/home.

---

# Property Experience

## Structure (`src/app/hotel/[id]/page.tsx`)

First 5 seconds should show: **name, city, photos, price range, primary book path**.

Code order: gallery → header (name, city, favorite) → description → price range → meta → **rooms/CTA**.

**Assessment:** Structure is reasonable for OTA pattern.

**UNKNOWN live:** Photo quality, map embed, mobile carousel UX, CTA stickiness.

### UI-002 — Hero/gallery dependency on seed media (P3)

Empty or single cover hurts trust — content/data issue, not layout.

---

# Booking

## Steps (code)

Hotel → `/booking?roomId|roomTypeId&dates` → **BookingWizard 3 steps** (guest details → payment info → confirm) → API → `/chat/booking/[id]` → `/payment/[code]`.

**BOOKING-001 (P2):** High step count + handoff across chat and payment URLs.

**UNKNOWN live:** Form state on back navigation, double-submit, price breakdown clarity, loading states.

---

# Owner Onboarding

## Flow summary

**Entry:** `/profile/become-owner` (`OwnerOnboardingExperience.tsx`)

| Step | Mobile wizard | Required |
|------|---------------|----------|
| 0 Personal | fullName, phone, email, city | 4 fields |
| 1 Property | businessName, address (+ optional type, counts, description) | 2 fields |
| 2 Documents | identity, facade, room, bathroom photos | 4 uploads |
| 3 Review | consent + optional extra | 1 checkbox |

**Desktop:** single scroll — 5 sections (includes optional extra before review).

### Totals

| Metric | Value |
|--------|-------|
| **TOTAL STEPS (mobile)** | 4 |
| **TOTAL REQUIRED FIELDS** | 11 (7 text + 4 files + consent) |
| **TOTAL REQUIRED DOCUMENTS** | 4 (identity, facade, room, bathroom) |
| **ESTIMATED COGNITIVE LOAD** | **EXTREME** |

### OWNER-001 (P1)

**PROBLEM:** Owner must upload property photos **before** approval, without yet having owner tools or clear “why each photo.”

**USER IMPACT:** Drop-off for small hosts; feels like bureaucratic gate, not progressive onboarding.

**RECOMMENDED DIRECTION:** Phase onboarding: (1) identity + contact → submit → (2) property details after approval preview; defer non-identity photos to post-approval checklist (partially exists in `OwnerOnboardingPanel` 5-step checklist).

### Step-by-step notes

| Step | Requires | User understands why? | Deferrable? |
|------|----------|-------------------------|-------------|
| Personal | Identity contact | Mostly yes | Partially (some pre-filled) |
| Property address | Location for verification | Partially | Could defer exact address |
| Room/facade photos | Trust/moderation | **Weak** without examples | **Yes** — post-approval |
| Consent | Legal | Yes | No |

---

# Owner Dashboard

**Route:** `/dashboard/owner?section=…` — bottom nav **hidden**.

**Sections:** overview, properties, rooms, bookings, offline-bookings, calendar, notifications, reviews, finances, statistics, help.

### OWNER-002 (P1)

**PROBLEM:** Single massive server page; payment methods form appears globally; terminology mixes hotel/room/type/booking/PMS.

**USER IMPACT:** Non-PMS user cannot answer “what do I do first?” without reading many sections.

**EVIDENCE:** `src/app/dashboard/owner/page.tsx` (~1,577 lines); `OwnerRoomTypesPanel`, calendar grid, DataToolbar tables.

**RECOMMENDED DIRECTION:** Guided “day 1” workspace: Properties → Rooms → Calendar → Bookings; hide advanced sections until checklist complete.

---

# Room Management

**Paths:**
- Room types + bulk (`OwnerRoomTypesPanel`) — 3 required fields + 30 amenity options
- Legacy single room form — hotelId, title, price, capacity

**UNKNOWN live:** Terminology confusion between “room type” vs “room” vs “category.”

### OWNER-003 (P2)

**PROBLEM:** Two parallel mental models (type+bulk vs single room) on same section.

**RECOMMENDED DIRECTION:** Single guided flow with progressive disclosure.

---

# Occupancy / Availability

**Code:** `OwnerCalendar` 30-day grid + overrides + occupied bookings list (`?section=calendar`).

**Question:** “What’s free today?” — owner must open Calendar section and interpret grid.

### OWNER-004 (P2)

**PROBLEM:** No single “availability at a glance” answer; table/grid literacy required.

**RECOMMENDED DIRECTION:** Today/tomorrow summary strip + color-coded room rows (future wave).

---

# Admin Dashboard

**Route:** `/dashboard/admin?section=…`

**Sections:** dashboard, content, applications, hotels, users, owner-access, bookings, finance, notifications, complaints.

### ADMIN-001 (P2)

**PROBLEM:** Default dashboard = aggregate KPIs; urgent items (pending applications, flagged hotels, complaints) not prioritized as action queue.

**EVIDENCE:** `admin/page.tsx` section switcher; risk flags in notifications history.

**RECOMMENDED DIRECTION:** “Attention inbox” widget: applications + moderation queue + complaints + failed payments.

---

# Analytics

| Surface | What exists | Visualization |
|---------|-------------|---------------|
| Admin dashboard | Counts, 30-day revenue/commission | Numbers + tables |
| Owner overview/statistics | KPIs, conversion proxy | Cards |
| Owner finances | 30-day revenue, payouts list | Table/list |

**No dedicated charts/graphs** — mostly raw numbers.

**Assessment:** Appropriate for MVP; **avoid decorative charts**. Useful future: booking trend line (admin), occupancy % (owner), conversion funnel (owner statistics already has proxy).

---

# AI / TST

## Code behavior (`TstAssistant.tsx`, `tst-assistant.css`)

| Aspect | Finding |
|--------|---------|
| Discovery | FAB + optional hint bubble (`localStorage` hintSeen) |
| Open | body `overflow: hidden`; FAB hidden |
| Close | X, backdrop, Escape, link onClick |
| Hidden on | auth, owner/admin dashboards |
| Mobile layout | Near-fullscreen panel above bottom nav (~4.75rem gap) |
| Security | Account intents route to secure pages; no password in chat |

### AI-001 (P2)

**PROBLEM:** Dark panel + backdrop blocks entire app context; user loses spatial orientation on hotel/search pages.

**RECOMMENDED DIRECTION (future floating assistant):** Smaller docked panel; preserve page peek; optional minimize-to-chip; do not lock body scroll on desktop.

### AI-002 (P3)

**UNKNOWN live:** Browser back while open; re-open state persistence; scroll restoration.

**Code suggests:** Session refresh on open; draft state in component — partial re-entry OK.

---

# Navigation

## Actual bottom nav (verified code + partial live)

**Home · Search · Tours · History · Profile** — Favorites via Profile only.

| Check | Status |
|-------|--------|
| Active state logic | Code: prefix matching in `BOTTOM_TABS` |
| History includes payment/chat paths | Yes — history tab stays active |
| Profile vs History separation | Code: correct |
| Deep link `/history?tab=` | Code: supported |
| Unauthorized `/history` | Redirect sign-in |
| Owner on `/history` | Redirect owner dashboard |

### NAV-002 (P3)

Legacy paths `/dashboard/bookings`, `/dashboard/guest` redirect — good; ensure no stale links in UI (**UNKNOWN** full link audit).

---

# Localization

### I18N-001 (P2) — English aria-label on RU UI

**EVIDENCE:** `src/components/landing/TajstayHero3D.tsx` lines 31, 35 — `aria-label="Trust highlights"`.

**USER IMPACT:** Screen reader language mismatch on RU locale.

---

### I18N-002 (P2) — Brand casing

**EVIDENCE:** Component `TajstayHero3D`, possible “Tajstay” strings in content/site config.

**RECOMMENDED DIRECTION:** Enforce **TajStay** in UI copy; TST Assistant naming in assistant surfaces only.

---

### Tajik (tg)

**UNKNOWN:** Full tg pass not executed in browser. Code uses `messages.ts` trip/profile/bottomNav keys — risk of mixed RU/TJ in owner onboarding dark forms (English-adjacent slate UI copy in components).

**RECOMMENDED DIRECTION:** Phase 1b tg-only walkthrough with overflow checks on Profile/History.

---

# Visual Design

## Premium blockers (specific)

1. **Split design languages:** `home-*` dark emerald marketing vs `profile-center` light commercial vs `mockup-screen` narrow legacy (Tours, some profile subpages).
2. **Owner onboarding:** dark slate “internal tool” aesthetic vs traveler marketing — feels like different products.
3. **Emoji trust icons** on home trust cards (✓ 🔒 💬) — casual vs premium travel brand.
4. **AIRecommendationLab** on desktop home — extra cognitive block; label mix RU + English structure in snapshot (“Trust highlights” region).
5. **Empty featured strip** with admin empty copy — breaks commercial polish when DB sparse.

## What works

- Profile Center hierarchy (sections, compact stats, verification badges).
- History card dedicated component — avoids generic hotel card confusion.
- Green as action accent in profile-center CSS — restrained usage.

---

# Accessibility Findings

| ID | Severity | Finding |
|----|----------|---------|
| A11Y-001 | P2 | Hardcoded English aria-labels (I18N-001) |
| A11Y-002 | P2 | TST body scroll lock — may trap focus on mobile (code: overflow hidden; dialog role present — **UNKNOWN** focus trap audit) |
| A11Y-003 | P3 | Date inputs on mobile search — native pickers OK; **UNKNOWN** label association audit on all filter fields |

---

# Technical UX Findings

| ID | Finding |
|----|---------|
| TECH-001 | Home mobile hides footer — may affect PWA/offline trust |
| TECH-002 | Owner dashboard single page — slow cognitive parse, potential perf on low devices (**UNKNOWN** metrics) |
| TECH-003 | 13 search filters — powerful but heavy for casual user |
| TECH-004 | History requires auth — correct; guest must discover sign-in from empty states |

---

# Issue register

## P0 — Critical blockers

*None confirmed in read-only audit without live booking/payment test.*  

**UNKNOWN P0 candidates (must verify live):**
- Payment flow failure with real booking code
- Auth redirect loops
- Double-booking UI if calendar wrong (logic not tested)

---

## P1

| ID | Title |
|----|-------|
| UX-001 | Mobile home content starvation |
| OWNER-001 | Owner application extreme cognitive load |
| OWNER-002 | Owner dashboard monolith / PMS complexity |

---

## P2

| ID | Title |
|----|-------|
| NAV-001 | Tours placeholder in primary nav |
| I18N-001 | English aria-label Trust highlights |
| I18N-002 | Tajstay vs TajStay branding |
| AI-001 | TST fullscreen blocking context |
| ADMIN-001 | Admin weak attention queue |
| BOOKING-001 | Booking multi-hop flow length |
| UX-003 | Mobile home footer hidden |
| UX-004 | Mobile search missing city chips |
| OWNER-003 | Dual room creation models |
| OWNER-004 | Occupancy not at-a-glance |
| A11Y-001 | English aria labels |
| A11Y-002 | TST scroll lock / focus |

---

## P3

| ID | Title |
|----|-------|
| UX-002 | Admin empty copy on guest home |
| UI-002 | Weak media seed on property pages |
| AI-002 | TST re-entry/back button UNKNOWN |
| NAV-002 | Stale dashboard links audit |
| A11Y-003 | Filter label audit |

---

# Screenshot evidence index

| ID | Route | Viewport | Observation |
|----|-------|----------|-------------|
| E-001 | `/` | Unknown (likely desktop) | RU nav, search form, duplicate H1 “Найди идеальное жильё”, empty featured “Ничего не найдено”, English accessibility name “Trust highlights” |

*Additional screenshots not captured due to incomplete browser session.*

---

# Recommended Work Waves

Based on **actual findings**, not template order:

### Wave 0 — Audit completion & blockers
- Run `/setup` for `.better-web-ui.md`
- Complete Playwright MCP walkthrough at 390×844 with seed accounts (guest, owner, admin)
- Capture console errors; verify P0 candidates

### Wave 1 — Mobile traveler foundation
- UX-001, UX-003, UX-004: mobile home discovery + footer + city chips
- I18N-001, I18N-002: aria + brand pass

### Wave 2 — Traveler journey polish
- BOOKING-001: booking flow step reduction (UX only, no logic change scope TBD)
- Search empty/loading/error states live review
- Property page mobile CTA stickiness

### Wave 3 — Owner onboarding redesign (IA only first)
- OWNER-001: phased application; defer photo uploads
- Align owner apply UI with TajStay light brand

### Wave 4 — Owner workspace simplification
- OWNER-002, OWNER-003, OWNER-004: guided workspace, unified room flow, availability summary

### Wave 5 — Admin attention & ops
- ADMIN-001: moderation/applications inbox

### Wave 6 — Navigation & product honesty
- NAV-001: Tours tab strategy (badge “Soon” vs demote vs MVP catalog)

### Wave 7 — TST / AI UX
- AI-001, AI-002: floating assistant spec; back button; scroll restore

### Wave 8 — Visual system unification
- Unify home / profile / mockup-shell / owner dark themes toward TajStay light + green accent direction

### Wave 9 — Accessibility & regression
- A11Y fixes; Playwright smoke from `e2e/test-plan.md`; i18n tg full pass

---

# Human-like test summary (key flows)

| Flow | Result | Notes |
|------|--------|-------|
| Home → Search | **PARTIAL** | Home loaded; search not clicked in live session |
| Search → Hotel → Book | **UNKNOWN** | Needs live data |
| History tabs | **UNKNOWN** | Needs auth |
| Profile hub | **UNKNOWN** | Needs auth |
| Owner apply | **UNKNOWN** | Code review only — EXTREME load |
| Owner dashboard | **UNKNOWN** | Code review — HIGH load |
| Admin dashboard | **UNKNOWN** | Code review |
| TST open/close | **UNKNOWN** | Code supports X/backdrop/Escape; not live tested |

---

# What is genuinely good (do not over-correct)

- History ≠ Profile duplication — architecture is correct.
- `HistoryRecordCard` + `classify.ts` — mature domain modeling.
- Profile Center IA matches product spec direction.
- TST security routing (password, email, cross-user refuse) — responsible patterns.
- Tours placeholder is honest copy-wise — only nav placement is wrong for maturity level.

---

**End of audit.** No application code, schema, or API changes were made.  
**Next step:** Phase 1b — complete browser verification with Playwright MCP + seeded roles, then prioritize Wave 0–1.
