import Link from "next/link";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { StatusBadge, bookingStatusVariant, paymentStatusVariant } from "@/components/ui/StatusBadge";
import LeaveReviewForm from "@/app/dashboard/guest/leave-review-form";
import { BookingChatLauncher } from "@/components/chat/BookingChatPanel";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type BookingWithRelations = {
  id: number;
  status: string;
  paymentStatus: string;
  publicCode: string | null;
  checkIn: Date;
  checkOut: Date;
  totalPrice: unknown;
  commission: unknown;
  roomId: number | null;
  guestDocumentUrl: string | null;
  room: {
    title: string;
    hotel: {
      id: number;
      ownerId: number;
      name: string;
      owner?: { name: string | null; phone: string | null } | null;
    };
  } | null;
  roomType: {
    name: string;
    hotel: {
      id: number;
      ownerId: number;
      name: string;
      owner?: { name: string | null; phone: string | null } | null;
    };
  } | null;
  review: { rating: number; comment: string; reply: string | null } | null;
};

type Props = {
  locale: Locale;
  user: { id: number; role: string };
  booking: BookingWithRelations;
};

export function TripBookingCard({ locale, user, booking }: Props) {
  const subtotal = Math.max(0, Number(booking.totalPrice) - Number(booking.commission ?? 0));
  const commission = Number(booking.commission ?? 0);
  const eligibleForReview =
    booking.status === "CONFIRMED" &&
    booking.paymentStatus === "PAID" &&
    booking.checkOut.getTime() < Date.now() &&
    !booking.review;
  const hotel = bookingHotel(booking);
  const roomTitle = bookingRoomTitle(booking);

  return (
    <article className="surface-1 rounded-xl p-4" data-reveal>
      <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-3">
        <div>
          <div className="font-semibold text-white">{hotel.name}</div>
          <div className="text-sm text-brand-200">{roomTitle}</div>
          <div className="mt-1 text-sm">
            {booking.checkIn.toISOString().slice(0, 10)} – {booking.checkOut.toISOString().slice(0, 10)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-brand-200">{m(locale, "guestDash.statusBooking")}:</span>
            <StatusBadge variant={bookingStatusVariant(booking.status)} className="!bg-brand-700 !text-white !ring-brand-600">
              {m(locale, `status.${booking.status}`)}
            </StatusBadge>
          </div>
        </div>
        <div className="text-sm text-brand-200">
          <span>{m(locale, "guestDash.payment")}: </span>
          <StatusBadge variant={paymentStatusVariant(booking.paymentStatus)} className="!bg-brand-800 !text-white !ring-brand-600">
            {m(locale, `status.${booking.paymentStatus}`)}
          </StatusBadge>
          <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span>{m(locale, "tripsHub.stayCost")}</span>
              <span>{subtotal.toFixed(2)} TJS</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{m(locale, "tripsHub.serviceFee")}</span>
              <span>{commission.toFixed(2)} TJS</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-1 text-sm font-semibold text-white">
              <span>{m(locale, "guestDash.amount")}</span>
              <span>{Number(booking.totalPrice).toFixed(2)} TJS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          className="rounded-xl border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-100 transition hover:bg-brand-700"
          href={`/hotel/${hotel.id}`}
        >
          {m(locale, "tripsHub.openHotel")}
        </Link>
        {booking.roomId ? (
          <Link
            className="rounded-xl border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-100 transition hover:bg-brand-700"
            href={`/booking?roomId=${booking.roomId}&checkIn=${booking.checkIn.toISOString().slice(0, 10)}&checkOut=${booking.checkOut.toISOString().slice(0, 10)}`}
          >
            {m(locale, "tripsHub.bookAgain")}
          </Link>
        ) : null}
        {booking.publicCode && booking.paymentStatus !== "PAID" ? (
          <Link
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
            href={`/payment/${booking.publicCode}`}
          >
            {m(locale, "tripsHub.openPayment")}
          </Link>
        ) : null}
      </div>

      {booking.review ? (
        <div className="mt-4 rounded-xl border border-brand-700 bg-brand-800 p-4 text-sm text-white">
          <div className="font-semibold">{m(locale, "guestDash.yourReview")}</div>
          <div>
            {m(locale, "profile.rating")}: {booking.review.rating}/5
          </div>
          <div className="mt-1 whitespace-pre-wrap text-brand-200">{booking.review.comment}</div>
          {booking.review.reply ? (
            <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-3">
              <div className="text-sm font-semibold text-white">{m(locale, "guestDash.ownerReply")}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-brand-200">{booking.review.reply}</div>
            </div>
          ) : null}
        </div>
      ) : eligibleForReview ? (
        <div className="mt-4">
          <LeaveReviewForm
            bookingId={booking.id}
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
      ) : (
        <div className="mt-4 text-sm text-brand-200">{m(locale, "guestDash.reviewLater")}</div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white">{m(locale, "tripsHub.guestDocumentTitle")}</div>
        {booking.guestDocumentUrl ? (
          <div className="mt-2 text-sm text-brand-200">
            {m(locale, "tripsHub.documentUploaded")}{" "}
            <a className="font-semibold text-white underline underline-offset-2" href={booking.guestDocumentUrl} target="_blank" rel="noreferrer">
              {m(locale, "tripsHub.documentOpen")}
            </a>
          </div>
        ) : (
          <form action="/api/bookings/document" method="post" encType="multipart/form-data" className="mt-3">
            <input type="hidden" name="bookingId" value={booking.id} />
            <input required name="docFile" type="file" accept="image/jpeg,image/png,image/webp" className="ds-input w-full py-2" />
            <div className="mt-2 text-xs text-brand-200">{m(locale, "tripsHub.documentHint")}</div>
            <button className="ds-primary-btn mt-3 w-full text-sm font-medium text-white" type="submit">
              {m(locale, "tripsHub.documentUpload")}
            </button>
          </form>
        )}
      </div>

      <form action="/api/complaints/create" method="post" className="surface-2 mt-4 rounded-2xl border border-white/10 p-4">
        <div className="text-sm font-semibold text-white">{m(locale, "admin.complaints")}</div>
        <textarea
          required
          name="message"
          placeholder={m(locale, "guestDash.complaintPlaceholder")}
          className="ds-input mt-2 min-h-[90px] w-full resize-y py-3"
        />
        <input type="hidden" name="bookingId" value={booking.id} />
        <button className="ds-primary-btn mt-3 w-full text-sm font-medium text-white" type="submit">
          {m(locale, "admin.complaints")}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md">
        <span className="w-full text-sm font-semibold text-white sm:w-auto">{m(locale, "tripsHub.chatSection")}</span>
        <BookingChatLauncher
          bookingId={booking.id}
          currentUserId={user.id}
          currentUserRole="GUEST"
          locale={locale}
          bookingStatus={booking.status}
          paymentStatus={booking.paymentStatus}
          checkInIso={booking.checkIn.toISOString()}
          paymentCode={booking.publicCode ?? undefined}
          title={m(locale, "tripsHub.chatWithHost")}
          hotelName={hotel.name}
          roomTitle={roomTitle}
          openLabel={m(locale, "tripsHub.chatOpen")}
        />
        <Link
          href={`/chat/booking/${booking.id}`}
          className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
        >
          {m(locale, "tripsHub.chatRoom")}
        </Link>
      </div>

      {(booking.status === "CONFIRMED" || booking.status === "COMPLETED") && (
        <div className="mt-4 rounded-2xl border border-brand-700 bg-brand-800 p-4 text-sm text-brand-200">
          <div className="font-semibold">{m(locale, "tripsHub.ownerContacts")}</div>
          <div className="mt-1 text-white">
            {booking.room?.hotel?.owner?.name ?? booking.roomType?.hotel?.owner?.name ?? "—"} ·{" "}
            {booking.room?.hotel?.owner?.phone ?? booking.roomType?.hotel?.owner?.phone ?? "—"}
          </div>
          <div className="mt-1 text-xs text-brand-200">{m(locale, "tripsHub.ownerContactsHint")}</div>
        </div>
      )}
    </article>
  );
}
