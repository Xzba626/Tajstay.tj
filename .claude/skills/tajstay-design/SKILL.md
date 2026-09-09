---
name: tajstay-design
description: TajStay visual/design-system rules — brand color #0F7A4D on white canvas, shell-specific layout (Public Desktop / Consumer Mobile / Owner CRM / Admin CRM), forbidden visual patterns, mobile+desktop baseline. Use for any UI, layout, redesign, color, spacing, or typography work.
---

# TajStay design

Judgment layer, not a component library. Read the referenced `.mdc` files for the parts relevant to the
current task instead of loading everything.

## Non-negotiables

- White/near-white canvas + brand green `#0F7A4D` as accent/CTA/panel — never a full-page green tint, never a
  second green shade.
- No mint/light text on white; no low-contrast text on deep green.
- No website footer under mobile app/workspace nav; no Consumer tabs inside Admin/Owner; no raw enums in
  Admin UI; no blank white panels (diagnose: no data vs crash vs off-viewport vs white-on-white); no fake AI.
- Shells never leak into each other: `PublicShell ≠ AdminShell ≠ OwnerShell ≠ ConsumerAccountShell`.
- Match existing tokens (`--taj-*`, `--green-accent`, `profile-center`, `mockup-*`) before inventing new ones.
- Do not redesign screen-by-screen outside the currently authorized BLOCK (see `.agent/STATE.md`).

## Composition formula (project-wide)

```
background = white / near-white
functional identity = deep green blocks, CTAs, selected states, icons
content cards = white / light
premium accents = controlled gold (Owner/role only, not the whole Owner CRM)
CRM analytics = green / amber / blue / red by meaning
```

## Review checklist before shipping UI

1. Can a user tell what to do within 3 seconds?
2. Is the primary action obvious and reachable on mobile?
3. Are empty/error/loading states human-readable (ru/tg/en via `messages.ts`, no hardcoded strings)?
4. Does it feel like TajStay (light base, restrained green), not a generic AI-SaaS template
   (three stat tiles, purple gradients, glass overload)?
5. Did you extend an existing component instead of cloning a pattern?

## Read next (only what the task needs)

- `.cursor/rules/tajstay-master-spec.mdc` — brand-wide baseline, desktop/mobile visual reference, hard stops
- `.cursor/rules/tajstay-shells-architecture.mdc` — per-shell nav/IA, semantic color tokens, state matrix
- `.cursor/rules/tajstay-visual-direction.mdc` — brand & layout bar
- `.cursor/rules/design-taste.mdc` — judgment layer this skill is adapted from
- `.agents/skills/frontend-design`, `add-ui`, `polish`, `arrange`, `animate`, `critique`, `bolder`, `a11y` —
  better-web-ui skills already installed under `.agents/skills/`; `Read` the specific `SKILL.md` on demand

## Verify after implementing

Run `tajstay-browser-qa` for any shipped UX/flow change — do not mark PASS from code inspection alone.
