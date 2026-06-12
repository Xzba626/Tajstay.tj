import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  return buildPageMetadata({
    title: m(locale, "meta.termsTitle"),
    description: m(locale, "meta.termsDescription"),
    path: "/terms"
  });
}

export default async function TermsPage() {
  const locale = getLocale();
  const content = await getSiteContent();
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">{m(locale, "footer.terms")}</h1>
      <p className="mt-4 whitespace-pre-wrap text-slate-300">{content.legal.termsText}</p>
    </section>
  );
}

