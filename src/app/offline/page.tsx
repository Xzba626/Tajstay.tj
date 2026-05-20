import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default function OfflinePage() {
  const locale = getLocale();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" d="M3 12h3M18 12h3M8 8l-2-2M16 16l2 2M8 16l-2 2M16 8l2-2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h1 className="font-serif text-2xl font-semibold text-slate-900">{m(locale, "pwa.offlineTitle")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{m(locale, "pwa.offlineBody")}</p>
      <p className="mt-2 text-xs text-slate-500">{m(locale, "pwa.offlineReadOnly")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-2xl bg-emerald-800 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        {m(locale, "pwa.offlineRetry")}
      </Link>
    </div>
  );
}
