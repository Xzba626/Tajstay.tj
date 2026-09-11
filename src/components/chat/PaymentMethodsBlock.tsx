"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export type PaymentMethodDisplay = {
  id: number;
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions?: string | null;
};

export type PaymentMethodSnapshot = {
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions: string | null;
};

export function PaymentMethodsBlock({
  locale,
  bookingId,
  methods,
  selectedMethodId,
  frozenSnapshot,
  locked
}: {
  locale: Locale;
  bookingId: number;
  methods: PaymentMethodDisplay[];
  /** Already-selected method (Booking.hotelPaymentMethodId) - null if the guest hasn't picked one yet. */
  selectedMethodId: number | null;
  /**
   * Booking.paymentMethodSnapshot - the immutable requisites frozen at selection time. Once set,
   * this is what's actually shown for the selected method, NOT the live entry in `methods` - the
   * owner may have edited or deactivated that method since, and the guest must keep seeing exactly
   * what they were told to pay to.
   */
  frozenSnapshot: PaymentMethodSnapshot | null;
  /** True once proof has been submitted - the snapshot is frozen, selection can no longer change. */
  locked: boolean;
}) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [currentSelectedId, setCurrentSelectedId] = useState<number | null>(selectedMethodId);
  const [error, setError] = useState<string | null>(null);

  // The guest's already-selected method must stay visible even if the owner deactivates or
  // deletes it afterward - getHotelPaymentMethods() only returns active methods, so it can
  // disappear from `methods` entirely. Re-inject it from the frozen snapshot when that happens.
  const displayMethods: PaymentMethodDisplay[] =
    currentSelectedId && frozenSnapshot && !methods.some((m2) => m2.id === currentSelectedId)
      ? [{ id: currentSelectedId, ...frozenSnapshot }, ...methods]
      : methods;

  if (!displayMethods.length) {
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

  async function selectMethod(id: number) {
    if (locked || selecting) return;
    setSelecting(id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/select-payment-method`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelPaymentMethodId: id })
      });
      if (!res.ok) throw new Error(m(locale, "bookingRoom.payment.selectFailed"));
      setCurrentSelectedId(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : m(locale, "bookingRoom.payment.selectFailed"));
    } finally {
      setSelecting(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4 backdrop-blur-md">
      <h2 className="text-sm font-semibold text-[#d1fae5]">{m(locale, "bookingRoom.payment.title")}</h2>
      <p className="mt-1 text-xs text-slate-400">
        {locked ? m(locale, "bookingRoom.payment.hintLocked") : m(locale, "bookingRoom.payment.hintSelect")}
      </p>
      <ul className="mt-3 space-y-3">
        {displayMethods.map((method) => {
          const isSelected = currentSelectedId === method.id;
          // Once selected, the frozen snapshot (if the server has one) is the source of truth for
          // what's displayed - never the live method row, which the owner may have edited since.
          const display: PaymentMethodDisplay = isSelected && frozenSnapshot ? { id: method.id, ...frozenSnapshot } : method;
          return (
            <li
              key={method.id}
              className={`rounded-xl border p-3 ${isSelected ? "border-[#0f7a4d] bg-[#0f7a4d]/10" : "border-white/10 bg-black/20"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-100">{display.displayLabel}</div>
                {!locked && !isSelected ? (
                  <button
                    type="button"
                    disabled={selecting === method.id}
                    onClick={() => void selectMethod(method.id)}
                    className="shrink-0 rounded-lg border border-[#0f7a4d]/40 px-2.5 py-1 text-xs font-semibold text-[#d1fae5]"
                  >
                    {selecting === method.id ? "…" : m(locale, "bookingRoom.payment.select")}
                  </button>
                ) : isSelected ? (
                  <span className="shrink-0 rounded-lg bg-[#0f7a4d] px-2.5 py-1 text-xs font-semibold text-white">
                    {m(locale, "bookingRoom.payment.selected")}
                  </span>
                ) : null}
              </div>
              {isSelected ? (
                <>
                  <div className="mt-1 text-xs text-slate-400">{display.recipientName}</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 break-all font-mono text-sm text-slate-100">
                      {display.paymentIdentifier}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyText(display.id, display.paymentIdentifier)}
                      className="shrink-0 rounded-lg bg-[#0f7a4d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f7a4d]"
                    >
                      {copiedId === display.id ? m(locale, "bookingRoom.payment.copied") : m(locale, "bookingRoom.payment.copy")}
                    </button>
                  </div>
                  {display.instructions ? <div className="mt-2 text-xs text-slate-400">{display.instructions}</div> : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </section>
  );
}
