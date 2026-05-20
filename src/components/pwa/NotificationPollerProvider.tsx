"use client";

import { useEffect } from "react";
import { useNotificationPoller } from "@/hooks/useNotificationPoller";
import { markUserInteracted } from "@/lib/pwa/notificationPrefs";

export function NotificationPollerProvider({
  enabled,
  initialUnreadCount,
  toastLabel
}: {
  enabled: boolean;
  initialUnreadCount: number;
  toastLabel: string;
}) {
  useNotificationPoller({ enabled, initialCount: initialUnreadCount, toastLabel });

  useEffect(() => {
    const onInteract = () => markUserInteracted();
    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  return null;
}
