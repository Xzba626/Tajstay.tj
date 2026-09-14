"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

/** BLOCK 5.4B - the owner's single atomic action for a pay-at-check-in booking's arrival day:
 * "payment received and guest checked in" together, never a plain check-in that could leave the
 * booking CHECKED_IN while still unpaid. */
export function ArrivalPaymentAction({ locale, bookingId }: { locale: Locale; bookingId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function confirm() {
    if (busy || done) return;
    if (!window.confirm(m(locale, "owner.payAtCheckIn.arrivalConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}/confirm-arrival-payment`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
      router.refresh();
    } catch {
      setError(m(locale, "owner.payAtCheckIn.arrivalFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4">
      <h2 className="text-sm font-semibold text-[#d1fae5]">{m(locale, "owner.payAtCheckIn.toggleLabel")}</h2>
      {done ? (
        <p className="mt-2 text-sm text-slate-300">{m(locale, "owner.payAtCheckIn.arrivalDone")}</p>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="mt-3 w-full rounded-xl bg-[#0f7a4d] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : m(locale, "owner.payAtCheckIn.arrivalAction")}
          </button>
          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        </>
      )}
    </section>
  );
}
