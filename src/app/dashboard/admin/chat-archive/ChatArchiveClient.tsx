"use client";

import { useState } from "react";

export function ChatArchiveClient() {
  const [bookingId, setBookingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const id = Number.parseInt(bookingId.trim(), 10);
    if (!Number.isFinite(id) || id < 1) {
      setError("Укажите числовой ID брони");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/chat/archive?bookingId=${id}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Ошибка выгрузки");
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-archive-booking-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur-xl" style={{ borderRadius: 16 }}>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-slate-200">ID бронирования</span>
        <input
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          inputMode="numeric"
          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
          placeholder="например 12"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => download()}
        className="w-full rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
      >
        {busy ? "Выгрузка…" : "Скачать JSON (архив + метаданные)"}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <p className="text-xs leading-relaxed text-slate-500">
        В файл попадают записи из таблицы архива, реквизиты брони, ссылки на чеки и документы. Активные сообщения, если чат ещё не архивирован, в выгрузке не
        дублируются — откройте чат в системе или дождитесь политики архивации (30 дней после выезда).
      </p>
    </div>
  );
}
