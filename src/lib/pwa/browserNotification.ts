/** Show a system notification when permission is granted (foreground or background tab). */
export function showBrowserNotification(opts: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title = opts.title.trim() || "Tajstay";
  const body = opts.body.trim();
  const url = opts.url || "/notifications";
  const tag = opts.tag || "tajstay-alert";

  try {
    const n = new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      data: { url }
    });
    n.onclick = () => {
      window.focus();
      window.location.href = url;
      n.close();
    };
  } catch {
    /* Safari / restricted contexts */
  }
}
