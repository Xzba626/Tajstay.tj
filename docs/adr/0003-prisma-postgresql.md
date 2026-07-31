# ADR-0003: Prisma + PostgreSQL

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Data model includes relational inventory (rooms, bookings, date ranges), financial records, and encrypted PII. SQLite was explicitly removed from the project.

## Decision

- **PostgreSQL** as sole production database (Neon in cloud)
- **Prisma** as ORM and migration tool
- `DATABASE_URL` (pooled) + `DIRECT_URL` (migrations)
- No Prisma enums for domain statuses — string constants in `lib/domain/` for flexibility

## Why not alternatives?

| Alternative | Why not |
|-------------|---------|
| **Drizzle** | Migration cost; Prisma already entrenched (42 models, 30+ migrations) |
| **Raw SQL** | Loses type safety and migration ergonomics |
| **MongoDB** | Booking overlap queries and transactions fit SQL |
| **MySQL** | Team standardized on Postgres/Neon |

## Consequences

- **Positive:** Mature migrations, typegen, good DX
- **Negative:** N+1 risks (audit found); need indexes + batch queries
- **Phase 0:** Add advisory locks / transactions for booking; consider PG `EXCLUDE` constraint long-term

## Related

ADR-0008 (atomic booking)
