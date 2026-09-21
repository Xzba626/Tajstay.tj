"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Consumer mobile corrective pass: the desktop footer was rendering inside mobile app-like
 * flows (booking wizard, booking chat, search results) where bottom navigation is already the
 * primary mobile nav - producing a long, un-app-like scroll past the composer/actions to a
 * desktop-style footer. Desktop keeps the footer everywhere (unchanged, no route filtering there)
 * - only these routes hide it, and only under the mobile breakpoint (CSS, not unmounting), so
 * `<Footer />` itself (a server component fetching its own content) stays untouched.
 */
const MOBILE_HIDDEN_PREFIXES = ["/chat/", "/booking", "/search"];

export function FooterVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  // `/booking` is a single page (no sub-routes, confirmed against the route tree), not a
  // `/booking/[id]` segment - a trailing-slash prefix match against it never matches "/booking"
  // itself, which is the bug this fixes. `/chat/` keeps its slash since /chat/booking/[id] is a
  // real nested segment and a bare "/chat" prefix would incidentally match a future top-level
  // /chatXyz route.
  const hideOnMobile = MOBILE_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  return <div className={hideOnMobile ? "hidden md:contents" : "contents"}>{children}</div>;
}
