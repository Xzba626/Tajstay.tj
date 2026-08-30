---
name: ralph
description: TajStay Ralph autonomous loop — PRD-driven implement/test/fix cycles via Cursor agent. Use when user asks for ralph session, prd.json, or autonomous multi-story execution. Never auto-change production DB, auth, booking engine, or payments without explicit approval.
disable-model-invocation: true
---

# Ralph (TajStay)

Upstream: [taberoajorge/ralph](https://github.com/taberoajorge/ralph). Project templates: `ralph/`.

## TajStay guardrails (non-negotiable)

Ralph stories **must not** silently:

- Run `prisma migrate dev` against production
- Change auth/session middleware without review
- Alter booking classification (`classify.ts`) without TZ
- Add payment/card capture outside `/payment/[code]`
- Push or deploy without user request

Split such work into **human-approval** stories.

## Setup

1. Copy scripts from upstream if needed: `ralph/scripts/` (not committed — install from repo).
2. Edit `ralph/prd.json` — small stories with verifiable acceptance criteria.
3. Edit `ralph/prompt.md` — TajStay context + test commands.
4. Run: `cd ralph && ./ralph-cursor.sh` (requires `agent` CLI).

## Story quality

Each story needs:

- Clear acceptance criteria (`npm run lint`, `npx tsc --noEmit`, specific URL behavior)
- `passes: false` until verified
- Scope small enough for one agent iteration

## Loop

```
Task → Analyze → Implement → Test → Evaluate → Fix → Retest → Commit → Next
```

Pause: `touch ralph/.ralph-pause` | Stop: `touch ralph/.ralph-done`

## Pair with

- `tajstay-quality-gate` before marking any story passed
- `human-like-qa` for UI stories
