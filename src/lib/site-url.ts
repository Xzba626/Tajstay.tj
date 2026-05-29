/** Canonical site origin for metadata, OG URLs, and absolute links. */
export function resolveSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const withProto = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return withProto.replace(/\/$/, "");
  }
  if (process.env.VERCEL_ENV === "production") {
    return "https://www.tajstay.site";
  }
  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost.replace(/\/$/, "")}`;
  }
  return "https://www.tajstay.site";
}

export function resolveMetadataBase(): URL {
  return new URL(`${resolveSiteOrigin()}/`);
}
