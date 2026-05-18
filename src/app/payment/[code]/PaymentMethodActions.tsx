"use client";

import { useMemo, useState } from "react";

type Props = {
  amount: number;
  account: string;
  provider: "DC" | "ALIF";
};

export function PaymentMethodActions({ amount, account, provider }: Props) {
  const [copied, setCopied] = useState(false);
  const isDc = provider === "DC";

  const deepLink = useMemo(() => {
    if (isDc) {
      const p = new URLSearchParams({ amount: String(Math.max(0, Math.round(amount))), account });
      return `next.dc.tj://payment?${p.toString()}`;
    }
    return `alifmobi://payment?amount=${Math.max(0, Math.round(amount))}&account=${encodeURIComponent(account)}`;
  }, [isDc, amount, account]);

  const fallbackWeb = isDc ? "https://dc.tj/" : "https://alif.tj/";

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  function openApp() {
    window.location.href = deepLink;
    window.setTimeout(() => {
      window.location.href = fallbackWeb;
    }, 2500);
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyAccount}
          className="rounded-lg border border-brand-700 bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {copied ? "Скопировано" : "Копировать номер"}
        </button>
        <button
          type="button"
          onClick={openApp}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Открыть в {isDc ? "Dushanbe City" : "Alif Mobi"}
        </button>
      </div>
      <div className="text-[11px] text-brand-200">
        Нажмите «Открыть в {isDc ? "Dushanbe City" : "Alif Mobi"}», чтобы продолжить оплату в приложении.
      </div>
    </div>
  );
}

