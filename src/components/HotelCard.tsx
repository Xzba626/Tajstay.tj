import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { Hotel, Room } from "@prisma/client";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { m } from "@/lib/i18n/messages";
import { HotelCardShell } from "@/components/HotelCardShell";

type Props = {
  hotel: Hotel & { rooms: Room[]; availableRoomsCount?: number };
  locale?: Locale;
  variant?: "accent" | "list";
  hrefQuery?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  };
};

function buildQueryString(q?: Props["hrefQuery"]) {
  if (!q) return "";
  const params = new URLSearchParams();
  if (q.checkIn) params.set("checkIn", q.checkIn);
  if (q.checkOut) params.set("checkOut", q.checkOut);
  if (q.guests) params.set("guests", String(q.guests));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function HotelCard({ hotel, locale = "ru", hrefQuery }: Props) {
  const minPrice = hotel.rooms.length ? Math.min(...hotel.rooms.map((r) => Number(r.price))) : 0;
  const query = buildQueryString(hrefQuery);
  const availableRooms = hotel.rooms.filter((r) => r.availability).length;
  const scarcityCount = hotel.availableRoomsCount;
  const showScarcity = scarcityCount != null && scarcityCount > 0 && scarcityCount < 3;
  const cityMap: Record<string, string> = {
    dushanbe: m(locale, "cities.dushanbe"),
    khujand: m(locale, "cities.khujand"),
    penjikent: m(locale, "cities.penjikent"),
    badakhshan: m(locale, "cities.badakhshan")
  };
  const cityLabel = cityMap[hotel.city.toLowerCase()] ?? hotel.city;
  const showRating = hotel.rating > 0.05;
  const href = `/hotel/${hotel.id}${query}`;

  return (
    <HotelCardShell className="hotel-card-pamir">
      <Link href={href} className="block">
        <div className="hotel-card-pamir__media">
          {hotel.coverImageUrl ? (
            <AppImage
              src={hotel.coverImageUrl}
              alt={hotel.name}
              fill
              className="object-cover"
              sizes="(max-width:640px) 85vw, 320px"
            />
          ) : (
            <div className="hotel-card-pamir__placeholder" aria-hidden />
          )}
          <div className="hotel-card-pamir__badges">
            <span className="hotel-card-pamir__city">{cityLabel}</span>
            {showRating ? (
              <span className="hotel-card-pamir__rating">
                <span aria-hidden>★</span> {hotel.rating.toFixed(1)}
              </span>
            ) : (
              <span className="hotel-card-pamir__rating hotel-card-pamir__rating--new">
                {m(locale, "hotelCard.newListing")}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="hotel-card-pamir__body">
        <Link href={href} className="hotel-card-pamir__name">
          {hotel.name}
        </Link>

        {hotel.description ? (
          <p className="hotel-card-pamir__desc">{hotel.description}</p>
        ) : null}

        {showScarcity ? (
          <p className="hotel-card-pamir__scarce">
            {m(locale, "search.roomsLeft", { count: String(scarcityCount) })}
          </p>
        ) : scarcityCount == null && availableRooms > 0 ? (
          <p className="hotel-card-pamir__avail">
            {availableRooms} {availableRooms === 1 ? "номер" : "номера"} свободно
          </p>
        ) : null}

        <div className="hotel-card-pamir__footer">
          <div>
            <span className="hotel-card-pamir__from">{t(locale, "fromPrice")}</span>
            <div className="hotel-card-pamir__price">
              <span className="hotel-card-pamir__amount">{minPrice.toLocaleString()}</span>
              <span className="hotel-card-pamir__currency">TJS</span>
            </div>
          </div>
          <Link href={href} className="taj-btn taj-btn--primary taj-btn--sm" aria-label={t(locale, "details")}>
            {t(locale, "details")}
          </Link>
        </div>
      </div>
    </HotelCardShell>
  );
}
