"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import { cn } from "@/lib/cn";
import { normalizeLocale, type Locale, LOCALE_COOKIE } from "@/lib/i18n/locale";
import { notificationText } from "@/lib/notifications/text";

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

export function UserMenu({ userName, role, ownerApp, labels: L, initialUnreadCount = 0 }: Props) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200",
          open
            ? "border-green-700/40 bg-green-50/80 shadow-md ring-2 ring-green-800/15"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${L.account}. ${L.unreadNotifications}: ${unreadCount}`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-900 to-emerald-800 text-xs font-bold text-white shadow-inner">
          {initials(userName)}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">{userName}</span>
        <svg
          className={cn("h-4 w-4 text-slate-500 transition-transform duration-200", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-red-900/40"
            aria-hidden
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          "absolute right-0 z-[100] mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 py-2 shadow-2xl shadow-slate-900/15 ring-1 ring-black/5 backdrop-blur-md transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.97] opacity-0"
        )}
        style={{ visibility: open ? "visible" : "hidden" }}
        role="menu"
        aria-hidden={!open}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="truncate font-semibold text-slate-900">{userName}</div>
          <div className="text-xs text-slate-500">{L.account}</div>
        </div>
        <nav className="flex max-h-[min(70vh,420px)] flex-col overflow-y-auto py-1 text-sm">
          <div className="mx-2 mb-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700">{L.notificationsTitle}</div>
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            </div>
            {items.length === 0 ? (
              <div className="text-xs text-slate-500">{L.noNotifications}</div>
            ) : (
              <div className="space-y-1.5">
                {items.slice(0, 4).map((n) => (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg border px-2 py-1.5 text-xs transition",
                      n.isRead ? "border-slate-200 bg-white text-slate-600" : "border-emerald-300 bg-emerald-50 text-emerald-900"
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
                className="text-[11px] font-semibold text-emerald-700 disabled:opacity-50"
              >
                {L.markReadAll}
              </button>
              <Link href={allNotificationsLink(role)} onClick={() => setOpen(false)} className="text-[11px] font-semibold text-slate-700">
                {L.openAllNotifications}
              </Link>
            </div>
          </div>

          <Link
            href="/profile"
            className="mx-1 rounded-xl px-3 py-2.5 text-slate-700 transition-colors hover:bg-slate-100"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {L.profile}
          </Link>
          <Link
            href={role === "OWNER" ? "/dashboard/owner" : "/dashboard/bookings"}
            className="mx-1 rounded-xl px-3 py-2.5 text-slate-700 transition-colors hover:bg-slate-100"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {L.bookings}
          </Link>
          <Link
            href="/favorites"
            className="mx-1 rounded-xl px-3 py-2.5 text-slate-700 transition-colors hover:bg-slate-100"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {L.favorites}
          </Link>

          <div className="my-1 border-t border-slate-100" />

          {role === "GUEST" && ownerApp.kind === "none" && (
            <Link
              href="/profile/become-owner"
              className="mx-1 rounded-xl px-3 py-2.5 font-medium text-green-800 transition-colors hover:bg-green-50"
              onClick={() => setOpen(false)}
            >
              {L.becomeOwner}
            </Link>
          )}
          {role === "GUEST" && ownerApp.kind === "pending" && (
            <div className="mx-1 rounded-xl px-3 py-2.5 text-xs leading-snug text-amber-800">{L.ownerPending}</div>
          )}
          {role === "GUEST" && ownerApp.kind === "approved" && (
            <div className="mx-1 rounded-xl px-3 py-2.5 text-xs leading-snug text-green-800">{L.ownerApproved}</div>
          )}
          {role === "GUEST" && ownerApp.kind === "rejected" && (
            <>
              <div className="mx-1 px-3 py-2 text-xs leading-snug text-red-700">
                {L.ownerRejected}
                {ownerApp.comment ? `: ${ownerApp.comment}` : ""}
              </div>
              <Link href="/profile/become-owner" className="mx-1 rounded-xl px-3 py-2.5 text-green-800 hover:bg-green-50" onClick={() => setOpen(false)}>
                {L.applyAgain}
              </Link>
            </>
          )}

          {role === "OWNER" && (
            <Link
              href="/dashboard/owner"
              className="mx-1 rounded-xl px-3 py-2.5 font-medium text-slate-900 transition-colors hover:bg-amber-50"
              onClick={() => setOpen(false)}
            >
              {L.ownerPanel}
            </Link>
          )}

          {role === "ADMIN" && (
            <Link
              href="/dashboard/admin"
              className="mx-1 rounded-xl px-3 py-2.5 font-medium text-slate-900 transition-colors hover:bg-emerald-50"
              onClick={() => setOpen(false)}
            >
              {L.adminPanel}
            </Link>
          )}

          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            disabled={loggingOut}
            className="mx-1 w-[calc(100%-0.5rem)] rounded-xl px-3 py-2.5 text-left text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
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
