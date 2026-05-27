"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locale";

export type MobileMenuLabels = {
  menu: string;
  close: string;
  home: string;
  search: string;
  language: string;
  navSection: string;
  accountSection: string;
  systemSection: string;
  about: string;
  contacts: string;
  contactUs: string;
  forOwners: string;
  policy: string;
  terms: string;
  faq: string;
  signIn: string;
  signUp: string;
  profile: string;
  bookings: string;
  favorites: string;
  becomeOwner: string;
  ownerPanel: string;
  adminPanel: string;
  logout: string;
  loggingOut: string;
  ownerPending: string;
  ownerRejected: string;
  applyAgain: string;
  notifications: string;
};

type Props = {
  user:
    | {
        name: string;
        role: string;
      }
    | null
    | undefined;
  ownerApp: OwnerAppNavState;
  locale: Locale;
  labels: MobileMenuLabels;
  unreadCount?: number;
  brandName: string;
  brandMarkUrl: string;
};

type NavItem = { href: string; label: string; icon: NavIconName };
type NavIconName = "home" | "search" | "about" | "owner" | "contact" | "profile" | "bookings" | "favorites" | "admin";

function NavIcon({ name }: { name: NavIconName }) {
  const common = "h-5 w-5 shrink-0 text-[var(--taj-text-muted)]";
  switch (name) {
    case "home":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "search":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
          <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "about":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="2" />
          <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "owner":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 21v-7h6v7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "contact":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M21 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 1.12 4.18 2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L7.09 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 21 16.92Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "profile":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "bookings":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 3v3M17 3v3M4 7h16M6 11h4M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "favorites":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 21s-7-4.4-9.3-8.6C.9 8.9 3.1 6 6.4 6c1.8 0 3 .9 3.6 1.8C10.6 6.9 11.8 6 13.6 6c3.3 0 5.5 2.9 3.7 6.4C19 16.6 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "admin":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2 20 6v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 16h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}

const MOBILE_MENU_HISTORY_TAG = "tajstay-mobile-menu";

export function MobileMenu({ user, ownerApp, locale: _locale, labels: L, unreadCount = 0, brandName: _brandName, brandMarkUrl: _brandMarkUrl }: Props) {
  void _locale;
  void _brandName;
  void _brandMarkUrl;
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, [open]);

  // Browser-back / Android-back closes the drawer instead of navigating away.
  useEffect(() => {
    if (!open) return;
    const state = (window.history.state ?? null) as { [k: string]: unknown } | null;
    if (!state || state[MOBILE_MENU_HISTORY_TAG] !== true) {
      window.history.pushState({ ...(state ?? {}), [MOBILE_MENU_HISTORY_TAG]: true }, "");
    }
    function onPop() {
      setOpen(false);
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      const cur = (window.history.state ?? null) as { [k: string]: unknown } | null;
      if (cur && cur[MOBILE_MENU_HISTORY_TAG] === true) {
        window.history.back();
      }
    };
  }, [open]);

  const navItems = useMemo<NavItem[]>(() => {
    const role = user?.role ?? "GUEST";
    const ownerHref =
      role === "OWNER"
        ? "/dashboard/owner"
        : ownerApp.kind === "approved"
          ? "/dashboard/owner"
          : "/profile/become-owner";

    const list: NavItem[] = [
      { href: "/", label: L.home, icon: "home" },
      { href: "/search", label: L.search, icon: "search" },
      { href: "/about", label: L.about, icon: "about" },
      { href: ownerHref, label: L.forOwners, icon: "owner" },
      { href: "/contacts", label: L.contactUs, icon: "contact" }
    ];
    return list;
  }, [L, ownerApp.kind, user]);

  const accountItems = useMemo<NavItem[]>(() => {
    if (!user) return [];
    const role = user.role;
    const list: NavItem[] = [
      { href: "/profile", label: L.profile, icon: "profile" },
      {
        href: role === "OWNER" ? "/dashboard/owner" : "/dashboard/bookings",
        label: L.bookings,
        icon: "bookings"
      },
      { href: "/favorites", label: L.favorites, icon: "favorites" }
    ];
    if (role === "ADMIN") list.push({ href: "/dashboard/admin", label: L.adminPanel, icon: "admin" });
    return list;
  }, [L, user]);

  void unreadCount;

  async function logout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("logout failed");
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  const drawer = (
    <div
      className={cn(
        "fixed inset-0 z-[10001] md:hidden",
        open ? "pointer-events-auto visible" : "pointer-events-none invisible"
      )}
      aria-hidden={!open}
      role="dialog"
      aria-modal={open ? "true" : undefined}
    >
      <div
        className={cn(
          "absolute inset-0 bg-slate-950/55 backdrop-blur-md transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "mobile-menu-panel absolute right-0 top-0 flex h-dvh max-h-dvh w-[min(85vw,380px)] flex-col backdrop-blur-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="mobile-menu-panel__header flex shrink-0 items-center justify-between px-4 py-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--taj-text-muted)]">
            {L.menu}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mobile-menu-panel__close inline-flex h-10 w-10 items-center justify-center rounded-full transition active:scale-[0.94]"
            aria-label={L.close}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
          aria-label={L.navSection}
        >
          {navItems.map((it) => (
            <Link
              key={`${it.href}:${it.label}`}
              href={it.href}
              onClick={() => setOpen(false)}
              className="mobile-menu-panel__link flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
            >
              <NavIcon name={it.icon} />
              {it.label}
            </Link>
          ))}

          {user && accountItems.length > 0 ? (
            <>
              <div className="mobile-menu-panel__divider my-3 border-t" />
              {accountItems.map((it) => (
                <Link
                  key={`acc:${it.href}`}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="mobile-menu-panel__link flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition"
                >
                  <NavIcon name={it.icon} />
                  {it.label}
                </Link>
              ))}
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => void logout()}
                className="mt-2 min-h-[44px] rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2.5 text-left text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                {loggingOut ? L.loggingOut : L.logout}
              </button>
            </>
          ) : null}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative z-[10002] inline-flex h-11 min-h-[44px] w-11 min-w-[44px] touch-manipulation items-center justify-center rounded-xl border border-emerald-300/45 bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-900/35 transition active:scale-[0.97] hover:bg-emerald-500 md:hidden"
        aria-label={L.menu}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}

