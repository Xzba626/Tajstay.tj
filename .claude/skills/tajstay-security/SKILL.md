---
name: tajstay-security
description: TajStay security rules — auth, RBAC, tenant isolation, sensitive data (passport, credentials), admin audit, payments, recovery flows, destructive-operation gating. Use for any task touching login, permissions, owner/admin credentials, payments, or bookings' authorization.
---

# TajStay security

Security priority order (before any redesign): **P0-S1** secret-word / owner recovery / fail-close credentials /
Admin Audit → **P0-S2** AuthZ / destructive ops / RBAC prep → **P0-R1** 500 traces + blank-panel root cause →
then Design System / shells / screens. Do not start P0-S2 or later phases without explicit user authorization
— check `.agent/STATE.md` for what is currently authorized.

## Non-negotiables

- Frontend checks are UX only — every permission/ownership check must be enforced server-side.
- No admin-settable owner password as a CRM field. Only: send a one-time, short-lived, hashed-at-rest recovery
  token; invalidate previous tokens; never log the token; rate-limit; write to `AdminAuditLog`; invalidate
  sessions after success or a critical change.
- Phone/email changes for owners/admins go through separate confirmed flows with audit + notification —
  never an inline CRM text field silently overwriting contact info.
- Role change / blocking / hotel moderation require confirm + reason, and must hit `AdminAuditLog`.
- Do not hardcode `if role === ADMIN → allow all` — leave room for Super Admin / Ops / Moderator / Support / Finance.
- Never accept or store plaintext passwords, card data, or secrets inside chat/TST Assistant flows.
- TST session API must always `requireUser` and scope by `session.id` — never trust a client-supplied userId.

## Known baseline (verify current state before assuming fixed)

- `ADMIN_SECRET_WORD ?? "tajstay-secret"` default in `src/lib/admin-security.ts` was a P0 secret-word primitive —
  P0-S1 remediation removed it as an authN factor; confirm production secret-hash state before relying on this.
- `src/lib/services/riskScoring.ts` emits raw English risk strings (`needs moderation`, `HIGH|MEDIUM|LOW`) —
  must go through an i18n/presentation map before reaching Admin UI, never raw.
- `/api/admin/users/credentials` updates phone/email + deletes sessions; `reset-password/route.ts` uses a hashed
  token + 1h expiry + httpOnly cookie handoff — verify single-use, prior-token invalidation, rate limits, and
  audit are actually wired before treating this as closed.

## Report format

State findings as `PASS | FAIL | BLOCKED | UNKNOWN` with the exact code path checked — never "looks secure" from
reading UI copy alone; UI text changes are not a remediation for a storage/AuthZ issue.

## Read next (only what the task needs)

- `.cursor/rules/tajstay-shells-architecture.mdc` — P0 SECURITY / P0 DATA section, Owner Access detail
- `.agents/skills/security/*` (`agent-security`, `api-security`, `owasp-top-10-web`, `llm-top-10`,
  `prompt-injection`, `dependency-scanning`, `threat-modeling`, `secure-code-review`, `ai-data-privacy`) —
  `Read` the one matching the current change
- `.agents/skills/security-review`, `security-ux` — review checklists
- `scripts/security-p0-s1-tests.ts` — run via `npx tsx scripts/security-p0-s1-tests.ts` after touching P0-S1 areas

## Protected without explicit approval

Production DB schema/migrations, auth/authorization core, booking engine invariants, payment capture, security
secrets. Stop and ask rather than proceeding — same list `ralph/guardrails.md` enforces for autonomous runs.
