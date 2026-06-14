import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { BookingActions } from "@/components/trips/BookingActions";
import { bookingHotelOptional } from "@/lib/pms/bookingContext";
import type { Locale } from "@/lib/i18n/locale";
import { formatBookingStatus } from "@/lib/i18n/bookingStatus";
import { m } from "@/lib/i18n/messages";

type BookingSlice = {
  id: number;
  status: string;
  paymentStatus: string;
  publicCode: string | null;
  cancellationReason?: string | null;
  checkIn: Date;
  checkOut: Date;
  review?: { id: number } | null;
  assignedRoom?: { hotel: { id: number; name: string; coverImageUrl?: string | null } } | null;
  room: { hotel: { id: number; name: string; coverImageUrl?: string | null } } | null;
  roomType: { hotel: { id: number; name: string; coverImageUrl?: string | null } } | null;
};

function statusClass(status: string): string {
  if (["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(status)) return "mockup-status--confirmed";
  if (["CANCELLED", "REJECTED", "EXPIRED", "CANCELLED_BY_GUEST"].includes(status)) return "mockup-status--cancelled";
  if (["WAITING_PAYMENT", "PENDING_PAYMENT", "WAIT_PROOF"].includes(status)) return "mockup-status--payment";
  if (["ON_REVIEW", "PENDING_OWNER"].includes(status)) return "mockup-status--review";
  return "mockup-status--pending";
}

export function TripMockupCard({ locale, booking }: { locale: Locale; booking: BookingSlice }) {
  const hotel =
    bookingHotelOptional(booking as Parameters<typeof bookingHotelOptional>[0]) ?? {
      id: 0,
      name: m(locale, "tripsHub.hotelUnknown"),
      coverImageUrl: null
    };
  const dates = `${booking.checkIn.toISOString().slice(0, 10)} – ${booking.checkOut.toISOString().slice(0, 10)}`;
  const code = booking.publicCode ? `#${booking.publicCode}` : `#TS${booking.id}`;

  return (
    <article className="mockup-list-card mockup-list-card--with-actions">
      <Link href={`/chat/booking/${booking.id}`} className="mockup-list-card__link">
        <div className="mockup-list-card__media">
          {hotel.coverImageUrl ? (
            <AppImage src={hotel.coverImageUrl} alt={hotel.name} fill className="object-cover" sizes="88px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl opacity-30">🏨</div>
          )}
        </div>
        <div className="mockup-list-card__body">
          <div className="mockup-list-card__title line-clamp-2">{hotel.name}</div>
          <div className="mockup-list-card__meta">{dates}</div>
          <div className="mockup-list-card__row">
            <span className="mockup-list-card__meta">{code}</span>
            <span className={`mockup-status ${statusClass(booking.status)}`}>
              {formatBookingStatus(locale, booking.status)}
            </span>
          </div>
        </div>
      </Link>
      <BookingActions booking={booking} />
    </article>
  );
}
