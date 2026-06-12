/** Internal return path only — blocks protocol-relative and external URLs. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return null;
  }
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (s.includes(":")) return null;
  if (s.length > 512) return null;
  return s;
}

export function defaultDashboardForRole(role: string): string {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "OWNER") return "/dashboard/owner";
  return "/dashboard/bookings";
}

/** After email/password login: honor ?next= when role allows. */
export function postLoginRedirect(role: string, next: string | null | undefined): string {
  const n = safeReturnPath(next ?? null);
  if (!n) return defaultDashboardForRole(role);
  if (n.startsWith("/dashboard/admin")) {
    if (role === "ADMIN") return n;
    return "/dashboard/bookings?notice=adminOnly";
  }
  if (n.startsWith("/dashboard/owner")) {
    if (role === "OWNER") return n;
    return "/dashboard/bookings?notice=ownerOnly";
  }
  return n;
}
