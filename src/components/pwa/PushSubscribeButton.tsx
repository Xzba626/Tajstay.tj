"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

export function PushSubscribeButton({
  labels
}: {
  labels: { enable: string; enabled: string; denied: string; unsupported: string };
}) {
  const [status, setStatus] = useState<"idle" | "enabled" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    } else if (Notification.permission === "granted") {
      setStatus("enabled");
    }
  }, []);

  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "denied") {
      setStatus("denied");
      return;
    }
    if (perm !== "granted") return;

    const keyRes = await fetch("/api/push/vapid-public-key");
    const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
    if (!publicKey) {
      setStatus("unsupported");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    const json = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys
      })
    });
    setStatus("enabled");
  }

  if (status === "unsupported") {
    return <p className="text-xs text-slate-500">{labels.unsupported}</p>;
  }
  if (status === "denied") {
    return <p className="text-xs text-amber-700">{labels.denied}</p>;
  }
  if (status === "enabled") {
    return <p className="text-xs text-emerald-700">{labels.enabled}</p>;
  }

  return (
    <button
      type="button"
      onClick={() => void subscribe()}
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
    >
      {labels.enable}
    </button>
  );
}
