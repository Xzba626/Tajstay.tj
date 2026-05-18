import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { StatusBadge, bookingStatusVariant, paymentStatusVariant } from "@/components/ui/StatusBadge";
import LeaveReviewForm from "./leave-review-form";
import { BookingChatLauncher } from "@/components/chat/BookingChatPanel";

export const dynamic = "force-dynamic";

export default async function GuestDashboardPage({
  searchParams
}: {
  searchParams?: { notice?: string };
}) {
  const locale = getLocale();
  const user = await requireUser();
  const notice = (searchParams?.notice ?? "").trim();
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-8">
        <h1 className="text-2xl font-semibold text-white">{m(locale, "guestDash.title")}</h1>
        <p className="text-brand-200">{m(locale, "guestDash.signInPrompt")}</p>
        <a className="ds-primary-btn inline-flex items-center" href="/auth/sign-in">
          {m(locale, "guestDash.signIn")}
        </a>
      </div>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: {
      room: {
        include: {
          hotel: { include: { owner: true } }
        }
      },
      review: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-white">{m(locale, "guestDash.title")}</h1>
        <Link
          href="/dashboard/bookings"
          className="text-sm font-semibold text-emerald-200/90 underline-offset-4 transition hover:text-emerald-100 hover:underline"
        >
          Все бронирования
        </Link>
      </div>
      {notice === "adminOnly" && (
        <div
          className="rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200"
          role="status"
        >
          {m(locale, "guestDash.adminOnlyNotice")}
        </div>
      )}
      {notice === "ownerOnly" && (
        <div
          className="rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200"
          role="status"
        >
          {m(locale, "guestDash.ownerOnlyNotice")}
        </div>
      )}
      <div className="space-y-3">
        {bookings.map((booking) => {
          const subtotal = Math.max(0, Number(booking.totalPrice) - Number(booking.commission ?? 0));
          const commission = Number(booking.commission ?? 0);
          const eligibleForReview =
            booking.status === "CONFIRMED" &&
            booking.paymentStatus === "PAID" &&
            booking.checkOut.getTime() < Date.now() &&
            !booking.review;
          return (
          <div key={booking.id} className="surface-1 rounded-xl p-4" data-reveal>
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-3">
              <div>
                <div className="font-semibold text-white">{booking.room.hotel.name}</div>
                <div className="text-sm text-brand-200">{booking.room.title}</div>
                <div className="mt-1 text-sm">
                  {booking.checkIn.toISOString().slice(0, 10)} - {booking.checkOut.toISOString().slice(0, 10)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-brand-200">{m(locale, "guestDash.statusBooking")}:</span>
                  <StatusBadge
                    variant={bookingStatusVariant(booking.status)}
                    className="!bg-brand-700 !text-white !ring-brand-600"
                  >
                    {m(locale, `status.${booking.status}`)}
                  </StatusBadge>
                </div>
              </div>
              <div className="text-sm text-brand-200">
                <span className="text-brand-200">{m(locale, "guestDash.payment")}: </span>
                <StatusBadge
                  variant={paymentStatusVariant(booking.paymentStatus)}
                  className="!bg-brand-800 !text-white !ring-brand-600"
                >
                  {m(locale, `status.${booking.paymentStatus}`)}
                </StatusBadge>
                <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span>Стоимость проживания</span>
                    <span>{subtotal.toFixed(2)} TJS</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Сервисная комиссия</span>
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
              <a
                className="rounded-xl border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-100 transition hover:bg-brand-700"
                href={`/hotel/${booking.room.hotel.id}`}
              >
                Открыть отель
              </a>
              <a
                className="rounded-xl border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-100 transition hover:bg-brand-700"
                href={`/booking?roomId=${booking.roomId}&checkIn=${booking.checkIn.toISOString().slice(0, 10)}&checkOut=${booking.checkOut
                  .toISOString()
                  .slice(0, 10)}`}
              >
                Забронировать снова
              </a>
            </div>

            {booking.review ? (
              <div className="mt-4 rounded-xl border border-brand-700 bg-brand-800 p-4 text-sm text-white">
                <div className="font-semibold">{m(locale, "guestDash.yourReview")}</div>
                <div>{m(locale, "profile.rating")}: {booking.review.rating}/5</div>
                <div className="mt-1 whitespace-pre-wrap text-brand-200">{booking.review.comment}</div>
                {booking.review.reply && (
                  <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-3">
                    <div className="text-sm font-semibold text-white">{m(locale, "guestDash.ownerReply")}</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-brand-200">{booking.review.reply}</div>
                  </div>
                )}
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

            {/* Guest document upload (passport/ID) */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Документ гостя (паспорт/ID)</div>
              {booking.guestDocumentUrl ? (
                <div className="mt-2 text-sm text-brand-200">
                  Загружено:&nbsp;
                  <a
                    className="font-semibold text-white underline underline-offset-2"
                    href={booking.guestDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    открыть документ
                  </a>
                </div>
              ) : (
                <form action="/api/bookings/document" method="post" encType="multipart/form-data" className="mt-3">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input
                    required
                    name="docFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="ds-input w-full py-2"
                  />
                  <div className="mt-2 text-xs text-brand-200">JPG/PNG/WebP, до 6MB.</div>
                  <button className="ds-primary-btn mt-3 w-full text-sm font-medium text-white" type="submit">
                    Загрузить документ
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
              <span className="w-full text-sm font-semibold text-white sm:w-auto">Чат по брони</span>
              <BookingChatLauncher
                bookingId={booking.id}
                currentUserId={user.id}
                currentUserRole="GUEST"
                locale={locale}
                bookingStatus={booking.status}
                paymentStatus={booking.paymentStatus}
                checkInIso={booking.checkIn.toISOString()}
                paymentCode={booking.publicCode ?? undefined}
                title="Чат с владельцем"
                hotelName={booking.room.hotel.name}
                roomTitle={booking.room.title}
                openLabel="Открыть чат"
              />
              {(() => {
                const code = booking.publicCode?.trim();
                const deal =
                  code &&
                  ["WAITING_PAYMENT", "WAIT_PROOF", "ON_REVIEW", "REJECTED"].includes(booking.status);
                const dealHref = deal ? `/payment/${encodeURIComponent(code)}?after=1` : `/chat/booking/${booking.id}`;
                return (
              <Link
                href={dealHref}
                className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                {deal ? "Оплата и чат" : "Полный экран"}
              </Link>
                );
              })()}
            </div>

            {/* Owner contacts after confirmation */}
            {(booking.status === "CONFIRMED" || booking.status === "COMPLETED") && (
              <div className="mt-4 rounded-2xl border border-brand-700 bg-brand-800 p-4 text-sm text-brand-200">
                <div className="font-semibold">Контакты владельца</div>
                <div className="mt-1 text-white">
                  {booking.room.hotel.owner.name} · {booking.room.hotel.owner.phone}
                </div>
                <div className="mt-1 text-xs text-brand-200">
                  Контакты доступны после подтверждения брони владельцем.
                </div>
              </div>
            )}
          </div>
          );
        })}
        {!bookings.length && <p className="text-brand-200">{m(locale, "owner.bookingsEmpty")}</p>}
      </div>
    </div>
  );
}

