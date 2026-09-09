---
name: tajstay-database-safety
description: TajStay Prisma/database safety — migrations, seeding, production DB access, DIRECT_URL requirement. Use for any schema change, migration, seed script, or task that could touch a live database.
---

# TajStay database safety

Production database schema, migrations, and direct production DB access are a **protected domain** — get
explicit user approval before running anything against production, even a read-only-looking script, unless the
user has clearly already authorized it for this session.

## Rules

- Never run a destructive command (`prisma migrate reset`, `DROP DATABASE`, `git reset --hard`,
  `git push --force`) without the user explicitly asking for it in this session.
- Migrations against a pooled connection must go through `scripts/ensure-direct-url.mjs` first
  (`node scripts/ensure-direct-url.mjs prisma migrate deploy`) — never migrate via a pooler-only URL
  (see `package.json` → `prisma:deploy`, `doctor`).
- Local schema iteration: `npm run prisma:generate` / `npm run prisma:migrate` (`prisma migrate dev`) against
  the local/dev database only.
- Seeding: `npm run db:seed` (`prisma db seed` → `prisma/seed.ts`) — dev/test data only, never seed over
  production.
- After touching P0-S1 security-adjacent schema (admin audit, credentials, recovery tokens), re-run
  `npx tsx scripts/security-p0-s1-tests.ts` against the local test DB.
- Do not invent a second booking/status system in the schema — extend `src/lib/domain/booking.ts`
  (`BOOKING_STATUS`) and the existing Prisma models.

## Read next

- `ralph/guardrails.md` — "Protected domains need approval", "DIRECT_URL for Vercel migrate"
- `.cursor/rules/tajstay-shells-architecture.mdc` — P0 DATA/RUNTIME section (outlier amounts, KPI coverage,
  state matrix)
- `tajstay-security` — when a schema/migration change touches credentials, audit log, or RBAC
