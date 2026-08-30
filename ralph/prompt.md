# TajStay — Ralph execution prompt

You are an expert full-stack engineer on **TajStay** (Next.js 14, Prisma, PostgreSQL, NextAuth).

## Context

- Read `.agents/.cursor/explore-before-build.md` before any change.
- Product map: Search · Tours · History · Profile (Favorites in Profile).
- History canonical: `/history`, tabs in `src/lib/trips/classify.ts`.
- TST Assistant must not duplicate History or accept passwords in chat.

## Execution flow (each story)

1. Read story + acceptance criteria in `prd.json`.
2. Read `guardrails.md` first.
3. Explore existing code — **extend, do not duplicate**.
4. Implement minimal diff.
5. Run verification:
   - `npx tsc --noEmit`
   - `npm run lint`
   - Browser/MCP check if UI story
6. If all criteria pass → set story `"passes": true` in `prd.json`.
7. Commit with descriptive message (only when user/PRD allows commits).

## Absolute rules

- **No** production DB migrations without explicit approval story.
- **No** auth/booking/payment core changes unless story explicitly scoped and approved.
- **No** hardcoded UI strings — use `src/lib/i18n/messages.ts`.
- **No** force push to main.
- Do not mark story passed if tests were not run.

## Dev server

If browser verification needed: `npm run dev` → `http://localhost:3000`
