"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import { cn } from "@/lib/cn";
import { normalizeLocale, type Locale, LOCALE_COOKIE } from "@/lib/i18n/locale";
import { notificationText } from "@/lib/notifications/text";
import { TrustBadges } from "@/components/auth/TrustBadges";
import type { TrustBadge } from "@/lib/auth/trustBadges";

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

import { NOTIFICATION_NEW_EVENT } from "@/lib/pwa/notificationEvents";

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
  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("user-menu-trigger relative", open && "ring-2 ring-[var(--taj-lake)]/30")}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${L.account}. ${L.unreadNotifications}: ${unreadCount}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--taj-lake)] to-[var(--taj-lake-deep)] text-xs font-bold text-white shadow-inner">
          {initials(userName)}
        </span>
        <span className="hidden max-w-[7.5rem] truncate sm:inline">{userName}</span>
        <svg
          className={cn("h-4 w-4 shrink-0 text-[var(--taj-ink-soft)] transition-transform duration-200", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {unreadCount > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          "user-menu-dropdown transition-all duration-200 ease-out",
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.97] opacity-0"
        )}
        style={{ visibility: open ? "visible" : "hidden" }}
        role="menu"
        aria-hidden={!open}
      >
        <div className="border-b border-[var(--taj-line)] px-4 py-3">
          <div className="truncate font-semibold text-[var(--taj-ink)]">{userName}</div>
          <div className="text-xs text-[var(--taj-color-text-muted)]">{L.account}</div>
          <TrustBadges locale={menuLocale} badges={trustBadges} size="sm" className="mt-2" />
        </div>

        <nav className="flex max-h-[min(70vh,28rem)] flex-col overflow-y-auto py-1">
          {hasNotifications ? (
            <div className="mx-2 mb-2 rounded-xl border border-[var(--taj-line)] bg-[var(--taj-mist)] p-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[var(--taj-ink)]">{L.notificationsTitle}</div>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-[var(--taj-lake)] px-2 py-0.5 text-[10px] font-semibold text-white">{unreadCount}</span>
                ) : null}
              </div>
              {items.length === 0 ? (
                <div className="text-xs text-[var(--taj-color-text-muted)]">{L.noNotifications}</div>
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
                          ? "border-[var(--taj-line)] bg-[var(--taj-mist)] text-[var(--taj-ink-soft)]"
                          : "border-[var(--taj-lake)]/30 bg-[var(--taj-lake-soft)] text-[var(--taj-ink)]"
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
                  className="text-[11px] font-semibold text-[var(--taj-lake)] disabled:opacity-50"
                >
                  {L.markReadAll}
                </button>
                <Link href={allNotificationsLink(role)} onClick={() => setOpen(false)} className="text-[11px] font-semibold text-[var(--taj-ink-soft)]">
                  {L.openAllNotifications}
                </Link>
              </div>
            </div>
          ) : (
            <p className="user-menu-notifications-compact">{L.noNotifications}</p>
          )}

          <Link href="/profile" className="user-menu-item mx-1" role="menuitem" onClick={() => setOpen(false)}>
            {L.profile}
          </Link>
          <Link
            href={role === "OWNER" ? "/dashboard/owner" : "/dashboard/bookings"}
            className="user-menu-item mx-1"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {L.bookings}
          </Link>
          <Link href="/favorites" className="user-menu-item mx-1" role="menuitem" onClick={() => setOpen(false)}>
            {L.favorites}
          </Link>

          <div className="my-1 border-t border-[var(--taj-line)]" />

          {role === "GUEST" && ownerApp.kind === "none" && (
            <Link href="/profile/become-owner" className="user-menu-item user-menu-item--owner mx-1" onClick={() => setOpen(false)}>
              {L.becomeOwner}
            </Link>
          )}
          {role === "GUEST" && ownerApp.kind === "pending" && (
            <Link href="/profile/become-owner" className="user-menu-item mx-1 text-amber-200/90" onClick={() => setOpen(false)}>
              {L.ownerPending}
            </Link>
          )}
          {role === "GUEST" && ownerApp.kind === "approved" && (
            <Link href="/dashboard/owner" className="user-menu-item user-menu-item--owner mx-1" onClick={() => setOpen(false)}>
              {L.ownerApproved}
            </Link>
          )}
          {role === "GUEST" && ownerApp.kind === "rejected" && (
            <>
              <div className="mx-3 px-1 py-1.5 text-xs leading-snug text-red-300/90">
                {L.ownerRejected}
                {ownerApp.comment ? `: ${ownerApp.comment}` : ""}
              </div>
              <Link href="/profile/become-owner" className="user-menu-item user-menu-item--owner mx-1" onClick={() => setOpen(false)}>
                {L.applyAgain}
              </Link>
            </>
          )}

          {role === "OWNER" && (
            <Link href="/dashboard/owner" className="user-menu-item user-menu-item--owner mx-1" onClick={() => setOpen(false)}>
              {L.ownerPanel}
            </Link>
          )}

          {role === "ADMIN" && (
            <Link href="/dashboard/admin" className="user-menu-item mx-1" onClick={() => setOpen(false)}>
              {L.adminPanel}
            </Link>
          )}

          <div className="my-1 border-t border-[var(--taj-line)]" />
          <button
            type="button"
            disabled={loggingOut}
            className="user-menu-item user-menu-item--danger mx-1 w-[calc(100%-0.5rem)] disabled:opacity-60"
            role="menuitem"
            onClick={() => void logout()}
          >
            {loggingOut ? L.loggingOut : L.logout}
          </button>
        </nav>
      </div>
    </div>
  );
}
