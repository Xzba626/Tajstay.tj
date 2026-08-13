"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { setAppNotificationBadge } from "@/lib/pwa/appBadge";
import { dispatchNotificationNew, dispatchNotificationToast } from "@/lib/pwa/notificationEvents";
import { playNewNotificationSound } from "@/lib/pwa/notificationSound";

const POLL_MS = 25_000;

export type NotificationListItem = {
  id: number;
  type: string;
  title: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  bookingCode: string | null;
  link: string;
};

export function useNotificationPoller(opts: {
  enabled: boolean;
  initialCount: number;
  toastLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const prevCountRef = useRef(opts.initialCount);
  const itemsRef = useRef<NotificationListItem[]>([]);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/list", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: NotificationListItem[] };
      itemsRef.current = Array.isArray(data.items) ? data.items : [];
    } catch {
      /* ignore */
    }
  }, []);

  const poll = useCallback(async () => {
    if (!opts.enabled) return;
    try {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      const count = typeof data.count === "number" ? Math.max(0, data.count) : 0;
      const prev = prevCountRef.current;
      if (count > prev) {
        await refreshList();
        const newest = itemsRef.current.find((i) => !i.isRead);
        const preview = newest?.title || newest?.message || opts.toastLabel || "";
        playNewNotificationSound();
        dispatchNotificationToast(preview || opts.toastLabel || "");
        dispatchNotificationNew({ count, delta: count - prev, preview });
      }
      prevCountRef.current = count;
      setAppNotificationBadge(count);
      dispatchNotificationNew({ count, delta: 0 });

      if (
        pathname === "/notifications" ||
        pathname === "/dashboard/messages" ||
        pathname?.startsWith("/chat/")
      ) {
        router.refresh();
      }
    } catch {
      /* offline */
    }
  }, [opts.enabled, opts.toastLabel, pathname, refreshList, router]);

  useEffect(() => {
    prevCountRef.current = opts.initialCount;
    setAppNotificationBadge(opts.initialCount);
  }, [opts.initialCount]);

  useEffect(() => {
    if (!opts.enabled) return;
    void refreshList();
    void poll();
    const t = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(t);
  }, [opts.enabled, poll, refreshList]);

  return { getItems: () => itemsRef.current, poll };
}
