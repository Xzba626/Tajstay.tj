# TajStay current state

Read this before anything else. Then load only the skill matching NEXT (see `CLAUDE.md` → Skill routing).
Do not re-read old audit reports or the full MASTER spec unless the task needs them.

## Branch / SHA

- Branch: `feature/tajstay-full-ui-ux-rebuild`
- Base SHA (as of this file): `9bddfa6` (legacy brand-color + hero cleanup commit)

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
- Added `docs/TAJSTAY_ARCHITECTURE_V2.md` (product architecture authority, pointed to from
  `CLAUDE.md`) — binding on product-scope decisions within whatever block is authorized here; does
  not itself unlock protected domains or P0-S2.
- **Legacy brand-color cleanup** (commit `9bddfa6`): all `emerald-*`/`mint-*`/`teal-*` Tailwind
  utilities and off-brand literal hex greens replaced with canonical `#0F7A4D` across chat, payment,
  owner-onboarding, trips, PWA, and layout components (62 files). Home promo banner:
  emerald/teal gradient → solid brand green. `CODE`: done. `TEST`: `npx tsc --noEmit` clean,
  `eslint` clean on touched files (only pre-existing unrelated `useMemo` dep warnings remain).
  `DEPLOYED`: local dev server only (`localhost:3000`), not yet pushed/deployed to a preview URL.
  `REAL RUNTIME`: manually walked `/` and `/search` in the in-app Browser pane at mobile (~390px)
  and desktop (1440x900) viewports — white canvas, single green `#0F7A4D` search surface, no
  console errors. `EVIDENCE`: screenshots taken this session (not saved as files) — see chat
  transcript, not yet an external deployment URL+SHA per the Evidence gates rule, since this was
  local-only. `STATUS: PASS (local runtime evidence only — needs a deployed URL+SHA pass before
  claiming ship-ready)`.
- **Decorative hero removal** (same commit): deleted dead `HeroTravelPreview.tsx`,
  `HeroTravelBackdrop.tsx`, `HomeHeroLuxury.tsx` (never imported), `Hero3DSceneGate.tsx`,
  `Hero3DScene.tsx` (dead 3D code, no importers). `TajstayHero3D` now renders text+CTA only, no
  globe/network visual. `premium-overhaul.css` hero backgrounds are flat white. Verified visually
  on `/` at mobile+desktop (see above). `STATUS: PASS (local runtime evidence only)`.
- **Bug found & fixed in passing**: home page's AI recommendation section imported
  `@/components/ai/AIRecommendationLab`, a file already deleted in a prior commit (`8773d8d`) —
  this broke `npx tsc --noEmit`. Removed the dead import and the broken section (also aligns with
  V2 §14/§57 "remove legacy fake/random AI"). Not a new regression — was already broken before this
  session touched the file.
- Confirmed already-satisfied from the authorized block (no change needed): Owner/Admin mobile
  bottom nav + "More" drawer is already `position: fixed !important`, portaled via `BodyPortal`,
  high z-index (`workspace-mobile-shell.css`) — does not hide or jump. Mobile search results are
  already single-column (`grid-cols-1`), desktop is `md:grid-cols-2 lg:grid-cols-3`.

## OPEN

- P0-S2 (AuthZ / destructive ops / RBAC prep) — not started, needs explicit authorization first.
  **Do not start even after the visual block closes** — user has explicitly said this must be a
  separate, separately-authorized step, ordered before Owner Hotel Desk foundation work.
- P0-R1 (500 traces + blank-panel root cause) — not started.
- Production secret-hash state after P0-S1 — UNKNOWN, needs runtime verification against production, not local.
- HTTP E2E Guest/Owner→admin 403 suite — not built.
- Pending phone/email verification flow — not built (intentionally fail-closed for now).
- Design System Foundation / shells visual migration — blocked on P0-S1+ closure per MASTER spec; current
  block above is the local visual pass, full Design System Foundation is still pending.
- Visual-migration block remaining items (not yet evidenced): Auth screen visual cleanup;
  Consumer/Admin/Owner nav & chrome full pass (beyond the already-locked bottom nav); TST Assistant
  positioning; hover/pressed/loading/focus/disabled state audit across primary buttons; full
  responsive matrix (360/390/412/768/1024/1280/1440+); human-like browser QA for Owner and Admin
  roles specifically (only Guest/consumer `/` and `/search` verified so far); a deployed
  preview-URL + SHA evidence pass (current evidence is local dev server only).

## DO NOT TOUCH without explicit approval

- Production database (schema, migrations, direct access)
- Authentication / authorization core
- Booking engine invariants
- Payment capture flows
- Security-critical env secrets / credentials

## NEXT

Continue closing the FULL TAJSTAY VISUAL MIGRATION + HUMAN BROWSER WALKTHROUGH block per the OPEN
list above (Auth cleanup, nav/chrome full pass, responsive matrix, interactive states, Owner/Admin
browser QA, deployed-URL evidence) — proceed through these without waiting for a go-ahead on each
one; they're inside the already-authorized block. Do not mark the block fully closed on build/tsc/
lint alone.

**Do not start P0-S2 (AuthZ/RBAC) even once the visual block is fully closed** — get separate
explicit authorization for it first. Only after P0-S2 is authorized and closed should Owner Hotel
Desk foundation work (V2 §21+) begin. Sequence is fixed: visual block → P0-S2/AuthZ → Owner Hotel
Desk foundation → rest of V2 §63 order.

From the next new product-scope block onward (post visual-migration), design against
`docs/TAJSTAY_ARCHITECTURE_V2.md` directly rather than the pre-V2 Owner/Admin architecture, so
Owner Hotel Desk and later blocks aren't built once against old assumptions and rebuilt again.

Product architecture authority is `docs/TAJSTAY_ARCHITECTURE_V2.md` (added 2026-09-09) — read it
only when a task needs product-scope detail beyond the current block; it does not change which block
is authorized right now or unlock P0-S2/protected domains on its own.

## Update discipline

Update this file only at the end of a logical block (not every small edit): move finished items DONE→,
adjust NEXT, and update SHA. Do not paste long specs here — link to the `.cursor/rules/*.mdc` file instead.
