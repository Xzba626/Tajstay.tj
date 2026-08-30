# Step 4 — Admin Panel Exploration (Read-Only)

**Status:** EXPLORATION ONLY — **no code changes started**

**Prerequisite:** Step 3 Profile **ACCEPTED** after authenticated QA (currently **PENDING ACCEPTANCE**)

---

## Core responsive principle (mandatory for implementation)

> **Same visual language, different responsive composition.**

Desktop and mobile are **not** the same UI scaled with CSS.

| Approach | Forbidden |
|----------|-----------|
| Desktop first → shrink to 390px | ❌ |
| Mobile first → stretch to 1440px | ❌ |

### Shared (one Design System)

- Brand identity, TajStay green (`#15803d`), white canvas
- Typography, icon family, status semantics
- Button semantics (default/hover/pressed/focus/loading/success/disabled/error)
- Border/radius/spacing scale
- Interaction + accessibility rules
- i18n terminology (ru/tg/en)

### May differ (composition)

- Layout structure (sidebar vs bottom nav / sheet)
- Information density and priority order
- Table vs card list presentation
- Chart size and progressive disclosure
- Icon size/placement (same family, different scale)
- Button layout (compact horizontal vs thumb-friendly)

---

## Design per breakpoint (required before each major screen)

For every Admin screen, define composition **before** coding:

| Breakpoint | Design decisions |
|------------|------------------|
| **390px** | First viewport content, immediate actions, hidden/secondary items, cards vs scroll, bottom sheet, mobile nav |
| **412px** | Critical screens — additional QA |
| **768px** | Tablet composition (not desktop shrunk, not mobile stretched) |
| **1280px** | Desktop sidebar + main workspace |
| **1440–1920px** | Max-width, controlled density — no infinite stretch |

### Visual acceptance (per major screen)

Minimum evidence:

- 390px screenshot
- 1280px screenshot

Critical screens also: 412px, 1440px

**Pass criteria (both required):**

```text
Desktop quality: PASS / FAIL
Mobile quality:  PASS / FAIL
```

`Desktop PASS ≠ responsive PASS`

---

## Desktop vs Mobile — Admin composition target

### Desktop (1280px+)

```text
┌──────────────┬─────────────────────────────┐
│ Sidebar      │ Command center workspace    │
│ (compact)    │ KPI · attention · activity  │
│ Dashboard    │                             │
│ Moderation   │                             │
│ Users        │                             │
│ Bookings     │                             │
│ Analytics    │                             │
│ …            │                             │
└──────────────┴─────────────────────────────┘
```

- Full tables where appropriate
- Multi-column analytics
- Compact horizontal actions

### Mobile (390px)

```text
Header (context + actions)
─────────────────────────
Priority KPIs / attention queue
─────────────────────────
Compact cards (not wide tables)
─────────────────────────
Quick actions
─────────────────────────
Bottom nav OR compact drawer
Secondary → More / Sheet
```

- Tables → card lists (same data model, different presentation)
- Analytics: priority metrics + progressive disclosure
- Thumb-friendly targets; hover not required for state clarity
- Mobile is **primary experience**, not fallback

---

## Icons, buttons, tables, analytics

### Icons

- Same library, stroke weight, semantic meaning
- Size/placement may differ (desktop inline label vs mobile stacked/compact)

### Buttons

- Desktop: compact, text + icon where useful
- Mobile: thumb-friendly, adequate touch target, destructive separated from primary
- Identical state semantics on both (touch: no hover dependency)

### Tables

- Desktop: full table when data warrants it
- Mobile: card/list rows — avoid horizontal scroll tables on 390px

### Analytics

- Desktop: charts, comparisons, multi-column
- Mobile: priority chart + compact KPI cards + disclosure — not full desktop dashboard on one screen

---

## Skills workflow (implementation phase)

```text
audit → critique → frontend-design → add-ui → arrange
→ polish → distill → (bolder/quieter as needed) → data-viz
→ a11y → test → security-ux
→ human-like-qa → e2e-browser-qa → security review
```

Skills must **influence decisions**, not appear only in reports.

---

## Improvement rule

```text
Current UI = objectively good  → keep
Current UI = acceptable        → change only if measurable UX gain
Current UI = poor              → redesign
```

> improvement over change

---

## Explicitly OUT OF SCOPE (this wave)

- Passport / Hotel Vault implementation
- Manager role / new permissions
- New backend calculations
- Prisma / migrations / API contract changes
- Step 4 **implementation** until Step 3 ACCEPT

---

**BUSINESS LOGIC CHANGED:** NO (planned)  
**DATABASE CHANGED:** NO  
**API CONTRACT CHANGED:** NO  
**AUTHORIZATION CHANGED:** NO

---

*Exploration complete — awaiting Step 3 ACCEPT before implementation.*

## Current Admin IA

Single route with query sections:

| Section | URL | Purpose |
|---------|-----|---------|
| dashboard | `?section=dashboard` | KPI counts, 30d revenue, risk flags |
| content | `?section=content` | Home banner, brand, payment catalog, contacts |
| applications | `?section=applications` | Pending owner applications |
| hotels | `?section=hotels` | Hotel moderation list + filters |
| users | `?section=users` | All users + role filter |
| owner-access | `?section=owner-access` | Owner accounts |
| bookings | `?section=bookings` | Booking ops + payment/status actions |
| finance | `?section=finance` | Payments, payouts, refunds |
| notifications | `?section=notifications` | Admin notification feed |
| complaints | `?section=complaints` | Guest complaints |

