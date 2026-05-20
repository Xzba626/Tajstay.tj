"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PwaProvider() {
  const router = useRouter();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.update().catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function onOnline() {
      if (wasOffline) router.refresh();
      setWasOffline(false);
    }
    function onOffline() {
      setWasOffline(true);
    }
    setWasOffline(!navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [router, wasOffline]);

  return null;
}
