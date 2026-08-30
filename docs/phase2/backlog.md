# TajStay Phase 2 — Implementation Backlog (Waves 0–8)

**Baseline commit:** `5166e303` (`cleanup-project`)  
**Audit reference:** `docs/audits/tajstay-product-audit.md`  
**Audit commits noted:** `4ebda0c` (merge PR #83), `7464477` (not in local tree — verify on remote)

---

## Pre-flight status

| Item | Status |
|------|--------|
| Phase 1 audit | Done |
| `.better-web-ui.md` | **Deferred → Wave 1** |
| Playwright MCP | Configured in `.cursor/mcp.json`; runtime availability **environment-dependent** |
| Skills / rules | `.agents/skills/`, `.cursor/rules/` present |
| Prisma/Vercel | `vercel.json` + `scripts/ensure-direct-url.mjs`; no `scripts/vercel-build.mjs` |

---

## Dependency map (critical path)

```text
Wave 0 (trust blockers)
  └─ Wave 1 (design tokens / .better-web-ui.md)
       └─ Wave 2 (traveler UX) — depends on tokens + Wave 0 i18n/dates
       └─ Wave 3 (owner onboarding) — depends on Wave 0 city + Wave 1 forms
       └─ Wave 4 (owner workspace) — depends on Wave 3 + payment model clarity
       └─ Wave 5 (admin command center) — depends on Wave 1 data-viz + Wave 4 booking model
       └─ Wave 6 (TST) — depends on Wave 1 sheet/modal tokens
       └─ Wave 7 (chat + security) — parallel after Wave 0
       └─ Wave 8 (polish/a11y) — last
```

**Security gate (cross-cutting):** hotel isolation, manager RBAC, TST prompt injection — before Wave 4 manager accounts and Wave 6 TST expansion.

---

## Wave 0 — Trust blockers

| Audit ID | Task | Priority | Status |
|----------|------|----------|--------|
| UX-003 (P2) | Telegram raw config error → user-facing unavailable state | P0 process | **Done** |
| OWNER-001 | Owner city false validation → canonical city select + API normalize | P1 | **Done** |
| UX-001 (cookie) | Cookie banner above bottom nav + TST FAB | P1 | **Done** |
| OWNER-002 | Payment methods duplication → finances section only | P2 | **Done** |
| NAV-001 (booking) | History tab not active during `/booking` flow | P2 | **Done** |
| BOOKING-001 | Locale-aware booking dates + readable formatted hint | P2 | **Done** |
| UI-002 | Premium photo placeholder (no fake images) | P2 | **Done** |
| I18N-001 | Hero aria-labels localized | P2 | **Done** |

---

## Wave 1 — Design foundation

- Create `.better-web-ui.md` (project design config)
- Unify light-surface tokens (white bg + green accent system)
- Status colors: booking, occupancy, payment
- Form, sheet, empty, loading, error primitives
- Logo usage audit (full vs mark vs icon)

**Audit targets:** UX-001 mobile home, UI-001 brand casing, split design languages

---

## Wave 2 — Traveler

- Mobile home discovery modules (without duplicating desktop)
- Search city chips on mobile
- Booking flow step clarity (UX only)
- Property mobile CTA stickiness
- Tours nav strategy (NAV-001 placeholder)

**Keep:** Profile Center, History hub IA

---

## Wave 3 — Owner onboarding (radical simplify)

- Phase 1: account + minimal hotel (name, location, map, photo, contact)
- Progressive verification profile (80% bar)
- Defer heavy documents post-submission
- `PILOT_MODE` flag architecture (UX simplify, no auth bypass)

**Audit:** OWNER-001 EXTREME load

---

## Wave 4 — Owner workspace

- Command center: Today / occupancy / revenue visual
- Room creation progressive disclosure
- Mobile occupancy day-view (OWNER-004)
- Online/offline unified booking model UI
- Manager accounts + hotel isolation (schema + RBAC)

---

## Wave 5 — Admin command center

- Attention inbox (applications, complaints, risk)
- Visual analytics (purpose-driven charts only)
- ADMIN-001 redesign

---

## Wave 6 — TST

- Floating FAB + auto-dismiss greeting bubble
- Mobile bottom sheet (non-blocking)
- Desktop compact side panel
- TST security review (prompt injection, cross-tenant)

---

## Wave 7 — Chat + security

- Chat UX hierarchy
- IDOR/BOLA audit owner/manager/admin
- Guest identity document architecture (legal review — no passport in PG)

---

## Wave 8 — Polish

- a11y pass
- i18n tg full walkthrough
- Performance + regression (Playwright from `e2e/test-plan.md`)

---

## Ralph eligibility

Independent Ralph tasks **after** Wave 0 QA gate + security gate:

- I18N string sweep (scoped files)
- Photo placeholder adoption (remaining components)
- Admin chart components (single metric each)

**Not Ralph-ready yet:** owner onboarding redesign, manager RBAC, admin command center (need architecture gate).
