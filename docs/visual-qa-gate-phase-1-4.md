# Visual QA Gate — after Phase 1–4

**Status:** Complete — **stop**. Phase 5 not started.  
**Date:** 2026-08-10  
**Scope:** Visual / chrome regression after Tokens → Core Components → Header → User Menu.  
**Rule:** Defects listed only; no mass fixes during this gate.

## Method

| Layer | What ran | Limitation |
|-------|----------|------------|
| **L1** | Code + CSS review of header, UserMenu, DS primitives, residual hex, mobile shell | Proves wiring, breakpoints, role gates, token leftovers |
| **L2** | Playwright Chromium screenshots for 1366/1440/1920/2560 + 375/390/414 | **Blocked** — `npx playwright` install failed (`ECONNRESET` to registry.npmjs.org) |
| **L3** | HTTP smoke via `curl.exe` against `localhost:3000` | Auth/API blocked by **DB schema drift** (see Functional smoke) |

Verdict confidence: **high for contrast/CSS leftovers and breakpoint wiring**; **medium for spacing/overflow** (needs L2 when network allows); **auth smoke incomplete** (infra, not UI regression).

---

## Verdict

Foundation layers (tokens, core DS, ≥1200 header, UserMenu matrix) are largely wired correctly. **Do not start Phase 5 until P1 foundation defects below are fixed** (especially light-chrome auth CTAs and ProfileHub hero contrast). Mobile layout shell is preserved; light chrome after Phase 2 is real and must be treated as accepted or explicitly reworked — not assumed “OK”.

---

## Defect list

| ID | Severity | Viewport | Component | Problem | Expected | Actual | Likely cause | Recommended phase |
|----|----------|----------|-----------|---------|----------|--------|--------------|-------------------|
| VQA-01 | **P1** | Desktop ≥768 | Header Sign In | Near-invisible CTA on light header | Dark/`--color-text` outline CTA on white | `.header-auth-signin` → `color: #e2e8f0`, translucent white border (`globals.css`) on `.site-header` `rgba(255,255,255,0.92)` | Dark-theme leftover after Phase 2 light chrome | **Foundation fix** (pre–Phase 5) |
| VQA-02 | **P1** | Desktop ≥768 | Header Sign Up | Neon gradient + glow CTA | Solid `#087F5B` primary, soft shadow | `linear-gradient(#34d399,#059669)` + `box-shadow … rgba(16,185,129,0.28)` | Same residual neon pass | **Foundation fix** |
| VQA-03 | **P1** | Mobile &lt;768 | `header-auth-signin-mobile` | Light mint text on light sticky header | Readable dark text / light pill matching Phase 2 | `home.css` → `color: #ecfdf5`, white translucent border/bg | Mobile chip never re-themed | **Foundation fix** |
| VQA-04 | **P1** | Mobile &lt;768 | ProfileHub hero | Dark name on dark hero (Phase 4 override fights dark card) | Consistent light ProfileHub **or** light-on-dark text | Dark gradient hero in `profile-hub.css` `@media (max-width:767)`; Phase 4 forces `.profile-hero-card__name { color: var(--color-text) }` = `#111827` | Partial Phase 4 (menu rows only) | **Foundation fix** / ProfileHub polish |
| VQA-05 | **P2** | Desktop | UserMenu | No arrow-key roving tabindex | ArrowUp/Down (+ Home/End) between `menuitem`s | Escape + click-outside only | Incomplete menu pattern | Phase 5 a11y / foundation polish |
| VQA-06 | **P2** | All | Modal / Dropdown | Incomplete keyboard enclosure | Modal Tab trap; menu arrows | Escape + first-focus; no Tab trap | Lightweight primitives | Phase 5 a11y |
| VQA-07 | **P2** | Desktop | HeaderNav / UserMenu | Weak focus-visible on chrome | Visible `--taj-shadow-focus` | Hover-first styles; no dedicated `:focus-visible` on nav/menu items | Polish gap | Foundation polish |
| VQA-08 | **P2** | All | BrandMark | Non-canonical focus ring | Token focus | `focus-visible:ring-emerald-400/50` | Tailwind emerald ≠ `#087F5B` | Foundation polish |
| VQA-09 | **P2** | Guest surfaces | Cards / home CTAs | Residual neon glow in active UI | Soft primary focus from tokens | e.g. card/home CTA focus with `rgba(34,197,94…)` / `#34d399` shadows | Incomplete Phase 2 neutralization | Residual kill before/during Phase 5 Home |
| VQA-10 | **P2** | Profile (legacy) | `profile-nav` | Neon wash on hover | `--color-primary-soft` | `auth.css` `rgba(34,197,94,0.1)` | Missed alias | Foundation polish |
| VQA-11 | **P2** | Forms | `.ds-input` | Incomplete disabled/error vs `.taj-input` | Parity states | Focus styles only on `.ds-input` | Dual input classes | Foundation DS parity |
| VQA-12 | **P2** | Forms (TZ) | `.tz-input-field:focus` | Focus ring neutralized away | Replace with `--taj-shadow-focus` | Still uses `var(--green-glow)` which Phase 2 set to `transparent` | Glow killed without replacement | Foundation fix |
| VQA-13 | **P3** | ≤1023 vs `md` | SiteHeaderFrame | Scroll-hide breakpoint ≠ header `md` | Align hide-on-scroll with 768 or 1200 | JS/CSS `max-width: 1023px`; auth chrome uses `md` (768) | Pre-existing tablet split | Consistency pass |
| VQA-14 | **P3** | Mobile | ProfileHub logout / gold ring | Premium-dark chrome beside light menu rows | One visual system on hub | Dark red logout glass + gold avatar glow | Scoped Phase 4 only | ProfileHub polish |
| VQA-15 | **P3** | Desktop | UserMenu notifications | Mixed menu semantics | Consistent `menuitem` or drop `role="menu"` | Notification links lack `role="menuitem"` | Partial ARIA | a11y polish |
| VQA-16 | **P3** | All | Dead CSS | Unused neon utilities still ship | Remove or quarantine | `.neon-glow`, conic/`pulse-glow` leftovers in `globals.css` | Legacy premium CSS | Cleanup |
| VQA-ENV | **P0\*** | Local env | Auth / Prisma | Seed login cannot complete | Guest/Owner/Admin login for role visual QA | `POST /api/auth/email/login` → **500**; Prisma: `Hotel.propertyTypeId` missing in DB | Schema not migrated vs client | **Ops:** `npm run doctor` / migrate — *not* a Phase UI defect |

