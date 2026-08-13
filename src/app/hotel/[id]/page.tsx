import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import ReviewReplyForm from "@/components/ReviewReplyForm";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getOwnerPaymentMethods } from "@/lib/owner-payment-methods";
import { Card } from "@/shared/ui";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import { AppImage } from "@/components/ui/AppImage";
import { HotelViewTracker } from "@/components/guest/HotelViewTracker";
import { getBookingGuestLabel } from "@/lib/domain/booking";
import { HotelRoomCategories } from "@/components/hotel/HotelRoomCategories";
import { groupHotelRooms, hotelPriceRange } from "@/lib/hotel/groupHotelRooms";

function buildAiReviewSummary(comments: string[]) {
  const topicKeywords: Record<string, string[]> = {
    чистоту: ["чист", "clean"],
    расположение: ["располож", "location", "центр"],
    персонал: ["персонал", "staff", "сервис"],
    комфорт: ["уют", "комфорт", "тихо"],
    цена: ["цена", "price", "деш", "дорого"]
  };
  const issueKeywords: Record<string, string[]> = {
    шумоизоляция: ["шум", "noise", "громко"],
    уборка: ["гряз", "dirty", "пыль"],
    обслуживание: ["долго", "wait", "медленно"],
    интернет: ["wifi", "wi-fi", "интернет"],
    цена: ["дорого", "expensive"]
  };

  const score = new Map<string, number>();
  const joined = comments.join(" ").toLowerCase();
  Object.entries(topicKeywords).forEach(([topic, keys]) => {
    const count = keys.reduce((acc, key) => acc + (joined.includes(key) ? 1 : 0), 0);
    if (count > 0) score.set(topic, count);
  });

  const top = Array.from(score.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
  const issueScore = new Map<string, number>();
  Object.entries(issueKeywords).forEach(([issue, keys]) => {
    const count = keys.reduce((acc, key) => acc + (joined.includes(key) ? 1 : 0), 0);
    if (count > 0) issueScore.set(issue, count);
  });
  const issues = Array.from(issueScore.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([issue]) => issue);

  return {
    positive: top.length
      ? `Чаще всего хвалят: ${top.join(", ")}.`
      : "Гости отмечают хорошее соотношение цены и качества.",
    negative: issues.length
      ? `Что улучшить: ${issues.join(", ")}.`
      : "Критичных повторяющихся замечаний в отзывах не найдено."
  };
}

const PROPERTY_TYPE_KEYS: Record<string, string> = {
  HOTEL: "search.propertyHotel",
  HOSTEL: "search.propertyHostel",
  GUEST_HOUSE: "search.propertyGuestHouse",
  APARTMENT: "search.propertyApartment",
  ECO_HOUSE: "search.propertyEcoHouse"
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = Number(params.id);
  if (!id) {
    return {
      title: "Отель — TajStay",
      description: "Подробная страница отеля на TajStay."
    };
  }
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    select: { name: true, city: true, description: true }
  });
  if (!hotel) {
    return {
      title: "Отель не найден — TajStay",
      description: "Запрошенный отель не найден."
    };
  }
  return {
    title: `${hotel.name}, ${hotel.city} — TajStay`,
    description: hotel.description?.slice(0, 160) || `Бронирование отеля ${hotel.name} в городе ${hotel.city} на TajStay.`
  };
}

