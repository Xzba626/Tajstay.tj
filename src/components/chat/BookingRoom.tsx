"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BookingChatPanel } from "@/components/chat/BookingChatPanel";
import { BookingChatHeader } from "@/components/chat/BookingChatHeader";
import { PaymentMethodsBlock } from "@/components/chat/PaymentMethodsBlock";
import { ProofUploadPanel } from "@/components/chat/ProofUploadPanel";
import { BookingTimeline } from "@/components/chat/BookingTimeline";
import { ReviewBanner } from "@/components/chat/ReviewBanner";
import { PaymentReviewCard } from "@/components/chat/PaymentReviewCard";
import { GuestReviewWaitingCard } from "@/components/chat/GuestReviewWaitingCard";
import { DisputeActions } from "@/components/chat/DisputeActions";
import LeaveReviewForm from "@/app/dashboard/guest/leave-review-form";
import type { BookingTimelineEvent } from "@/lib/chat/bookingTimeline";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { TrustBadge } from "@/lib/auth/trustBadges";
import { BOOKING_STATUS } from "@/lib/domain/booking";

export type BookingRoomProps = {
  locale: Locale;
  bookingId: number;
  currentUserId: number;
  currentUserRole: "GUEST" | "OWNER" | "ADMIN";
  isGuest: boolean;
  backHref: string;
  title: string;
  counterpartPreview: string;
  counterpartTrustBadges?: TrustBadge[];
  guestLabel: string;
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
  proofSent?: boolean;
  paymentProofUrl?: string | null;
  guestDocumentUrl?: string | null;
  proofSubmittedAt?: string | null;
  proofReviewDeadlineAt?: string | null;
  proofAmount?: number | null;
  proofComment?: string | null;
  eligibleForReview?: boolean;
  focusReview?: boolean;
  existingReview?: { rating: number; comment: string; reply: string | null } | null;
};

