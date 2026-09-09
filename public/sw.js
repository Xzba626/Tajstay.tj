/* Tajstay PWA service worker — app shell + offline fallback */
const CACHE_VERSION = "tajstay-shell-v3";
const SHELL_URLS = ["/", "/offline", "/search", "/about", "/brand/tajstay-icon.png", "/manifest.webmanifest"];

// Only these path prefixes may have their navigation HTML cached — everything else is
// personalized/authenticated (profile, dashboard, notifications, favorites, history, auth, ...)
// and must never be written into the shared offline cache, or one device user could be served
// another user's cached page after a session switch.
const PUBLIC_NAV_PREFIXES = ["/", "/about", "/search", "/tours", "/offline", "/faq", "/contacts", "/policy", "/terms"];

function isPublicNavPath(pathname) {
  if (pathname === "/") return true;
  return PUBLIC_NAV_PREFIXES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isNavigation(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

function isApiOrAuth(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  if (isApiOrAuth(url)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ offline: true, error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Network-first for JS/CSS chunks: dev-mode (and some deploy) filenames are not content-hashed,
  // so cache-first can serve stale code indefinitely after a rebuild/deploy. Cache is only a
  // fallback for genuinely offline requests.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/sounds/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        try {
          const res = await fetch(event.request);
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(event.request);
          return cached || Response.error();
        }
      })
    );
    return;
  }

  if (isNavigation(event.request)) {
    const cacheable = isPublicNavPath(url.pathname);
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (cacheable) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);
          if (cacheable) {
            const cached = await cache.match(event.request);
            if (cached) return cached;
          }
          const offline = await cache.match("/offline");
          return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      try {
        const res = await fetch(event.request);
        if (res.ok && (url.pathname.endsWith(".svg") || url.pathname.endsWith(".png") || url.pathname.endsWith(".css")))
          cache.put(event.request, res.clone());
        return res;
      } catch {
        const cached = await cache.match(event.request);
        return cached || Response.error();
      }
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Tajstay", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data?.text() || "";
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Tajstay", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      tag: data.tag || "tajstay-notification"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
