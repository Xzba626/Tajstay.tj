"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  hotelId: number;
  status: string;
  rejectionReason?: string | null;
};

export function OwnerHotelPropertyExtras({ hotelId, status, rejectionReason }: Props) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/hotels/${hotelId}/resubmit`, {
        method: "POST",
        headers: { accept: "application/json" }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Ошибка");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/hotels/${hotelId}/delete`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Ошибка удаления");
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (status === "DELETED") return null;

  return (
    <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
      {status === "PENDING" && (
        <div className="status-banner status-banner--warning rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
          🕐 Объект на проверке. Обычно занимает до 24 часов.
        </div>
      )}
      {status === "REJECTED" && (
        <div className="status-banner status-banner--error rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
          <p>❌ Объект отклонён.</p>
          {rejectionReason ? <p className="mt-1">Причина: {rejectionReason}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleResubmit()}
            className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            Исправить и подать повторно
          </button>
        </div>
      )}
      {status === "APPROVED" && (
        <div className="status-banner status-banner--success rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          ✅ Объект одобрен и виден гостям.
        </div>
      )}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="btn-danger rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/50"
      >
        Удалить объект
      </button>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-slate-100 ring-1 ring-white/10">
            <h3 className="text-lg font-bold">Удалить объект?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Объект будет скрыт с сайта. Завершённые брони и отзывы сохранятся в архиве.
            </p>
            <p className="mt-2 text-sm font-semibold text-red-200">Это действие нельзя отменить.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Да, удалить
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
