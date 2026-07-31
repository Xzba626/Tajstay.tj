# TajStay — Product & Engineering Strategy

**Version:** 1.0  
**Status:** Approved baseline (living document — extend via ADRs, not by bloating this file)  
**Audience:** Engineering, Product, Leadership, Investors  
**North Star:** **Confirmed Bookings per Month (CBM)**

---

## 1. Vision (summary)

Full narrative: [`docs/PRODUCT_VISION.md`](./PRODUCT_VISION.md)

> Стать основной цифровой платформой бронирования и управления размещением в Центральной Азии, объединяющей путешественников, владельцев объектов и партнёров в единую экосистему.

This strategy explains **how we build** toward that vision. Long-horizon marketplace/expansion ideas live in `PRODUCT_VISION.md`, not here.

---

## 2. Strategic priorities (order is fixed)

| # | Priority | Rationale |
|---|----------|-----------|
| 1 | Security P0 | Trust, legal, KYC |
| 2 | Atomic booking | Confirmed race condition; blocks marketplace integrity |
| 3 | Product analytics | Cannot measure ROI without funnel data |
| 4 | Owner onboarding (7-step wizard + single moderation) | **Supply** bottleneck |
| 5 | Unified payment flow | **Demand** bottleneck |
| 6 | Modular monolith + use-cases | Safe refactor foundation |
| 7 | v2 API | Mobile, partners, gradual migration |
| 8 | Real dashboards | Replace fake metrics |
| 9 | Search improvements | Pagination → dedicated engine (after benchmark) |
| 10 | Scale & international expansion | After TJ product-market fit |

---

## 3. Supply vs demand

| Supply (owners) | Demand (guests) |
|-----------------|-----------------|
| KYC / application | Search & discovery |
| Property wizard | Checkout funnel |
| Moderation SLA | Payment & proof |
| Rooms & calendar | Conversion to CBM |
| Payouts & finances | Retention & repeat |

Problems must be diagnosed in the correct lane before prescribing solutions.

---

## 4. Phased roadmap

### Phase 0 — Critical fixes (start here)

**Scope:** Security P0, atomic booking, personnel bug, hide fake analytics.  
**Parallel:** Phase 0.5 CI (lint, typecheck, build gate).

| KPI | Target |
|-----|--------|
| Double bookings in stress test | **0** |
| Open security P0 | **0** |
| CI green on `main` | **required** |

DoD: [`docs/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md#phase-0)

### Phase 1 — Foundation

Modular folders, `use-cases/`, `AnalyticsEvent`, v2 API skeleton, DB indexes.

| KPI | Target (report **p50 / p95**) |
|-----|-------------------------------|
| Owner API latency | p95 **<200 ms** |
| Search API latency | p95 **<500 ms** |
| Funnel events | **≥10** types |

### Phase 2 — Owner product

7-step property wizard, 9-section panel, simplified KYC, **one moderation gate**.

| KPI | Target (p50 / p95 / median) |
|-----|-----------------------------|
| Owner onboarding active time | p50 **<30 min**, p95 **<45 min** |
| Apply → published wall-clock | p50 **<24 h** (with SLA) |

### Phase 3 — Guest product

Unified payment UX, shorter checkout, real conversion tracking.

| KPI | Target |
|-----|--------|
| Booking funnel conversion | **+20%** vs baseline |
| Clicks to booking created | **≤5** |

### Phase 4 — Scale prep

Dedicated search engine (**after benchmark** — see ADR-004), caching, DR drills.

| KPI | Target |
|-----|--------|
| Search p95 | **<150 ms** |
| Uptime | **99.9%** |

**Year 1–3 scale targets:** 500 → 5k → 10k hotels — see [`docs/PRODUCT_VISION.md`](./PRODUCT_VISION.md).

---

## 5. Business metrics (executive)

| Metric | Definition |
|--------|------------|
| **CBM** | North Star — confirmed paid bookings / month |
| **GMV** | Sum of `totalPrice` for CONFIRMED + PAID |
| **Gross commission** | Sum of `commission` (~12% default) |
| **Take rate** | Net revenue / GMV |
| **Occupancy / ADR / RevPAR** | Standard hospitality (owner & investor reporting) |
| **Refund % / Dispute rate** | Trust metrics |

Unit economics (CAC, LTV, payback) require marketing attribution — Phase 1+ analytics.

---

## 6. Operational commitments (SLA)

| Process | Target |
|---------|--------|
| Owner application review | <24 h |
| Hotel moderation | <12 h |
| Payment proof review (business hours) | <15 min |
| Support first response | <2 h |
| P0 incident response | <1 h |

---

## 7. Risk register (summary)

Full table maintained in project tracker; top risks:

| Risk | P | I | Mitigation |
|------|---|---|------------|
| No payment gateway API | H | H | Unified manual flow + gateway pilot Y1 |
| Double booking | M | Critical | P0 atomic tx |
| TJ data/privacy law | M | H | Encryption, private blob, legal review |
| No CI | H | H | Phase 0.5 pipeline |
| Owner supply stall | M | H | Wizard + single moderation |

---

## 8. Feature flags (registry)

New user-facing behavior ships behind flags. Defaults **off** until QA sign-off.

| Flag | Phase |
|------|-------|
| `booking.atomicCreate.v2` | 0 |
| `security.privateBlob.v2` | 0 |
| `analytics.events.v1` | 1 |
| `ownerWizard.v2` | 2 |
| `ownerPanel.v2` | 2 |
| `payments.unifiedFlow.v2` | 3 |
| `search.v2` | 4 |
| `search.dedicatedEngine` | 4 (post-benchmark) |

---

## 9. Observability & CI/CD (summary)

- **Observability:** Sentry (Phase 0), structured logs, OTel (Phase 1), uptime checks, business alerts on CBM drop.
- **CI/CD:** PR → lint → typecheck → tests → build → preview → merge requires green. Details: [`docs/ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md).
- **Backup:** Neon PITR, RPO ≤1 h, RTO ≤4 h, monthly restore drill.

