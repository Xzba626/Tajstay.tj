import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default async function FaqPage() {
  const locale = getLocale();
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{m(locale, "footer.faq")}</h1>
      <div className="mt-6 space-y-4 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-semibold text-slate-900">{m(locale, "legal.faqQ1")}</div>
          <p className="mt-2 text-sm text-slate-600">{m(locale, "legal.faqA1")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-semibold text-slate-900">{m(locale, "legal.faqQ2")}</div>
          <p className="mt-2 text-sm text-slate-600">{m(locale, "legal.faqA2")}</p>
        </div>
      </div>
    </section>
  );
}

