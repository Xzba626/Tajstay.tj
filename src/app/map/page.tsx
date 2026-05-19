import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db/safeDb";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false
});

export default async function MapPage() {
  const locale = getLocale();
  const hotels = await safeDbQuery(
    "map.hotels",
    () =>
      prisma.hotel.findMany({
        where: { status: "APPROVED" },
        include: { rooms: true }
      }),
    []
  );

  const mapHotels = hotels.map((hotel) => {
    const fromPrice = hotel.rooms.length ? Math.min(...hotel.rooms.map((r) => Number(r.price))) : null;
    return {
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      fromPrice
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">{m(locale, "search.mapMode")}</h1>
      <p className="text-sm text-slate-500">{m(locale, "admin.moderateHotels")}</p>
      {!mapHotels.length && (
        <div className="glass-panel rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-slate-300">
          {m(locale, "admin.emptyResults")}
          <p className="mt-2 text-sm text-slate-400">{m(locale, "admin.emptyResultsHint")}</p>
        </div>
      )}
      <MapClient hotels={mapHotels} labels={{ fromPrice: m(locale, "search.fromPrice"), details: m(locale, "search.details") }} />
    </div>
  );
}
