import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { resolveSiteOrigin } from "@/lib/site-url";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  openGraph?: boolean;
};

/** Shared page-level metadata with optional OpenGraph for trust/SEO pages. */
export function buildPageMetadata({
  title,
  description,
  path,
  openGraph = true
}: PageMetadataOptions): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${resolveSiteOrigin()}${canonicalPath}`;

  if (!openGraph) {
    return { title, description };
  }

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: BRAND.name,
      images: [{ url: BRAND.ogImage, width: 1200, height: 630, alt: BRAND.name }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [BRAND.ogImage]
    }
  };
}
