"use client";

import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { PaymentCountdown } from "@/app/payment/[code]/PaymentCountdown";

export function ReviewBanner({
  locale,
  role,
  proofReviewDeadlineAt
}: {
  locale: Locale;
  role: "GUEST" | "OWNER" | "ADMIN";
  proofReviewDeadlineAt: string | null;
}) {
  const isAdmin = role === "ADMIN";
  const isOwner = role === "OWNER";

  const title = isAdmin
    ? m(locale, "bookingRoom.review.bannerAdminTitle")
    : isOwner
      ? m(locale, "bookingRoom.review.bannerOwnerTitle")
      : m(locale, "bookingRoom.review.bannerGuestTitle");

  const body = isAdmin
    ? m(locale, "bookingRoom.review.bannerAdminBody")
    : isOwner
      ? m(locale, "bookingRoom.review.bannerOwnerBody")
      : m(locale, "bookingRoom.review.bannerGuestBody");

  return (
    <div
      role="status"
      className="rounded-2xl border border-indigo-400/30 bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-slate-900/40 px-4 py-3 shadow-lg shadow-indigo-950/20 backdrop-blur-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-indigo-100">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{body}</p>
        </div>
        {proofReviewDeadlineAt ? (
          <div className="shrink-0 rounded-xl border border-indigo-400/25 bg-black/25 px-3 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200/80">
              {m(locale, "bookingRoom.review.deadline")}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
              <PaymentCountdown expiresAtIso={proofReviewDeadlineAt} />
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