function StarRow({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} из 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < filled ? "text-amber-300" : "text-brand-700"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function HotelDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { checkIn?: string; checkOut?: string };
}) {
  const locale = getLocale();
  const id = Number(params.id);
  if (!id) notFound();

  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);

  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      roomTypes: {
        include: {
          photos: { orderBy: { sortOrder: "asc" } },
          _count: { select: { rooms: { where: { availability: true, status: "ACTIVE" } } } }
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      },
      rooms: { include: { photos: { orderBy: { sortOrder: "asc" } }, roomType: true } }
    }
  });

  if (!hotel) notFound();

  const isFavorite =
    user?.role === "GUEST"
      ? Boolean(
          await prisma.favorite.findFirst({
            where: { userId: user.id, hotelId: hotel.id }
          })
        )
      : false;

  const reviews = await prisma.review.findMany({
    where: {
      OR: [{ booking: { room: { hotelId: hotel.id } } }, { booking: { roomType: { hotelId: hotel.id } } }]
    },
    include: { booking: { include: { user: true } } },
    orderBy: { createdAt: "desc" }
  });

  const canReply =
    user?.role === "ADMIN" || (user?.role === "OWNER" && hotel.ownerId === user.id);
  const acceptedPaymentMethods = await getOwnerPaymentMethods(hotel.ownerId);
  const similarHotels = await prisma.hotel.findMany({
    where: { city: hotel.city, status: "APPROVED", id: { not: hotel.id } },
    take: 3,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }]
  });
  const aiReviewSummary = buildAiReviewSummary(reviews.map((item) => item.comment));
  const showRating = hotel.rating > 0.05;

  const descriptionOk =
    hotel.description &&
    hotel.description.trim().length > 2 &&
    hotel.description.trim() !== "\\я";

  const roomGroups = groupHotelRooms({
    rooms: hotel.rooms,
    roomTypes: hotel.roomTypes,
    checkIn: searchParams?.checkIn,
    checkOut: searchParams?.checkOut,
    fallbackTitle: m(locale, "hotelPage.standardRoom")
  });
  const priceRange = hotelPriceRange(roomGroups);
  const galleryUrls = [
    hotel.coverImageUrl,
    ...hotel.photos.map((photo) => photo.url)
  ].filter((url, index, list): url is string => Boolean(url) && list.indexOf(url) === index);

  const propertyTypeKey = PROPERTY_TYPE_KEYS[hotel.propertyType];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <HotelViewTracker hotelId={hotel.id} name={hotel.name} city={hotel.city} />

      <section className="space-y-4" data-reveal>
        <div className="relative overflow-hidden rounded-2xl bg-brand-800" style={{ viewTransitionName: `hotel-hero-${hotel.id}` } as any}>
          {galleryUrls.length > 1 ? (
            <RoomPhotoCarousel urls={galleryUrls} title={hotel.name} variant="dark" />
          ) : (
            <div className="relative h-80">
              {hotel.coverImageUrl ? (
                <AppImage
                  src={hotel.coverImageUrl}
                  alt={hotel.name}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 1200px"
                  priority
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{hotel.name}</h1>
            <p className="text-sm text-brand-200">
              {hotel.city}
              {hotel.address ? `, ${hotel.address}` : ""}
            </p>
          </div>
          {user?.role === "GUEST" && (
            <form action="/api/favorites/toggle" method="post">
              <input type="hidden" name="hotelId" value={hotel.id} />
              <button
                className={
                  isFavorite
                    ? "rounded-xl border border-brand-600 px-3 py-2 text-sm font-medium text-brand-200 hover:bg-brand-800"
                    : "rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-400"
                }
              >
                {isFavorite ? m(locale, "userMenu.inFavorites") : m(locale, "userMenu.favorites")}
              </button>
            </form>
          )}
        </div>

        {descriptionOk ? <p className="text-sm text-brand-200">{hotel.description}</p> : null}

        {priceRange ? (
          <p className="text-lg font-semibold text-white">
            {priceRange.min === priceRange.max
              ? `${m(locale, "search.fromPrice")} ${priceRange.min} TJS`
              : `${priceRange.min}–${priceRange.max} TJS`}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-200">
          {propertyTypeKey ? <span>{m(locale, propertyTypeKey)}</span> : null}
          {showRating ? (
            <span className="inline-flex items-center gap-2">
              <StarRow rating={hotel.rating} />
              <span>{hotel.rating.toFixed(1)}</span>
              {reviews.length ? <span>({reviews.length})</span> : null}
            </span>
          ) : (
            <span className="premium-badge premium-badge--new inline-flex">{m(locale, "hotelPage.newListing")}</span>
          )}
        </div>
      </section>

      <section className="space-y-3" data-reveal>
        <h2 className="text-xl font-semibold text-white">{m(locale, "owner.rooms")}</h2>
        {roomGroups.length ? (
          <HotelRoomCategories locale={locale} groups={roomGroups} />
        ) : (
          <p className="text-sm text-brand-200">{m(locale, "admin.emptyResults")}</p>
        )}
      </section>

      {(acceptedPaymentMethods.length > 0) && (
        <section className="space-y-3" data-reveal>
          {acceptedPaymentMethods.length > 0 ? (
            <Card className="space-y-2 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-200">Accepted payment methods</div>
              <div className="flex flex-wrap gap-2">
                {acceptedPaymentMethods.map((method) => (
                  <span
                    key={method}
                    className="rounded-full border border-brand-700 bg-brand-800 px-3 py-1 text-xs font-semibold text-brand-200"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}
        </section>
      )}

      {similarHotels.length > 0 && (
        <section className="space-y-3" data-reveal>
          <h2 className="text-xl font-semibold text-white">Похожие варианты</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {similarHotels.map((item) => (
              <Card key={item.id} className="space-y-2 p-4">
                <h3 className="text-base font-semibold text-white">{item.name}</h3>
                <p className="text-sm text-brand-200">{item.city}</p>
                <p className="text-sm text-brand-200">Рейтинг: {item.rating.toFixed(1)}</p>
                <Link href={`/hotel/${item.id}`} className="text-sm font-semibold text-brand-200 hover:text-white">
                  Смотреть отель
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3" data-reveal>
        <h2 className="text-xl font-semibold text-white">{m(locale, "hotelPage.reviews")}</h2>
        {reviews.length ? (
          <>
            <Card className="space-y-2 p-5">
              <p className="text-sm text-brand-200">{aiReviewSummary.positive}</p>
              <p className="text-sm text-brand-200">{aiReviewSummary.negative}</p>
            </Card>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="glass-panel rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">
                        {m(locale, "profile.rating")}: {r.rating}/5
                      </div>
                      <div className="text-sm text-brand-200">{getBookingGuestLabel(r.booking)}</div>
                      <div className="mt-3 whitespace-pre-wrap text-sm text-brand-200">{r.comment}</div>
                      {r.imageUrl && (
                        <div className="mt-3">
                          <AppImage
                            src={r.imageUrl}
                            alt="review"
                            width={320}
                            height={192}
                            className="max-h-48 w-auto rounded-xl border border-brand-700 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {r.reply && (
                    <div className="mt-4 rounded-xl border border-brand-700 bg-brand-800 p-4 text-sm">
                      <div className="font-semibold text-white">{m(locale, "guestDash.ownerReply")}</div>
                      <div className="mt-1 whitespace-pre-wrap text-brand-200">{r.reply}</div>
                    </div>
                  )}

                  {canReply && !r.reply && (
                    <ReviewReplyForm
                      reviewId={r.id}
                      labels={{
                        title: m(locale, "guestDash.ownerReply"),
                        placeholder: "Write a reply...",
                        saving: "Saving...",
                        submit: m(locale, "admin.save"),
                        error: m(locale, "auth.errorGeneric")
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-brand-200">{m(locale, "profile.reviewsEmpty")}</p>
        )}
      </section>
    </div>
  );
}
