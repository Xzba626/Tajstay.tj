import type { MetadataRoute } from "next";
import { resolveSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: ["/about", "/contacts", "/policy", "/terms", "/search", "/"]
    },
    sitemap: `${base}/sitemap.xml`
  };
}
