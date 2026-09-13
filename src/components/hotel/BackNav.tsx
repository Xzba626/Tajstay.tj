import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

/** A visible, touch-friendly back control - not a decorative arrow-only affordance. A plain
 *  server-rendered link to a logical fallback (this hotel's city search, or the hotel page from
 *  the reviews page) - works with zero client JS, and browser Back still works normally for a
 *  visit that came from Search since this is an ordinary link, not a history hijack. */
export function BackNav({ locale, fallbackHref }: { locale: Locale; fallbackHref: string }) {
  return (
    <Link
      href={fallbackHref}
      aria-label={m(locale, "hotelPage.back")}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm active:bg-black/40"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {m(locale, "hotelPage.back")}
    </Link>
  );
}
