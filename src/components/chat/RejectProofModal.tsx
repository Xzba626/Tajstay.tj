"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

const PRESETS = ["amount_mismatch", "unclear_receipt", "wrong_account", "duplicate"] as const;

export function RejectProofModal({
  locale,
  open,
  busy,
  onClose,
  onSubmit
}: {
  locale: Locale;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError(m(locale, "bookingRoom.review.rejectReasonRequired"));
      return;
    }
    setError(null);
    await onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label={m(locale, "bookingRoom.review.rejectCancel")}
        onClick={() => {
          if (!busy) {
            setReason("");
            setError(null);
            onClose();
          }
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-xl">
        <h2 className="text-base font-semibold text-white">{m(locale, "bookingRoom.review.rejectTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{m(locale, "bookingRoom.review.rejectDesc")}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => setReason(m(locale, `bookingRoom.review.preset.${key}`))}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              {m(locale, `bookingRoom.review.preset.${key}`)}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={m(locale, "bookingRoom.review.rejectPlaceholder")}
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
          maxLength={500}
        />
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setReason("");
              setError(null);
              onClose();
            }}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200"
          >
            {m(locale, "bookingRoom.review.rejectCancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSubmit()}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : m(locale, "bookingRoom.review.rejectConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
