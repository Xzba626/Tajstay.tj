import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getHotelReviewsForDisplay } from "@/lib/hotel/getHotelReviews";
import { ReviewCard } from "@/components/hotel/ReviewCard";
import { BackNav } from "@/components/hotel/BackNav";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `${m(getLocale(), "hotelPage.allReviews")} — TajStay` };
}

export default async function HotelAllReviewsPage({ params }: { params: { id: string } }) {
  const locale = getLocale();
  const id = Number(params.id);
  if (!id) notFound();

  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);

  const hotel = await prisma.hotel.findUnique({ where: { id }, select: { id: true, name: true, ownerId: true, status: true } });
  if (!hotel) notFound();
  if (hotel.status !== "APPROVED" && user?.role !== "ADMIN" && user?.id !== hotel.ownerId) {
    notFound();
  }

  const canReply = user?.role === "ADMIN" || (user?.role === "OWNER" && hotel.ownerId === user.id);
  const reviews = await getHotelReviewsForDisplay(hotel.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackNav locale={locale} fallbackHref={`/hotel/${hotel.id}`} />
      <h1 className="text-xl font-semibold text-white">
        {m(locale, "hotelPage.allReviews")} — {hotel.name}
      </h1>
      {reviews.length ? (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} locale={locale} review={r} canReply={canReply} />
          ))}
        </div>
      ) : (
        <p className="text-brand-200">{m(locale, "hotelPage.noReviewsYet")}</p>
      )}
    </div>
  );
}
