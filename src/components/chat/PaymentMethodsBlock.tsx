"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function PaymentMethodsBlock({ locale, methods }: { locale: Locale; methods: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!methods.length) {
    return (
      <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-slate-400">
        {m(locale, "bookingRoom.payment.empty")}
      </section>
    );
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4 backdrop-blur-md">
      <h2 className="text-sm font-semibold text-emerald-100">{m(locale, "bookingRoom.payment.title")}</h2>
      <p className="mt-1 text-xs text-slate-400">{m(locale, "bookingRoom.payment.hint")}</p>
      <ul className="mt-3 space-y-2">
        {methods.map((method) => (
          <li
            key={method}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 break-all font-mono text-sm text-slate-100">{method}</span>
            <button
              type="button"
              onClick={() => void copyText(method)}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {copied === method ? m(locale, "bookingRoom.payment.copied") : m(locale, "bookingRoom.payment.copy")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

