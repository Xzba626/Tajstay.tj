"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/locale";
import { notificationText } from "@/lib/notifications/text";

export type NotificationBellLabels = {
  ariaLabel: string;
  title: string;
  noNotifications: string;
  markReadAll: string;
  openAll: string;
};

type NotificationItem = {
  id: number;
  type: string;
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

export function NotificationBell({
  labels,
  initialUnreadCount = 0
}: {
  labels: NotificationBellLabels;
  initialUnreadCount?: number;
}) {
  const [open, setOpen] = useState(false);
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
    let mounted = true;
    async function pull() {
      try {
        const [countRes, listRes] = await Promise.all([
          fetch("/api/notifications/unread", { credentials: "include", cache: "no-store" }),
          fetch("/api/notifications/list", { credentials: "include", cache: "no-store" })
        ]);
        if (!mounted || !countRes.ok) return;
        const countData = (await countRes.json()) as { count?: number };
        const listData = (await listRes.json()) as { items?: NotificationItem[] };
        setUnreadCount(typeof countData.count === "number" ? Math.max(0, countData.count) : 0);
        setItems(Array.isArray(listData.items) ? listData.items : []);
      } catch {
        // ignore
      }
    }
    const t = window.setInterval(() => void pull(), 4000);
    void pull();
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  async function readAll() {
    if (markingReadAll) return;
    setMarkingReadAll(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
      setUnreadCount(0);
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    } finally {
      setMarkingReadAll(false);
    }
  }

  const locale = getClientLocale();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50",
          open && "ring-2 ring-emerald-600/20"
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
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">{labels.title}</span>
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
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {items.length ? (
              items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link || "/notifications"}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50",
                      !n.isRead && "bg-emerald-50/80 font-medium"
                    )}
                  >
                    {notificationText(locale, n.type, n.bookingCode)}
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-center text-sm text-slate-500">{labels.noNotifications}</li>
            )}
          </ul>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-xl border border-slate-200 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {labels.openAll}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
