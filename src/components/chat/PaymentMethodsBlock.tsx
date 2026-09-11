"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export type PaymentMethodDisplay = {
  id: number;
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions?: string | null;
};

export function PaymentMethodsBlock({ locale, methods }: { locale: Locale; methods: PaymentMethodDisplay[] }) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!methods.length) {
    return (
      <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-slate-400">
        {m(locale, "bookingRoom.payment.empty")}
      </section>
    );
  }

  async function copyText(id: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4 backdrop-blur-md">
      <h2 className="text-sm font-semibold text-[#d1fae5]">{m(locale, "bookingRoom.payment.title")}</h2>
      <p className="mt-1 text-xs text-slate-400">{m(locale, "bookingRoom.payment.hint")}</p>
      <ul className="mt-3 space-y-3">
        {methods.map((method) => (
          <li key={method.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-semibold text-slate-100">{method.displayLabel}</div>
            <div className="mt-1 text-xs text-slate-400">{method.recipientName}</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 break-all font-mono text-sm text-slate-100">
                {method.paymentIdentifier}
              </span>
              <button
                type="button"
                onClick={() => void copyText(method.id, method.paymentIdentifier)}
                className="shrink-0 rounded-lg bg-[#0f7a4d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f7a4d]"
              >
                {copiedId === method.id ? m(locale, "bookingRoom.payment.copied") : m(locale, "bookingRoom.payment.copy")}
              </button>
            </div>
            {method.instructions ? <div className="mt-2 text-xs text-slate-400">{method.instructions}</div> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
