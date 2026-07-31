# ADR-0004: Search engine selection (process)

**Status:** Proposed (execute in Year 1)  
**Date:** 2026-07-31

## Context

Current search loads up to 500 hotels with nested rooms/bookings and paginates in memory (`src/lib/services/search.ts`). This fails before 10k hotels. We must improve search without prematurely locking a vendor.

## Decision

**Two-stage approach — no engine chosen today.**

### Year 0 (Phase 1–4 early)

- PostgreSQL with proper **DB-level pagination**
- Add indexes (`Hotel.status`, full-text on `name`/`city` if needed)
- Remove in-memory `slice` on full result sets
- Target: p95 **<500 ms** at current scale

### Year 1 — Benchmark gate

Evaluate candidates against **same dataset and query set**:

| Candidate | Role |
|-----------|------|
| PostgreSQL FTS + tuned queries | Baseline |
| Dedicated search engine (e.g. Typesense, Meilisearch, OpenSearch) | Challenger |

**Selection criteria (weighted):**

1. p95 latency at 10k hotels / 50k rooms  
2. Operational cost (hosting, ops hours)  
3. Faceted filters (city, price, amenities, dates)  
4. DX (indexing pipeline from Prisma changes)  
5. Multi-language (ru/tg/en)  

Winner documented in **ADR-0004-supplement** (or supersede this ADR). Migration behind `search.dedicatedEngine` flag.

## Why not pick Meilisearch now?

Audit mentioned Meilisearch as example; **vendor lock-in in strategy doc was explicitly rejected**. Benchmark may show PG FTS is sufficient until 5k hotels.

## Consequences

- **Positive:** Evidence-based choice; Phase 0–1 unblocked
- **Negative:** Two migration steps (pagination, then maybe engine)

## Owner

Engineering lead + Product (search is demand-critical)
