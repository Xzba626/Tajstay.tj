# ADR-0005: v2 API parallel to v1

**Status:** Accepted  
**Date:** 2026-07-31

## Context

142 API routes exist under `/api/*`. Breaking clients during refactor is unacceptable. Mobile and partner API are planned Year 2.

## Decision

- Introduce `/api/v2/*` for new contracts
- v1 remains until consumers migrate
- Deprecation headers on v1 endpoints when v2 stable
- OpenAPI spec generated from v2 routes (Phase 1)

## Consequences

- Temporary duplication — acceptable
- Feature flags route traffic to v2 handlers when ready

## Alternatives

- Big-bang replace v1 — rejected (too risky)
