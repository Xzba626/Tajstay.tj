# TajStay Design System — Canonical (Phase 2)

> Modern Tajik Hospitality: white space + near-black type + emerald accent (~10%).  
> One Design System. Legacy `--taj-*` / TZ / premium names are **aliases**, not parallel palettes.

## Canonical color

| Role | Token | Hex |
|------|-------|-----|
| Primary Emerald | `--color-primary` | `#087F5B` |
| Dark Emerald | `--color-primary-dark` | `#065F46` |
| Soft emerald wash | `--color-primary-soft` | `#E6F5F0` |
| White surface | `--color-surface` | `#FFFFFF` |
| Soft background | `--color-background-soft` | `#F8FAFC` |
| Near black | `--color-text` | `#111827` |
| Secondary text | `--color-text-secondary` | `#6B7280` |
| Border | `--color-border` | `#E5E7EB` |
| Accent (sparse) | `--color-accent` | `#C45C26` |
| Danger | `--color-danger` | `#B42318` |

Emerald only for: primary buttons, active nav, selected states, important links, CTAs, active icons, focus rings.

## Source of truth

[`src/styles/tokens.css`](src/styles/tokens.css)

Legacy bridges (not second systems):

- [`src/styles/tz-design-tokens.css`](src/styles/tz-design-tokens.css) — old TZ names → canonical  
- [`src/styles/variables.css`](src/styles/variables.css) — older aliases  
- [`src/styles/taj-theme.css`](src/styles/taj-theme.css) — component surface tokens  

## Typography

- UI: **DM Sans** (`--taj-font-ui`)  
- Display: **Playfair Display** (`--taj-font-display`) — brand/hero only  

Scale tokens: Display · H1 · H2–H4 · Body Large/Body/Small · Caption · Button · Label (`--taj-text-*`).

## Radius, shadow, z-index, motion

- Radius base: 12–16px (`--taj-radius-md` / `--taj-radius-lg`)  
- Shadows: subtle graphite — **no green glow**  
- Z: base 0 · header 100 · dropdown 200 · overlay 300 · modal 400 · toast 500  
- Menu motion: ~180–240ms (`--duration-menu`)

## Breakpoints (layout policy)

| Range | Policy |
|-------|--------|
| `<768` | Existing mobile (do not redesign layout for desktop DS) |
| `768–1199` | Existing tablet |
| `≥1200` | New desktop visual redesign (Phase 4+) |
| `≥1600` | Large desktop container |

Phase 2 prepares tokens only — no mass layout breakpoint migration.

## Brand assets

Raster logos / OG / favicons under `/brand/` are **not** auto-recolored. UI token `#0F6B4C` (legacy Verdant) was migrated to `#087F5B`; PNG assets keep their baked colors until a separate brand task.

## Agent mandate

See [`.agents/skills/tajstay-design/SKILL.md`](.agents/skills/tajstay-design/SKILL.md).
