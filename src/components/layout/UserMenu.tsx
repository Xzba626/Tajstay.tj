"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  User
} from "lucide-react";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import { cn } from "@/lib/cn";
import { normalizeLocale, type Locale, LOCALE_COOKIE } from "@/lib/i18n/locale";
import { notificationText } from "@/lib/notifications/text";
import { TrustBadges } from "@/components/auth/TrustBadges";
import type { TrustBadge } from "@/lib/auth/trustBadges";
import { Separator } from "@/components/ds/Separator";
import { TajikPattern } from "@/components/ds/TajikPattern";
import { NOTIFICATION_NEW_EVENT } from "@/lib/pwa/notificationEvents";

export type UserMenuLabels = {
  account: string;
  profile: string;
  bookings: string;
  favorites: string;
  becomeOwner: string;
  ownerPending: string;
  ownerApproved: string;
  ownerRejected: string;
  applyAgain: string;
  ownerPanel: string;
  adminPanel: string;
  logout: string;
  loggingOut: string;
  unreadNotifications: string;
  notificationsTitle: string;
  noNotifications: string;
  markReadAll: string;
  openAllNotifications: string;
};

type Props = {
  userName: string;
  role: string;
  ownerApp: OwnerAppNavState;
  labels: UserMenuLabels;
  initialUnreadCount?: number;
  locale?: Locale;
  trustBadges?: TrustBadge[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

type NotificationItem = {
  id: number;
  type: string;
  isRead: boolean;
  createdAt: string;
  bookingId: number | null;
  bookingCode: string | null;
  hotelName: string | null;
  guestName: string | null;
  link: string;
};

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const d = Date.now() - t;
  const min = Math.floor(d / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const days = Math.floor(hr / 24);
  return `${days} дн назад`;
}

function prettyNotificationText(n: NotificationItem): string {
  const locale = getClientLocale();
  return notificationText(locale, n.type, n.bookingCode);
}

function allNotificationsLink(_role: string): string {
  return "/notifications";
}

function getClientLocale(): Locale {
  try {
    const raw = document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${LOCALE_COOKIE}=`));
    const v = raw ? decodeURIComponent(raw.split("=").slice(1).join("=")) : "";
    return normalizeLocale(v);
  } catch {
    return "ru";
  }
}

function roleCaption(role: string, accountLabel: string): string {
  if (role === "ADMIN") return "Admin";
  if (role === "OWNER") return "Owner";
  if (role === "HOTEL_MODERATOR") return "Moderator";
  return accountLabel;
}

export function UserMenu({
  userName,
  role,
  ownerApp,
  labels: L,
  initialUnreadCount = 0,
  locale: localeProp,
  trustBadges = []
}: Props) {
  const menuLocale = localeProp ?? getClientLocale();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [markingReadAll, setMarkingReadAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    function onNew(e: Event) {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") setUnreadCount(detail.count);
    }
    window.addEventListener(NOTIFICATION_NEW_EVENT, onNew);
    return () => window.removeEventListener(NOTIFICATION_NEW_EVENT, onNew);
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/notifications/list", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data: { items?: NotificationItem[] }) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => undefined);
  }, [open]);

  async function readAllNotifications() {
    if (markingReadAll) return;
    setMarkingReadAll(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("read-all failed");
      setUnreadCount(0);
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    } catch {
      // keep previous state
    } finally {
      setMarkingReadAll(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Logout failed");
      setOpen(false);
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  const hasNotifications = unreadCount > 0 || items.length > 0;
  const bookingsHref = role === "OWNER" ? "/dashboard/owner" : "/dashboard/bookings";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("user-menu-trigger relative", open && "is-open")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`${L.account}. ${L.unreadNotifications}: ${unreadCount}`}
      >
        <span className="user-menu-avatar" aria-hidden>
          {initials(userName)}
        </span>
        <span className="user-menu-trigger__name hidden max-w-[8rem] truncate sm:inline">{userName}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        id={menuId}
        className={cn("user-menu-dropdown", open ? "user-menu-dropdown--open" : "user-menu-dropdown--closed")}
        role="menu"
        aria-hidden={!open}
      >
        <div className="user-menu-header relative">
          <TajikPattern kind="corner" className="pointer-events-none absolute right-2 top-2" />
          <span className="user-menu-avatar user-menu-avatar--lg" aria-hidden>
            {initials(userName)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-[var(--color-text)]">{userName}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{roleCaption(role, L.account)}</div>
            <TrustBadges locale={menuLocale} badges={trustBadges} size="sm" className="mt-2" />
          </div>
        </div>

        <nav className="user-menu-scroll">
          {hasNotifications ? (
            <div className="user-menu-notify-block">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[var(--color-text)]">{L.notificationsTitle}</div>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </div>
              {items.length === 0 ? (
                <div className="text-xs text-[var(--color-text-muted)]">{L.noNotifications}</div>
              ) : (
                <div className="space-y-1.5">
                  {items.slice(0, 4).map((n) => (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded-lg border px-2 py-1.5 text-xs transition",
                        n.isRead
                          ? "border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-text-secondary)]"
                          : "border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-[var(--color-text)]"
                      )}
                    >
                      <div className="font-semibold">{prettyNotificationText(n)}</div>
                      <div className="mt-0.5 text-[11px] opacity-80">{relativeTime(n.createdAt)}</div>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    readAllNotifications().catch(() => undefined);
                  }}
                  disabled={markingReadAll || unreadCount === 0}
                  className="text-[11px] font-semibold text-[var(--color-primary)] disabled:opacity-50"
                >
                  {L.markReadAll}
                </button>
                <Link
                  href={allNotificationsLink(role)}
                  onClick={() => setOpen(false)}
                  className="text-[11px] font-semibold text-[var(--color-text-secondary)]"
                >
                  {L.openAllNotifications}
                </Link>
              </div>
            </div>
          ) : (
            <p className="user-menu-notifications-compact">{L.noNotifications}</p>
          )}

          <Separator />

          <Link href="/profile" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <User size={18} aria-hidden />
            <span>{L.profile}</span>
          </Link>
          <Link href={bookingsHref} className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <CalendarDays size={18} aria-hidden />
            <span>{L.bookings}</span>
          </Link>
          <Link href="/favorites" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Heart size={18} aria-hidden />
            <span>{L.favorites}</span>
          </Link>

          {(role === "GUEST" || role === "OWNER") && <Separator />}

          {role === "GUEST" && ownerApp.kind === "none" && (
            <Link href="/profile/become-owner" className="user-menu-item user-menu-item--owner" role="menuitem" onClick={() => setOpen(false)}>
              <Settings size={18} aria-hidden />
              <span>{L.becomeOwner}</span>
            </Link>
          )}
          {role === "GUEST" && ownerApp.kind === "pending" && (
            <Link href="/profile/become-owner" className="user-menu-item user-menu-item--pending" role="menuitem" onClick={() => setOpen(false)}>
              <Settings size={18} aria-hidden />
              <span>{L.ownerPending}</span>
            </Link>
          )}
          {role === "GUEST" && ownerApp.kind === "approved" && (
            <Link href="/dashboard/owner" className="user-menu-item user-menu-item--owner" role="menuitem" onClick={() => setOpen(false)}>
              <LayoutDashboard size={18} aria-hidden />
              <span>{L.ownerApproved}</span>
            </Link>
          )}
          {role === "GUEST" && ownerApp.kind === "rejected" && (
            <>
              <div className="user-menu-rejected">
                {L.ownerRejected}
                {ownerApp.comment ? `: ${ownerApp.comment}` : ""}
              </div>
              <Link href="/profile/become-owner" className="user-menu-item user-menu-item--owner" role="menuitem" onClick={() => setOpen(false)}>
                <Settings size={18} aria-hidden />
                <span>{L.applyAgain}</span>
              </Link>
            </>
          )}

          {role === "OWNER" && (
            <Link href="/dashboard/owner" className="user-menu-item user-menu-item--owner" role="menuitem" onClick={() => setOpen(false)}>
              <LayoutDashboard size={18} aria-hidden />
              <span>{L.ownerPanel}</span>
            </Link>
          )}

          {role === "ADMIN" && (
            <>
              <Separator />
              <Link href="/dashboard/admin" className="user-menu-item user-menu-item--admin" role="menuitem" onClick={() => setOpen(false)}>
                <Shield size={18} aria-hidden />
                <span>{L.adminPanel}</span>
              </Link>
            </>
          )}

          <Separator />
          <button
            type="button"
            disabled={loggingOut}
            className="user-menu-item user-menu-item--danger w-full disabled:opacity-60"
            role="menuitem"
            onClick={() => void logout()}
          >
            <LogOut size={18} aria-hidden />
            <span>{loggingOut ? L.loggingOut : L.logout}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
