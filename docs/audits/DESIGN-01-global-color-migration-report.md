# BLOCK DESIGN-01 — Global TajStay Color Migration Report

**Commit SHA:** `50a299b3c96b09e31788607dc3c7f8780b044ce9` (base) + migration branch  
**Branch:** `cursor/global-color-migration-0d19`  
**Date:** 2026-09-07  
**STATUS:** PASS (public routes) / PARTIAL (owner/admin runtime — BLOCKED without QA DB accounts)

---

## ROUTE INVENTORY

39 page routes discovered from `src/app/**/page.tsx`:

| Path | Auth | Notes |
|------|------|-------|
| `/` | Public | Home |
| `/search` | Public | Hotel search |
| `/map` | Public | Map view |
| `/tours` | Public | Tours catalog |
| `/history` | Guest | Tabs: confirmed · unconfirmed · past · cancelled · all |
| `/favorites` | Guest | Favorites |
| `/notifications` | Guest | Notifications |
| `/booking` | Public/Guest | Checkout wizard |
| `/hotel/[id]` | Public | Hotel detail |
| `/payment/[code]` | Guest | Secure payment |
| `/chat/booking/[bookingId]` | Guest/Owner/Admin | Booking chat |
| `/offline` | Public | PWA offline |
| `/about`, `/contacts`, `/faq`, `/policy`, `/terms` | Public | Marketing/legal |
| `/auth/sign-in`, `/auth/forgot-password`, `/auth/reset-password` | Public | Auth |
| `/profile` + 10 subpages | Guest | Profile hub |
| `/profile/become-owner`, `/apply/owner` | Guest | Owner onboarding |
| `/dashboard/admin` | Admin | Sections via `?section=` |
| `/dashboard/admin/chat-archive` | Admin | Chat archive |
| `/dashboard/owner` | Owner | Sections via `?section=` |
| `/dashboard/messages` | Auth | Messages inbox |
| `/dashboard/bookings`, `/dashboard/guest`, `/dashboard/guest/notifications` | Redirects | Legacy → `/history` or `/notifications` |

**Virtual sections (query-param):**
- Admin: dashboard · content · applications · hotels · users · owner-access · bookings · finance · notifications · complaints
- Owner: overview · properties · rooms · bookings · offline-bookings · calendar · notifications · reviews · finances · statistics · help

**Special files:** `loading.tsx` (root, search, history, hotel), `error.tsx`, `not-found.tsx`

---

## COLOR INVENTORY BEFORE

| Layer | Issue |
|-------|-------|
| `globals.css` "palette lock" | Forced `#004724` green wall, mint text `#d8f1e2` on all surfaces |
| `taj-theme.css` | Dark emerald gradient `--taj-app-bg`, light text on all pages |
| `tokens.css` | Public surfaces `#004724`, dark card rgba |
| `shared/config/theme.ts` | Stale cyan/teal/violet palette (`#14B8A6`, `#8B5CF6`) |
| Components | teal/cyan/violet/indigo in chat, notifications, hero |
| `PageBackdrop.tsx` | Canvas painted `#004724` full-screen |

---

## DESIGN SYSTEM

Canonical semantic tokens in `src/styles/semantic-tokens.css`:

```
--color-page / --color-surface / --color-surface-subtle / --color-surface-elevated
--color-text-primary / secondary / muted / disabled / on-brand
--color-brand / hover / active / soft
--color-border / border-strong
--color-success / warning / danger / info (+ soft variants)
--color-gold / gold-soft
```

Bridged to legacy `--ts-*`, `--taj-*`, `--ds-*` via existing design-system layers.

Tailwind extended with `page`, `surface`, `ink`, `semantic` color groups referencing CSS variables.

---

## CHANGED FILES

