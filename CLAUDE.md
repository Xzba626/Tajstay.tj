# TajStay — Claude Code project rules

TajStay is an existing, production-oriented Next.js 14 hotel-booking platform.
One brand · four shells: **Public Desktop** · **Consumer Mobile/PWA** · **Owner CRM** · **Admin CRM**.
Shared design system, different information architecture per shell.

**Start every session:** read `.agent/STATE.md` first. It has the current branch, SHA, active block,
DONE/OPEN/NEXT. Do not re-read this file's full history or old audit reports unless the task needs them.

**Product architecture authority:** `docs/TAJSTAY_ARCHITECTURE_V2.md`. When older specs conflict with
V2 on product architecture, V2 wins — but only within whatever BLOCK is currently authorized in
`.agent/STATE.md`; V2 does not itself authorize touching a protected domain (see Hard stops / Protected
domains below).

## Hard stops

- No one-shot rewrite of the whole app. Work only the explicitly authorized BLOCK (see STATE.md), then stop and report.
- No production DB wipe / destructive prod probes without explicit user permission.
- Frontend ≠ AuthZ — backend must enforce every permission check.
- Never claim `PASS` from code/build inspection alone for user-facing or security-sensitive changes — see Evidence gates below.
- Canonical brand spelling: **TajStay** (not Tajstay/TAJSTAY/Taj Stay in product copy). In-app assistant: **TST Assistant**.
- Canonical brand color: `#0F7A4D` (deep green) on white/near-white canvas. No alternate green shades, no mint/light text on white, no full-page green tint.

## Explore before build

Do not assume the current implementation is correct or missing.

1. Study existing code first (`rg`, `git diff`, `git status`, route inventory) before writing new code.
2. Do not create parallel/duplicate components, routes, models, or status systems (e.g. no `HistoryCard2`, second booking classifier).
3. Extend minimally — smallest change that fits the existing module.
4. Task spec wins over existing code, but only within that task's scope — do not refactor unrelated areas.
5. Never recursively read the whole repository unless the task is an explicit repo-wide audit.

Canonical modules (do not duplicate): `src/lib/trips/classify.ts` (History classification), `src/lib/trips/urls.ts`,
`src/components/trips/HistoryRecordCard.tsx`, `src/lib/domain/booking.ts` (`BOOKING_STATUS`), `src/lib/i18n/format.ts` / `plural.ts`.
Full detail: `.cursor/rules/tajstay-explore-before-build.mdc`.

## Evidence gates

Statuses: `PASS | FAIL | BLOCKED | UNKNOWN`. `PASS` requires evidence beyond grep/build — runtime evidence for
anything user-facing (dev server walkthrough, browser check, or deployed screenshot).
Every runtime/visual claim must cite **deployment URL + exact commit SHA** — production `tajstay.site` is never
mixed with a Vercel preview as the same baseline.

## Skill routing

Load the skill that matches the task instead of reading unrelated specs:

| Task touches | Load |
|---|---|
| Layout, visual polish, redesign, color/spacing/typography | `tajstay-design` |
| Auth, RBAC, sensitive data, payments, admin audit, recovery | `tajstay-security` |
| Verifying a shipped UX/flow change in a real browser | `tajstay-browser-qa` |
| Owner workspace: hotels, rooms, bookings, owner finance/analytics | `tajstay-owner-crm` |
| Admin workspace: users, moderation, complaints, admin finance | `tajstay-admin-crm` |
| Prisma schema/migrations, seed data, production DB access | `tajstay-database-safety` |

Load at most one or two skills per task. Never load the full set for a small change.

## Quality gate (minimum by change type)

| Change | Minimum gate |
|---|---|
| Any code | `npx tsc --noEmit` |
| TS/TSX | `npm run lint` on touched areas |
| UI / layout | Real browser check (`tajstay-browser-qa`) + design review |
| Routes / nav | Verify bottom nav + deep links; no duplicate History |
| Auth / payment / booking / API | Security review (`tajstay-security`) — no silent data mutation |
| i18n-visible text | ru / tg / en keys present in `messages.ts` |

Full production-ready checklist: `.cursor/rules/tajstay-quality-gate.mdc`.

## Protected domains (explicit user approval required)

- Production database schema, migrations, or direct prod DB access
- Authentication / authorization core
- Booking engine invariants
- Payment capture flows
- Security-critical env secrets / credentials

## Subagents & Plan Mode

Use the `Agent` tool point-wise, not as a fleet: a security-focused review only when auth/payments/permissions
change, a browser-QA pass only after a logical UI block is done. Do not spawn agents for routine edits (CSS tweak,
copy fix, small bug).

Use Plan Mode for genuinely architectural or hard-to-reverse decisions (new CRM entity model, RBAC redesign,
financial model changes, DB migrations, deployment changes). Small implementations (padding, copy, a single
component) go straight to action.

## Existing AI tooling in this repo

`.cursor/rules/*.mdc` and `.agents/skills/*` are the Cursor-side rule/skill stack and remain the source of truth for
full detail — the `.claude/skills/*` skills here are thin Claude Code routers that point back into them, not a
duplicate spec. `.agents/skills/security/*` (OWASP/LLM/threat-modeling subset) and better-web-ui skills
(`add-ui`, `polish`, `arrange`, `critique`, `a11y`, …) are readable files under `.agents/skills/` — `Read` them
directly when a task needs that depth; they are not auto-discovered by Claude Code.

Browser automation for QA is already built in (`mcp__claude-in-chrome__*` / the `claude-in-chrome` skill) —
do not add a second Playwright MCP server for Claude Code; `.cursor/mcp.json` is Cursor-only.

`ralph/` is an autonomous-loop harness (Ralph technique) with its own guardrails (`ralph/guardrails.md`) —
unrelated to normal interactive sessions unless the user explicitly asks to run it.
