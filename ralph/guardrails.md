# Guardrails (Signs)

Lessons learned from Ralph iterations on TajStay. **Read this first every iteration.**

## Active guardrails

### Sign: Explore before build
- **Trigger:** Any History, Tours, Nav, Profile, TST, booking work
- **Instruction:** Read `.agents/.cursor/explore-before-build.md`; reuse canonical modules
- **Added:** Initial TajStay Ralph setup

### Sign: History ≠ COMPLETED for Past tab
- **Trigger:** History classification changes
- **Instruction:** Past = calendar after checkout; COMPLETED is badge only
- **Added:** Initial TajStay Ralph setup

### Sign: Protected domains need approval
- **Trigger:** Stories touching auth, payments, booking engine, Prisma schema
- **Instruction:** Stop and request human approval; split into separate story
- **Added:** Initial TajStay Ralph setup

### Sign: DIRECT_URL for Vercel migrate
- **Trigger:** CI/database migration stories
- **Instruction:** Use `scripts/ensure-direct-url.mjs`; never migrate via pooler-only URL
- **Added:** Initial TajStay Ralph setup

## Manual additions

(Add new signs below when iterations fail)
