import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export function OwnerEmptyState() {
  const locale = getLocale();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121F14] p-8 shadow-lg shadow-black/20 ring-1 ring-white/5 md:p-10">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />
      <div className="relative max-w-xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">{m(locale, "owner.emptyTitle")}</h2>
        <p className="mt-3 leading-relaxed text-[rgba(240,237,232,0.6)]">{m(locale, "owner.emptyText")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/owner?section=properties"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-green)] px-6 py-3 text-sm font-semibold text-[#0D1610] shadow-md transition hover:bg-[var(--brand-green-dark)]"
          >
            {m(locale, "owner.addPropertyCta")}
          </Link>
          <a
            href="mailto:support@tajstay.local?subject=TajStay%20support"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            {m(locale, "owner.contactAdmin")}
          </a>
        </div>
      </div>
    </div>
  );
}
