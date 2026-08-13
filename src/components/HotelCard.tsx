import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { Hotel, Room } from "@prisma/client";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { m } from "@/lib/i18n/messages";

type Props = {
  hotel: Hotel & { rooms: Room[] };
  locale?: Locale;
  variant?: "accent" | "list" | "compact";
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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
        <span className="flex items-center gap-0.5" aria-label={`${rating} из 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs ${i < full ? "text-[var(--brand-star)]" : i === full && half ? "text-[var(--brand-star)]/70" : "text-brand-700"}`}>
          ★
        </span>
      ))}
    </span>
  );
}

const AMENITY_ICONS: Record<string, string> = {
  wifi: "📶",
  parking: "🅿️",
  pool: "🏊",
  gym: "💪",
  spa: "🧖",
  restaurant: "🍽️",
  bar: "🍸",
  breakfast: "☕",
};

export function HotelCard({ hotel, locale = "ru", variant = "accent", hrefQuery }: Props) {
  const minPrice = hotel.rooms.length ? Math.min(...hotel.rooms.map((r) => Number(r.price))) : 0;
  const query = buildQueryString(hrefQuery);
  const availableRooms = hotel.rooms.filter((r) => r.availability).length;
  const cityMap: Record<string, string> = {
    dushanbe: m(locale, "cities.dushanbe"),
    khujand: m(locale, "cities.khujand"),
    penjikent: m(locale, "cities.penjikent"),
    badakhshan: m(locale, "cities.badakhshan")
  };
  const cityLabel = cityMap[hotel.city.toLowerCase()] ?? hotel.city;
  const showRating = hotel.rating > 0.05;

  if (variant === "compact") {
    return (
      <article className="hotel-card-premium hotel-card-premium--compact group">
        <Link href={`/hotel/${hotel.id}${query}`} className="block">
          <div className="hotel-img-wrap relative w-full">
            {hotel.coverImageUrl ? (
              <AppImage src={hotel.coverImageUrl} alt={hotel.name} fill className="object-cover" sizes="(max-width:768px) 50vw, 220px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
                <div className="text-2xl opacity-20">🏨</div>
              </div>
            )}
            <div className="hotel-img-overlay" />
            {showRating ? (
              <div className="absolute top-1.5 right-1.5 z-10">
                <div className="rating-badge !px-1.5 !py-0.5 !text-[10px]">
                  <span>★</span>
                  <span>{hotel.rating.toFixed(1)}</span>
                </div>
              </div>
            ) : null}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-2 pb-1.5">
              <h3 className="line-clamp-1 text-[13px] font-bold leading-tight text-white drop-shadow-lg">{hotel.name}</h3>
            </div>
          </div>
        </Link>
        <div className="relative z-[1] px-2 py-1.5">
          {availableRooms > 0 ? (
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              <span className="truncate text-[10px] font-medium text-brand-100">
                {availableRooms} {availableRooms === 1 ? "номер" : "номера"}
              </span>
            </div>
          ) : null}
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-extrabold tabular-nums tracking-tight text-[var(--taj-color-text)]">
              {minPrice.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-[var(--taj-color-text-secondary)]">TJS</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="hotel-card-premium group" data-reveal>
      {/* Image */}
      <Link href={`/hotel/${hotel.id}${query}`} className="block">
        <div className="hotel-img-wrap relative w-full">
          {hotel.coverImageUrl ? (
            <AppImage src={hotel.coverImageUrl} alt={hotel.name} fill className="object-cover" sizes="(max-width:640px) 100vw, 400px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
              <div className="text-5xl opacity-20">🏨</div>
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
                }}
              />
            </div>
          )}

          {/* Overlay gradient */}
          <div className="hotel-img-overlay" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 z-10">
            <span className="city-tag">
              <span>📍</span> {cityLabel.toUpperCase()}
            </span>
          </div>

          {/* Rating top-right */}
          <div className="absolute top-3 right-3 z-10">
            {showRating ? (
              <div className="rating-badge">
                <span>★</span>
                <span>{hotel.rating.toFixed(1)}</span>
              </div>
            ) : (
              <span className="city-tag">{m(locale, "hotelCard.newListing")}</span>
            )}
          </div>

          {/* Bottom of image — hotel name overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-3">
            <h3 className="text-base font-bold text-white leading-tight drop-shadow-lg line-clamp-1">
              {hotel.name}
            </h3>
            {showRating ? (
              <div className="mt-1 flex items-center justify-between text-xs text-white/90">
                <StarRating rating={hotel.rating} />
                <span className="inline-flex items-center gap-1">
                  <span className="text-amber-300">★</span>
                  <span className="font-semibold">{hotel.rating.toFixed(1)}</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Card body */}
      <div className="relative z-[1] p-3 sm:p-4">
        {/* Description (hidden on mobile for premium compactness) */}
        <p className="hidden sm:block min-h-[2.5rem] line-clamp-2 text-sm leading-relaxed text-brand-200">
          {hotel.description || "Комфортное жильё в самом сердце города"}
        </p>

        {/* Availability indicator */}
        {availableRooms > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            <span className="text-xs font-medium text-brand-100">
              {availableRooms} {availableRooms === 1 ? "номер" : "номера"} свободно
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--taj-color-border)] pt-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--taj-color-text-muted)]">{t(locale, "fromPrice")}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tabular-nums tracking-tight text-[var(--taj-color-text)] sm:text-2xl">
                {minPrice.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-[var(--taj-color-text-secondary)]">TJS</span>
            </div>
          </div>

          <Link
            href={`/hotel/${hotel.id}${query}`}
            aria-label={t(locale, "details")}
            className="taj-btn taj-btn--secondary taj-btn--icon shrink-0 !min-h-[2.75rem] !min-w-[2.75rem] !p-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
