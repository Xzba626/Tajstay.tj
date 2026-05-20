export function setAppNotificationBadge(count: number): void {
  if (typeof navigator === "undefined") return;
  const n = Math.max(0, Math.floor(count));
  const nav = navigator as Navigator & {
    setAppBadge?: (count: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (n > 0 && nav.setAppBadge) {
      void nav.setAppBadge(n);
    } else if (nav.clearAppBadge) {
      void nav.clearAppBadge();
    }
  } catch {
    // unsupported
  }
}
