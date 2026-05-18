import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default async function AboutPage() {
  const locale = getLocale();
  return (
    <section className="mx-auto max-w-4xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">{m(locale, "footer.about")}</h1>

      <article className="rounded-2xl border border-white/10 bg-[#121F14] px-6 py-7 sm:px-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-green)]">{m(locale, "about.block1Title")}</h2>
        <p className="text-[0.95rem] leading-7 text-[rgba(240,237,232,0.75)]">{m(locale, "about.block1Text")}</p>
      </article>

      <article className="rounded-2xl border border-white/10 bg-[#121F14] px-6 py-7 sm:px-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-green)]">{m(locale, "about.block2Title")}</h2>
        <p className="text-[0.95rem] leading-7 text-[rgba(240,237,232,0.75)]">{m(locale, "about.block2Text")}</p>
      </article>

      <article className="rounded-2xl border border-white/10 bg-[#121F14] px-6 py-7 sm:px-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-green)]">{m(locale, "about.block3Title")}</h2>
        <p className="whitespace-pre-line text-[0.95rem] leading-7 text-[rgba(240,237,232,0.75)]">{m(locale, "about.block3Text")}</p>
      </article>
    </section>
  );
}

