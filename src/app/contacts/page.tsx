import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";

export default async function ContactsPage() {
  const locale = getLocale();
  const content = await getSiteContent();
  const s = content.support;
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-[#14231b]">{m(locale, "footer.contacts")}</h1>
      <p className="mt-4 text-slate-600">{m(locale, "legal.contactsLead")}</p>
      <div className="contacts-card mt-6">
        {s.workingHours ? <div className="contacts-card__hours">{s.workingHours}</div> : null}
        <div className="contacts-card__actions">
          <a className="contacts-card__action" href={`mailto:${s.email}`}>
            <Mail size={18} aria-hidden />
            <span>{s.email}</span>
          </a>
          {s.phone ? (
            <a className="contacts-card__action" href={`tel:${s.phone.replace(/\s+/g, "")}`}>
              <Phone size={18} aria-hidden />
              <span>{s.phone}</span>
            </a>
          ) : null}
          {s.whatsapp ? (
            <a className="contacts-card__action" href={s.whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={18} aria-hidden />
              <span>{m(locale, "legal.contactWhatsapp")}</span>
            </a>
          ) : null}
          {s.telegram ? (
            <a className="contacts-card__action" href={s.telegram} target="_blank" rel="noreferrer">
              <Send size={18} aria-hidden />
              <span>{m(locale, "legal.contactTelegram")}</span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
