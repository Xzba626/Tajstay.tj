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
    <section className="liquid-glass rounded-2xl p-6">
      <h2 className="text-lg font-bold text-slate-100">{m(locale, "dashboard.paymentMethods.title")}</h2>
      <p className="mt-1 text-sm text-slate-300">{m(locale, "dashboard.paymentMethods.desc")}</p>
      <form action="/api/owner/payment-methods" method="post" className="mt-4 space-y-3">
        <input
          name="methods"
          defaultValue={ownerPaymentMethods.join(", ")}
          placeholder={m(locale, "dashboard.paymentMethods.placeholder")}
          className="ds-input w-full text-sm"
          aria-describedby="owner-payment-catalog-hint"
        />
        <button type="submit" className="ds-primary-btn text-sm">
          {m(locale, "dashboard.paymentMethods.save")}
        </button>
      </form>
      {catalogMethods.length ? (
        <p id="owner-payment-catalog-hint" className="mt-3 text-xs text-slate-400">
          {m(locale, "dashboard.paymentMethods.catalogHint")}: {catalogMethods.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
