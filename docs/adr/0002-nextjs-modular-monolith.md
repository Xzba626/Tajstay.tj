# ADR-0002: Next.js modular monolith

**Status:** Accepted  
**Date:** 2026-07-31

## Context

TajStay is a single Next.js 14 App Router application. Team size is small. We need fast iteration for TJ market fit before optimizing for hyperscale.

## Decision

Stay on **Next.js modular monolith** (not microservices, not separate Nest/Go API server) through at least **10k hotels / ~100k users**.

Internal structure:

- Route handlers thin → `lib/use-cases/`
- Domain logic in `lib/domain/`
- Optional future extract: search, notifications (Year 3+) — only if metrics justify

## Why not alternatives?

| Alternative | Why not now |
|-------------|-------------|
| **NestJS / separate API** | Duplicates auth, deployment, types; team already on Next |
| **Go/Rust API** | Hiring & velocity cost; no proven bottleneck isolated yet |
| **Laravel/PHP** | Full rewrite; no business case |
| **Microservices** | Operational overhead; double booking fix doesn't need services |
| **Turborepo monorepo** | Premature until mobile + partner API need shared packages (Year 2) |

## Consequences

- **Positive:** One deploy, shared types, Vercel-native, SSR + API colocated
- **Negative:** Large pages (`owner/page.tsx` 1605 lines) until Phase 1 split — mitigated by route-per-section refactor
- **Risk:** Must enforce module boundaries via code review + use-cases

## Review trigger

Revisit when: team >15 engineers, or single module needs independent scaling (search QPS >10x rest).
