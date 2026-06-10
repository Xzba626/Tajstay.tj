import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import LeaveReviewForm from "@/app/dashboard/guest/leave-review-form";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export default async function ReviewCreatePage({
  searchParams
}: {
  searchParams?: { bookingId?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/review/create");

  const bookingId = Number(searchParams?.bookingId ?? "");
  if (!bookingId) redirect("/dashboard/bookings");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ...bookingWithHotelInclude, review: true }
  });
  if (!booking || (user.role !== "ADMIN" && booking.userId !== user.id)) {
    redirect("/dashboard/bookings");
  }
  if (booking.review) redirect("/dashboard/bookings?tab=history");

  const hotel = bookingHotel(booking);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-white">{m(locale, "guestDash.leaveReview")}</h1>
      <p className="mt-2 text-sm text-brand-200">
        {hotel.name} · {booking.checkIn.toISOString().slice(0, 10)} – {booking.checkOut.toISOString().slice(0, 10)}
      </p>
      <div className="mt-6">
        <LeaveReviewForm
          bookingId={booking.id}
          locale={locale}
          labels={{
            title: m(locale, "guestDash.leaveReview"),
            commentPlaceholder: m(locale, "guestDash.reviewCommentPh"),
            imagePlaceholder: m(locale, "guestDash.reviewImagePh"),
            sending: m(locale, "guestDash.reviewSending"),
            submit: m(locale, "guestDash.leaveReview"),
            error: m(locale, "auth.errorGeneric")
          }}
        />
      </div>
    </div>
  );
}
