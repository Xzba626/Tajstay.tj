# TajStay current state

Read this before anything else. Then load only the skill matching NEXT (see `CLAUDE.md` → Skill routing).
Do not re-read old audit reports or the full MASTER spec unless the task requires it.

## Branch / SHA

- Branch: `feature/tajstay-full-ui-ux-rebuild`
- Base SHA (as of this file): `8773d8d5280951fece934ac0439e006264c45505`

## Current authorized block

**FULL TAJSTAY VISUAL MIGRATION + HUMAN BROWSER WALKTHROUGH** (local).
White canvas + brand green `#0F7A4D` only. Lock Admin/Owner mobile header + bottom nav + More drawer so they
never hide or jump.

**Do not start P0-S2** (AuthZ / destructive-ops / RBAC prep) without explicit user authorization.

## DONE

- P0-S1 security remediation: secret-word primitive removed as an authN factor; owner recovery
  invalidate + rate-limit + email-only (no plaintext UI token); credentials fail-closed;
  `AdminAuditLog` wired on recovery / credentials / admin self-security / emergency.
  Tests: `npx tsx scripts/security-p0-s1-tests.ts` — 15/15 PASS on local test DB.
- Lightweight Claude Code architecture set up (this session): root `CLAUDE.md`, `.claude/skills/*`
  (design, security, browser-qa, owner-crm, admin-crm, database-safety), this `STATE.md`.

## OPEN

- P0-S2 (AuthZ / destructive ops / RBAC prep) — not started, needs explicit authorization first.
- P0-R1 (500 traces + blank-panel root cause) — not started.
- Production secret-hash state after P0-S1 — UNKNOWN, needs runtime verification against production, not local.
- HTTP E2E Guest/Owner→admin 403 suite — not built.
- Pending phone/email verification flow — not built (intentionally fail-closed for now).
- Design System Foundation / shells visual migration — blocked on P0-S1+ closure per MASTER spec; current
  block above is the local visual pass, full Design System Foundation is still pending.

## DO NOT TOUCH without explicit approval

- Production database (schema, migrations, direct access)
- Authentication / authorization core
- Booking engine invariants
- Payment capture flows
- Security-critical env secrets / credentials

## NEXT

Continue the FULL TAJSTAY VISUAL MIGRATION + HUMAN BROWSER WALKTHROUGH block (local): white canvas +
`#0F7A4D` only, locked Admin/Owner mobile chrome, then human-like browser QA evidence
(`tajstay-browser-qa`) before claiming PASS on any touched screen.

Product architecture authority is now `docs/TAJSTAY_ARCHITECTURE_V2.md` (added 2026-09-09) — read it
only when a task needs product-scope detail beyond the current block; it does not change which block
is authorized right now or unlock P0-S2/protected domains on its own.

## Update discipline

Update this file only at the end of a logical block (not every small edit): move finished items DONE→,
adjust NEXT, and update SHA. Do not paste long specs here — link to the `.cursor/rules/*.mdc` file instead.
