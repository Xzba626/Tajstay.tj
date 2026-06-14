"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapBookingApiError } from "@/lib/booking/apiErrors";

export function CancelBookingButton({ bookingId }: { bookingId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (busy) return;
    if (!window.confirm("Отменить бронирование?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-by-guest`, {
        method: "POST",
        credentials: "include"
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(mapBookingApiError(json.error, res.status));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex min-w-0 max-w-full flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleCancel()}
        className="mockup-btn mockup-btn--ghost text-red-200"
      >
        {busy ? "Отмена…" : "✕ Отменить"}
      </button>
      {error ? (
        <span className="max-w-full break-words text-xs text-red-300" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
