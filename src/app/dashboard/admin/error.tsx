"use client";

import { useEffect, useState } from "react";
import { m } from "@/lib/i18n/messages";
import { normalizeLocale, LOCALE_COOKIE } from "@/lib/i18n/locale";
import { AdminBackButton } from "@/components/admin/AdminBackButton";

/**
 * ADMIN 6.1B root-cause fix for two confirmed production defects at once:
 *
 * 1. "Admin open in Tajik, 500 screen shows Russian" — there was no Admin-scoped error boundary
 *    at all; every uncaught error in any `/dashboard/admin/*` route fell through to the single
 *    app-wide `src/app/error.tsx`, which has hardcoded Russian strings and no locale awareness.
 *    This boundary reads the `tajstay_locale` cookie directly (error boundaries are Client
 *    Components and cannot call the server-only `getLocale()`) and renders RU/TG/EN correctly.
 *
 * 2. "AdminHeader disappears on the error screen, only the old header remains" — an error
 *    boundary replaces its own segment's `children`, but the *sibling* layout at that same segment
 *    level keeps rendering. Because there was no error.tsx under `dashboard/admin/`, errors bubbled
 *    all the way to the ROOT error.tsx, which sits *outside* `dashboard/admin/layout.tsx` — so the
 *    entire Admin layout (AdminHeader + sidebar) unmounted along with the broken page. Placing this
 *    file here, a sibling of `dashboard/admin/layout.tsx`, keeps that layout (and therefore
 *    AdminHeader/AdminSidebar/AdminMobileNav) mounted and only replaces the broken content area.
 */
export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState(normalizeLocale(undefined));

  useEffect(() => {
    console.error(error);
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
    setLocale(normalizeLocale(match ? decodeURIComponent(match[1]) : undefined));
  }, [error]);

  return (
    <div className="admin-command-center flex min-h-[50vh] w-full flex-col items-center justify-center px-4 py-10 text-center">
      <div className="admin-risk-chip admin-risk-chip--high">{m(locale, "admin.errorBoundaryBadge")}</div>
      <h1 className="mt-4 text-xl font-bold text-[var(--admin-text)]">{m(locale, "admin.errorBoundaryTitle")}</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.errorBoundaryMessage")}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="admin-btn admin-btn--primary">
          {m(locale, "admin.errorBoundaryRetry")}
        </button>
        <AdminBackButton href="/dashboard/admin" label={m(locale, "admin.errorBoundaryBackToAdmin")} />
      </div>
    </div>
  );
}
