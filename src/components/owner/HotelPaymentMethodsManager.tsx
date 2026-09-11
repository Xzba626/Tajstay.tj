"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Hotel = { id: number; name: string };

type PaymentMethod = {
  id: number;
  hotelId: number;
  type: string;
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions: string | null;
  isActive: boolean;
};

const TYPES = ["CARD", "WALLET", "BANK", "OTHER"] as const;

const emptyDraft = {
  type: "CARD" as (typeof TYPES)[number],
  displayLabel: "",
  recipientName: "",
  paymentIdentifier: "",
  instructions: ""
};

function HotelPaymentMethodsEditor({ locale, hotel }: { locale: Locale; hotel: Hotel }) {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/owner/hotels/${hotel.id}/payment-methods`, { credentials: "include" });
    const json = (await res.json().catch(() => ({}))) as { methods?: PaymentMethod[] };
    setMethods(json.methods ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id]);

  async function createMethod() {
    if (busy) return;
    if (!draft.displayLabel.trim() || !draft.recipientName.trim() || !draft.paymentIdentifier.trim()) {
      setError(m(locale, "owner.paymentMethods.fillRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/hotels/${hotel.id}/payment-methods`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (!res.ok) throw new Error(m(locale, "owner.paymentMethods.saveFailed"));
      setDraft(emptyDraft);
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : m(locale, "owner.paymentMethods.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(method: PaymentMethod) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/owner/hotels/${hotel.id}/payment-methods/${method.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !method.isActive })
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(method: PaymentMethod) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/owner/hotels/${hotel.id}/payment-methods/${method.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="owner-panel space-y-3">
      <h3 className="owner-panel__title">{hotel.name}</h3>

      {methods === null ? (
        <p className="owner-section-lead">{m(locale, "owner.paymentMethods.loading")}</p>
      ) : methods.length === 0 && !adding ? (
        <p className="owner-section-lead">{m(locale, "owner.paymentMethods.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {methods?.map((method) => (
            <li key={method.id} className="owner-record-card flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="owner-record-card__title">{method.displayLabel}</div>
                <div className="owner-record-card__meta truncate">
                  {method.recipientName} · {method.paymentIdentifier}
                </div>
                {method.instructions ? <div className="owner-record-card__meta">{method.instructions}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleActive(method)}
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 disabled:opacity-50"
                >
                  {method.isActive ? m(locale, "owner.paymentMethods.active") : m(locale, "owner.paymentMethods.inactive")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(method)}
                  className="rounded-lg border border-red-400/30 px-2.5 py-1 text-xs text-red-200 disabled:opacity-50"
                >
                  {m(locale, "owner.paymentMethods.remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
          <select
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as (typeof TYPES)[number] }))}
            className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={draft.displayLabel}
            onChange={(e) => setDraft((d) => ({ ...d, displayLabel: e.target.value }))}
            placeholder={m(locale, "owner.paymentMethods.labelPlaceholder")}
            className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <input
            value={draft.recipientName}
            onChange={(e) => setDraft((d) => ({ ...d, recipientName: e.target.value }))}
            placeholder={m(locale, "owner.paymentMethods.recipientPlaceholder")}
            className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <input
            value={draft.paymentIdentifier}
            onChange={(e) => setDraft((d) => ({ ...d, paymentIdentifier: e.target.value }))}
            placeholder={m(locale, "owner.paymentMethods.identifierPlaceholder")}
            className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <textarea
            value={draft.instructions}
            onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
            placeholder={m(locale, "owner.paymentMethods.instructionsPlaceholder")}
            rows={2}
            className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
          />
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setDraft(emptyDraft);
                setError(null);
              }}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200"
            >
              {m(locale, "owner.paymentMethods.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void createMethod()}
              className="rounded-lg bg-[#0f7a4d] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy ? "…" : m(locale, "owner.paymentMethods.save")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200"
        >
          {m(locale, "owner.paymentMethods.add")}
        </button>
      )}
    </div>
  );
}

export function HotelPaymentMethodsManager({ locale, hotels }: { locale: Locale; hotels: Hotel[] }) {
  if (!hotels.length) {
    return <p className="owner-section-lead">{m(locale, "owner.paymentMethods.noHotels")}</p>;
  }
  return (
    <div className="space-y-4">
      {hotels.map((hotel) => (
        <HotelPaymentMethodsEditor key={hotel.id} locale={locale} hotel={hotel} />
      ))}
    </div>
  );
}
