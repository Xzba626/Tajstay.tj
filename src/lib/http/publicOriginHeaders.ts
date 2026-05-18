import { headers } from "next/headers";
import { readPublicOrigin } from "./publicOrigin";

function firstHeader(v: string | null | undefined): string {
  return v?.split(",")[0]?.trim() ?? "";
}

/** Для Server Components: публичный origin по заголовкам (туннель / прокси). */
export function getPublicOriginFromHeaders(): string {
  const h = headers();
  const xfHost = firstHeader(h.get("x-forwarded-host"));
  const hostHeader = firstHeader(h.get("host"));
  const fallbackHost = xfHost || hostHeader || "127.0.0.1:3000";
  const syntheticUrl = `http://${fallbackHost}/`;
  return readPublicOrigin(h.get.bind(h), syntheticUrl);
}