export function BookingRoom(props: BookingRoomProps) {
  const {
    locale,
    bookingId,
    currentUserId,
    currentUserRole,
    isGuest,
    backHref,
    title,
    counterpartPreview,
    counterpartTrustBadges = [],
    guestLabel,
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
    proofSent,
    paymentProofUrl = null,
    guestDocumentUrl = null,
    proofSubmittedAt = null,
    proofReviewDeadlineAt = null,
    proofAmount = null,
    proofComment = null,
    eligibleForReview = false,
    focusReview = false,
    existingReview = null
  } = props;

  const isOnReview = bookingStatus === BOOKING_STATUS.ON_REVIEW;
  const isAdmin = currentUserRole === "ADMIN";
  const isOwner = currentUserRole === "OWNER";

  const showPaymentFlow =
    isGuest && (bookingStatus === BOOKING_STATUS.WAITING_PAYMENT || bookingStatus === BOOKING_STATUS.WAIT_PROOF);

  const canSubmitProof =
    isGuest && (bookingStatus === BOOKING_STATUS.WAITING_PAYMENT || bookingStatus === BOOKING_STATUS.WAIT_PROOF);

  const showReviewUi = isOnReview;
  const showReviewCard = showReviewUi && (isAdmin || isOwner);

  useEffect(() => {
    if (!focusReview || !eligibleForReview) return;
    const el = document.getElementById("booking-review");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusReview, eligibleForReview]);

  const asideContent = (
    <>
      <BookingTimeline locale={locale} events={timeline} highlightKind={isOnReview ? "ON_REVIEW" : undefined} />
      {isGuest && isOnReview ? <GuestReviewWaitingCard locale={locale} proofSubmittedAt={proofSubmittedAt} /> : null}
      {showReviewCard ? (
        <PaymentReviewCard
          locale={locale}
          bookingId={bookingId}
          canAct={isAdmin}
          guestLabel={guestLabel}
          totalPrice={Number(totalPrice)}
          currency={currency}
          paymentProofUrl={paymentProofUrl}
          guestDocumentUrl={guestDocumentUrl}
          proofSubmittedAt={proofSubmittedAt}
          proofReviewDeadlineAt={proofReviewDeadlineAt}
          proofAmount={proofAmount}
          proofComment={proofComment}
        />
      ) : null}
      {showPaymentFlow ? (
        <>
          <PaymentMethodsBlock locale={locale} methods={paymentMethods} />
          <ProofUploadPanel
            locale={locale}
            bookingId={bookingId}
            publicCode={publicCode}
            canSubmit={canSubmitProof}
            defaultAmount={Number(totalPrice)}
          />
        </>
      ) : null}
    </>
  );

  return (
    <div className="chat-page">
      <nav className="chat-page__nav" aria-label={m(locale, "bookingRoom.back")}>
        <Link href={backHref}>← {m(locale, "bookingRoom.back")}</Link>
        <Link href="/dashboard/messages">{m(locale, "bookingRoom.allMessages")}</Link>
      </nav>

      <BookingChatHeader
        locale={locale}
        hotelName={hotelName}
        roomTitle={roomTitle}
        coverImageUrl={coverImageUrl}
        checkInIso={checkInIso}
        checkOutIso={checkOutIso}
        guestCount={guestCount}
        totalPrice={Number(totalPrice)}
        currency={currency}
        bookingStatus={bookingStatus}
        paymentStatus={paymentStatus}
        publicCode={publicCode}
        compact
      />

      {showReviewUi ? (
        <ReviewBanner locale={locale} role={currentUserRole} proofReviewDeadlineAt={proofReviewDeadlineAt} />
      ) : null}

      {proofSent && !isOnReview ? (
        <div className="chat-proof-card" role="status">
          <span className="chat-proof-card__status chat-proof-card__status--pending">{m(locale, "bookingRoom.proof.sentBanner")}</span>
        </div>
      ) : null}

      <DisputeActions locale={locale} bookingId={bookingId} canOpen={currentUserRole !== "ADMIN"} />

      {isGuest && existingReview ? (
        <div className="surface-1 rounded-2xl border border-white/10 p-4 text-sm text-white">
          <div className="font-semibold">{m(locale, "guestDash.yourReview")}</div>
          <div>
            {m(locale, "profile.rating")}: {existingReview.rating}/5
          </div>
          <div className="mt-1 whitespace-pre-wrap text-brand-200">{existingReview.comment}</div>
          {existingReview.reply ? (
            <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-3">
              <div className="text-sm font-semibold text-white">{m(locale, "guestDash.ownerReply")}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-brand-200">{existingReview.reply}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isGuest && eligibleForReview ? (
        <div
          id="booking-review"
          className={`surface-1 rounded-2xl border p-4 ${focusReview ? "border-emerald-400/40 ring-1 ring-emerald-400/25" : "border-white/10"}`}
        >
          <LeaveReviewForm
            bookingId={bookingId}
            labels={{
              title: m(locale, "guestDash.leaveReview"),
              rating: m(locale, "profile.rating"),
              commentPlaceholder: m(locale, "guestDash.reviewCommentPh"),
              imagePlaceholder: m(locale, "guestDash.reviewImagePh"),
              sending: m(locale, "guestDash.reviewSending"),
              submit: m(locale, "guestDash.leaveReview"),
              error: m(locale, "auth.errorGeneric")
            }}
          />
        </div>
      ) : null}

      <div className="chat-page__layout">
        <main className="chat-page__thread">
          <BookingChatPanel
            bookingId={bookingId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            locale={locale}
            bookingStatus={bookingStatus}
            paymentStatus={paymentStatus}
            checkInIso={checkInIso}
            paymentCode={publicCode ?? undefined}
            presentation="page"
            title={title}
            hotelName={hotelName}
            roomTitle={roomTitle}
            counterpartPreview={counterpartPreview}
            counterpartTrustBadges={counterpartTrustBadges}
            suppressPaymentDeepLink={showPaymentFlow || isOnReview}
            suppressReviewActions={showReviewCard}
            embeddedInRoom
            density="compact"
          />
        </main>

        <aside className="chat-page__aside chat-page__aside--collapsible lg:!block">
          <details className="lg:hidden">
            <summary>{m(locale, "bookingRoom.header.payment")} & {m(locale, "bookingRoom.header.dates")}</summary>
            <div className="chat-page__aside-inner">{asideContent}</div>
          </details>
          <div className="hidden space-y-2 lg:block">{asideContent}</div>
        </aside>
      </div>
    </div>
  );
}
