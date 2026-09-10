"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PwaProvider() {
  const router = useRouter();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // SYSTEMIC FINDING (this session): the SW was registering unconditionally, including in
    // local dev. Next.js dev serves non-content-hashed chunk URLs and can return slow/aborted
    // responses mid-recompile; when the SW's network-first `/_next/` handler's fetch fails or
    // races a recompile, it falls back to `caches.match()` and can permanently re-serve a stale
    // chunk from before the edit — reproduced 4 times this session (stale UI in the browser
    // while fresh SSR HTML and a clean production build both showed the current source
    // correctly). A dev server is not a static asset host; a SW has no reason to run there.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      return;
    }

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