**Entry:** `/dashboard/admin`  
**Auth:** `requireAdmin()` server-side  
**Layout:** `AdminDashboardLayout` → `DashboardShell` + `AdminSidebar` / `AdminMobileNav`

---

## Current Components

| Component | Role |
|-----------|------|
| `src/app/dashboard/admin/page.tsx` | **Monolith ~1180 lines** — all sections inline |
| `src/app/dashboard/admin/layout.tsx` | Sidebar labels + shell |
| `src/components/dashboard/AdminSidebar.tsx` | Desktop sidebar + mobile accordion nav |
| `src/components/ds/DashboardShell.tsx` | Sidebar + main content grid |
| `AdminOwnerApplicationActions` | Owner app approve/reject |
| `AdminBookingPayCountdown` | Payment timer |
| `DataToolbar`, `Pagination`, `EmptyState` | Shared list UX |
| `StatusBadge` | Booking/payment/role variants |
| `dashboard-skin`, `glass-panel`, `liquid-glass` | Dark/glass visual classes |

---

## Current Data Sources (unchanged in redesign)

- Prisma: `hotel`, `user`, `booking`, `ownerApplication`, `payment`, `payout`, `refund`, `notification`, `complaint`
- Aggregates: 30-day `booking.aggregate` for revenue/commission
- `getSiteContent()` for CMS blocks
- `scoreHotelRisk`, `deriveEscrowState`, `notificationText`

**No fake metrics** — redesign must use these queries only.

---

## Current Responsive Behaviour

| Breakpoint | Behaviour |
|------------|-----------|
| Desktop (lg+) | Fixed sidebar 224px, sticky |
| Mobile | Full-width accordion "Admin menu" button; **no bottom nav** |
| Content | Mixed: dark `text-slate-100` header + guide cards; some sections white cards |
| Tables | Card lists (not HTML tables) — good for mobile conversion |

---

## Current Problems (audit + critique)

1. **Instruction-heavy top** — 3 guide cards with long copy before any KPI ("how to use admin")
2. **Not a command center** — dashboard = raw numbers; no "requires attention" queue
3. **Visual inconsistency** — dark glass + white booking cards + mixed emerald/teal/red buttons
4. **Verbose sidebar footer** — `admin.navHint` instructional text
5. **Mobile nav** — accordion only; not thumb-friendly bottom nav; 10 items in dropdown
6. **Hardcoded strings** — e.g. "Finance", "Открыть чат", payment catalog EN copy
7. **No trends/charts** — revenue/bookings are static numbers despite data existing
8. **Applications section** — buried; no count badge on nav
9. **Section header always visible** — page title + subtitle on every section load
10. **Duplicate green shades** — emerald-600/700, teal-600 ad hoc

---

## Redesign Plan (presentation only)

### Phase A — Foundation
- Add `admin-command-center.css` scoped light tokens (reuse `tajstay-brand-tokens.css`)
- Admin shell: white canvas, `--primary` green, dark text
- Do **not** global color replace

### Phase B — Layout
- **Desktop:** compact sidebar (icons + short labels), remove navHint
- **Mobile:** bottom nav (Dashboard, Moderation, Users, Bookings, More) OR compact drawer — match TajStay shell patterns
- Header: page title + contextual actions only

### Phase C — Dashboard (command center)
- Row 1: 3–4 KPIs with labels + optional delta (only if computable from existing data)
- Row 2: **Requires attention** — pending applications count, unread notifications, open complaints
- Row 3: compact activity / risk list (existing riskNotes)
- Remove guide cards from default view (move to help link if needed)

### Phase D — Sections (incremental)
1. applications — action cards + checklist visual
2. bookings — status text + color + icon (existing StatusBadge)
3. users — search/filter toolbar polish
4. finance — grouped cards (keep data)
5. analytics — mini sparkline only if library already in project

### Phase E — i18n pass
- Replace hardcoded RU/EN strings in admin page
- Add `adminNav.finance` etc.

### Phase F — QA + security
- Browser matrix 360/390/1280
- `requireAdmin` + API route review (read-only)
- No schema/API changes

---

## Explicitly OUT OF SCOPE (this wave)

- Passport / Hotel Vault
- Manager role / permissions
- New backend calculations
- Prisma / migrations
- TST full redesign (Step 6) — only verify no regression in admin context

---

## Recommended execution order

1. ✅ Step 3 profile acceptance (authenticated QA)
2. Admin Phase A–B (shell + nav)
3. Admin Phase C (dashboard)
4. Admin Phase D sections one-by-one + browser QA each
5. i18n + security review
6. Final report per Step 4 spec §37

---

## Files likely touched (when approved)

- `src/app/dashboard/admin/page.tsx` (presentation refactor, possibly extract presentational subcomponents)
- `src/components/dashboard/AdminSidebar.tsx`
- `src/app/dashboard/admin/layout.tsx`
- New: `src/styles/admin-command-center.css`
- `src/lib/i18n/messages.ts` (admin keys)
- Possibly: `src/components/ds/DashboardShell.tsx` (admin-scoped class)

---

**BUSINESS LOGIC CHANGED:** NO (planned)  
**DATABASE CHANGED:** NO  
**API CONTRACT CHANGED:** NO  
**AUTHORIZATION CHANGED:** NO

---

*Exploration complete — awaiting Step 3 acceptance before implementation.*
