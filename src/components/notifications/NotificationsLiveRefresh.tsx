"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { NOTIFICATION_NEW_EVENT } from "@/lib/pwa/notificationEvents";

/** Soft refresh on /notifications when global poller detects changes. */
export function NotificationsLiveRefresh() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/notifications") return;
    function onNew(e: Event) {
      const detail = (e as CustomEvent<{ delta?: number }>).detail;
      if (detail?.delta && detail.delta > 0) router.refresh();
    }
    window.addEventListener(NOTIFICATION_NEW_EVENT, onNew);
    return () => window.removeEventListener(NOTIFICATION_NEW_EVENT, onNew);
  }, [pathname, router]);

  return null;
}
