import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getHotelPaymentMethods } from "@/lib/hotels/paymentMethods";
import { Card } from "@/shared/ui";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import { AppImage } from "@/components/ui/AppImage";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { isBrandAssetUrl } from "@/lib/brand";
import { HotelViewTracker } from "@/components/guest/HotelViewTracker";
import { HotelRoomCategories } from "@/components/hotel/HotelRoomCategories";
import { groupHotelRooms, hotelPriceRange } from "@/lib/hotel/groupHotelRooms";
import { getHotelDateAvailability } from "@/lib/pms/inventory";
import { HotelDateChange } from "@/components/hotel/HotelDateChange";
import { ReviewCard } from "@/components/hotel/ReviewCard";
import { getHotelReviewsForDisplay } from "@/lib/hotel/getHotelReviews";
import { BackNav } from "@/components/hotel/BackNav";

const REVIEWS_PREVIEW_COUNT = 4;

function buildSearchFallbackHref(
  city: string,
  searchParams?: { checkIn?: string; checkOut?: string; guests?: string }
): string {
  const params = new URLSearchParams({ city });
  if (searchParams?.checkIn) params.set("checkIn", searchParams.checkIn);
  if (searchParams?.checkOut) params.set("checkOut", searchParams.checkOut);
  if (searchParams?.guests) params.set("guests", searchParams.guests);
  return `/search?${params.toString()}`;
}

