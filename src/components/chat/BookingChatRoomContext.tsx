"use client";

import { BRAND } from "@/lib/brand";
import type { BookingTimelineEvent } from "@/lib/chat/bookingTimeline";
import { PaymentCountdown } from "@/app/payment/[code]/PaymentCountdown";
import { PaymentMethodsBlock } from "@/components/chat/PaymentMethodsBlock";
import { ProofUploadPanel } from "@/components/chat/ProofUploadPanel";
import { BookingTimeline } from "@/components/chat/BookingTimeline";
import { ReviewBanner } from "@/components/chat/ReviewBanner";
import { PaymentReviewCard } from "@/components/chat/PaymentReviewCard";
import { GuestReviewWaitingCard } from "@/components/chat/GuestReviewWaitingCard";
import type { Locale } from "@/lib/i18n/locale";
import { formatBookingStatus, formatPaymentStatus } from "@/lib/i18n/bookingStatus";
import { m } from "@/lib/i18n/messages";
import { BOOKING_STATUS } from "@/lib/domain/booking";

export type BookingChatRoomContextProps = {
  locale: Locale;
  bookingId: number;
  currentUserRole: "GUEST" | "OWNER" | "ADMIN";
  hotelName: string;
  roomTitle: string;
  coverImageUrl: string | null;
  checkInIso: string;
  checkOutIso: string;
  guestCount: number;
  totalPrice: number;
  currency: string;
  bookingStatus: string;
  paymentStatus: string;
  publicCode: string | null;
  paymentMethods: string[];
  timeline: BookingTimelineEvent[];
  guestLabel: string;
  proofSent?: boolean;
  paymentProofUrl?: string | null;
  guestDocumentUrl?: string | null;
  proofSubmittedAt?: string | null;
  proofReviewDeadlineAt?: string | null;
  proofAmount?: number | null;
  proofComment?: string | null;
  /** Live timer from chat poll */
  expiresAtIso?: string | null;
  paymentTimerPaused?: boolean;
};

export function BookingChatRoomContext(props: BookingChatRoomContextProps) {
  const {
    locale,
    bookingId,
    currentUserRole,
    hotelName,
    roomTitle,
    coverImageUrl,
    checkInIso,
    checkOutIso,
    guestCount,
    totalPrice,
    currency,
    bookingStatus,
    paymentStatus,
    publicCode,
    paymentMethods,
    timeline,
    guestLabel,
    proofSent,
    paymentProofUrl,
    guestDocumentUrl,
    proofSubmittedAt,
    proofReviewDeadlineAt,
    proofAmount,
    proofComment,
    expiresAtIso,
    paymentTimerPaused
  } = props;

  const isGuest = currentUserRole === "GUEST";
  const isAdmin = currentUserRole === "ADMIN";
  const isOwner = currentUserRole === "OWNER";
  const isOnReview = bookingStatus === BOOKING_STATUS.ON_REVIEW;
  const showPaymentFlow =
    isGuest && (bookingStatus === BOOKING_STATUS.WAITING_PAYMENT || bookingStatus === BOOKING_STATUS.WAIT_PROOF);
  const showReviewCard = isOnReview && (isAdmin || isOwner);
  const cover = coverImageUrl || BRAND.logoMark;
  const checkIn = checkInIso.slice(0, 10);
  const checkOut = checkOutIso.slice(0, 10);

  const showTimer =
    bookingStatus === "WAITING_PAYMENT" ||
    bookingStatus === "WAIT_PROOF" ||
    bookingStatus === "ON_REVIEW";

  return (
    <div className="chat-inline-context">
      <div className="chat-inline-context__booking">
        <div className="chat-inline-context__thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="chat-inline-context__title truncate">{hotelName}</div>
          <div className="chat-inline-context__sub truncate">{roomTitle}</div>
          <div className="chat-inline-context__meta">
            <span>
              {checkIn} — {checkOut}
            </span>
            <span aria-hidden>·</span>
            <span>
              {guestCount} {m(locale, "bookingRoom.header.guests").toLowerCase()}
            </span>
            {publicCode ? (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono text-[10px]">{publicCode}</span>
              </>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chat-inline-context__pill">{formatBookingStatus(locale, bookingStatus)}</span>
            <span className="chat-inline-context__pill chat-inline-context__pill--muted">
              {formatPaymentStatus(locale, paymentStatus)}
            </span>
          </div>
          {showTimer ? (
            <div className="mt-2 text-[11px] tabular-nums text-slate-300">
              {isOnReview && proofReviewDeadlineAt ? (
                <>
                  {m(locale, "status.ON_REVIEW")}: <PaymentCountdown expiresAtIso={proofReviewDeadlineAt} />
                </>
              ) : expiresAtIso ? (
                <>
                  {m(locale, "checkout.timerTitle")}:{" "}
                  <PaymentCountdown
                    expiresAtIso={expiresAtIso}
                    paused={paymentTimerPaused}
                    pausedLabel={m(locale, "chat.timerPaused")}
                  />
                </>
              ) : paymentTimerPaused ? (
                <span className="text-amber-200/90">{m(locale, "chat.timerPaused")}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <BookingTimeline locale={locale} events={timeline} highlightKind={isOnReview ? "ON_REVIEW" : undefined} />

      {isOnReview ? (
        <ReviewBanner locale={locale} role={currentUserRole} proofReviewDeadlineAt={proofReviewDeadlineAt ?? null} />
      ) : null}

      {proofSent && !isOnReview ? (
        <div className="chat-proof-card" role="status">
          <span className="chat-proof-card__status chat-proof-card__status--pending">
            {m(locale, "bookingRoom.proof.sentBanner")}
          </span>
        </div>
      ) : null}

      {isGuest && isOnReview ? (
        <GuestReviewWaitingCard locale={locale} proofSubmittedAt={proofSubmittedAt ?? null} />
      ) : null}

      {showReviewCard ? (
        <PaymentReviewCard
          locale={locale}
          bookingId={bookingId}
          canAct={isAdmin}
          guestLabel={guestLabel}
          totalPrice={Number(totalPrice)}
          currency={currency}
          paymentProofUrl={paymentProofUrl ?? null}
          guestDocumentUrl={guestDocumentUrl ?? null}
          proofSubmittedAt={proofSubmittedAt ?? null}
          proofReviewDeadlineAt={proofReviewDeadlineAt ?? null}
          proofAmount={proofAmount ?? null}
          proofComment={proofComment ?? null}
        />
      ) : null}

      {showPaymentFlow ? (
        <>
          <PaymentMethodsBlock locale={locale} methods={paymentMethods} />
          <ProofUploadPanel
            locale={locale}
            bookingId={bookingId}
            publicCode={publicCode}
            canSubmit={showPaymentFlow}
            defaultAmount={Number(totalPrice)}
          />
        </>
      ) : null}
    </div>
  );
}
