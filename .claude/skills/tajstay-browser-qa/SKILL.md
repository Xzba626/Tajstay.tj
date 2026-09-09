---
name: tajstay-browser-qa
description: Human-like browser QA for TajStay — walks a real flow as a guest/consumer/owner/admin at mobile and desktop viewports, checks empty/error states and navigation recovery, cites URL+SHA as runtime evidence. Use after any shipped UI/flow change, before marking PASS.
---

# TajStay browser QA

Do not mark a UX task complete from code review alone — `PASS` requires runtime evidence.

## Tooling

Use the built-in `claude-in-chrome` browser tools (`mcp__claude-in-chrome__*`) in this environment — load them
via `ToolSearch` if not already loaded. Do not add a second Playwright MCP server for Claude Code;
`.cursor/mcp.json` (Playwright MCP) is Cursor-only and unrelated to this session.

## Walkthrough script

1. Start the app (`npm run dev`, default `http://localhost:3000`) or use the deployed preview URL the user gave.
2. Set viewport **390×844** (mobile) first for consumer-facing flows; repeat critical paths at **1280×800**
   (desktop). Owner/Admin CRM: check both sidebar (desktop) and bottom-nav (mobile) shells.
3. Sign in with the correct role for the flow (guest / consumer / owner / admin) — do not test Admin-only
   permission logic as a guest.
4. Execute the journey step by step; screenshot on failure.

## Checklist

- Obvious what to do next within 3 seconds
- Feedback after every action (loading, success, error)
- Back / cancel works; no dead ends
- Bottom nav / sidebar correct for the shell; History is not duplicated outside `/history`
- No overlapping FAB/drawer blocking taps
- Errors human-readable (ru primary; tg/en if visible) — no raw enum strings (`PENDING`, `MEDIUM`, etc.)
- Empty states explain what to do, not a blank white panel
- Destructive actions (logout, delete) require confirmation
- Feels like a finished product, not a dev prototype

## Report format

```
## Human-like QA — [flow name]
Viewport: mobile | desktop
Result: PASS | FAIL | BLOCKED
Evidence: [deployment URL] @ [commit SHA]

### Friction points
### Blockers
### Screenshots / steps
```

Never mix production (`tajstay.site`) and a Vercel preview as the same evidence baseline.

## Read next

- `.agents/skills/human-like-qa/SKILL.md`, `.agents/skills/e2e-browser-qa/SKILL.md` — fuller scripts/checklists
- `.cursor/rules/tajstay-quality-gate.mdc` — when browser QA is required vs optional
