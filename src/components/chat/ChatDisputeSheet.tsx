"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  locale: Locale;
  bookingId: number;
  open: boolean;
  onClose: () => void;
  onOpened?: () => void;
};

export function ChatDisputeSheet({ locale, bookingId, open, onClose, onOpened }: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setReason("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  if (!open) return null;

  async function submit() {
    if (!reason.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId, reason: reason.trim() })
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "failed");
      }
      onOpened?.();
      onClose();
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : m(locale, "chat.dispute.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="chat-sheet-overlay" aria-label={m(locale, "common.close")} onClick={onClose} />
      <div className="chat-sheet" role="dialog" aria-labelledby="chat-dispute-title">
        <div className="chat-sheet__handle" aria-hidden />
        <h2 id="chat-dispute-title" className="text-base font-semibold text-white">
          {m(locale, "chat.dispute.title")}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{m(locale, "chat.dispute.sheetHint")}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={m(locale, "chat.dispute.placeholder")}
          className="chat-sheet__textarea mt-3"
          rows={4}
        />
        {error ? (
          <p className="mt-2 text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy || reason.trim().length < 10}
          onClick={() => void submit()}
          className="btn-primary mt-4 w-full"
        >
          {busy ? "…" : m(locale, "chat.dispute.submit")}
        </button>
      </div>
    </>
  );
}
