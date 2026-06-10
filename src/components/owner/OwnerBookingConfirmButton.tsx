"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  bookingId: number;
  locale: Locale;
  label?: string;
  className?: string;
  apiBase?: string;
};

export function OwnerBookingConfirmButton({ bookingId, locale, label, className, apiBase = "/api/owner" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await fetch(`${apiBase}/bookings/${bookingId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "X-Requested-With": "fetch" }
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setError(json.error ?? m(locale, "owner.calendar.confirmError"));
        return;
      }
      setToast(json.message ?? m(locale, "owner.calendar.confirmSuccess"));
      router.refresh();
    } catch {
      setError(m(locale, "owner.calendar.confirmError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onConfirm()}
        className={
          className ??
          "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        }
      >
        {busy ? m(locale, "owner.calendar.confirming") : (label ?? m(locale, "owner.confirm"))}
      </button>
      {toast ? <span className="text-xs font-medium text-emerald-700">{toast}</span> : null}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </div>
  );
}
