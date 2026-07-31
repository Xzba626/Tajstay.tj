# ADR-0001: Record architecture decisions

**Status:** Accepted  
**Date:** 2026-07-31

## Context

TajStay is entering a multi-phase refactor. Decisions made now (monolith vs services, API versioning, search technology) will be questioned within 12–24 months. We need a lightweight record of **why**, not only **what**.

## Decision

We use Architecture Decision Records in `docs/adr/`:

- One file per decision (`NNNN-short-title.md`)
- Status: Proposed | Accepted | Deprecated | Superseded
- Link from `TAJSTAY_STRATEGY.md` when relevant

## Consequences

- **Positive:** Onboarding, investor diligence, fewer repeated debates
- **Negative:** Small overhead per decision — acceptable

## Alternatives considered

- Wiki / Notion only — rejected (not in repo, not versioned with code)
- Comments in code — rejected (hard to discover)
