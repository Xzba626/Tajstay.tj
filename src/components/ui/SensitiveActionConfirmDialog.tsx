"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export type SensitiveActionConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  locale: Locale;
  title: string;
  description: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  /** When set, step 2 requires typing this phrase exactly */
  confirmPhrase?: string;
  busy?: boolean;
};

export function SensitiveActionConfirmDialog({
  open,
  onClose,
  onConfirm,
  locale,
  title,
  description,
  warning,
  confirmLabel,
  cancelLabel,
  variant = "default",
  confirmPhrase,
  busy = false
}: SensitiveActionConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) {
      setStep(1);
      setTyped("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase;
  const cancel = cancelLabel ?? m(locale, "confirmDialog.cancel");
  const finalConfirm = confirmLabel ?? m(locale, "confirmDialog.confirm");
  const isDanger = variant === "danger";

  async function handleFinalConfirm() {
    if (!phraseOk || busy) return;
    await onConfirm();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-slate-100 ring-1 ring-white/10 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>

        {step === 1 ? (
          <>
            <p className="mt-2 text-sm text-slate-300">{description}</p>
            {warning ? <p className="mt-3 text-sm font-semibold text-amber-200">{warning}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                  isDanger ? "bg-red-700 hover:bg-red-600" : "bg-emerald-700 hover:bg-emerald-600"
                }`}
              >
                {m(locale, "confirmDialog.continue")}
              </button>
              <button type="button" onClick={onClose} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200">
                {cancel}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-300">{m(locale, "confirmDialog.step2Hint")}</p>
            {confirmPhrase ? (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {m(locale, "confirmDialog.typePhrase", { phrase: confirmPhrase })}
                </label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  autoComplete="off"
                />
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !phraseOk}
                onClick={() => void handleFinalConfirm()}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  isDanger ? "bg-red-700 hover:bg-red-600" : "bg-emerald-700 hover:bg-emerald-600"
                }`}
              >
                {busy ? m(locale, "confirmDialog.processing") : finalConfirm}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(1)}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200"
              >
                {m(locale, "confirmDialog.back")}
              </button>
              <button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-400">
                {cancel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
