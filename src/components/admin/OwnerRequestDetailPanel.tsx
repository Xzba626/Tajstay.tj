"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerRequestFileType } from "@/lib/owner/ownerRequestFiles";
import { formatBookingStatus } from "@/lib/i18n/bookingStatus";

const FILE_LABEL_KEYS: Record<OwnerRequestFileType, string> = {
  passportFront: "admin.ownerRequestFilePassportFront",
  passportBack: "admin.ownerRequestFilePassportBack",
  selfieWithDoc: "admin.ownerRequestFileSelfie",
  propertyDoc: "admin.ownerRequestFilePropertyDoc",
  facade: "admin.ownerRequestFileFacade",
  room: "admin.ownerRequestFileRoom",
  bathroom: "admin.ownerRequestFileBathroom"
};

type Props = {
  locale: Locale;
  applicationId: number;
  status: string;
  availableFileTypes: OwnerRequestFileType[];
};

export function OwnerRequestDetailPanel({ locale, applicationId, status, availableFileTypes }: Props) {
  const router = useRouter();
  const [adminComment, setAdminComment] = useState("");
  const [activeType, setActiveType] = useState<OwnerRequestFileType | null>(availableFileTypes[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "PENDING";
  const fileUrl = activeType ? `/api/admin/owner-requests/${applicationId}/file?type=${activeType}` : null;

  async function decide(nextStatus: "APPROVED" | "REJECTED") {
    if (nextStatus === "REJECTED" && !adminComment.trim()) {
      setError(m(locale, "admin.ownerRequestsRejectCommentRequired"));
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
      if (!res.ok) throw new Error((json as { error?: string }).error ?? m(locale, "admin.processing"));
      router.refresh();
      router.push("/dashboard/owner-requests");
    } catch (e) {
      setError(e instanceof Error ? e.message : m(locale, "admin.processing"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{m(locale, "admin.ownerRequestsDocuments")}</h2>
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
              {m(locale, FILE_LABEL_KEYS[type])}
            </button>
          ))}
          {!availableFileTypes.length ? (
            <p className="text-sm text-slate-500">{m(locale, "admin.ownerRequestsNoFiles")}</p>
          ) : null}
        </div>
        {fileUrl ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={activeType ? m(locale, FILE_LABEL_KEYS[activeType]) : ""} className="max-h-[480px] w-full object-contain" />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{m(locale, "admin.ownerRequestsDecision")}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {m(locale, "admin.ownerRequestsStatusLabel")}:{" "}
          <span className="font-semibold text-slate-900">{formatBookingStatus(locale, status)}</span>
        </p>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {isPending ? (
          <>
            <label className="mt-4 block text-sm font-medium text-slate-700">{m(locale, "admin.ownerRequestsCommentLabel")}</label>
            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder={m(locale, "admin.ownerRequestsCommentPlaceholder")}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide("APPROVED")}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? m(locale, "admin.processing") : m(locale, "admin.ownerRequestsApprove")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide("REJECTED")}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? m(locale, "admin.processing") : m(locale, "admin.ownerRequestsReject")}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-500">{m(locale, "admin.ownerRequestsProcessed")}</p>
        )}
      </section>
    </div>
  );
}
