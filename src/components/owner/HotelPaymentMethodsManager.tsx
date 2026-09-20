"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, Wallet, Landmark, MoreHorizontal, Check, ChevronDown } from "lucide-react";
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
const TYPE_ICONS = { CARD: CreditCard, WALLET: Wallet, BANK: Landmark, OTHER: MoreHorizontal } as const;

export function paymentTypeLabel(locale: Locale, type: string): string {
  switch (type) {
    case "CARD":
      return m(locale, "owner.paymentMethods.typeCard");
    case "WALLET":
      return m(locale, "owner.paymentMethods.typeWallet");
    case "BANK":
      return m(locale, "owner.paymentMethods.typeBank");
    default:
      return m(locale, "owner.paymentMethods.typeOther");
  }
}

function PaymentTypeSelect({
  locale,
  value,
  onChange
}: {
  locale: Locale;
  value: (typeof TYPES)[number];
  onChange: (t: (typeof TYPES)[number]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const ValueIcon = TYPE_ICONS[value];

  return (
    <div className="relative" ref={ref}>
      <label className="owner-payment-type-label">{m(locale, "owner.paymentMethods.typeFieldLabel")}</label>
      <button
        type="button"
        className="owner-payment-type-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ValueIcon size={16} aria-hidden />
        <span className="flex-1 text-left">{paymentTypeLabel(locale, value)}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open ? (
        <ul className="owner-payment-type-listbox" role="listbox">
          {TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            const selected = t === value;
            return (
              <li key={t}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="owner-payment-type-option"
                  onClick={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                >
                  <Icon size={16} aria-hidden />
                  <span className="flex-1 text-left">{paymentTypeLabel(locale, t)}</span>
                  {selected ? <Check size={16} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const emptyDraft = {
  type: "CARD" as (typeof TYPES)[number],
  displayLabel: "",
  recipientName: "",
  paymentIdentifier: "",
  instructions: ""
};

function fieldPlaceholder(
  locale: Locale,
  type: (typeof TYPES)[number],
  kind: "label" | "recipient" | "identifier"
): string {
  const suffix =
    type === "CARD" ? "Card" : type === "WALLET" ? "Wallet" : type === "BANK" ? "Bank" : "Other";
  const key = `owner.paymentMethods.${kind}Placeholder${suffix}` as const;
  const specific = m(locale, key);
  if (specific && specific !== key) return specific;
  return m(locale, `owner.paymentMethods.${kind}Placeholder`);
}

function maskIdentifier(raw: string): string {
  const digits = raw.replace(/\s+/g, "");
  if (digits.length <= 4) return raw;
  return `•••• ${digits.slice(-4)}`;
}

function HotelPaymentMethodsEditor({ locale, hotel }: { locale: Locale; hotel: Hotel }) {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptsPayAtCheckIn, setAcceptsPayAtCheckIn] = useState<boolean | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/owner/hotels/${hotel.id}/payment-methods`, { credentials: "include" });
    const json = (await res.json().catch(() => ({}))) as { methods?: PaymentMethod[]; acceptsPayAtCheckIn?: boolean };
    setMethods(json.methods ?? []);
    setAcceptsPayAtCheckIn(Boolean(json.acceptsPayAtCheckIn));
  }

  async function togglePayAtCheckIn() {
    if (policyBusy || acceptsPayAtCheckIn === null) return;
    const next = !acceptsPayAtCheckIn;
    setPolicyBusy(true);
    setAcceptsPayAtCheckIn(next); // optimistic - reverted below if the server rejects it
    try {
      const res = await fetch(`/api/owner/hotels/${hotel.id}/pay-at-checkin-policy`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptsPayAtCheckIn: next })
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setAcceptsPayAtCheckIn(!next);
    } finally {
      setPolicyBusy(false);
    }
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

      <div className="owner-record-card flex flex-wrap items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <div className="owner-record-card__title">{m(locale, "owner.payAtCheckIn.toggleLabel")}</div>
          <div className="owner-record-card__meta">{m(locale, "owner.payAtCheckIn.toggleHint")}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={acceptsPayAtCheckIn ?? false}
          disabled={acceptsPayAtCheckIn === null || policyBusy}
          onClick={() => void togglePayAtCheckIn()}
          className={`owner-pay-checkin-toggle shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            acceptsPayAtCheckIn ? "is-on" : "is-off"
          }`}
        >
          {acceptsPayAtCheckIn ? m(locale, "owner.payAtCheckIn.enabled") : m(locale, "owner.payAtCheckIn.disabled")}
        </button>
      </div>

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
                  {paymentTypeLabel(locale, method.type)} · {method.recipientName} ·{" "}
                  {maskIdentifier(method.paymentIdentifier)}
                </div>
                {method.instructions ? <div className="owner-record-card__meta">{method.instructions}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleActive(method)}
                  className="owner-btn owner-btn--secondary owner-btn--sm disabled:opacity-50"
                >
                  {method.isActive ? m(locale, "owner.paymentMethods.active") : m(locale, "owner.paymentMethods.inactive")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(method)}
                  className="owner-btn owner-btn--sm border border-[#dc2626] text-[#dc2626] disabled:opacity-50"
                >
                  {m(locale, "owner.paymentMethods.remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        /* Whole add-method form was legacy dark theme (bg-black/10, bg-black/20, text-white,
           border-white/15) rendering dark translucent boxes on the light Owner workspace.
           Rebuilt on the owner-* primitives. Presentation only — no payment/accounting
           semantics touched. */
        <div className="space-y-2 rounded-xl border border-[var(--owner-border)] bg-[var(--owner-surface-muted)] p-3">
          <PaymentTypeSelect
            locale={locale}
            value={draft.type}
            onChange={(t) => setDraft((d) => ({ ...d, type: t }))}
          />
          <input
            value={draft.displayLabel}
            onChange={(e) => setDraft((d) => ({ ...d, displayLabel: e.target.value }))}
            placeholder={fieldPlaceholder(locale, draft.type, "label")}
            className="owner-input"
          />
          <input
            value={draft.recipientName}
            onChange={(e) => setDraft((d) => ({ ...d, recipientName: e.target.value }))}
            placeholder={fieldPlaceholder(locale, draft.type, "recipient")}
            className="owner-input"
          />
          <input
            value={draft.paymentIdentifier}
            onChange={(e) => setDraft((d) => ({ ...d, paymentIdentifier: e.target.value }))}
            placeholder={fieldPlaceholder(locale, draft.type, "identifier")}
            className="owner-input"
          />
          <textarea
            value={draft.instructions}
            onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
            placeholder={m(locale, "owner.paymentMethods.instructionsPlaceholder")}
            rows={2}
            className="owner-textarea"
          />
          {error ? <p className="text-xs font-semibold text-[#dc2626]">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setDraft(emptyDraft);
                setError(null);
              }}
              className="owner-btn owner-btn--secondary owner-btn--sm"
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
          className="owner-btn owner-btn--secondary owner-btn--sm"
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
