# TajStay AI Development Stack

Project-scoped skills, rules, and MCP configuration for Cursor.

## Install external skill packages

**Status:** better-web-ui (18 skills) and SecuritySkills (9 skills) are installed under `.agents/skills/`.

Re-install or update:

```bash
powershell -File scripts/install-better-web-ui.ps1
powershell -File scripts/install-security-skills.ps1
npx skills update   # better-web-ui updates
```

After (re)install, run **`/setup`** once in Cursor to generate `.better-web-ui.md` for this repo.

## Project-native skills (committed)

| Skill | Path | Role |
|-------|------|------|
| Explore before build | `.agents/.cursor/explore-before-build.md` | Engineering — canonical architecture |
| TajStay orchestration | `.agents/skills/tajstay-orchestration/SKILL.md` | Meta — which agent to invoke |
| Human-like QA | `.agents/skills/human-like-qa/SKILL.md` | QA — real-user product walkthrough |
| Ralph loop | `.agents/skills/ralph/SKILL.md` | Autonomous task execution |
| E2E with browser | `.agents/skills/e2e-browser-qa/SKILL.md` | QA — Playwright MCP flows |

## Rules (`.cursor/rules/`)

| Rule | alwaysApply | Purpose |
|------|-------------|---------|
| `tajstay-explore-before-build.mdc` | yes | Architecture guardrails |
| `design-taste.mdc` | no (globs) | Design judgment layer |
| `tajstay-visual-direction.mdc` | no | TajStay brand & layout bar |
| `tajstay-quality-gate.mdc` | no | PASS/FAIL checklist before done |
| `tajstay-orchestration.mdc` | no | Agent team routing |

## MCP

- `.cursor/mcp.json` — Playwright MCP for live browser verification

## Ralph autonomous loop

Templates in `ralph/` — never auto-run against production DB or auth without approval.
