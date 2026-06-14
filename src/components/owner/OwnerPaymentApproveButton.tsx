"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { SensitiveActionConfirmDialog } from "@/components/ui/SensitiveActionConfirmDialog";

type Props = {
  bookingId: number;
  locale: Locale;
  className?: string;
};

export function OwnerPaymentApproveButton({ bookingId, locale, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function onApprove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}/payment-approve`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "X-Requested-With": "fetch" }
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? m(locale, "confirmDialog.approvePaymentDesc"));
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setError(m(locale, "confirmDialog.approvePaymentDesc"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirmOpen(true)}
        className={
          className ??
          "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        }
      >
        {busy ? "…" : "✅ Подтвердить оплату"}
      </button>
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
      <SensitiveActionConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onApprove}
        locale={locale}
        title={m(locale, "confirmDialog.approvePaymentTitle")}
        description={m(locale, "confirmDialog.approvePaymentDesc")}
        confirmLabel={m(locale, "confirmDialog.confirm")}
        busy={busy}
      />
    </div>
  );
}
