/**
 * TajStay shared theme config — aligned with semantic-tokens.css (DESIGN-01).
 * Use CSS variables in components; this file is for programmatic access only.
 */
export const colors = {
  page: "var(--color-page)",
  surface: "var(--color-surface)",
  surfaceSubtle: "var(--color-surface-subtle)",
  surfaceElevated: "var(--color-surface-elevated)",
  primary: "var(--color-brand)",
  primaryHover: "var(--color-brand-hover)",
  primaryActive: "var(--color-brand-active)",
  primarySoft: "var(--color-brand-soft)",
  gold: "var(--color-gold)",
  goldSoft: "var(--color-gold-soft)",
  text: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  textOnBrand: "var(--color-text-on-brand)",
  border: "var(--color-border)",
  borderStrong: "var(--color-border-strong)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const gradients = {
  brand: "linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-hover) 45%, var(--color-brand-active) 100%)",
  brandSoft: "linear-gradient(135deg, var(--color-brand-soft) 0%, var(--color-surface) 100%)",
  surface: "linear-gradient(140deg, var(--color-surface), var(--color-surface-subtle))"
} as const;
