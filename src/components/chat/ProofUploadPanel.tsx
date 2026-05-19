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
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-105"
        >
          {m(locale, "bookingRoom.proof.cta")}
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3" encType="multipart/form-data">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">{m(locale, "bookingRoom.proof.title")}</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-white">
              {m(locale, "bookingRoom.proof.cancel")}
            </button>
          </div>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-emerald-400/35 bg-emerald-500/10 px-4 py-6">
            <span className="text-sm font-semibold text-emerald-100">{m(locale, "bookingRoom.proof.file")}</span>
            <span className="text-xs text-slate-500">PNG, JPG, WebP</span>
            <input name="proofFile" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" required />
          </label>
          <input
            name="proofAmount"
            type="number"
            min={0}
            step={1}
            defaultValue={defaultAmount}
            placeholder={m(locale, "bookingRoom.proof.amount")}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
          />
          <textarea
            name="proofComment"
            rows={2}
            placeholder={m(locale, "bookingRoom.proof.comment")}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
          />
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : m(locale, "bookingRoom.proof.submit")}
          </button>
        </form>
      )}
    </section>
  );
}

