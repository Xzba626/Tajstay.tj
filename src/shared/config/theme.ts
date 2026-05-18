export const colors = {
  primary: "#14B8A6",
  accent: "#22D3EE",
  secondary: "#34D399",
  highlight: "#8B5CF6",
  bg: "#020617",
  bgSecondary: "#0b1220",
  surface: "rgba(255,255,255,0.07)",
  surfaceStrong: "rgba(255,255,255,0.11)",
  text: "#E2E8F0",
  muted: "#94A3B8",
  border: "rgba(255,255,255,0.14)"
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
  brand: "linear-gradient(135deg, #10B981 0%, #14B8A6 45%, #0EA5E9 80%, #8B5CF6 100%)",
  surface: "linear-gradient(140deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
  glow: "radial-gradient(900px 420px at 10% 10%, rgba(52,211,153,0.18), transparent 70%)"
} as const;
