import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import LeaveReviewForm from "@/app/dashboard/guest/leave-review-form";
import { bookingHotelOptional } from "@/lib/pms/bookingContext";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function ReviewCreatePage({
  searchParams
}: {
  searchParams?: { bookingId?: string };
}) {
  const locale = getLocale();
  const user = await requireUser();
  if (!user) redirect("/auth/sign-in?next=/review/create");

  const bookingId = Number(searchParams?.bookingId ?? "");
  if (!bookingId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-brand-200">Укажите bookingId в ссылке.</p>
        <Link href="/dashboard/bookings" className="btn-primary mt-4 inline-flex !w-auto px-6">
          К поездкам
        </Link>
      </div>
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      review: true,
      assignedRoom: { include: { hotel: true } },
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } }
    }
  });

  if (!booking || booking.userId !== user.id) {
    redirect("/dashboard/bookings");
  }
  if (booking.review) {
    redirect("/dashboard/bookings?tab=history");
  }
  if (booking.status !== "COMPLETED" && booking.status !== "CONFIRMED") {
    redirect("/dashboard/bookings");
  }

  const hotel = bookingHotelOptional(booking);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard/bookings" className="text-sm text-brand-300 hover:underline">
        ← {m(locale, "tripsHub.title")}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">{m(locale, "guestDash.leaveReview")}</h1>
      {hotel ? <p className="mt-1 text-sm text-brand-200">{hotel.name}</p> : null}
      <div className="mt-6">
        <LeaveReviewForm
          bookingId={booking.id}
          locale={locale}
          labels={{
            title: m(locale, "guestDash.leaveReview"),
            commentPlaceholder: m(locale, "guestDash.reviewCommentPh"),
            imagePlaceholder: m(locale, "guestDash.reviewImagePh"),
            sending: m(locale, "guestDash.reviewSending"),
            submit: m(locale, "guestDash.reviewSubmit"),
            error: m(locale, "guestDash.reviewError")
          }}
        />
      </div>
    </div>
  );
}
