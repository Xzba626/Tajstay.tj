"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  applicationId: number;
  labels: {
    approve: string;
    reject: string;
    rejectReason: string;
    confirmApproveTitle: string;
    confirmApproveDesc: string;
    confirmApproveCta: string;
    cancel: string;
    processing: string;
  };
};

export function AdminOwnerApplicationActions({ applicationId, labels: L }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/owner-applications/${applicationId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: action === "reject" ? JSON.stringify({ comment: comment.trim() }) : "{}"
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
    <div className="mt-4 border-t border-slate-100 pt-4">
      {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("approve")}
            className="admin-btn admin-btn--primary"
          >
            {L.approve}
          </button>
          <button
            type="button"
            onClick={() => setMode("reject")}
            className="admin-btn admin-btn--destructive"
          >
            {L.reject}
          </button>
        </div>
      )}

      {mode === "approve" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="font-semibold text-emerald-900">{L.confirmApproveTitle}</p>
          <p className="mt-1 text-sm text-emerald-800">{L.confirmApproveDesc}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit("approve")}
              className="admin-btn admin-btn--primary"
            >
              {busy ? L.processing : L.confirmApproveCta}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="admin-btn admin-btn--ghost">
              {L.cancel}
            </button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4">
          <label className="block text-sm font-semibold text-red-900">{L.rejectReason}</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows={3}
            className="mt-2 w-full rounded-xl border border-red-200 px-3 py-2 text-sm"
            placeholder={L.rejectReason}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !comment.trim()}
              onClick={() => void submit("reject")}
              className="admin-btn admin-btn--destructive"
            >
              {busy ? L.processing : L.reject}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="admin-btn admin-btn--ghost">
              {L.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
