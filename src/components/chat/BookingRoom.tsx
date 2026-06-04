"use client";

import Link from "next/link";
import { BookingChatPanel } from "@/components/chat/BookingChatPanel";
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
};

export function BookingRoom(props: BookingRoomProps) {
  const {
    locale,
    bookingId,
    currentUserId,
    currentUserRole,
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
    proofComment = null
  } = props;

  const isOnReview = bookingStatus === BOOKING_STATUS.ON_REVIEW;
  const showReviewCard = isOnReview && (currentUserRole === "ADMIN" || currentUserRole === "OWNER");

  const roomContext = {
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
    proofComment
  };

  return (
    <div className="chat-page chat-page--messenger">
      <nav className="chat-page__nav chat-page__nav--minimal" aria-label={m(locale, "bookingRoom.back")}>
        <Link href={backHref}>← {m(locale, "bookingRoom.back")}</Link>
        <Link href="/dashboard/messages">{m(locale, "bookingRoom.allMessages")}</Link>
      </nav>

      <div className="chat-page__thread chat-page__thread--solo">
        <BookingChatPanel
          bookingId={bookingId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          locale={locale}
          bookingStatus={bookingStatus}
          paymentStatus={paymentStatus}
          checkInIso={checkInIso}
          checkOutIso={checkOutIso}
          paymentCode={publicCode ?? undefined}
          presentation="page"
          title={title}
          hotelName={hotelName}
          roomTitle={roomTitle}
          counterpartPreview={counterpartPreview}
          counterpartTrustBadges={counterpartTrustBadges}
          suppressPaymentDeepLink
          suppressReviewActions={showReviewCard}
          embeddedInRoom
          density="compact"
          roomContext={roomContext}
        />
      </div>
    </div>
  );
}
