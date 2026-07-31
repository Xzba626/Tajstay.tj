# ADR-0007: AnalyticsEvent collector

**Status:** Proposed (Phase 1)  
**Date:** 2026-07-31

## Context

No product analytics SDK. `HotelViewTracker` writes localStorage only. Cannot measure funnel or CBM drivers.

## Decision

Add `AnalyticsEvent` Prisma model + `POST /api/internal/events` (or server-side insert from use-cases):

```text
type, userId?, hotelId?, bookingId?, payload (JSON), createdAt
```

Minimum events Phase 1: `search_submitted`, `hotel_view`, `booking_step_*`, `booking_created`, `proof_submitted`, `booking_confirmed`, `owner_application_*`, `property_wizard_step_*`

Nightly aggregation → admin funnel + business metrics snapshot.

## Why not PostHog-only?

- PostHog acceptable as **frontend supplement** later
- Server-side events required for authoritative booking funnel (ad blockers, SSR)

## Consequences

- Enables CBM decomposition and experiment framework
- Storage growth — partition/archive events >90 days
