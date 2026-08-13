import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { normalizePaymentBadge } from "@/lib/trips/classify";
import {
  bookingDetailPath,
  canContinuePayment,
  canLeaveReview,
  formatHotelDates,
  formatHotelStayMeta,
  formatTourDate,
  formatTourStayMeta,
  mapBookingToHistoryRecord,
  recordKindIcon,
  type HistoryRecord
} from "@/lib/trips/historyRecord";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type BookingInput = Parameters<typeof mapBookingToHistoryRecord>[0];

function bookingStatusClass(status: string): string {
  if (["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(status)) return "mockup-status--confirmed";
  if (["CANCELLED", "REJECTED", "EXPIRED", "CANCELLED_BY_GUEST"].includes(status)) return "mockup-status--cancelled";
  return "mockup-status--pending";
}

function paymentStatusClass(badge: ReturnType<typeof normalizePaymentBadge>): string {
  if (badge === "PAID") return "mockup-status--confirmed";
  if (badge === "REFUNDED" || badge === "FAILED") return "mockup-status--cancelled";
  return "mockup-status--pending";
}

function bookingStatusLabel(locale: Locale, status: string): string {
  const key = `status.${status}`;
  const translated = m(locale, key);
  return translated === key ? status : translated;
}

function paymentStatusLabel(locale: Locale, paymentStatus: string): string {
  const badge = normalizePaymentBadge(paymentStatus);
  if (badge === "UNPAID") return m(locale, "tripsHub.paymentUnpaid");
  if (badge === "PAID") return m(locale, "tripsHub.paymentPaid");
  if (badge === "REFUNDED") return m(locale, "tripsHub.paymentRefunded");
  return m(locale, "status.FAILED");
}

function statusPrefix(status: string, paymentStatus: string): { booking: string; payment: string } {
  const badge = normalizePaymentBadge(paymentStatus);
  const confirmed = ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(status);
  const cancelled = ["CANCELLED", "REJECTED", "EXPIRED", "CANCELLED_BY_GUEST"].includes(status);

  return {
    booking: cancelled ? "✕" : confirmed ? "✓" : "⏳",
    payment: badge === "PAID" ? "✓" : badge === "REFUNDED" ? "↩" : "○"
  };
}

function HistoryRecordCardInner({ locale, record }: { locale: Locale; record: HistoryRecord }) {
  const payBadge = normalizePaymentBadge(record.paymentStatus);
  const prefixes = statusPrefix(record.status, record.paymentStatus);
  const detailHref = bookingDetailPath(record.id);
  const showPayment =
    record.kind === "hotel"
      ? canContinuePayment({
          status: record.status,
          paymentStatus: record.paymentStatus,
          publicCode: record.publicCode,
          expiresAt: record.expiresAt,
          paymentTimerPaused: record.paymentTimerPaused
        })
      : record.publicCode != null && payBadge === "UNPAID";
  const showReview =
    record.kind === "hotel" &&
    canLeaveReview({
      status: record.status,
      paymentStatus: record.paymentStatus,
      checkOut: record.checkOut,
      review: record.hasReview ? { id: 1 } : null
    });

  const title = record.title;
  const location = record.location;
  const dates = record.kind === "hotel" ? formatHotelDates(locale, record) : formatTourDate(locale, record);
  const stayMeta = record.kind === "hotel" ? formatHotelStayMeta(locale, record) : formatTourStayMeta(locale, record);
  const icon = recordKindIcon(record.kind);
  const cover = record.coverImageUrl;

  return (
    <article className="mockup-list-card mockup-list-card--history">
      <div className="mockup-list-card__media">
        {cover ? (
          <AppImage src={cover} alt={title} fill className="object-cover" sizes="88px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-30">{icon}</div>
        )}
      </div>
      <div className="mockup-list-card__body">
        <div className="mockup-list-card__title line-clamp-2">
          <span aria-hidden className="mr-1">
            {icon}
          </span>
          {title}
        </div>
        {location && location !== "—" ? <div className="mockup-list-card__meta">{location}</div> : null}
        <div className="mockup-list-card__meta">{dates}</div>
        <div className="mockup-list-card__meta">{stayMeta}</div>
        {record.kind === "hotel" && record.roomTitle !== "—" ? (
          <div className="mockup-list-card__meta line-clamp-1">{record.roomTitle}</div>
        ) : null}
        <div className="mockup-list-card__badges">
          <span className={`mockup-status ${bookingStatusClass(record.status)}`}>
            <span aria-hidden>{prefixes.booking} </span>
            {bookingStatusLabel(locale, record.status)}
          </span>
          <span className={`mockup-status ${paymentStatusClass(payBadge)}`}>
            <span aria-hidden>{prefixes.payment} </span>
            {paymentStatusLabel(locale, record.paymentStatus)}
          </span>
        </div>
        <div className="mockup-list-card__actions">
          <Link href={detailHref} className="mockup-list-card__btn mockup-list-card__btn--primary">
            {m(locale, "tripsHub.openRecord")}
          </Link>
          {showPayment && record.publicCode ? (
            <Link href={`/payment/${record.publicCode}`} className="mockup-list-card__btn">
              {m(locale, "tripsHub.continuePayment")}
            </Link>
          ) : null}
          {showReview ? (
            <Link href={bookingDetailPath(record.id, { review: "1" })} className="mockup-list-card__btn">
              {m(locale, "guestDash.leaveReview")}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Dedicated History list card — not a Search HotelCard. */
export function HistoryRecordCard({ locale, booking }: { locale: Locale; booking: BookingInput }) {
  const record = mapBookingToHistoryRecord(booking);
  return <HistoryRecordCardInner locale={locale} record={record} />;
}

export function HistoryRecordCardFromRecord({ locale, record }: { locale: Locale; record: HistoryRecord }) {
  return <HistoryRecordCardInner locale={locale} record={record} />;
}