---

## 10. Performance budget

| Surface | p95 target | Notes |
|---------|------------|-------|
| Search API | 150 ms (Phase 4) / 500 ms (Phase 1) | |
| Booking create API | 200 ms | |
| Checkout (LCP) | 2.5 s | |
| Owner dashboard | 500 ms | |
| Shared JS (First Load) | <300 KB goal | Track on `/search`, `/dashboard/owner` |

Report **p50 and p95** — never optimize on averages alone.

---

## 11. Search engine decision (no vendor lock-in)

```
Year 0:  PostgreSQL + proper pagination + indexes
Year 1:  Benchmark (PG FTS vs dedicated engines)
         → ADR with winner
         → Migration behind search.dedicatedEngine flag
```

See [`docs/adr/0004-search-engine-selection.md`](./adr/0004-search-engine-selection.md).

---

## 12. Architecture (current target)

- **Modular monolith** — Next.js 14 App Router, PostgreSQL, Prisma.
- **Layers:** Presentation → Use-cases → Domain → Infrastructure.
- **API:** v1 legacy + v2 behind flags; partner API Year 2+.
- **Modules:** identity, catalog, booking, payments, messaging, analytics, admin.

Decisions and rationale: [`docs/adr/`](./adr/README.md).

---

## 13. Governance

| Artifact | Location | Update |
|----------|----------|--------|
| This strategy | `docs/TAJSTAY_STRATEGY.md` | Quarterly |
| Vision (5–10y) | `docs/PRODUCT_VISION.md` | Annually |
| ADRs | `docs/adr/` | Per decision |
| Engineering principles | `docs/ENGINEERING_PRINCIPLES.md` | As needed |
| Security | `docs/SECURITY_ARCHITECTURE.md` | Per major change |
| Data governance | `docs/DATA_GOVERNANCE.md` | Legal-driven |
| DoD | `docs/DEFINITION_OF_DONE.md` | Per phase |

**Rule:** Do not grow this file with new decisions — add an ADR and link it here.

---

## 14. What we are not doing yet

- Microservices (until team/load justify extract)
- Fixing vendor choice for search (benchmark first)
- Year 4+ marketplace features in codebase (vision only)
- Expanding strategy doc instead of shipping Phase 0

---

## 15. Next action

**Implement Phase 0.** Track progress against DoD and feature flags. Record deviations in ADRs.

Prior audit artifacts remain in `docs/audit/` for historical reference.
