/** Short human label from User-Agent (best-effort, no external deps). */
export function userAgentLabel(ua: string | null | undefined): string {
  const s = (ua ?? "").trim();
  if (!s) return "—";

  const lower = s.toLowerCase();
  let os = "Unknown OS";
  if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  let browser = "Browser";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/") && !lower.includes("edg")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("telegram")) browser = "Telegram";

  if (lower.includes("mobile") || lower.includes("iphone") || lower.includes("android")) {
    return `${os} · ${browser}`;
  }
  return `${os} · ${browser}`;
}
