---
name: human-like-qa
description: Walks TajStay in a real browser as a human user would — clarity, errors, mobile UX, empty states, navigation recovery. Use after UI/flow changes before marking PASS. Requires dev server or deployed preview.
disable-model-invocation: true
---

# Human-like QA (TajStay)

**Do not** mark UX tasks complete from code review alone.

## Prerequisites

- App running: `npm run dev` (default `http://localhost:3000`)
- Browser: Playwright MCP (`.cursor/mcp.json`) or cursor-ide-browser

## Walkthrough script

1. Set viewport **390×844** (mobile) first; repeat critical paths at **1280×800** (desktop).
2. Sign in with test guest if flow requires auth (see README / seed docs).
3. Execute the user journey step by step; screenshot on failure.

## Checklist

- [ ] Obvious what to do next within 3 seconds
- [ ] Feedback after every action (loading, success, error)
- [ ] Back / cancel works; no dead ends
- [ ] Bottom nav correct; History ≠ Profile duplicate
- [ ] No overlapping FAB/drawer blocking taps
- [ ] Errors human-readable (ru/tg/en if visible)
- [ ] Empty states explain what to do
- [ ] No accidental data loss (confirm on logout, destructive actions)
- [ ] Feels like a **finished commercial product**, not a dev prototype

## Report format

```markdown
## Human-like QA — [flow name]

**Viewport:** mobile | desktop
**Result:** PASS | FAIL

### Friction points
1. ...

### Blockers
- ...

### Screenshots / steps
- ...
```

## Pair with

- `e2e-browser-qa` for repeatable scenarios
- `critique` / `design-taste` for visual issues
