"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { PaymentCountdown } from "@/app/payment/[code]/PaymentCountdown";
import { RejectProofModal } from "@/components/chat/RejectProofModal";

export type PaymentReviewCardProps = {
  locale: Locale;
  bookingId: number;
  canAct: boolean;
  guestLabel: string;
  totalPrice: number;
  currency: string;
  paymentProofUrl: string | null;
  guestDocumentUrl: string | null;
  proofSubmittedAt: string | null;
  proofReviewDeadlineAt: string | null;
  proofAmount?: number | null;
  proofComment?: string | null;
};

export function PaymentReviewCard(props: PaymentReviewCardProps) {
  const {
    locale,
    bookingId,
    canAct,
    guestLabel,
    totalPrice,
    currency,
    paymentProofUrl,
    guestDocumentUrl,
    proofSubmittedAt,
    proofReviewDeadlineAt,
    proofAmount,
    proofComment
  } = props;

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function confirmPayment() {
    if (!canAct || busy) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/bookings/confirm-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || m(locale, "bookingRoom.review.confirmFailed"));
      setToast(m(locale, "bookingRoom.review.confirmOk"));
      router.refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : m(locale, "bookingRoom.review.confirmFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function rejectPayment(reason: string) {
    if (!canAct || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/bookings/reject-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ bookingId, reason })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || m(locale, "bookingRoom.review.rejectFailed"));
      setRejectOpen(false);
      setToast(m(locale, "bookingRoom.review.rejectOk"));
      router.refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : m(locale, "bookingRoom.review.rejectFailed"));
    } finally {
      setBusy(false);
    }
  }

  const submittedLabel = proofSubmittedAt
    ? new Date(proofSubmittedAt).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

  return (
    <>
      <section className="rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.07] p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-indigo-100">{m(locale, "bookingRoom.review.cardTitle")}</h2>
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-100">
            {m(locale, "status.ON_REVIEW")}
          </span>
        </div>

        <dl className="mt-3 space-y-2 text-xs text-slate-300">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">{m(locale, "bookingRoom.review.guest")}</dt>
            <dd className="truncate font-medium text-slate-100">{guestLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">{m(locale, "bookingRoom.review.expected")}</dt>
            <dd className="font-semibold tabular-nums text-white">
              {Number(totalPrice)} {currency}
            </dd>
          </div>
          {proofAmount != null ? (
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{m(locale, "bookingRoom.review.paidAmount")}</dt>
              <dd className="font-semibold tabular-nums text-emerald-100">
                {proofAmount} {currency}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">{m(locale, "bookingRoom.review.submittedAt")}</dt>
            <dd>{submittedLabel}</dd>
          </div>
          {proofReviewDeadlineAt ? (
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{m(locale, "bookingRoom.review.deadline")}</dt>
              <dd className="font-semibold tabular-nums text-amber-100">
                <PaymentCountdown expiresAtIso={proofReviewDeadlineAt} />
              </dd>
            </div>
          ) : null}
        </dl>

        {proofComment ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
            {proofComment}
          </p>
        ) : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {paymentProofUrl ? (
            <button
              type="button"
              onClick={() => setLightbox(paymentProofUrl)}
              className="overflow-hidden rounded-xl ring-1 ring-white/15 transition hover:ring-indigo-400/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paymentProofUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              <span className="block bg-black/40 py-1 text-center text-[10px] font-semibold text-indigo-100">
                {m(locale, "bookingRoom.review.openReceipt")}
              </span>
            </button>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-500">
              {m(locale, "bookingRoom.review.noReceipt")}
            </div>
          )}
          {guestDocumentUrl ? (
            <button
              type="button"
              onClick={() => setLightbox(guestDocumentUrl)}
              className="overflow-hidden rounded-xl ring-1 ring-white/15 transition hover:ring-indigo-400/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={guestDocumentUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              <span className="block bg-black/40 py-1 text-center text-[10px] font-semibold text-slate-300">
                {m(locale, "bookingRoom.review.openDocument")}
              </span>
            </button>
          ) : null}
        </div>

        {canAct ? (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmPayment()}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/25 disabled:opacity-55"
            >
              {busy ? "…" : m(locale, "bookingRoom.review.confirm")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
              className="w-full rounded-xl border border-red-400/35 bg-red-500/10 py-3 text-sm font-semibold text-red-100 disabled:opacity-55"
            >
              {m(locale, "bookingRoom.review.reject")}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-400">{m(locale, "bookingRoom.review.ownerViewOnly")}</p>
        )}

        {toast ? <p className="mt-2 text-center text-xs text-slate-300">{toast}</p> : null}
      </section>

      <RejectProofModal
        locale={locale}
        open={rejectOpen}
        busy={busy}
        onClose={() => setRejectOpen(false)}
        onSubmit={rejectPayment}
      />

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          aria-label="Close"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[92vh] max-w-full rounded-2xl object-contain" />
        </button>
      ) : null}
    </>
  );
}
