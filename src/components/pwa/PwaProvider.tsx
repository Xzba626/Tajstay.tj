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
      // Full dev cleanup, not just unregister: a registration from an earlier session (before
      // this gate existed, or from a stale browser profile) can keep controlling the current
      // page's navigation *and* keep serving its own cached responses even after unregister() -
      // unregister only stops it from controlling *future* loads. Only touch TajStay's own
      // cache (name-prefixed "tajstay-", matches public/sw.js's CACHE_VERSION scheme) - never
      // delete unrelated browser storage. If a stale registration/cache was actually found and
      // removed, reload once so the developer sees current content immediately instead of
      // needing manual DevTools intervention.
      Promise.all([navigator.serviceWorker.getRegistrations(), caches.keys()]).then(
        async ([regs, cacheKeys]) => {
          const tajstayCacheKeys = cacheKeys.filter((k) => k.startsWith("tajstay-"));
          const foundStale = regs.length > 0 || tajstayCacheKeys.length > 0;
          await Promise.all(regs.map((reg) => reg.unregister()));
          await Promise.all(tajstayCacheKeys.map((k) => caches.delete(k)));
          if (foundStale) window.location.reload();
        }
      );
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
