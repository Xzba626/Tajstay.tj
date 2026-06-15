"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationCategoryIcon } from "@/components/notifications/NotificationCategoryIcon";
import { cn } from "@/lib/cn";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/locale";
import { categoryStyle, notificationUiCategory } from "@/lib/notifications/categoryUi";
import { notificationText } from "@/lib/notifications/text";
import { setAppNotificationBadge } from "@/lib/pwa/appBadge";
import {
  isNotificationSoundEnabled,
  markUserInteracted,
  setNotificationSoundEnabled
} from "@/lib/pwa/notificationPrefs";
import { NOTIFICATION_NEW_EVENT } from "@/lib/pwa/notificationEvents";
import { playNewNotificationSound } from "@/lib/pwa/notificationSound";

export type NotificationBellLabels = {
  ariaLabel: string;
  title: string;
  noNotifications: string;
  noNotificationsHint: string;
  markReadAll: string;
  openAll: string;
  soundOn: string;
  soundOff: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  newToast: string;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  bookingCode: string | null;
  link: string;
};

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

function relativeTime(iso: string, labels: NotificationBellLabels): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const d = Date.now() - t;
  const min = Math.floor(d / 60000);
  if (min < 1) return labels.justNow;
  if (min < 60) return labels.minutesAgo.replace("{n}", String(min));
  const hr = Math.floor(min / 60);
  if (hr < 24) return labels.hoursAgo.replace("{n}", String(hr));
  const days = Math.floor(hr / 24);
  return labels.daysAgo.replace("{n}", String(days));
}

export function NotificationBell({
  labels,
  initialUnreadCount = 0,
  className
}: {
  labels: NotificationBellLabels;
  initialUnreadCount?: number;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [markingReadAll, setMarkingReadAll] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = getClientLocale();

  const pull = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        fetch("/api/notifications/unread-count", { credentials: "include", cache: "no-store" }),
        fetch("/api/notifications/list", { credentials: "include", cache: "no-store" })
      ]);
      if (countRes.ok) {
        const countData = (await countRes.json()) as { count?: number };
        const c = typeof countData.count === "number" ? Math.max(0, countData.count) : 0;
        setUnreadCount(c);
        setAppNotificationBadge(c);
      }
      if (listRes.ok) {
        const listData = (await listRes.json()) as { items?: NotificationItem[] };
        setItems(Array.isArray(listData.items) ? listData.items.slice(0, 10) : []);
      }
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    setSoundOn(isNotificationSoundEnabled());
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
    if (open) {
      setLoading(true);
      void pull().finally(() => setLoading(false));
    }
  }, [open, pull]);

  async function readAll() {
    if (markingReadAll) return;
    setMarkingReadAll(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
      setUnreadCount(0);
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
      setAppNotificationBadge(0);
    } finally {
      setMarkingReadAll(false);
    }
  }

  async function openItem(n: NotificationItem) {
    markUserInteracted();
    if (!n.isRead) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
      void fetch(`/api/notifications/${n.id}/read`, { method: "PATCH", credentials: "include" });
    }
    setOpen(false);
    router.push(n.link || "/notifications");
  }

  function toggleSound() {
    markUserInteracted();
    const next = !soundOn;
    setSoundOn(next);
    setNotificationSoundEnabled(next);
    if (next) playNewNotificationSound();
  }

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => {
          markUserInteracted();
          setOpen((o) => !o);
        }}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-100 shadow-sm transition hover:bg-white/10 md:border-slate-200 md:bg-white md:text-slate-700 md:hover:bg-slate-50",
          open && "ring-2 ring-emerald-500/30"
        )}
        aria-expanded={open}
        aria-label={labels.ariaLabel}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-slate-950 md:ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[120] mt-2 w-[min(100vw-1.5rem,24rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/5">
          <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">{labels.title}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                  title={soundOn ? labels.soundOn : labels.soundOff}
                >
                  {soundOn ? "🔔" : "🔕"}
                </button>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void readAll()}
                    disabled={markingReadAll}
                    className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
                  >
                    {labels.markReadAll}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <ul className="max-h-[min(60vh,20rem)] space-y-0.5 overflow-y-auto p-2">
            {loading && !items.length ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">…</li>
            ) : items.length ? (
              items.map((n) => {
                const cat = notificationUiCategory(n.type);
                const style = categoryStyle(cat);
                const title =
                  n.title?.trim() ||
                  notificationText(locale, n.type, n.bookingCode, { title: n.title, message: n.message });
                const body = n.message?.trim() || "";
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void openItem(n)}
                      className={cn(
                        "flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50",
                        !n.isRead && "bg-emerald-50/60"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
                          style.bg,
                          style.text,
                          style.ring
                        )}
                      >
                        <NotificationCategoryIcon icon={style.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-sm break-words whitespace-normal",
                              !n.isRead ? "font-semibold text-slate-900" : "text-slate-800"
                            )}
                          >
                            {title}
                          </span>
                          {!n.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> : null}
                        </span>
                        {body ? (
                          <span className="mt-0.5 block text-xs break-words whitespace-normal text-slate-500">{body}</span>
                        ) : null}
                        <span className="mt-1 block text-[11px] text-slate-400">{relativeTime(n.createdAt, labels)}</span>
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 0 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">{labels.noNotifications}</p>
                <p className="mt-1 text-xs text-slate-500">{labels.noNotificationsHint}</p>
              </li>
            )}
          </ul>

          <div className="border-t border-slate-100 p-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-xl bg-slate-900 py-2.5 text-center text-xs font-semibold text-white hover:bg-slate-800"
            >
              {labels.openAll}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
