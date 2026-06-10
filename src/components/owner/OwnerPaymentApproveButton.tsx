"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  bookingId: number;
  locale: Locale;
  className?: string;
};

export function OwnerPaymentApproveButton({ bookingId, locale, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onApprove() {
    if (busy) return;
    if (!window.confirm("Подтвердить получение оплаты от гостя?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}/payment-approve`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "X-Requested-With": "fetch" }
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Не удалось подтвердить оплату");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось подтвердить оплату");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onApprove()}
        className={
          className ??
          "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        }
      >
        {busy ? "…" : "✅ Подтвердить оплату"}
      </button>
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </div>
  );
}