function parseDateOnly(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, mo, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
}

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
  searchParams?: { checkIn?: string; checkOut?: string; guests?: string };
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
  // A PENDING/REJECTED hotel isn't public inventory yet - only its own owner (previewing their
  // own submission) or an Admin (reviewing it) may view it here. Everyone else gets the same 404
  // as a hotel that doesn't exist at all - never leak that a non-public hotel id is real.
  if (hotel.status !== "APPROVED" && user?.role !== "ADMIN" && user?.id !== hotel.ownerId) {
    notFound();
  }

  const isFavorite =
    user?.role === "GUEST"
      ? Boolean(
          await prisma.favorite.findFirst({
            where: { userId: user.id, hotelId: hotel.id }
          })
        )
      : false;

  const reviews = await getHotelReviewsForDisplay(hotel.id);

  const canReply =
    user?.role === "ADMIN" || (user?.role === "OWNER" && hotel.ownerId === user.id);
  // Public page - only the method label is shown here, never the requisites (card/account number).
  // Full requisites are only shown to the guest in their own booking chat payment step.
  const acceptedPaymentMethods = (await getHotelPaymentMethods(hotel.id)).map((m) => m.displayLabel);
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

  const parsedCheckIn = parseDateOnly(searchParams?.checkIn);
  const parsedCheckOut = parseDateOnly(searchParams?.checkOut);
  const datesAreValid = Boolean(parsedCheckIn && parsedCheckOut && parsedCheckOut.getTime() > parsedCheckIn.getTime());
  const dateAvailability =
    datesAreValid && parsedCheckIn && parsedCheckOut
      ? await getHotelDateAvailability(hotel.id, parsedCheckIn, parsedCheckOut)
      : null;

  const roomGroups = groupHotelRooms({
    rooms: hotel.rooms,
    roomTypes: hotel.roomTypes,
    checkIn: searchParams?.checkIn,
    checkOut: searchParams?.checkOut,
    fallbackTitle: m(locale, "hotelPage.standardRoom"),
    unavailableRoomTypeIds: dateAvailability?.unavailableRoomTypeIds,
    unavailableRoomIds: dateAvailability?.unavailableRoomIds
  });
  const hotelFullySoldOut = Boolean(dateAvailability && !dateAvailability.hasAnyAvailability);
  const priceRange = hotelPriceRange(roomGroups);
  const galleryUrls = [
    hotel.coverImageUrl,
    ...hotel.photos.map((photo) => photo.url)
  ].filter(
    (url, index, list): url is string =>
      Boolean(url) && !isBrandAssetUrl(url) && list.indexOf(url) === index
  );
  const heroCoverUrl = hotel.coverImageUrl && !isBrandAssetUrl(hotel.coverImageUrl) ? hotel.coverImageUrl : null;

  const propertyTypeKey = PROPERTY_TYPE_KEYS[hotel.propertyType];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <HotelViewTracker hotelId={hotel.id} name={hotel.name} city={hotel.city} />
      <BackNav locale={locale} fallbackHref={buildSearchFallbackHref(hotel.city, searchParams)} />

      <section className="space-y-4" data-reveal>
        <div className="relative overflow-hidden rounded-2xl bg-brand-800" style={{ viewTransitionName: `hotel-hero-${hotel.id}` } as any}>
          {galleryUrls.length > 1 ? (
            <RoomPhotoCarousel urls={galleryUrls} title={hotel.name} variant="dark" />
          ) : (
            <div className="relative h-80">
              {heroCoverUrl ? (
                <AppImage
                  src={heroCoverUrl}
                  alt={hotel.name}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 1200px"
                  priority
                />
              ) : (
                <PhotoPlaceholder locale={locale} variant="hotel" className="absolute inset-0" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--taj-color-text)]">{hotel.name}</h1>
            <p className="text-sm text-[var(--taj-color-text-secondary)]">
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
                    ? "rounded-xl border border-brand-600 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                    : "rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-400"
                }
              >
                {isFavorite ? m(locale, "userMenu.inFavorites") : m(locale, "userMenu.favorites")}
              </button>
            </form>
          )}
        </div>

        {descriptionOk ? <p className="text-sm text-[var(--taj-color-text-secondary)]">{hotel.description}</p> : null}

        {priceRange ? (
          <p className="text-lg font-semibold text-[var(--taj-color-text)]">
            {priceRange.min === priceRange.max
              ? `${m(locale, "search.fromPrice")} ${priceRange.min} TJS`
              : `${priceRange.min}–${priceRange.max} TJS`}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--taj-color-text-secondary)]">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--taj-color-text)]">{m(locale, "owner.rooms")}</h2>
          {datesAreValid && !hotelFullySoldOut ? (
            <HotelDateChange
              locale={locale}
              hotelId={hotel.id}
              checkIn={searchParams?.checkIn}
              checkOut={searchParams?.checkOut}
            />
          ) : null}
        </div>
        {hotelFullySoldOut ? (
          <div className="glass-panel space-y-3 rounded-xl p-5">
            <p className="text-sm text-[var(--taj-color-text)]">{m(locale, "hotelPage.hotelFullySoldOut")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <HotelDateChange
                locale={locale}
                hotelId={hotel.id}
                checkIn={searchParams?.checkIn}
                checkOut={searchParams?.checkOut}
              />
              <Link href="/search" className="text-sm font-medium text-brand-700 underline">
                {m(locale, "hotelPage.backToSearch")}
              </Link>
            </div>
          </div>
        ) : roomGroups.length ? (
          <HotelRoomCategories locale={locale} groups={roomGroups} />
        ) : (
          <p className="text-sm text-[var(--taj-color-text-secondary)]">{m(locale, "admin.emptyResults")}</p>
        )}
      </section>

      {(acceptedPaymentMethods.length > 0) && (
        <section className="space-y-3" data-reveal>
          {acceptedPaymentMethods.length > 0 ? (
            <Card className="space-y-2 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--taj-color-text-secondary)]">Accepted payment methods</div>
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
          <h2 className="text-xl font-semibold text-[var(--taj-color-text)]">Похожие варианты</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {similarHotels.map((item) => (
              <Card key={item.id} className="space-y-2 p-4">
                <h3 className="text-base font-semibold text-[var(--taj-color-text)]">{item.name}</h3>
                <p className="text-sm text-[var(--taj-color-text-secondary)]">{item.city}</p>
                <p className="text-sm text-[var(--taj-color-text-secondary)]">Рейтинг: {item.rating.toFixed(1)}</p>
                <Link href={`/hotel/${item.id}`} className="text-sm font-semibold text-brand-600 hover:text-brand-800">
                  Смотреть отель
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3" data-reveal>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--taj-color-text)]">{m(locale, "hotelPage.reviews")}</h2>
          {reviews.length > REVIEWS_PREVIEW_COUNT ? (
            <Link href={`/hotel/${hotel.id}/reviews`} className="text-sm font-medium text-brand-700 underline">
              {m(locale, "hotelPage.allReviews")}
            </Link>
          ) : null}
        </div>
        {reviews.length ? (
          <>
            <Card className="space-y-2 p-5">
              <p className="text-sm text-[var(--taj-color-text-secondary)]">{aiReviewSummary.positive}</p>
              <p className="text-sm text-[var(--taj-color-text-secondary)]">{aiReviewSummary.negative}</p>
            </Card>
            <div className="space-y-3">
              {reviews.slice(0, REVIEWS_PREVIEW_COUNT).map((r) => (
                <ReviewCard key={r.id} locale={locale} review={r} canReply={canReply} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-[var(--taj-color-text-secondary)]">{m(locale, "hotelPage.noReviewsYet")}</p>
        )}
      </section>
    </div>
  );
}