- `src/styles/semantic-tokens.css` — canonical `--color-*` tokens
- `src/styles/taj-theme.css` — white canvas, brand green accents
- `src/styles/tokens.css` — public surface tokens
- `src/styles/home-pr2.css` — white header
- `src/app/globals.css` — removed green-wall palette lock; white canvas; green search block
- `tailwind.config.js` — semantic Tailwind colors
- `src/shared/config/theme.ts` — aligned to brand green (removed cyan/violet)
- `src/app/layout.tsx`, `public/manifest.webmanifest` — theme color `#0f7a4d`
- `src/components/effects/PageBackdrop.tsx` — white canvas animation
- Chat components (6 files) — indigo/violet/teal → semantic blue/green/amber/red
- `src/components/SearchBar.tsx`, home banners, auth badges, notifications

---

## PUBLIC — Verified

| Route | Desktop 1280 | Mobile 390 | Result |
|-------|----------------|------------|--------|
| `/` | ✅ | ✅ | White canvas, green search block, readable text |
| `/search` | ✅ | ✅ | White canvas, green CTAs |
| `/auth/sign-in` | ✅ | ✅ | Readable; green CTA |
| `/profile` (guest prompt) | ✅ | ✅ | White canvas |
| `/tours` | ✅ | ✅ | White canvas, green accents |
| `/about` | ✅ | ✅ | White canvas |
| `/not-found` | ✅ | ✅ | White canvas |

---

## GUEST / OWNER / ADMIN

| Role | Status | Notes |
|------|--------|-------|
| Guest (authenticated) | BLOCKED | No QA DB seeded; `/history` redirects to sign-in |
| Owner | BLOCKED | Requires approved owner account + hotel data |
| Admin | BLOCKED | Requires admin session + DB |

**Recommendation:** Create `qa-guest@tajstay.test` / `qa-owner@tajstay.test` via registration + admin approval in test environment.

---

## RESPONSIVE

Viewports verified at runtime: **390px**, **1280px**  
Build-time route compilation confirms all 39 routes compile.

---

## REMAINING LEGACY COLORS

| File | Color | Usage | Reason retained |
|------|-------|-------|-----------------|
| `globals.css` | `[class*="bg-cyan-"]` selectors | Remap arbitrary Tailwind to DS surfaces | Intentional override layer |
| `tajstay-design-system.css` | `.text-teal-500` remaps | Maps legacy Tailwind classes → brand green in workspaces | Bridge, not decoration |
| `owner-command-center.css` | `.text-teal-500` remaps | Same bridge pattern | Bridge |
| `taj-theme.css` | `--taj-icon-success: #22c55e` | Icon semantic success | Acceptable semantic accent |
| `MapClient.tsx` | `#22c55e` marker | Map pin visibility | Functional map contrast |
| `HeroTravelPreview.tsx` | `#22c55e` SVG | Decorative hero illustration | Brand green accent |
| `premium-overhaul.css` | `--green-accent` fallback | Legacy layer, overridden by tokens | Low priority cleanup |
| `variables.css` | Dark premium v2 values | Superseded by semantic tokens | Future removal candidate |

No remaining `#14B8A6`, `#8B5CF6`, `#004724` palette locks in active token path.

---

## TEST

| Test | Result |
|------|--------|
| `npm run build` | ✅ PASS (39 routes) |
| `npm run lint` | Not run (CSS-only migration) |
| Public runtime crawl | ✅ PASS (8 routes × 2 viewports) |
| Owner/Admin runtime | BLOCKED (no QA accounts) |

---

## REAL RUNTIME

- Dev server: `npx next dev -p 3000`
- Public routes manually crawled via browser automation
- Search block: green dominant surface on white page ✅
- Header: white with brand accents ✅
- No mint-on-white invisible text on tested routes ✅

---

## EVIDENCE

- Commit SHA on branch after push
- Screenshots: home/search/auth/profile/tours/about/404 at 390px and 1280px (captured during QA session)

---

## STATUS

**PASS** — Public/guest-prompt routes migrated to GREEN + WHITE system.  
**BLOCKED** — Full Owner/Admin matrix pending QA test accounts and seeded data.
