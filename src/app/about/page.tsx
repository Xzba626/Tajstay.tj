import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  return buildPageMetadata({
    title: m(locale, "meta.aboutTitle"),
    description: m(locale, "meta.aboutDescription"),
    path: "/about"
  });
}

export default async function AboutPage() {
  const locale = getLocale();
  const content = await getSiteContent();
  return (
    <section className="mx-auto max-w-4xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">{m(locale, "footer.about")}</h1>

      <article className="rounded-2xl border border-white/10 bg-[#121F14] px-6 py-7 sm:px-8">
        <p className="whitespace-pre-line text-[0.95rem] leading-7 text-[rgba(240,237,232,0.75)]">
          {content.legal.aboutText}
        </p>
      </article>
    </section>
  );
}
