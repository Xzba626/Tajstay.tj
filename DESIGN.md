# TajStay Design System — Verdant Peak

> Visual identity for a travel product you would trust with a real trip.
> Not Booking. Not Airbnb. Central Asian hospitality with mountain clarity — **green + white**.

## Brand feeling

**Calm authority.** Mountain forests, clear air — never neon, never casino emerald, never generic purple SaaS.

## Color (WCAG AA)

| Token | Hex | Role |
|-------|-----|------|
| `--taj-ink` | `#0F1A14` | Primary text |
| `--taj-ink-soft` | `#3D4F45` | Secondary text |
| `--taj-snow` | `#FFFFFF` | App canvas / elevated surfaces |
| `--taj-mist` | `#F4F7F5` | Soft bands / muted fills only |
| `--taj-lake` | `#0F6B4C` | Primary brand / CTAs / header / mobile nav |
| `--taj-lake-deep` | `#0A4D37` | Hover / depth |
| `--taj-lake-soft` | `#E6F2EC` | Soft brand wash |
| `--taj-saffron` | `#C45C26` | Accent (ratings, scarce) — use sparingly |
| `--taj-line` | `#D5DFD9` | Borders |
| `--taj-danger` | `#B42318` | Errors |

Contrast targets: body text on white ≥ 7:1; primary button **white** text on brand ≥ 4.5:1.

## System rule

**White canvas + green accent.** Do not stack CSS overrides on top of old dark themes. Delete unused visual layers; rebuild from tokens.

## Typography

| Role | Family | Notes |
|------|--------|-------|
| UI | **DM Sans** | Body, buttons, forms — never Inter |
| Display | **Playfair Display** | Brand moments & hero titles only |

Scale: 12 / 14 / 16 / 18 / 24 / 32 / 40 (fluid clamp for display).

## Radius & elevation

- Controls: 12px
- Cards: 16px
- Hero search: 20px
- Shadows: soft graphite/green-ink, **no green glow**

## Motion

Only when it clarifies hierarchy or feedback. Prefer `transform`/`opacity`. Respect `prefers-reduced-motion`.

Required interactive states: `default` → `hover` → `active` → `focus-visible` → `disabled`.

## Chrome

- **Header:** green brand bar; structure unchanged (logo, nav, locale, profile).
- **Desktop:** no bottom nav.
- **Mobile:** green bottom navigation; white app background.

## Agent mandate

See [`.agents/skills/tajstay-design/SKILL.md`](.agents/skills/tajstay-design/SKILL.md): justify changes; keep what works; rewrite what doesn’t; never clone OTAs.
