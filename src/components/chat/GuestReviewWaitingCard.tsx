"use client";

import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

/** Read-only sidebar hint for guest while payment is ON_REVIEW. */
export function GuestReviewWaitingCard({
  locale,
  proofSubmittedAt
}: {
  locale: Locale;
  proofSubmittedAt: string | null;
}) {
  const submittedLabel = proofSubmittedAt
    ? new Date(proofSubmittedAt).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  return (
    <section className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.06] p-4 text-sm backdrop-blur-md">
      <h2 className="font-semibold text-indigo-100">{m(locale, "bookingRoom.review.bannerGuestTitle")}</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{m(locale, "bookingRoom.review.bannerGuestBody")}</p>
      {submittedLabel ? (
        <p className="mt-3 text-[11px] text-slate-500">
          {m(locale, "bookingRoom.review.submittedAt")}: {submittedLabel}
        </p>
      ) : null}
    </section>
  );
}
