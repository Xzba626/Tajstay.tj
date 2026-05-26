import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getBookingGuestLabel } from "@/lib/domain/booking";
import { getLocale } from "@/lib/i18n/get-locale";
import { BookingRoom } from "@/components/chat/BookingRoom";
import { getOwnerPaymentMethods } from "@/lib/owner-payment-methods";
import { getBookingTimeline } from "@/lib/chat/bookingTimeline";
import { getProofMetaFromLogs } from "@/lib/chat/proofMeta";
import { m } from "@/lib/i18n/messages";
import { getUserTrustBadges } from "@/lib/auth/trustBadges";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export const dynamic = "force-dynamic";

export default async function BookingChatPage({
  params,
  searchParams
}: {
  params: { bookingId: string };
  searchParams?: { proofSent?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) notFound();

  const bookingId = Number(params.bookingId || "");
  if (!bookingId) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      ...bookingWithHotelInclude,
      room: { include: { hotel: { include: { owner: true } } } },
      payment: true,
      user: true
    }
  });
  if (!booking) notFound();

  const hotel = bookingHotel(booking);
  const isGuest = booking.userId === user.id;
  const guestLabel = getBookingGuestLabel(booking);
  const isOwner = hotel.ownerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isGuest && !isOwner && !isAdmin) notFound();

  if (isOwner && (booking.status === "WAITING_PAYMENT" || booking.status === "WAIT_PROOF")) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="surface-1 rounded-2xl p-4">
          <h1 className="text-2xl font-semibold text-white">{m(locale, "bookingRoom.ownerQuiet.title")}</h1>
          <p className="mt-2 text-sm text-brand-200">{m(locale, "bookingRoom.ownerQuiet.body")}</p>
        </div>
      </div>
    );
  }

  const backHref = isAdmin || isGuest ? "/dashboard/bookings" : "/dashboard/owner";
  const title =
    user.role === "ADMIN"
      ? m(locale, "bookingRoom.titleAdmin")
      : isGuest
        ? m(locale, "bookingRoom.titleGuest")
        : m(locale, "bookingRoom.titleOwner");

  const [paymentMethods, timeline, proofMeta] = await Promise.all([
    getOwnerPaymentMethods(hotel.ownerId),
    getBookingTimeline(bookingId),
    getProofMetaFromLogs(bookingId)
  ]);

  const proofSent = searchParams?.proofSent === "1";

  const counterpartUser = isGuest ? booking.room?.hotel?.owner : booking.user;
  const counterpartTrustBadges = counterpartUser ? getUserTrustBadges(counterpartUser) : [];

  return (
    <BookingRoom
      locale={locale}
      bookingId={bookingId}
      currentUserId={user.id}
      currentUserRole={user.role as "GUEST" | "OWNER" | "ADMIN"}
      isGuest={isGuest}
      backHref={backHref}
      title={title}
      guestLabel={guestLabel}
      counterpartPreview={
        isAdmin
          ? `${guestLabel} · ${hotel.name}`
          : isGuest
            ? m(locale, "bookingRoom.counterpartGuest")
            : `${m(locale, "bookingRoom.counterpartOwner")}: ${guestLabel}`
      }
      hotelName={hotel.name}
      roomTitle={bookingRoomTitle(booking)}
      coverImageUrl={hotel.coverImageUrl ?? null}
      checkInIso={booking.checkIn.toISOString()}
      checkOutIso={booking.checkOut.toISOString()}
      guestCount={booking.guestCount}
      totalPrice={Number(booking.totalPrice)}
      currency={booking.currency}
      bookingStatus={booking.status}
      paymentStatus={booking.paymentStatus}
      publicCode={booking.publicCode}
      paymentMethods={paymentMethods}
      timeline={timeline}
      proofSent={proofSent}
      paymentProofUrl={booking.paymentProofUrl}
      guestDocumentUrl={booking.guestDocumentUrl}
      proofSubmittedAt={booking.proofSubmittedAt?.toISOString() ?? null}
      proofReviewDeadlineAt={booking.proofReviewDeadlineAt?.toISOString() ?? null}
      proofAmount={proofMeta.proofAmount}
      proofComment={proofMeta.proofComment}
      counterpartTrustBadges={counterpartTrustBadges}
    />
  );
}
