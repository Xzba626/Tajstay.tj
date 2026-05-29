import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
export default async function FaqPage() {
  const locale = getLocale();
  const items = [
    { q: m(locale, "legal.faqQ1"), a: m(locale, "legal.faqA1") },
    { q: m(locale, "legal.faqQ2"), a: m(locale, "legal.faqA2") },
    { q: m(locale, "legal.faqQ3"), a: m(locale, "legal.faqA3") },
    { q: m(locale, "legal.faqQ4"), a: m(locale, "legal.faqA4") },
    { q: m(locale, "legal.faqQ5"), a: m(locale, "legal.faqA5") },
    { q: m(locale, "legal.faqQ6"), a: m(locale, "legal.faqA6") },
    { q: m(locale, "legal.faqQ7"), a: m(locale, "legal.faqA7") },
    { q: m(locale, "legal.faqQ8"), a: m(locale, "legal.faqA8") }
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">{m(locale, "footer.faq")}</h1>
      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <div key={index} className="surface-1 rounded-2xl p-5 text-sm shadow-sm">
            <div className="font-semibold text-slate-100">{item.q}</div>
            <p className="mt-2 text-slate-300">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
