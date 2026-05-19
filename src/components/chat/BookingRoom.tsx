"use client";

import Link from "next/link";
import { BookingChatPanel } from "@/components/chat/BookingChatPanel";
import { BookingChatHeader } from "@/components/chat/BookingChatHeader";
import { PaymentMethodsBlock } from "@/components/chat/PaymentMethodsBlock";
import { ProofUploadPanel } from "@/components/chat/ProofUploadPanel";
import { BookingTimeline } from "@/components/chat/BookingTimeline";
import type { BookingTimelineEvent } from "@/lib/chat/bookingTimeline";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
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
    proofSent
  } = props;

  const showPaymentFlow =
    isGuest &&
    (bookingStatus === BOOKING_STATUS.WAITING_PAYMENT ||
      bookingStatus === BOOKING_STATUS.WAIT_PROOF ||
      bookingStatus === BOOKING_STATUS.ON_REVIEW);

  const canSubmitProof =
    isGuest &&
    (bookingStatus === BOOKING_STATUS.WAITING_PAYMENT || bookingStatus === BOOKING_STATUS.WAIT_PROOF);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={backHref} className="text-slate-400 transition hover:text-white">
          ← {m(locale, "bookingRoom.back")}
        </Link>
        <Link href="/dashboard/messages" className="rounded-xl border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5">
          {m(locale, "bookingRoom.allMessages")}
        </Link>
      </div>

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
      />

      {proofSent ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100" role="status">
          {m(locale, "bookingRoom.proof.sentBanner")}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl ring-1 ring-white/5">
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
            suppressPaymentDeepLink={showPaymentFlow}
            density="default"
          />
        </div>

        <aside className="space-y-4">
          <BookingTimeline locale={locale} events={timeline} />
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
        </aside>
      </div>
    </div>
  );
}

