import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default function HistoryLoading() {
  const locale = getLocale();

  return (
    <div className="mockup-screen max-w-2xl" role="status" aria-live="polite">
      <div className="mockup-screen__title h-8 w-40 animate-pulse rounded bg-[var(--bg-elevated)]" aria-hidden />
      <div className="mb-4 mt-2 h-4 w-64 animate-pulse rounded bg-[var(--bg-elevated)]" aria-hidden />
      <div className="mockup-segment mb-4 h-11 animate-pulse" aria-hidden />
      <p className="py-12 text-center text-sm text-[var(--text-muted)]">{m(locale, "tripsHub.loading")}</p>
    </div>
  );
}
