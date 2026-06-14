"use client";

import { useEffect, useRef } from "react";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

/** Sync Web Push subscription when Notification.permission is already granted. */
export function PushSubscriptionSync() {
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    syncedRef.current = true;

    void (async () => {
      try {
        const keyRes = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
        if (!keyRes.ok) return;
        const { publicKey } = (await keyRes.json()) as { publicKey?: string };
        if (!publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }
        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys
          })
        });
      } catch {
        /* VAPID optional in dev */
      }
    })();
  }, []);

  return null;
}
