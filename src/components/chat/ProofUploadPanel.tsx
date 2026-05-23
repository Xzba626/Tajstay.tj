"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function ProofUploadPanel({
  locale,
  bookingId,
  publicCode,
  canSubmit,
  defaultAmount
}: {
  locale: Locale;
  bookingId: number;
  publicCode: string | null;
  canSubmit: boolean;
  defaultAmount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSubmit) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("bookingId", String(bookingId));
    if (publicCode) fd.set("code", publicCode);

    try {
      const res = await fetch("/api/payments/proof?json=1", {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" },
        body: fd
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; bookingId?: number };
      if (!res.ok) {
        setError(json.error || m(locale, "bookingRoom.proof.errFailed"));
        return;
      }
      setOpen(false);
      router.push(`/chat/booking/${bookingId}?proofSent=1`);
      router.refresh();
    } catch {
      setError(m(locale, "bookingRoom.proof.errFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat-proof-card">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="taj-btn taj-btn--primary taj-btn--sm taj-btn--full">
          {m(locale, "bookingRoom.proof.cta")}
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3" encType="multipart/form-data">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--taj-color-text)]">{m(locale, "bookingRoom.proof.title")}</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--taj-color-text-muted)] hover:text-[var(--taj-color-text)]">
              {m(locale, "bookingRoom.proof.cancel")}
            </button>
          </div>
          <span className="chat-proof-card__status chat-proof-card__status--pending">{m(locale, "status.ON_REVIEW")}</span>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--taj-color-border-strong)] bg-[var(--taj-emerald-50)] px-3 py-4">
            <span className="text-xs font-semibold text-[var(--taj-color-primary)]">{m(locale, "bookingRoom.proof.file")}</span>
            <span className="text-[10px] text-[var(--taj-color-text-muted)]">PNG, JPG, WebP</span>
            <input name="proofFile" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" required />
          </label>
          <input
            name="proofAmount"
            type="number"
            min={0}
            step={1}
            defaultValue={defaultAmount}
            placeholder={m(locale, "bookingRoom.proof.amount")}
            className="taj-input text-sm"
          />
          <textarea
            name="proofComment"
            rows={2}
            placeholder={m(locale, "bookingRoom.proof.comment")}
            className="taj-input min-h-[4rem] resize-y py-2 text-sm"
          />
          {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy} className="taj-btn taj-btn--primary taj-btn--sm taj-btn--full">
            {busy ? "…" : m(locale, "bookingRoom.proof.submit")}
          </button>
        </form>
      )}
    </section>
  );
}
