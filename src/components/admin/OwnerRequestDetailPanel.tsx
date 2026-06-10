"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnerRequestFileType } from "@/lib/owner/ownerRequestFiles";

const FILE_LABELS: Record<OwnerRequestFileType, string> = {
  passportFront: "📷 Паспорт (перед)",
  passportBack: "📷 Паспорт (назад)",
  selfieWithDoc: "🤳 Селфи с документом",
  propertyDoc: "🏠 Документ на объект",
  facade: "🏢 Фасад",
  room: "🛏 Комната",
  bathroom: "🚿 Санузел"
};

type Props = {
  applicationId: number;
  status: string;
  availableFileTypes: OwnerRequestFileType[];
};

export function OwnerRequestDetailPanel({ applicationId, status, availableFileTypes }: Props) {
  const router = useRouter();
  const [adminComment, setAdminComment] = useState("");
  const [activeType, setActiveType] = useState<OwnerRequestFileType | null>(availableFileTypes[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "PENDING";
  const fileUrl = activeType ? `/api/admin/owner-requests/${applicationId}/file?type=${activeType}` : null;

  async function decide(nextStatus: "APPROVED" | "REJECTED") {
    if (nextStatus === "REJECTED" && !adminComment.trim()) {
      setError("Укажите комментарий при отказе");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/owner-requests/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          adminComment: nextStatus === "REJECTED" ? adminComment.trim() : undefined
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Ошибка");
      router.refresh();
      router.push("/dashboard/owner-requests");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Документы</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {availableFileTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                activeType === type ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {FILE_LABELS[type]}
            </button>
          ))}
          {!availableFileTypes.length ? (
            <p className="text-sm text-slate-500">Файлы не загружены</p>
          ) : null}
        </div>
        {fileUrl ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={activeType ?? "document"} className="max-h-[480px] w-full object-contain" />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Решение</h2>
        <p className="mt-2 text-sm text-slate-600">
          Статус: <span className="font-semibold text-slate-900">{status}</span>
        </p>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {isPending ? (
          <>
            <label className="mt-4 block text-sm font-medium text-slate-700">Комментарий (обязателен при отказе)</label>
            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Причина отказа..."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide("APPROVED")}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "…" : "✅ Одобрить"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide("REJECTED")}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "…" : "❌ Отказать"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Заявка уже обработана</p>
        )}
      </section>
    </div>
  );
}
