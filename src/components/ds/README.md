# TajStay Design System (PR-1)

Foundation for layout, tokens, and shared UI. Import from `@/components/ds`.

## Layout

- `PageContainer` — public/account pages (`width`: default | narrow | full)
- `SectionContainer` — vertical section rhythm
- `DashboardShell` — sidebar + content (owner/admin layouts)
- `DashboardSection` — titled dashboard blocks
- `ContentGrid` — responsive grids

## Components

- `AppCard`, `StatCard`, `EmptyStateCard`, `ActionCard`, `FormSection`, `FormField`
- `PartnerPropertyCard`, `BookingCard` (presentational; not `components/HotelCard`)
- `Button`, `Input`, `Textarea`, `StickyActions`

## Tokens

See `src/styles/tokens.css` and `src/styles/ds-components.css`.

Legacy `--ds-*` and `.ds-input` / `.ds-primary-btn` remain aliased for gradual migration.
