"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";
import { BookOpen, Building2, ChevronDown, Heart, HelpCircle, Home, LogOut, User, X } from "lucide-react";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import type { MobileDrawerStats } from "@/lib/navigation/getMobileDrawerStats";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locale";
import { locales } from "@/lib/i18n/locale";

export type MobileMenuLabels = {
  menu: string;
  close: string;
  navSection: string;
  signIn: string;
  signUp: string;
  guestTraveler: string;
  statBookings: string;
  statFavorites: string;
  brandHome: string;
  favorites: string;
  bookings: string;
  bookingsActive: string;
  bookingsHistory: string;
  bookingsCancelled: string;
  bookingsPayments: string;
  profile: string;
  profilePersonal: string;
  profilePhone: string;
  profileEmail: string;
  profileTelegram: string;
  profileSecurity: string;
  profileChangePassword: string;
  profileNotifications: string;
  profileLanguage: string;
  profileLogout: string;
  ownerCtaTitle: string;
  ownerCtaAction: string;
  ownerBlock: string;
  ownerAdd: string;
  ownerList: string;
  ownerCalendar: string;
  ownerBookings: string;
  ownerAnalytics: string;
  ownerIncome: string;
  ownerReviews: string;
  ownerSupport: string;
  support: string;
  supportChat: string;
  supportTelegram: string;
  supportFaq: string;
  supportReport: string;
  supportSafety: string;
  supportComplaints: string;
  footerAbout: string;
  footerPolicy: string;
  footerTerms: string;
  loggingOut: string;
};

type Props = {
  user: { name: string; role: string } | null | undefined;
  ownerApp: OwnerAppNavState;
  locale: Locale;
  labels: MobileMenuLabels;
  brandName: string;
  brandMarkUrl: string;
  stats: MobileDrawerStats | null;
  trustStatus: string | null;
};

const MOBILE_MENU_HISTORY_TAG = "tajstay-mobile-menu";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function DrawerAccordion({
  title,
  icon,
  children,
  defaultOpen = false
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn("mdrawer-accordion", open && "is-open")}>
      <button
        type="button"
        className="mdrawer-accordion__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mdrawer-item__icon" aria-hidden>
          {icon}
        </span>
        <span>{title}</span>
        <ChevronDown className="mdrawer-accordion__chevron" size={18} aria-hidden />
      </button>
      <div id={panelId} className="mdrawer-accordion__panel">
        <div className="mdrawer-accordion__inner">
          <div className="mdrawer-accordion__content">{children}</div>
        </div>
      </div>
    </div>
  );
}

function DrawerNavLink({
  href,
  children,
  onNavigate,
  badge,
  icon
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  badge?: number;
  icon?: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Link
      href={href}
      className={cn("mdrawer-item", loading && "is-loading")}
      onClick={(e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        onNavigate();
        router.push(href);
      }}
    >
      {icon ? <span className="mdrawer-item__icon">{icon}</span> : null}
      <span className="mdrawer-item__label">{children}</span>
      {badge && badge > 0 ? <span className="mdrawer-item__badge">{badge > 99 ? "99+" : badge}</span> : null}
    </Link>
  );
}

function DrawerSubLink({
  href,
  children,
  onNavigate
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      className="mdrawer-subitem"
      onClick={(e) => {
        e.preventDefault();
        onNavigate();
        router.push(href);
      }}
    >
      {children}
    </Link>
  );
}

function DrawerLocaleRow({ current, onChanged }: { current: Locale; onChanged?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function change(locale: Locale) {
    if (locale === current || pending) return;
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale })
      });
      if (!res.ok) return;
      onChanged?.();
      startTransition(() => router.refresh());
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mdrawer-locale-row" role="group">
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          disabled={pending}
          className={cn("mdrawer-locale-btn", loc === current && "is-active")}
          onClick={() => void change(loc)}
        >
          {loc === "ru" ? "RU" : loc === "tg" ? "TJ" : "EN"}
        </button>
      ))}
    </div>
  );
}

