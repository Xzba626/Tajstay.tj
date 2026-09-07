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
      className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-blue-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{body}</p>
        </div>
        {proofReviewDeadlineAt ? (
          <div className="shrink-0 rounded-xl border border-blue-200 bg-white px-3 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              {m(locale, "bookingRoom.review.deadline")}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-ink-primary">
              <PaymentCountdown expiresAtIso={proofReviewDeadlineAt} />
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
