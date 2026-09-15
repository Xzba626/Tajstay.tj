import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getBookingGuestLabel } from "@/lib/domain/booking";
import { getLocale } from "@/lib/i18n/get-locale";
import { BookingRoom } from "@/components/chat/BookingRoom";
import { getHotelPaymentMethods } from "@/lib/hotels/paymentMethods";
import { getBookingTimeline } from "@/lib/chat/bookingTimeline";
import { getProofMetaFromLogs } from "@/lib/chat/proofMeta";
import { m } from "@/lib/i18n/messages";
import { getUserTrustBadges } from "@/lib/auth/trustBadges";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { authorizeBookingAccess } from "@/lib/pms/bookingAuthorization";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { canLeaveReview } from "@/lib/trips/historyRecord";
import { tripsHubPath } from "@/lib/trips/urls";

export const dynamic = "force-dynamic";

export default async function BookingChatPage({
  params,
  searchParams
}: {
  params: { bookingId: string };
  searchParams?: { proofSent?: string; review?: string };
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
      user: true,
      review: true
    }
  });
  if (!booking) notFound();

  const hotel = bookingHotel(booking);
  const guestLabel = getBookingGuestLabel(booking);
  const { isGuest, isOwner, isAdmin, allowed } = authorizeBookingAccess(booking, user);
  if (!allowed) notFound();

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

  // BLOCK 5.6C: presentation role must reflect PARTICIPANT context first, privileged ADMIN access
  // only as the fallback — otherwise a platform admin who is simply the guest on their own
  // booking gets the moderation-facing "АДМИН · чат брони" UI instead of a normal guest
  // conversation (the exact bug confirmed from the reported screenshot: `authorizeBookingAccess`
  // correctly computes isGuest/isOwner/isAdmin independently, but the raw `user.role` was used
  // for the *title* and, more importantly, for `currentUserRole` passed all the way down into
  // BookingRoom/BookingChatPanel, which derives every moderation control from it). No new
  // query-param or client-controlled flag is introduced — this is purely a presentation-priority
  // fix over booleans the backend already computed authoritatively. An admin opening someone
  // else's booking (isGuest=false, isOwner=false) still correctly gets the ADMIN/moderation view,
  // e.g. via the "Открыть переписку" link from Admin -> Жалобы и споры.
  const presentationRole: "GUEST" | "OWNER" | "ADMIN" = isGuest ? "GUEST" : isOwner ? "OWNER" : "ADMIN";
  const backHref = isAdmin || isGuest ? tripsHubPath("all") : "/dashboard/owner";
  const title =
    presentationRole === "ADMIN"
      ? m(locale, "bookingRoom.titleAdmin")
      : isGuest
        ? m(locale, "bookingRoom.titleGuest")
        : m(locale, "bookingRoom.titleOwner");

  const [paymentMethods, timeline, proofMeta] = await Promise.all([
    getHotelPaymentMethods(hotel.id),
    getBookingTimeline(bookingId, locale),
    getProofMetaFromLogs(bookingId)
  ]);

  const proofSent = searchParams?.proofSent === "1";
  const focusReview = (searchParams?.review ?? "").trim() === "1";
  const eligibleForReview = isGuest && canLeaveReview(booking);

  const counterpartUser = isGuest ? booking.room?.hotel?.owner : booking.user;
  const counterpartTrustBadges = counterpartUser ? getUserTrustBadges(counterpartUser) : [];

  return (
    <BookingRoom
      locale={locale}
      bookingId={bookingId}
      currentUserId={user.id}
      currentUserRole={presentationRole}
      isGuest={isGuest}
      backHref={backHref}
      title={title}
      guestLabel={guestLabel}
      counterpartPreview={
        presentationRole === "ADMIN"
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
      payOnArrival={booking.payOnArrival}
      publicCode={booking.publicCode}
      paymentMethods={paymentMethods}
      selectedHotelPaymentMethodId={booking.hotelPaymentMethodId}
      paymentMethodSnapshot={booking.paymentMethodSnapshot as { displayLabel: string; recipientName: string; paymentIdentifier: string; instructions: string | null } | null}
      timeline={timeline}
      proofSent={proofSent}
      paymentProofUrl={booking.paymentProofUrl ? `/api/files/booking/${booking.id}/proof` : null}
      guestDocumentUrl={booking.guestDocumentUrl ? `/api/files/booking/${booking.id}/document` : null}
      proofSubmittedAt={booking.proofSubmittedAt?.toISOString() ?? null}
      proofReviewDeadlineAt={booking.proofReviewDeadlineAt?.toISOString() ?? null}
      proofAmount={proofMeta.proofAmount}
      proofComment={proofMeta.proofComment}
      counterpartTrustBadges={counterpartTrustBadges}
      eligibleForReview={eligibleForReview}
      focusReview={focusReview}
      existingReview={
        booking.review
          ? { rating: booking.review.rating, comment: booking.review.comment, reply: booking.review.reply }
          : null
      }
    />
  );
}
