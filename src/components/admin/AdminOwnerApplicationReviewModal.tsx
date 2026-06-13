"use client";

import { useCallback, useEffect, useState } from "react";
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

type ReviewData = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  businessName: string;
  address: string | null;
  inn: string | null;
  status: string;
  applicationMeta: {
    city?: string;
    propertyType?: string;
    propertyDescription?: string;
    roomCount?: string;
    guestCapacity?: string;
  } | null;
  availableFileTypes: OwnerRequestFileType[];
};

type Props = {
  locale: Locale;
  applicationId: number | null;
  open: boolean;
  onClose: () => void;
};

export function AdminOwnerApplicationReviewModal({ locale, applicationId, open, onClose }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [activeType, setActiveType] = useState<OwnerRequestFileType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/owner-requests/${applicationId}`, {
        credentials: "include",
        headers: { accept: "application/json" }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to load");
      const payload = (json as { data: ReviewData }).data;
      setData(payload);
      setActiveType(payload.availableFileTypes[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (!open || !applicationId) return;
    void load();
  }, [open, applicationId, load]);

  useEffect(() => {
    if (!open) {
      setAdminComment("");
      setError(null);
      setData(null);
    }
  }, [open]);

  async function decide(nextStatus: "APPROVED" | "REJECTED") {
    if (!applicationId) return;
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
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          adminComment: nextStatus === "REJECTED" ? adminComment.trim() : undefined
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? m(locale, "admin.processing"));
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : m(locale, "admin.processing"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const fileUrl =
    applicationId && activeType ? `/api/admin/owner-requests/${applicationId}/file?type=${activeType}` : null;
  const isPending = data?.status === "PENDING";

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-review-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="owner-review-modal-title" className="text-lg font-semibold text-slate-900">
            {m(locale, "admin.verifyOwnerDocuments")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-slate-500">{m(locale, "admin.processing")}</p> : null}
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

          {data ? (
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">{m(locale, "admin.userName")}</dt>
                      <dd className="font-medium text-slate-900">{data.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">{m(locale, "profile.phone")}</dt>
                      <dd>{data.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">{m(locale, "profile.email")}</dt>
                      <dd className="break-all">{data.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">{m(locale, "admin.ownerRequestsObject")}</dt>
                      <dd>{data.businessName}</dd>
                    </div>
                    {data.address ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase text-slate-500">{m(locale, "admin.ownerRequestsAddress")}</dt>
                        <dd>{data.address}</dd>
                      </div>
                    ) : null}
                    {data.inn ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500">ИНН</dt>
                        <dd>{data.inn}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{m(locale, "admin.ownerRequestsDocuments")}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.availableFileTypes.map((type) => (
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
                    {!data.availableFileTypes.length ? (
                      <p className="text-sm text-slate-500">{m(locale, "admin.ownerRequestsNoFiles")}</p>
                    ) : null}
                  </div>
                  {fileUrl ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl}
                        alt={activeType ? m(locale, FILE_LABEL_KEYS[activeType]) : ""}
                        className="max-h-[360px] w-full object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-600">
                  {m(locale, "admin.ownerRequestsStatusLabel")}:{" "}
                  <span className="font-semibold text-slate-900">{formatBookingStatus(locale, data.status)}</span>
                </p>

                {isPending ? (
                  <>
                    <label className="mt-4 block text-sm font-medium text-slate-700">
                      {m(locale, "admin.ownerRequestsCommentLabel")}
                    </label>
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
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                      >
                        {m(locale, "admin.ownerRequestsReject")}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">{m(locale, "admin.ownerRequestsProcessed")}</p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
