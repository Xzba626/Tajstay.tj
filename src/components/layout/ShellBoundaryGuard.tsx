"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { shellFor, type ShellKind } from "@/lib/shell/classify";

type Props = {
  /** The shell `RootLayout` actually rendered for THIS request, computed server-side from the
   * `x-tajstay-shell` header (see middleware.ts). */
  serverShell: ShellKind;
};

/**
 * ADMIN 6.1B root-cause fix for the "double header" defect (P1, confirmed on both mobile and,
 * intermittently, desktop production).
 *
 * Root cause: `RootLayout` (src/app/layout.tsx) decides which shell to render — consumer
 * (Header/Footer/MobileBottomNav/AppShell incl. the floating TST Assistant) or bare (Admin/Owner
 * render their own chrome) — using `headers().get("x-tajstay-shell")`, a per-request value. That
 * decision is correct for a hard navigation (typed URL, full reload), but Next.js's client-side
 * Router Cache can reuse an already-rendered *dynamic* layout segment for up to ~30s after a soft
 * (`<Link>`) navigation, because the root layout segment itself didn't change between routes like
 * "/profile" and "/dashboard/admin" — only its `children` did. Reproduced locally: load "/"
 * (consumer shell mounts), click through to "/profile", then click the real in-app "Админ-панель"
 * link — the consumer Header/Assistant stay mounted (stale, cached) while Admin's own layout
 * mounts a *second* header underneath. This is a known Next 14 App Router limitation, not an app
 * bug in the header components themselves — every fix that only touches CSS/z-index/visibility
 * would hide the symptom without addressing why two shells got mounted at once.
 *
 * Fix: `usePathname()` IS reliably reactive on every client-side navigation (unlike `headers()`
 * in a Server Component, it isn't subject to the Router Cache). This guard re-derives the correct
 * shell for the CURRENT pathname on every navigation and compares it against what the server
 * actually rendered; on a mismatch it forces one full reload, guaranteeing the next render is a
 * hard navigation that recomputes `x-tajstay-shell` fresh — never a resurrected stale layout.
 * The reload is a deliberate, visible trade-off for crossing between what are, for this product,
 * two genuinely different applications (public site vs. internal CRM) — better than either shell
 * staying wrong indefinitely or a visual hack layering one shell over the other.
 */
export function ShellBoundaryGuard({ serverShell }: Props) {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const clientShell = shellFor(pathname);
    if (clientShell !== serverShell) {
      window.location.assign(window.location.href);
    }
  }, [pathname, serverShell]);

  return null;
}
