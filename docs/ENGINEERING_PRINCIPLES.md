# TajStay — Engineering Principles

Binding conventions for all contributors. Exceptions require an ADR.

---

## Architecture

1. **Modular monolith first** — clear module boundaries; extract services only with measured need.  
2. **API-first** — business capabilities exposed via versioned HTTP APIs (v2 target).  
3. **Use-cases own business logic** — routes/pages are thin; no complex Prisma in `page.tsx`.  
4. **No direct Prisma in route handlers** (target) — call `lib/use-cases/*` or `lib/services/*`.  
5. **DTOs at boundaries** — never leak Prisma models to client components.  
6. **Server Components by default** — Client Components only for interactivity.  
7. **Never duplicate business logic** — one implementation; delete legacy paths after migration.

---

## Data & money

8. **Money never as float** — `Decimal` / integer minor units in DB; format at presentation.  
9. **UTC inside DB** — store instants in UTC; timezone at presentation (`Hotel.timezone` → `Asia/Dushanbe` until multi-region).  
10. **Transactions for multi-write flows** — booking + payment + log must be atomic (Phase 0).  
11. **Check-then-act is insufficient** for inventory — re-validate inside transaction or use DB constraints.

---

## Security

12. **PII encrypted at rest** — owner application fields via `OWNER_DATA_ENCRYPTION_KEY`.  
13. **Private files never public blob** — signed URLs for admin access only.  
14. **RBAC enforced in middleware + use-case** — defense in depth.  
15. **Rate limit auth and write endpoints** — already started; extend consistently.  
16. **Secrets never in repo** — env only; rotate on leak.

---

## Quality

17. **Feature flags for user-facing changes** — see `TAJSTAY_STRATEGY.md` registry.  
18. **No merge without green CI** — lint, typecheck, build (tests growing over time).  
19. **Structured logging** — JSON with `requestId`, `userId`, `bookingId` where applicable.  
20. **Errors are typed** — domain errors → HTTP mapping in one place.

---

## UX & performance

21. **Respect performance budget** — see `TAJSTAY_STRATEGY.md` §10; measure p50/p95.  
22. **i18n for user-visible strings** — no new hardcoded Cyrillic in components.  
23. **`router.refresh()` sparingly** — prefer targeted cache invalidation or client hooks as we mature.

---

## Process

24. **ADR for significant decisions** — `docs/adr/`.  
25. **Definition of Done per phase** — `docs/DEFINITION_OF_DONE.md`.  
26. **Smallest correct diff** — refactor in place behind flags before big-bang deletes.

---

## Folder conventions (target)

```text
src/
  app/              # Routes only
  components/       # UI
  lib/
    use-cases/      # Write operations / orchestration
    services/       # Read queries / shared logic
    domain/         # Types, status sets, validators
    integrations/   # External APIs (Firebase, Resend, …)
  hooks/            # Client hooks
```

Naming: `kebab-case` files; `PascalCase` components; `camelCase` functions; enums as `const` objects in `domain/` (Prisma uses strings).

---

## Testing (direction)

- **Unit:** use-cases (booking, cancel, availability).  
- **Integration:** API routes against test DB.  
- **E2E:** critical paths (booking, owner wizard) — Phase 2+.  
- **Stress:** concurrent booking must pass before `booking.atomicCreate.v2` flag on.
