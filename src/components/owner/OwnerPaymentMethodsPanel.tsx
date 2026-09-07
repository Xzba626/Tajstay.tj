import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  locale: Locale;
  ownerPaymentMethods: string[];
  catalogMethods: string[];
};

/** Single owner payment-methods editor — finances section only (Wave 0: no global duplicate). */
export function OwnerPaymentMethodsPanel({ locale, ownerPaymentMethods, catalogMethods }: Props) {
  return (
    <section className="owner-panel">
      <h2 className="owner-panel__title">{m(locale, "dashboard.paymentMethods.title")}</h2>
      <p className="owner-section-lead">{m(locale, "dashboard.paymentMethods.desc")}</p>
      <form action="/api/owner/payment-methods" method="post" className="mt-4 space-y-3">
        <input
          name="methods"
          defaultValue={ownerPaymentMethods.join(", ")}
          placeholder={m(locale, "dashboard.paymentMethods.placeholder")}
          className="owner-input w-full"
          aria-describedby="owner-payment-catalog-hint"
        />
        <button type="submit" className="owner-btn owner-btn--primary">
          {m(locale, "dashboard.paymentMethods.save")}
        </button>
      </form>
      {catalogMethods.length ? (
        <p id="owner-payment-catalog-hint" className="owner-field__hint mt-3">
          {m(locale, "dashboard.paymentMethods.catalogHint")}: {catalogMethods.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
