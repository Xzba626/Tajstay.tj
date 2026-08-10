/**
 * Home Hero Video contract (Phase 5F).
 * No hardcoded remote production URL — supply via env or leave poster-only.
 *
 * Env (optional):
 *   NEXT_PUBLIC_HERO_VIDEO_MP4
 *   NEXT_PUBLIC_HERO_VIDEO_WEBM
 *   NEXT_PUBLIC_HERO_VIDEO_POSTER  (defaults to local brand/placeholder)
 */

export type HeroVideoSources = {
  /** Local or CDN MP4 — empty means poster-only. */
  mp4: string | null;
  webm: string | null;
  poster: string;
  /** Hint for future analytics / CMS wiring. */
  enabled: boolean;
};

const DEFAULT_POSTER = "/heritage/hero-poster.svg";

function trimOrNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/**
 * Resolve hero media. Until assets are provisioned, returns poster-only (enabled=false).
 * Home (Phase 5a) should consume this — do not hardcode remote URLs in components.
 */
export function resolveHeroVideoSources(): HeroVideoSources {
  const mp4 = trimOrNull(process.env.NEXT_PUBLIC_HERO_VIDEO_MP4);
  const webm = trimOrNull(process.env.NEXT_PUBLIC_HERO_VIDEO_WEBM);
  const poster = trimOrNull(process.env.NEXT_PUBLIC_HERO_VIDEO_POSTER) ?? DEFAULT_POSTER;
  const enabled = Boolean(mp4 || webm);

  return { mp4, webm, poster, enabled };
}
