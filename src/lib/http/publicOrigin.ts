/**
 * Публичный origin для редиректов, когда приложение за Cloudflare Tunnel / nginx:
 * внутренний запрос часто имеет host localhost:3000, а в заголовках — реальный домен.
 * Дополнительно учитываются CF-Visitor / Forwarded / cf-ray (HTTPS без X-Forwarded-Proto).
 */

export type HeaderSource = Pick<Headers, "get">;

function firstHeader(v: string | null | undefined): string {
  return v?.split(",")[0]?.trim() ?? "";
}

function isLocalHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  return (
    h === "localhost" ||
    h.startsWith("127.") ||
    h.startsWith("[::") ||
    h === "[::1]"
  );
}

function parseCfVisitorScheme(headerGet: HeaderSource["get"]): string {
  const raw = headerGet("cf-visitor") ?? headerGet("CF-Visitor");
  if (!raw) return "";
  try {
    const j = JSON.parse(raw) as { scheme?: string };
    if (j?.scheme === "http" || j?.scheme === "https") return j.scheme;
  } catch {
    /* ignore */
  }
  return "";
}

/** Первый элемент RFC 7239 Forwarded: proto=https;host=example.com;for=… */
function parseForwardedHeader(raw: string | null | undefined): { host?: string; proto?: string } {
  if (!raw) return {};
  const first = raw.split(",")[0] ?? "";
  let host: string | undefined;
  let proto: string | undefined;
  for (const part of first.split(";")) {
    const p = part.trim();
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const key = p.slice(0, eq).trim().toLowerCase();
    let val = p.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (key === "host") host = val;
    if (key === "proto") proto = val;
  }
  return { host, proto };
}

function isBehindCloudflare(headerGet: HeaderSource["get"]): boolean {
  return !!(headerGet("cf-ray") ?? headerGet("CF-Ray"));
}

/**
 * Единая логика origin по заголовкам прокси (Request, middleware, RSC).
 */
export function readPublicOrigin(headerGet: HeaderSource["get"], requestUrl: string): string {
  if (process.env.NODE_ENV === "production") {
    const envUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
    if (envUrl) {
      try {
        return new URL(envUrl).origin;
      } catch {
        /* fall through */
      }
    }
  }

  const direct = new URL(requestUrl);
  const xfHost = firstHeader(headerGet("x-forwarded-host"));
  const xfProto = firstHeader(headerGet("x-forwarded-proto"));
  const fwdRaw = headerGet("forwarded") ?? headerGet("Forwarded");
  const fwd = parseForwardedHeader(fwdRaw);
  const cfProto = parseCfVisitorScheme(headerGet);

  const hostHeader = firstHeader(headerGet("host"));
  const host = xfHost || (fwd.host ? firstHeader(fwd.host) : "") || hostHeader || direct.host;

  let proto =
    xfProto ||
    (fwd.proto ? firstHeader(fwd.proto) : "") ||
    cfProto ||
    (direct.protocol === "https:" ? "https" : "http");

  if (proto === "http" && isBehindCloudflare(headerGet) && !isLocalHost(host)) {
    proto = "https";
  }

  const looksInternal =
    !xfHost &&
    !fwd.host &&
    isLocalHost(host);

  if (looksInternal) {
    const envUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
    if (envUrl) {
      try {
        return new URL(envUrl).origin;
      } catch {
        /* ignore */
      }
    }
  }

  return `${proto}://${host}`;
}

export function getPublicOriginFromRequest(req: Request): string {
  return readPublicOrigin(req.headers.get.bind(req.headers), req.url);
}

export function publicUrl(req: Request, pathAndQuery: string): URL {
  const origin = getPublicOriginFromRequest(req);
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return new URL(path, origin);
}
