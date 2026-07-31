# ADR-0006: Feature flags for rollout

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Refactor touches booking, payments, owner onboarding — high blast radius.

## Decision

All user-facing behavioral changes ship behind flags (env or DB table → LaunchDarkly later). Registry in `TAJSTAY_STRATEGY.md` §8.

Phase 0 flags: `booking.atomicCreate.v2`, `security.privateBlob.v2`

## Consequences

- Enables gradual rollout and instant rollback
- Requires discipline: no flag sprawl; remove after 100% rollout

## Experiment framework (lightweight)

When running experiments:

- **Success metric** tied to CBM or funnel step
- **Guardrails:** error rate, p95 latency, support volume
- **Duration:** minimum 2 weeks or N bookings
- Log `experimentId` in `AnalyticsEvent` (ADR-0007)
