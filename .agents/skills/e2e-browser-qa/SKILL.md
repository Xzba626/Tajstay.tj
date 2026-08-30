---
name: e2e-browser-qa
description: Browser-driven QA for TajStay using Playwright MCP — navigate, click, fill forms, verify navigation and dialogs, capture screenshots. Pattern from playwright-mcp-demo self-healing loop. Use for E2E verification and regression of user flows.
disable-model-invocation: true
---

# E2E browser QA (TajStay)

Reference pattern: [playwright-mcp-demo](https://github.com/jay-yeluru/playwright-mcp-demo) — **Human scenario → AI → Browser → Test → Failure → Fix → Retest**.

## MCP setup

Project config: `.cursor/mcp.json` → `@playwright/mcp@latest`

Verify tools: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill`.

## TajStay critical flows (priority)

| ID | Flow | Entry |
|----|------|-------|
| F1 | Guest search → hotel → checkout start | `/search` |
| F2 | History tabs | `/history?tab=confirmed` … `all` |
| F3 | Profile center links | `/profile` → subpages |
| F4 | Favorites | `/favorites` |
| F5 | TST Assistant open/close + History intent | any page + FAB |
| F6 | Auth sign-in / sign-out | `/auth/sign-in` |
| F7 | Payment continuation | `/payment/[code]` when seed has unpaid booking |

## Execution rules

1. Read `e2e/test-plan.md` for scenario wording.
2. Use **accessibility snapshots** before clicking — do not guess selectors from code alone.
3. On failure: capture snapshot + screenshot → fix code → **retest same scenario**.
4. Do not assert PASS if browser step was skipped.

## Future Playwright test suite (optional)

When adding `@playwright/test`:

- Page objects under `e2e/pages/`
- Fixtures under `e2e/fixtures/`
- Specs generated from MCP-verified flows
- CI: `npx playwright test` on PR for smoke subset

## Self-healing loop

```
Scenario fails → MCP inspect live DOM → update locator/component → rerun scenario
```

Never heal by disabling assertions.
