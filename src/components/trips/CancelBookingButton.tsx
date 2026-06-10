"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelBookingButton({
  bookingId,
  label = "Отменить",
  className = "btn-secondary text-sm !w-auto !px-3 !py-1.5"
}: {
  bookingId: number;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onCancel() {
    if (busy) return;
    if (!window.confirm("Отменить бронирование?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-by-guest`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "X-Requested-With": "fetch" }
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Не удалось отменить бронь");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Не удалось отменить бронь");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} onClick={() => void onCancel()} className={className}>
      {busy ? "…" : label}
    </button>
  );
}
