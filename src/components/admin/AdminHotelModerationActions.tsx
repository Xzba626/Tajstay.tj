"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/ui/AppImage";

type Photo = { id: number; url: string };

type Props = {
  hotelId: number;
  hotelName: string;
  city: string;
  address: string;
  description: string;
  propertyType: string;
  status: string;
  createdAt: string;
  coverImageUrl: string | null;
  photos: Photo[];
  owner: { name: string; email: string | null; phone: string };
  labels: {
    approve: string;
    reject: string;
    rejectReason: string;
    confirmApproveTitle: string;
    confirmApproveDesc: string;
    confirmApproveCta: string;
    cancel: string;
    processing: string;
    submittedAt: string;
    host: string;
  };
};

export function AdminHotelModerationActions({
  hotelId,
  hotelName,
  city,
  address,
  description,
  propertyType,
  status,
  createdAt,
  coverImageUrl,
  photos,
  owner,
  labels: L
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const gallery = [
    ...(coverImageUrl ? [{ url: coverImageUrl, id: 0 }] : []),
    ...photos.filter((p) => p.url !== coverImageUrl)
  ];

  async function submit(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: action === "reject" ? JSON.stringify({ reason: reason.trim() }) : "{}"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed");
      setMode("idle");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {gallery.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {gallery.map((p) => (
            <button
              key={`${p.id}-${p.url}`}
              type="button"
              onClick={() => setLightbox(p.url)}
              className="relative h-20 w-28 overflow-hidden rounded-xl ring-1 ring-slate-200"
            >
              <AppImage src={p.url} alt="" fill className="object-cover" sizes="112px" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">{L.host}:</span> {owner.name} · {owner.email ?? "—"} · {owner.phone}
        </p>
        <p className="mt-1">
          {city}, {address} · {propertyType}
        </p>
        <p className="mt-2 line-clamp-4 text-slate-500">{description}</p>
        <p className="mt-2 text-xs text-slate-400">
          {L.submittedAt}: {new Date(createdAt).toLocaleString()}
        </p>
      </div>

      {status !== "PENDING" ? (
        <p className="text-xs text-slate-500">Статус: {status}</p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {status === "PENDING" && mode === "idle" && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setMode("approve")}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {L.approve}
          </button>
          <button
            type="button"
            onClick={() => setMode("reject")}
            className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800"
          >
            {L.reject}
          </button>
        </div>
      )}

      {mode === "approve" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="font-semibold text-emerald-900">{L.confirmApproveTitle}</p>
          <p className="mt-1 text-sm text-emerald-800">{L.confirmApproveDesc}</p>
          <p className="mt-2 text-sm font-medium text-emerald-950">«{hotelName}»</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit("approve")}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? L.processing : L.confirmApproveCta}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="rounded-xl border px-4 py-2 text-sm">
              {L.cancel}
            </button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4">
          <label className="block text-sm font-semibold text-red-900">
            {L.rejectReason}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={() => void submit("reject")}
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? L.processing : L.reject}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="rounded-xl border px-4 py-2 text-sm">
              {L.cancel}
            </button>
          </div>
        </div>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className="max-h-[90vh] w-auto rounded-lg object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
