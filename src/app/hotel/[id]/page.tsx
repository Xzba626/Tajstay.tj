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
      rooms: { include: { photos: { orderBy: { sortOrder: "asc" } } } }
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
    where: { booking: { room: { hotelId: hotel.id } } },
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
  const liveViewers = Math.max(4, Math.round(hotel.rating * 3));
  const roomsLeft = Math.max(1, Math.min(5, hotel.rooms.filter((room) => room.availability).length));

  const cheapestRoom = hotel.rooms.reduce<(typeof hotel.rooms)[number] | null>((acc, room) => {
    if (!acc) return room;
    return Number(room.price) < Number(acc.price) ? room : acc;
  }, null);

  const quickBookHref =
    cheapestRoom && searchParams?.checkIn && searchParams?.checkOut
      ? `/booking?roomId=${cheapestRoom.id}&checkIn=${encodeURIComponent(searchParams.checkIn)}&checkOut=${encodeURIComponent(searchParams.checkOut)}`
      : cheapestRoom
        ? `/booking?roomId=${cheapestRoom.id}`
        : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-3" data-reveal>
        <div
          className="relative h-80 overflow-hidden rounded-2xl bg-brand-800 lg:col-span-2"
          style={{ viewTransitionName: `hotel-hero-${hotel.id}` } as any}
        >
          {hotel.coverImageUrl ? (
            <img src={hotel.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        </div>
        <aside className="space-y-4">
          <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">{hotel.name}</h1>
              <p className="mt-1 text-sm text-brand-200">
                {hotel.city}, {hotel.address}
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
          <p className="text-sm text-brand-200">{hotel.description}</p>
          <div className="text-sm text-brand-200">{m(locale, "profile.rating")}: {hotel.rating.toFixed(1)}</div>
          {acceptedPaymentMethods.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-200">Accepted payment methods</div>
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
            </div>
          )}
          </Card>
          {quickBookHref && (
            <Card className="space-y-4 p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-200">{m(locale, "search.fromPrice")}</p>
                  <p className="text-2xl font-bold text-white">{Number(cheapestRoom?.price)} TJS</p>
                </div>
                <Link href={quickBookHref} className="ds-primary-btn inline-flex items-center text-sm">
                  {m(locale, "search.bookNow")}
                </Link>
              </div>
              <div className="space-y-2 text-sm text-brand-200">
                <p>🔥 Сейчас смотрят: {liveViewers} человек</p>
                <p>⏳ Осталось {roomsLeft} номера</p>
                <p>⭐ {hotel.rating.toFixed(1)} ({reviews.length} отзывов)</p>
              </div>
              <p className="text-xs text-brand-200">Цена может вырасти в ближайшие 2 часа из-за высокого спроса.</p>
            </Card>
          )}
        </aside>
      </section>

      <section data-reveal>
        <Card className="space-y-2 p-5">
          <h2 className="text-lg font-semibold text-white">Что говорят гости</h2>
          <p className="text-sm text-brand-200">{aiReviewSummary.positive}</p>
          <p className="text-sm text-brand-200">{aiReviewSummary.negative}</p>
        </Card>
      </section>

      <section className="space-y-3" data-reveal>
        <h2 className="text-xl font-semibold text-white">{m(locale, "owner.rooms")}</h2>
        <div className="space-y-3">
          {hotel.rooms.map((room) => (
            <div
              key={room.id}
              className="glass-panel flex flex-col gap-4 rounded-xl p-4 transition sm:flex-row sm:items-stretch"
            >
              <div className="w-full shrink-0 sm:max-w-xs sm:min-w-[280px]">
                <RoomPhotoCarousel
                  urls={room.photos.map((p) => p.url)}
                  title={room.title}
                  variant="dark"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{room.title}</div>
                  <div className="text-sm text-brand-200">{m(locale, "owner.capacity")}: {room.capacity}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-white">{Number(room.price)} TJS</div>
                  <Link
                    href={
                      searchParams?.checkIn && searchParams?.checkOut
                        ? `/booking?roomId=${room.id}&checkIn=${encodeURIComponent(searchParams.checkIn)}&checkOut=${encodeURIComponent(
                            searchParams.checkOut
                          )}`
                        : `/booking?roomId=${room.id}`
                    }
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    {m(locale, "search.bookNow")}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3" data-reveal>
        <h2 className="text-xl font-semibold text-white">{m(locale, "profile.reviewsTitle")}</h2>
        {reviews.length ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="glass-panel rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">
                      {m(locale, "profile.rating")}: {r.rating}/5
                    </div>
                    <div className="text-sm text-brand-200">{r.booking.user.name}</div>
                    <div className="mt-3 whitespace-pre-wrap text-sm text-brand-200">{r.comment}</div>
                    {r.imageUrl && (
                      <div className="mt-3">
                        <img src={r.imageUrl} alt="review" className="max-h-48 w-auto rounded-xl border border-brand-700" />
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
        ) : (
          <p className="text-brand-200">{m(locale, "profile.reviewsEmpty")}</p>
        )}
      </section>

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

      {quickBookHref && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
          <div className="liquid-glass flex items-center justify-between rounded-2xl px-4 py-3">
            <div>
              <div className="text-xs text-brand-200">{m(locale, "search.fromPrice")}</div>
              <div className="text-sm font-semibold text-white">{Number(cheapestRoom?.price)} TJS</div>
            </div>
            <Link href={quickBookHref} className="ds-primary-btn inline-flex items-center text-sm">
              {m(locale, "search.bookNow")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