export function MobileMenu({
  user,
  ownerApp,
  locale,
  labels: L,
  brandName,
  brandMarkUrl,
  stats,
  trustStatus
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const isOwner = user?.role === "OWNER";
  const isGuest = Boolean(user);
  const showOwnerCta = user?.role === "GUEST" && ownerApp.kind !== "approved";

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

  const bookingsLinks = useMemo(
    () => [
      { href: "/dashboard/bookings", label: L.bookingsActive },
      { href: "/dashboard/guest", label: L.bookingsHistory },
      { href: "/dashboard/guest", label: L.bookingsCancelled },
      { href: "/dashboard/guest", label: L.bookingsPayments }
    ],
    [L]
  );

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("logout failed");
      close();
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  const drawer = (
    <div
      className={cn("mdrawer-root fixed inset-0 z-[10001] md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
      role="dialog"
      aria-modal={open ? "true" : undefined}
      aria-label={L.menu}
    >
      <div
        className="mdrawer-overlay"
        style={{ opacity: open ? 1 : 0 }}
        onClick={close}
        aria-hidden
      />
      <div className={cn("mdrawer-panel", open ? "is-open" : "is-closed")}>
        <header className="mdrawer-top">
          <div className="mdrawer-top__row">
            <div className="min-w-0 flex-1">
              {user ? (
                <div className="mdrawer-user-card">
                  <div className="mdrawer-user-card__head">
                    <div className="mdrawer-avatar" aria-hidden>
                      {initials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="mdrawer-user-name">{user.name}</p>
                      <p className="mdrawer-user-status">{trustStatus ?? L.guestTraveler}</p>
                    </div>
                  </div>
                  {stats ? (
                    <div className="mdrawer-user-stats">
                      <span>{L.statBookings.replace("{count}", String(stats.bookingsCount))}</span>
                      <span>{L.statFavorites.replace("{count}", String(stats.favoritesCount))}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mdrawer-auth-actions">
                  <Link href="/auth/sign-in" className="mdrawer-auth-btn mdrawer-auth-btn--primary" onClick={close}>
                    {L.signIn}
                  </Link>
                  <Link href="/auth/sign-in?mode=register" className="mdrawer-auth-btn mdrawer-auth-btn--ghost" onClick={close}>
                    {L.signUp}
                  </Link>
                </div>
              )}
            </div>
            <button type="button" className="mdrawer-close" onClick={close} aria-label={L.close}>
              <X size={20} aria-hidden />
            </button>
          </div>
        </header>

        <div className="mdrawer-scroll">
          <p className="mdrawer-section-label">{L.navSection}</p>

          <DrawerNavLink href="/" onNavigate={close}>
            <span className="mdrawer-brand-row">
              {brandMarkUrl ? (
                <Image src={brandMarkUrl} alt="" width={32} height={32} className="mdrawer-brand-mark" unoptimized />
              ) : (
                <span className="mdrawer-item__icon" aria-hidden>
                  <Home size={18} />
                </span>
              )}
              <span>{brandName || L.brandHome}</span>
            </span>
          </DrawerNavLink>

          <DrawerNavLink href="/favorites" onNavigate={close} icon={<Heart size={18} aria-hidden />}>
            {L.favorites}
          </DrawerNavLink>

          {isGuest ? (
            <DrawerAccordion title={L.bookings} icon={<BookOpen size={18} aria-hidden />}>
              {bookingsLinks.map((item) => (
                <DrawerSubLink key={`${item.href}:${item.label}`} href={item.href} onNavigate={close}>
                  {item.label}
                </DrawerSubLink>
              ))}
            </DrawerAccordion>
          ) : null}

          {isGuest ? (
            <DrawerAccordion title={L.profile} icon={<User size={18} aria-hidden />} defaultOpen>
              <DrawerSubLink href="/profile" onNavigate={close}>
                {L.profilePersonal}
              </DrawerSubLink>
              <DrawerSubLink href="/profile" onNavigate={close}>
                {L.profilePhone}
              </DrawerSubLink>
              <DrawerSubLink href="/profile" onNavigate={close}>
                {L.profileEmail}
              </DrawerSubLink>
              <DrawerSubLink href="/profile" onNavigate={close}>
                {L.profileTelegram}
              </DrawerSubLink>
              <DrawerSubLink href="/auth/forgot-password" onNavigate={close}>
                {L.profileChangePassword}
              </DrawerSubLink>
              <DrawerSubLink href="/notifications" onNavigate={close}>
                <span className="flex w-full items-center justify-between gap-2">
                  {L.profileNotifications}
                  {stats && stats.unreadCount > 0 ? (
                    <span className="mdrawer-item__badge">{stats.unreadCount > 99 ? "99+" : stats.unreadCount}</span>
                  ) : null}
                </span>
              </DrawerSubLink>
              <p className="mdrawer-section-label" style={{ marginTop: "0.35rem" }}>
                {L.profileLanguage}
              </p>
              <DrawerLocaleRow current={locale} onChanged={close} />
              {showOwnerCta ? (
                <div className="mdrawer-cta">
                  <p>{L.ownerCtaTitle}</p>
                  <Link href="/profile/become-owner" onClick={close}>
                    {L.ownerCtaAction}
                  </Link>
                </div>
              ) : null}
              <button
                type="button"
                className="mdrawer-subitem mdrawer-logout w-full border-0 bg-transparent text-left"
                disabled={loggingOut}
                onClick={() => void logout()}
              >
                <LogOut size={16} aria-hidden />
                {loggingOut ? L.loggingOut : L.profileLogout}
              </button>
            </DrawerAccordion>
          ) : null}

          {isOwner ? (
            <DrawerAccordion title={L.ownerBlock} icon={<Building2 size={18} aria-hidden />}>
              <DrawerSubLink href="/dashboard/owner?section=properties" onNavigate={close}>
                {L.ownerAdd}
              </DrawerSubLink>
              <DrawerSubLink href="/dashboard/owner?section=properties" onNavigate={close}>
                {L.ownerList}
              </DrawerSubLink>
              <DrawerSubLink href="/dashboard/owner?section=calendar" onNavigate={close}>
                {L.ownerCalendar}
              </DrawerSubLink>
              <DrawerSubLink href="/dashboard/owner?section=bookings" onNavigate={close}>
                {L.ownerBookings}
              </DrawerSubLink>
              <DrawerSubLink href="/dashboard/owner?section=statistics" onNavigate={close}>
                {L.ownerAnalytics}
              </DrawerSubLink>
              <DrawerSubLink href="/dashboard/owner?section=finances" onNavigate={close}>
                {L.ownerIncome}
              </DrawerSubLink>
              <DrawerSubLink href="/dashboard/owner?section=reviews" onNavigate={close}>
                {L.ownerReviews}
              </DrawerSubLink>
              <DrawerSubLink href="/dashboard/owner?section=help" onNavigate={close}>
                {L.ownerSupport}
              </DrawerSubLink>
            </DrawerAccordion>
          ) : null}

          <DrawerAccordion title={L.support} icon={<HelpCircle size={18} aria-hidden />}>
            <DrawerSubLink href={isGuest ? "/dashboard/messages" : "/contacts"} onNavigate={close}>
              {L.supportChat}
            </DrawerSubLink>
            <DrawerSubLink href="/contacts" onNavigate={close}>
              {L.supportTelegram}
            </DrawerSubLink>
            <DrawerSubLink href="/faq" onNavigate={close}>
              {L.supportFaq}
            </DrawerSubLink>
            <DrawerSubLink href={isGuest ? "/dashboard/guest" : "/contacts"} onNavigate={close}>
              {L.supportReport}
            </DrawerSubLink>
            <DrawerSubLink href="/policy" onNavigate={close}>
              {L.supportSafety}
            </DrawerSubLink>
            {isGuest ? (
              <DrawerSubLink href="/dashboard/guest" onNavigate={close}>
                {L.supportComplaints}
              </DrawerSubLink>
            ) : null}
          </DrawerAccordion>
        </div>

        <footer className="mdrawer-footer">
          <nav className="mdrawer-footer__links" aria-label={L.navSection}>
            <Link href="/about" onClick={close}>
              {L.footerAbout}
            </Link>
            <Link href="/policy" onClick={close}>
              {L.footerPolicy}
            </Link>
            <Link href="/terms" onClick={close}>
              {L.footerTerms}
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mobile-menu-trigger relative z-[10002] inline-flex touch-manipulation items-center justify-center rounded-xl border border-emerald-300/45 bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-900/35 transition active:scale-[0.97] hover:bg-emerald-500 md:hidden"
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
