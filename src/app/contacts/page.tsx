import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

const SUPPORT_EMAIL = "support@tajstay.site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  return buildPageMetadata({
    title: m(locale, "meta.contactTitle"),
    description: m(locale, "meta.contactDescription"),
    path: "/contacts"
  });
}

export default async function ContactsPage() {
  const locale = getLocale();
  const content = await getSiteContent();
  const s = content.support;
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">{m(locale, "footer.contacts")}</h1>
      <p className="mt-4 text-slate-300">{m(locale, "legal.contactsLead")}</p>
      <div className="surface-1 mt-6 rounded-2xl p-5 text-sm text-slate-200 shadow-sm">
        <div className="font-semibold text-slate-100">{s.supportTitle}</div>
        {s.workingHours ? <div className="mt-2 text-slate-300">{s.workingHours}</div> : null}
        <div className="mt-2">
          Email:{" "}
          <a
            className="text-emerald-300 underline underline-offset-2"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
        {s.phone ? <div className="mt-1">Phone: {s.phone}</div> : null}
        {s.whatsapp ? (
          <div className="mt-1">
            WhatsApp:{" "}
            <a className="text-emerald-300 underline underline-offset-2" href={s.whatsapp} target="_blank" rel="noreferrer">
              {s.whatsapp}
            </a>
          </div>
        ) : null}
        {s.telegram ? (
          <div className="mt-1">
            Telegram:{" "}
            <a className="text-emerald-300 underline underline-offset-2" href={s.telegram} target="_blank" rel="noreferrer">
              {s.telegram}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
