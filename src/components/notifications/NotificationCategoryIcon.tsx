import type { CategoryStyle } from "@/lib/notifications/categoryUi";

export function NotificationCategoryIcon({ icon, className }: { icon: CategoryStyle["icon"]; className?: string }) {
  const c = className ?? "h-4 w-4";
  switch (icon) {
    case "booking":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 0 0 2-2V7H3v12a2 2 0 0 0 2 2Z" strokeLinecap="round" />
        </svg>
      );
    case "message":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" strokeLinejoin="round" />
        </svg>
      );
    case "payment":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "finance":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" strokeLinecap="round" />
        </svg>
      );
    case "moderation":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.7 2.4 18.2A2 2 0 0 0 4.2 21h15.6a2 2 0 0 0 1.8-2.8L14.7 3.7a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l2 2" strokeLinecap="round" />
        </svg>
      );
  }
}
