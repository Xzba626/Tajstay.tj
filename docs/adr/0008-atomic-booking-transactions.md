# ADR-0008: Atomic booking creation

**Status:** Proposed (Phase 0 — **required before scale**)  
**Date:** 2026-07-31

## Context

Stress test: **4 of 5** concurrent `POST /api/bookings` succeeded for same room/dates. Root cause: `assertDatesAvailable()` then gap then `booking.create()` without transaction or lock.

## Decision

Implement `createBooking` use-case:

1. `prisma.$transaction`  
2. Re-run availability check **inside** transaction  
3. `pg_advisory_xact_lock(roomId)` or `FOR UPDATE` on room row  
4. Create booking + payment + transactionLog atomically  
5. Ship behind `booking.atomicCreate.v2` flag; load test before default on

Long-term: PostgreSQL `EXCLUDE` constraint on occupying statuses per room + daterange.

## Alternatives

| Option | Notes |
|--------|-------|
| Serializable isolation | Heavier contention; try advisory lock first |
| Application-only mutex | Fails across serverless instances |

## Consequences

- Eliminates confirmed race; unblocks investor/stakeholder trust
- Slight latency increase on booking create — acceptable

## Verification

`scripts/audit-stress-test.mjs` must show **≤1 success** per concurrent batch.
