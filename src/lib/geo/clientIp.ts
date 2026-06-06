/** First public IP from reverse-proxy headers (Vercel / nginx). */
export function parseClientIp(forwarded: string | null): string | null {
  if (!forwarded) return null;
  const first = forwarded.split(",")[0]?.trim();
  if (!first || first === "127.0.0.1" || first === "::1") return null;
  return first;
}

export function clientIpFromHeaders(headers: Headers): string | null {
  return parseClientIp(headers.get("x-forwarded-for") ?? headers.get("x-real-ip"));
}
