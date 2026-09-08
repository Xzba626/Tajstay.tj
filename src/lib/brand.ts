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
  ogImage: "https://www.tajstay.site/brand/tajstay-og.png"
} as const;

export type BrandAssets = typeof BRAND;

/** True when a URL is a TajStay brand asset — never use as a hotel/user photo. */
export function isBrandAssetUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const value = url.trim().toLowerCase();
  if (!value) return true;
  return (
    value.includes("/brand/") ||
    value.includes("tajstay-mark") ||
    value.includes("tajstay-logo") ||
    value.includes("tajstay-icon") ||
    value === BRAND.logoMark.toLowerCase() ||
    value === BRAND.logoFull.toLowerCase() ||
    value === BRAND.favicon.toLowerCase()
  );
}