\*P0 for **local verification environment only** — not a Phase 2–4 UI regression.

---

## PASS (code-backed)

| Check | Evidence |
|-------|----------|
| Canonical primary | `tokens.css` `--color-primary: #087f5b` |
| Light site header | `home.css` `.site-header` white translucent chrome |
| Favorites / Bookings nav only ≥1200 | `Header.tsx` `desktopOnly` + `HeaderNav` `hidden min-[1200px]:inline-flex` |
| Pattern strip desktop-only | `site-header__pattern` `hidden min-[1200px]:block` |
| Header z vs menu | Header `z-[100]`; dropdown `--z-dropdown` |
| UserMenu Escape / outside / `aria-expanded` | `UserMenu.tsx` + `auth.css` open/closed |
| slideX + fade | `translateX(1.25rem)` → `0` + opacity |
| No photo avatar (initials only) | Initials in trigger + panel header |
| Admin item only `ADMIN` | Gated block → `/dashboard/admin` |
| Bookings href by role | OWNER → `/dashboard/owner`; else `/dashboard/bookings` |
| Owner Panel + guest `ownerApp` states | GUEST none/pending/approved/rejected + OWNER panel |
| `#004724` not in active chrome | Comments + splash only |
| TajikPattern restraint | Component used only in `EmptyState` (subtle); header uses thin CSS pattern strip |
| Mobile bottom nav preserved | `MobileBottomNav` `md:hidden` |
| Mobile avatar → `/profile` | `HeaderMobileActions` |
| Desktop UserMenu / Locale `md+` only | `hidden md:block` / `hidden md:flex` |
| Login / logout routes unchanged | `/auth/sign-in`, `POST /api/auth/logout` |
| Core Button / taj-input states | disabled, focus, error, loading present in `ds-components.css` |

**Tablet note:** At 768–1199 center nav still shows Home/Search/About (`md:flex`); Favorites/Bookings correctly wait until 1200 — matches Phase 4 spec, not a fail.

---

## Desktop checklist summary

| Area | 1366 | 1440 | 1920 | 2560 | Notes |
|------|------|------|------|------|-------|
| Header structure / ≥1200 rules | L1 OK | L1 OK | L1 OK | L1 OK | L2 screenshots pending |
| Auth CTAs (logged out) | **FAIL VQA-01/02** | same | same | same | Contrast / neon |
| UserMenu matrix | L1 OK | L1 OK | L1 OK | L1 OK | Arrow keys P2 |
| Core components | Partial | Partial | Partial | Partial | ds-input / tz focus P2 |
| DS residuals | Partial | Partial | Partial | Partial | VQA-09 neon leftovers |
| TajikPattern | PASS | PASS | PASS | PASS | Not wallpaper |

## Mobile checklist summary

| Area | 375 | 390 | 414 | Notes |
|------|-----|-----|-----|-------|
| Layout / bottom nav / `/profile` trigger | L1 PASS | L1 PASS | L1 PASS | No desktop redesign leak found in shell |
| Light chrome after Phase 2 | **Accepted as fact** | same | same | Sign-in chip **FAIL VQA-03** |
| ProfileHub | **FAIL VQA-04** | same | same | Hero contrast; menu rows L1 OK |
| Overflow / text | Pending L2 | Pending L2 | Pending L2 | |

---

## Functional smoke

| Route / action | Result |
|----------------|--------|
| `GET /api/health` | 200 |
| `GET /`, `/search`, `/auth/sign-in`, `/profile` | 200 |
| `POST /api/auth/email/login` (Guest/Owner/Admin) | **500** — Prisma schema drift (`Hotel.propertyTypeId`) |
| `GET /favorites`, `/dashboard/bookings` | 200 (without session in this run) |
| Owner/Admin dashboards without session | 307 redirect (expected) |
| `POST /api/auth/logout` | 200 |

UI route wiring is intact. Role-specific UserMenu visual checks in browser require a healthy DB + seed (`npm run doctor`) — out of scope for UI mass-fix during this gate.

---

## Recommended next sequence

1. **Foundation defect pass** (not Phase 5): VQA-01–04 first; then VQA-11–12; optional VQA-07–10.  
2. Re-run **L2 Visual QA** with screenshots at listed viewports (after Playwright install).  
3. Fix **DB / seed** (VQA-ENV) for Guest/Owner/Admin menu screenshots.  
4. Only then start **Phase 5 — Guest UI**, split: Home → Search → Hotel → Booking → Favorites/Profile.

---

## Stop

**Phase 5 not started.** No business-logic changes. This document is the gate deliverable.
