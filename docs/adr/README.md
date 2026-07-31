# Architecture Decision Records (ADR)

We document significant technical decisions here. **Do not** append long decision prose to `TAJSTAY_STRATEGY.md` — add an ADR and link it.

## Status

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](./0002-nextjs-modular-monolith.md) | Next.js modular monolith | Accepted |
| [0003](./0003-prisma-postgresql.md) | Prisma + PostgreSQL | Accepted |
| [0004](./0004-search-engine-selection.md) | Search engine selection process | Proposed |
| [0005](./0005-v2-api-parallel-migration.md) | v2 API parallel to v1 | Accepted |
| [0006](./0006-feature-flags-rollout.md) | Feature flags for rollout | Accepted |
| [0007](./0007-analytics-event-collector.md) | AnalyticsEvent collector | Proposed |
| [0008](./0008-atomic-booking-transactions.md) | Atomic booking creation | Proposed (Phase 0) |

## Template

New ADRs: copy structure from `0001`, increment number, set status to Proposed → Accepted after review.

## Alternatives considered

When rejecting an option (Nest, Go, microservices, Meilisearch, etc.), record **why not** in the ADR — future readers will not remember the debate.
