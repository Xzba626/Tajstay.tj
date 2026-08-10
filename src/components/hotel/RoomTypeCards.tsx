import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import { parseAmenitiesJson } from "@/lib/pms/amenities";
import { getAmenityLabel } from "@/lib/pms/amenityLabels";

type RoomTypeRow = {
  id: number;
  name: string;
  description: string | null;
  basePrice: unknown;
  maxGuests: number;
  bedsCount: number;
  bedConfig: string;
  mealPlan: string;
  amenities: string;
  photos: { url: string }[];
  _count?: { rooms: number };
};

export function RoomTypeCards({
  locale,
  roomTypes,
  checkIn,
  checkOut
}: {
  locale: Locale;
  roomTypes: RoomTypeRow[];
  checkIn?: string;
  checkOut?: string;
}) {
  const qs =
    checkIn && checkOut
      ? `&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
      : "";

  return (
    <div className="space-y-3">
      {roomTypes.map((rt) => {
        const photos = rt.photos?.length ? rt.photos.map((p) => p.url) : [];
        const amenities = parseAmenitiesJson(rt.amenities).slice(0, 6);
        const roomsLeft = rt._count?.rooms ?? 0;
        return (
          <div
            key={rt.id}
            className="flex flex-col gap-4 rounded-xl border border-[var(--taj-line)] bg-[var(--taj-snow)] p-4 shadow-[var(--taj-shadow-sm)] transition sm:flex-row sm:items-stretch"
          >
            <div className="w-full shrink-0 sm:max-w-xs sm:min-w-[280px]">
              <RoomPhotoCarousel urls={photos} title={rt.name} variant="light" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <div>
                <div className="font-semibold text-[var(--taj-ink)]">{rt.name}</div>
                {rt.description ? (
                  <p className="mt-1 text-sm text-[var(--taj-ink-soft)]">{rt.description}</p>
                ) : null}
                <div className="mt-2 text-sm text-[var(--taj-ink-soft)]">
                  {m(locale, "owner.capacity")}: {rt.maxGuests} · {m(locale, "pms.beds")}: {rt.bedsCount}
                </div>
                {amenities.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {amenities.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-[var(--taj-line)] bg-[var(--taj-mist)] px-3 py-1.5 text-sm text-[var(--taj-ink-soft)]"
                      >
                        {getAmenityLabel(locale, a)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {roomsLeft > 0 ? (
                  <p className="mt-2 text-xs text-[var(--taj-lake)]">
                    {m(locale, "pms.roomsLeft", { count: String(roomsLeft) })}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold text-[var(--taj-ink)]">
                  {m(locale, "search.fromPrice")} {Number(rt.basePrice)} TJS
                </div>
                <Link
                  href={`/booking?roomTypeId=${rt.id}${qs}`}
                  className="taj-btn taj-btn--primary taj-btn--sm"
                >
                  {m(locale, "search.bookNow")}
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
