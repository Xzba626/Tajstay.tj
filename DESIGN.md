# TajStay Design System — Verdant Peak

> Visual identity for a travel product you would trust with a real trip.
> Not Booking. Not Airbnb. Central Asian hospitality with mountain clarity — **green + white**.

## Brand feeling

**Calm authority.** Mountain forests, clear air, warm tea at dusk — never neon, never casino emerald, never generic purple SaaS.

## Why this palette (not the prior lake-teal experiment)

TajStay’s product brand is green + white. Teal was a useful interim for light surfaces; **Verdant Peak** reunites the UI with brand trust signals travelers already associate with the name, while keeping the composition wins (full-bleed hero, premium cards, light funnel).

## Color (WCAG AA)

| Token | Hex | Role |
|-------|-----|------|
| `--taj-ink` | `#0F1A14` | Primary text |
| `--taj-ink-soft` | `#3D4F45` | Secondary text |
| `--taj-mist` | `#F4F7F5` | App canvas |
| `--taj-snow` | `#FFFFFF` | Elevated surfaces / cards |
| `--taj-lake` | `#0F6B4C` | Primary brand / CTAs *(legacy name; value = forest green)* |
| `--taj-lake-deep` | `#0A4D37` | Hover / header depth |
| `--taj-lake-soft` | `#E6F2EC` | Soft brand wash |
| `--taj-saffron` | `#C45C26` | Accent (ratings, scarce) — use sparingly |
| `--taj-line` | `#D5DFD9` | Borders |
| `--taj-danger` | `#B42318` | Errors |

Contrast targets: body text on mist ≥ 7:1; primary button **white** text on brand ≥ 4.5:1.

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

Only when it clarifies hierarchy or feedback (hero settle, card lift, focus ring). Prefer `transform`/`opacity`. Respect `prefers-reduced-motion`.

## First viewport (guest home)

Brand → one headline → one supporting line → search CTA → one full-bleed visual. No stats strips, no promo stickers on hero media, no card grid in the first fold.

## Agent mandate

See [`.agents/skills/tajstay-design/SKILL.md`](.agents/skills/tajstay-design/SKILL.md): justify changes; keep what works; rewrite what doesn’t; never clone OTAs.
