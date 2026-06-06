import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { formatBookingStatus } from "@/lib/i18n/bookingStatus";
import { m } from "@/lib/i18n/messages";
import { PaymentCountdown } from "./PaymentCountdown";
import { DcNextPaymentCard } from "@/components/payment/DcNextPaymentCard";
import { getPublicOriginFromHeaders } from "@/lib/http/publicOriginHeaders";
import { PaymentAfterPay } from "./PaymentAfterPay";
import { GuestPaymentDealClient } from "./GuestPaymentDealClient";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { guestBookingCancelAllowed } from "@/lib/booking/guestCancel";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
  searchParams
}: {
  params: { code: string };
  searchParams?: { after?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) notFound();

  const code = decodeURIComponent(params.code || "").trim();
  if (!code) notFound();

  const booking = await prisma.booking.findUnique({
    where: { publicCode: code },
    include: { ...bookingWithHotelInclude, payment: true }
  });

  if (!booking || booking.userId !== user.id) notFound();
  const hotel = bookingHotel(booking);
  const roomTitle = bookingRoomTitle(booking);

  const expiresAt = booking.expiresAt?.toISOString() ?? null;
  const payWindowLiveExpired =
    !booking.paymentTimerPaused && booking.expiresAt && booking.expiresAt.getTime() < Date.now();
  const isExpired = booking.status === "EXPIRED" || Boolean(payWindowLiveExpired);
  const dcReturnUrl = `${getPublicOriginFromHeaders()}/payment/${encodeURIComponent(code)}?after=1`;
  const isConfirmed = booking.status === "CONFIRMED" || booking.status === "COMPLETED";
  const isOnReview = booking.status === "ON_REVIEW";
  const canSubmitProof = booking.status === "WAITING_PAYMENT" || booking.status === "WAIT_PROOF" || booking.status === "REJECTED";
  const canCancel = guestBookingCancelAllowed({
    status: booking.status,
    paymentStatus: booking.paymentStatus
  });
  const autoOpenAfter =
    (searchParams?.after ?? "").trim() === "1" ||
    booking.status === "WAITING_PAYMENT" ||
    booking.status === "WAIT_PROOF" ||
    booking.status === "ON_REVIEW" ||
    booking.status === "REJECTED";

  if (user.role === "GUEST") {
    return (
      <GuestPaymentDealClient
        locale={locale}
        bookingId={booking.id}
        userId={user.id}
        code={booking.publicCode ?? code}
        hotelName={hotel.name}
        roomTitle={roomTitle}
        totalPrice={Number(booking.totalPrice)}
        bookingStatus={booking.status}
        paymentStatus={booking.paymentStatus}
        expiresAtIso={expiresAt}
        proofReviewDeadlineAtIso={booking.proofReviewDeadlineAt?.toISOString() ?? null}
        paymentTimerPaused={Boolean(booking.paymentTimerPaused)}
        isExpired={isExpired}
        isConfirmed={isConfirmed}
        isOnReview={isOnReview}
        canSubmitProof={canSubmitProof}
        canCancel={canCancel}
        dcReturnUrl={dcReturnUrl}
        checkInIso={booking.checkIn.toISOString()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-white">{m(locale, "checkout.transferTitle")}</h1>

      <div className="surface-1 rounded-2xl p-5">
        <div className="text-sm text-brand-200">{hotel.name}</div>
        <div className="mt-1 text-sm text-brand-200">{roomTitle}</div>
        <div className="mt-3 text-sm text-brand-200">
          {m(locale, "checkout.totalCharge")}: <span className="font-semibold">{Number(booking.totalPrice)} TJS</span>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-sm text-brand-200">DC Next — оплата, затем чек на этой странице.</p>
        <div className="mt-5">
          <DcNextPaymentCard returnUrl={dcReturnUrl} amountTjs={Number(booking.totalPrice)} account="901317727" />
        </div>

        <div className="mt-4 rounded-xl border border-brand-700 bg-brand-800 p-4 text-sm">
          <div className="text-brand-200">
            {m(locale, "checkout.bookingCode")}: <span className="font-semibold text-white">{booking.publicCode}</span>
          </div>
          <div className="mt-2 text-xs text-brand-200">
            {isOnReview && booking.proofReviewDeadlineAt ? (
              <>
                {m(locale, "checkout.timerTitle")} ({m(locale, "status.ON_REVIEW")}):{" "}
                <span className="font-semibold text-white">
                  <PaymentCountdown expiresAtIso={booking.proofReviewDeadlineAt.toISOString()} />
                </span>
              </>
            ) : (
              <>
                {m(locale, "checkout.timerTitle")}:{" "}
                <span className="font-semibold text-white">
                  <PaymentCountdown
                    expiresAtIso={expiresAt}
                    paused={
                      Boolean(booking.paymentTimerPaused) &&
                      (booking.status === "WAITING_PAYMENT" || booking.status === "WAIT_PROOF")
                    }
                    pausedLabel={m(locale, "chat.timerPaused")}
                  />
                </span>
              </>
            )}
          </div>
        </div>

        {isExpired ? (
          <div className="mt-4 rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200" role="alert">
            {m(locale, "checkout.expired")}
          </div>
        ) : isConfirmed ? (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100" role="status">
            <div className="font-semibold">Бронь подтверждена.</div>
            <div className="mt-1">
              Код: <span className="font-bold text-emerald-50">{booking.publicCode}</span>
            </div>
          </div>
        ) : isOnReview ? (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100" role="status">
            <div className="font-semibold">{m(locale, "checkout.proofSent")}</div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200">
            Статус:{" "}
            <span className="font-semibold text-white">{formatBookingStatus(locale, booking.status)}</span>
          </div>
        )}

        {!isConfirmed && !isExpired ? (
          <PaymentAfterPay
            bookingId={booking.id}
            currentUserId={user.id}
            currentUserRole={user.role as "GUEST" | "OWNER" | "ADMIN"}
            bookingStatus={booking.status}
            paymentStatus={booking.paymentStatus}
            code={booking.publicCode ?? ""}
            isExpired={isExpired}
            canSubmitProof={canSubmitProof}
            canCancel={canCancel}
            autoOpen={autoOpenAfter}
            locale={locale}
            labels={{
              paidNext: "Далее",
              instructionTitle: "Подтверждение",
              instructionBody: "Прикрепите чек в течение отведённого времени.",
              proofTitle: m(locale, "checkout.proofTitle"),
              proofUrlPh: m(locale, "checkout.proofUrlLabel"),
              proofFileLabel: m(locale, "checkout.proofFileLabel"),
              submitProof: m(locale, "checkout.submitProof"),
              cancel: "Отменить",
              contactUs: m(locale, "checkout.contactUs"),
              supportLine: m(locale, "checkout.supportLine")
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
