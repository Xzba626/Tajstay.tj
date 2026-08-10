"use client";

import { HeroVideo } from "@/components/heritage/HeroVideo";
import type { HeroVideoSources } from "@/lib/heritage/heroVideo";
import { AppImage } from "@/components/ui/AppImage";

type Props = {
  sources: HeroVideoSources;
  /** Featured hotel cover used as poster when no dedicated video poster. */
  coverImageUrl: string | null;
};

/**
 * Home hero media: desktop video when env assets exist; otherwise poster / cover.
 * Mobile always prefers static poster (bandwidth).
 */
export function HomeHeroMedia({ sources, coverImageUrl }: Props) {
  const poster = coverImageUrl?.trim() || sources.poster;
  const merged: HeroVideoSources = {
    ...sources,
    poster
  };

  if (!merged.enabled && coverImageUrl) {
    return (
      <>
        <AppImage
          src={coverImageUrl}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="home-hero-pamir__veil" />
      </>
    );
  }

  return (
    <HeroVideo
      sources={merged}
      variant="bleed"
      preferPosterOnMobile
      className="home-hero-pamir__hero-video"
      label="Tajikistan"
    />
  );
}
