"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Pusher from "pusher-js";
import type { UserAlertPayload } from "@/lib/pusher/config";
import {
  isPusherClientConfigured,
  PUSHER_EVENTS,
  pusherCluster,
  pusherPublicKey,
  userNotifyChannelName
} from "@/lib/pusher/config";
import { isViewingBookingChat } from "@/lib/chat/chatViewState";
import { playNewNotificationSound } from "@/lib/pwa/notificationSound";
import { showBrowserNotification } from "@/lib/pwa/browserNotification";

export function ChatAlertsProvider({ userId }: { userId: number | null }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!userId || !isPusherClientConfigured()) return;

    let cancelled = false;
    let pusher: Pusher | null = null;

    void (async () => {
      try {
        const statusRes = await fetch("/api/pusher/status", { cache: "no-store" });
        const statusJson = (await statusRes.json().catch(() => ({}))) as { enabled?: boolean };
        if (!statusJson.enabled || cancelled) return;

        pusher = new Pusher(pusherPublicKey()!, {
          cluster: pusherCluster(),
          channelAuthorization: {
            endpoint: "/api/pusher/auth",
            transport: "ajax"
          }
        });

        const channel = pusher.subscribe(userNotifyChannelName(userId));

        channel.bind(PUSHER_EVENTS.USER_ALERT, (data: UserAlertPayload) => {
          if (!data?.bookingId) return;
          if (isViewingBookingChat(pathnameRef.current, data.bookingId)) return;

          playNewNotificationSound();
          showBrowserNotification({
            title: data.title || "Tajstay",
            body: data.body || "",
            url: data.url || `/chat/booking/${data.bookingId}`,
            tag: `chat-${data.bookingId}`
          });
        });
      } catch {
        /* best-effort */
      }
    })();

    return () => {
      cancelled = true;
      if (pusher) {
        pusher.unsubscribe(userNotifyChannelName(userId));
        pusher.disconnect();
      }
    };
  }, [userId]);

  return null;
}
