import Link from "next/link";
import { OfflineRetryButton } from "@/app/offline/OfflineRetryButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default function OfflinePage() {
  const locale = getLocale();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl">📡</div>
      <h1 className="text-2xl font-semibold text-slate-900">{m(locale, "pwa.offlineTitle")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{m(locale, "pwa.offlineBody")}</p>
      <p className="mt-2 text-xs text-slate-500">{m(locale, "pwa.offlineHint")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <OfflineRetryButton label={m(locale, "pwa.offlineRetry")} />
        <Link href="/" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {m(locale, "header.home")}
        </Link>
      </div>
    </div>
  );
}
