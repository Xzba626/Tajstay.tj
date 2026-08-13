import { BOOKING_STATUS } from "@/lib/domain/booking";
import { getNightDates } from "@/lib/services/bookingPricing";
import { bookingHotel, bookingRoomTitle, type BookingLike } from "@/lib/pms/bookingContext";
import { isStayPast, normalizePaymentBadge } from "@/lib/trips/classify";
import type { Locale } from "@/lib/i18n/locale";
import { formatStayDateRange, formatStayDay } from "@/lib/i18n/format";
import { formatCountLabel } from "@/lib/i18n/plural";
import { m } from "@/lib/i18n/messages";

export type HistoryRecordKind = "hotel" | "tour";

export type HistoryBookingRecord = {
  kind: "hotel";
  id: number;
  hotelId: number;
  title: string;
  location: string;
  roomTitle: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  nights: number;
  status: string;
  paymentStatus: string;
  publicCode: string | null;
  expiresAt: Date | null;
  paymentTimerPaused: boolean;
  coverImageUrl: string | null;
  hasReview: boolean;
};

/** Future tour bookings — shape ready before Tour model exists. */
export type HistoryTourRecord = {
  kind: "tour";
  id: number;
  title: string;
  location: string;
  date: Date;
  days: number;
  guestCount: number;
  status: string;
  paymentStatus: string;
  publicCode: string | null;
  coverImageUrl: string | null;
  hasReview: boolean;
};

export type HistoryRecord = HistoryBookingRecord | HistoryTourRecord;

type PrismaBookingSlice = {
  id: number;
  status: string;
  paymentStatus: string;
  publicCode: string | null;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  expiresAt?: Date | null;
  paymentTimerPaused?: boolean;
  review?: { id: number } | null;
  room?: { title?: string; hotel: { id: number; name: string; city?: string; coverImageUrl?: string | null } } | null;
  roomType?: { name?: string; hotel: { id: number; name: string; city?: string; coverImageUrl?: string | null } } | null;
  assignedRoom?: { title?: string; hotel: { id: number; name: string; city?: string; coverImageUrl?: string | null } } | null;
};

export function bookingDetailPath(bookingId: number, query?: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v) params.set(k, v);
  }
  const q = params.toString();
  return q ? `/chat/booking/${bookingId}?${q}` : `/chat/booking/${bookingId}`;
}

export function countStayNights(checkIn: Date, checkOut: Date): number {
  return getNightDates(checkIn, checkOut).length;
}

export function canContinuePayment(b: {
  status: string;
  paymentStatus: string;
  publicCode: string | null;
  expiresAt?: Date | null;
  paymentTimerPaused?: boolean;
}): boolean {
  const badge = normalizePaymentBadge(b.paymentStatus);
  if (badge === "PAID" || badge === "REFUNDED") return false;
  if (!b.publicCode) return false;
  if (b.status === BOOKING_STATUS.EXPIRED || b.status === BOOKING_STATUS.CANCELLED) return false;

  const payable = new Set<string>([BOOKING_STATUS.WAITING_PAYMENT, BOOKING_STATUS.WAIT_PROOF, BOOKING_STATUS.REJECTED]);
  if (!payable.has(b.status)) return false;

  if (!b.paymentTimerPaused && b.expiresAt && b.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export function canLeaveReview(
  b: { status: string; paymentStatus: string; checkOut: Date; review?: { id: number } | null },
  now: Date = new Date()
): boolean {
  return (
    b.status === BOOKING_STATUS.CONFIRMED &&
    b.paymentStatus === "PAID" &&
    isStayPast(b.checkOut, now) &&
    !b.review
  );
}

export function mapBookingToHistoryRecord(booking: PrismaBookingSlice): HistoryBookingRecord {
  const hotel = bookingHotel(booking as BookingLike);
  const nights = countStayNights(booking.checkIn, booking.checkOut);

  return {
    kind: "hotel",
    id: booking.id,
    hotelId: hotel.id,
    title: hotel.name,
    location: hotel.city?.trim() || "—",
    roomTitle: bookingRoomTitle(booking as BookingLike),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guestCount: booking.guestCount,
    nights,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    publicCode: booking.publicCode,
    expiresAt: booking.expiresAt ?? null,
    paymentTimerPaused: Boolean(booking.paymentTimerPaused),
    coverImageUrl: hotel.coverImageUrl ?? null,
    hasReview: Boolean(booking.review)
  };
}

export function formatHotelDates(locale: Locale, record: HistoryBookingRecord): string {
  return formatStayDateRange(locale, record.checkIn, record.checkOut);
}

export function formatTourDate(locale: Locale, record: HistoryTourRecord): string {
  return formatStayDay(locale, record.date);
}

export function formatHotelStayMeta(locale: Locale, record: HistoryBookingRecord): string {
  const nightsLabel = formatCountLabel(locale, record.nights, "night");
  const roomsLabel = m(locale, "tripsHub.roomOne");
  return `${nightsLabel} · ${roomsLabel}`;
}

export function formatTourStayMeta(locale: Locale, record: HistoryTourRecord): string {
  const daysLabel = formatCountLabel(locale, record.days, "day");
  const peopleLabel = formatCountLabel(locale, record.guestCount, "people");
  return `${daysLabel} · ${peopleLabel}`;
}

export function recordKindIcon(kind: HistoryRecordKind): string {
  return kind === "tour" ? "🏔" : "🏨";
}
