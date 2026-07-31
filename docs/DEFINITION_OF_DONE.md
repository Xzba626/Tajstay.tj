# Definition of Done — TajStay Refactoring

A phase is **not complete** until all items below for that phase are checked.

---

## Universal DoD (every phase)

- [ ] Changes merged via PR with at least one review
- [ ] `npm run lint` passes
- [ ] `tsc --noEmit` passes (or `npm run build` in CI)
- [ ] Prisma migrations applied on staging without error
- [ ] Rollback documented (revert migration plan or disable feature flag)
- [ ] No open P0/P1 bugs in phase scope
- [ ] Release notes / changelog entry for the team
- [ ] New architectural choices recorded in `docs/adr/` if applicable

---

## Phase 0 — Critical fixes {#phase-0}

- [ ] `security.privateBlob.v2` — KYC docs not publicly accessible
- [ ] JSON owner application path without documents removed or blocked
- [ ] Fake analytics hidden or replaced with “coming soon”
- [ ] Personnel section loads hotels correctly
- [ ] `booking.atomicCreate.v2` — concurrent stress test: **0** duplicate successes
- [ ] Sentry (or equivalent) receiving errors from staging
- [ ] Phase 0.5: GitHub Actions — lint + typecheck + build on PR

---

## Phase 1 — Foundation

- [ ] `lib/use-cases/` introduced with ≥3 use-cases (createBooking, cancelBooking, …)
- [ ] `analytics.events.v1` — ≥10 event types persisted
- [ ] v2 API skeleton documented (OpenAPI draft)
- [ ] DB indexes from audit deployed
- [ ] Performance baseline recorded (p50/p95 for search, owner calendar, booking)
- [ ] Unit tests for booking availability + atomic create

---

## Phase 2 — Owner product

- [ ] `ownerWizard.v2` — 7-step wizard E2E happy path
- [ ] `ownerPanel.v2` — 9 sections live
- [ ] `ownerKyc.simplified` — ≤2 required documents
- [ ] `moderation.singleQueue` — one gate to published
- [ ] Owner onboarding metrics: p50/p95 tracked
- [ ] Documentation for owner flows updated

---

## Phase 3 — Guest product

- [ ] `payments.unifiedFlow.v2` — single canonical payment path
- [ ] Checkout reduced to ≤2 steps (behind flag)
- [ ] Funnel dashboard or PostHog equivalent for CBM drivers
- [ ] Baseline vs +20% conversion documented (or hypothesis revised)

---

## Phase 4 — Scale prep

- [ ] Search benchmark completed — ADR-004 accepted
- [ ] `search.dedicatedEngine` or `search.v2` behind flag
- [ ] Load test report archived
- [ ] DR restore drill completed and logged
- [ ] Slow query dashboard reviewed

---

## Experiment DoD (when running A/B tests)

- [ ] Hypothesis and success metric defined before launch
- [ ] Guardrail metrics defined (error rate, latency, support tickets)
- [ ] Minimum duration / sample size agreed
- [ ] Rollback criterion documented
- [ ] Feature flag + experiment ID in analytics events
