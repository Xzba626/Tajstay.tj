/**
 * TajStay brand source of truth.
 * Logo, name, favicon, and OG assets must be changed here — not per-component.
 */
export const BRAND = {
  name: "TajStay",
  title: "TajStay — Tajikistan stays",
  logoMark: "/brand/tajstay-mark.png",
  logoFull: "/brand/tajstay-logo-full.png",
  favicon: "/brand/tajstay-icon.png",
  ogImage: "/brand/tajstay-og.png"
} as const;

export type BrandAssets = typeof BRAND;
