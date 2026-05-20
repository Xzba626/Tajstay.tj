"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import { cn } from "@/lib/cn";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
};

type Item = { kind: "link"; href: string; label: string } | { kind: "text"; label: string } | { kind: "divider" };

function Icon({ name }: { name: string }) {
  const common = "h-5 w-5 shrink-0 text-slate-500";
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
    case "contacts":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="2" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "faq":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-.8.8-1.3 1.1-1.3 2.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 16h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "policy":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2 20 6v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
    case "owner":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 21v-7h6v7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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
    default:
      return null;
  }
}

function sectionTitle(title: string) {
  return (
    <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </div>
  );
}

export function MobileMenu({ user, ownerApp, locale, labels: L, unreadCount = 0 }: Props) {
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

  const items = useMemo<Item[]>(() => {
    const role = user?.role ?? "GUEST";
    const list: Item[] = [];

    list.push({ kind: "text", label: L.navSection });
    list.push({ kind: "link", href: "/", label: L.home });
    list.push({ kind: "link", href: "/search", label: L.search });
    list.push({ kind: "link", href: "/about", label: L.about });
    list.push({ kind: "divider" });

    list.push({ kind: "text", label: L.accountSection });
    if (!user) {
      list.push({ kind: "link", href: "/auth/sign-in", label: L.signIn });
      list.push({ kind: "link", href: "/auth/sign-in", label: L.signUp });
    } else {
      list.push({ kind: "link", href: "/profile", label: L.profile });
      list.push({
        kind: "link",
        href: "/notifications",
        label: unreadCount > 0 ? `${L.notifications} (${unreadCount})` : L.notifications
      });
      list.push({ kind: "link", href: "/favorites", label: L.favorites });
      list.push({
        kind: "link",
        href: role === "OWNER" ? "/dashboard/owner" : "/dashboard/bookings",
        label: L.bookings
      });

      if (role === "GUEST") {
        if (ownerApp.kind === "none") list.push({ kind: "link", href: "/apply/owner", label: L.becomeOwner });
        if (ownerApp.kind === "pending") list.push({ kind: "text", label: L.ownerPending });
        if (ownerApp.kind === "rejected") {
          list.push({ kind: "text", label: L.ownerRejected });
          list.push({ kind: "link", href: "/apply/owner", label: L.applyAgain });
        }
      }
      if (role === "OWNER") list.push({ kind: "link", href: "/dashboard/owner", label: L.ownerPanel });
      if (role === "ADMIN") list.push({ kind: "link", href: "/dashboard/admin", label: L.adminPanel });
    }

    list.push({ kind: "divider" });
    list.push({ kind: "text", label: L.systemSection });
    list.push({ kind: "link", href: "/contacts", label: L.contacts });
    list.push({ kind: "link", href: "/policy", label: L.policy });
    list.push({ kind: "link", href: "/terms", label: L.terms });
    list.push({ kind: "link", href: "/faq", label: L.faq });

    return list;
  }, [L, ownerApp.kind, user, unreadCount]);

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
          "absolute right-0 top-0 flex h-dvh max-h-dvh w-[min(94vw,380px)] flex-col border-l border-white/10 bg-white/95 shadow-2xl shadow-slate-950/40 backdrop-blur-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/90 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="text-sm font-semibold text-slate-900">TajStay</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] hover:bg-slate-50"
          >
            {L.close}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>{L.language}</span>
              <ThemeToggle compact />
            </div>
            <LocaleSwitcher current={locale} />
          </div>

          {items.map((it, idx) => {
            if (it.kind === "divider") return <div key={`d-${idx}`} className="my-2 border-t border-slate-100" />;
            if (it.kind === "text") return <div key={`t-${idx}`}>{sectionTitle(it.label)}</div>;
            return (
              <Link
                key={`${it.href}:${it.label}`}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition active:bg-slate-200/80 hover:bg-slate-100"
              >
                <Icon
                  name={
                    it.href === "/"
                      ? "home"
                      : it.href === "/search"
                        ? "search"
                        : it.href === "/about"
                          ? "about"
                          : it.href === "/contacts"
                            ? "contacts"
                            : it.href === "/faq"
                              ? "faq"
                              : it.href === "/policy" || it.href === "/terms"
                                ? "policy"
                                : it.href === "/profile"
                                  ? "profile"
                                  : it.href === "/favorites"
                                    ? "favorites"
                                    : it.href === "/dashboard/bookings" || it.href === "/dashboard/guest"
                                      ? "bookings"
                                      : it.href === "/dashboard/owner"
                                        ? "owner"
                                        : it.href === "/dashboard/admin"
                                          ? "admin"
                                          : ""
                  }
                />
                {it.label}
              </Link>
            );
          })}

          {user && (
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => void logout()}
              className="mt-2 min-h-[44px] rounded-xl bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              {loggingOut ? L.loggingOut : L.logout}
            </button>
          )}
        </div>
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

