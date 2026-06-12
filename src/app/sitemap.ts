import type { MetadataRoute } from "next";
import { resolveSiteOrigin } from "@/lib/site-url";

/** Static routes for SEO — only additive entries; do not remove existing paths. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteOrigin();
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/contacts",
    "/policy",
    "/terms",
    "/search",
    "/faq",
    "/map"
  ];

  return staticRoutes.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/search" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/search" ? 0.9 : 0.6
  }));
}
