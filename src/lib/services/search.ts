import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db/safeDb";
import { scoreHotelByIntent } from "@/lib/services/searchIntent";

const CITY_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "Dushanbe", aliases: ["dushanbe", "душанбе"] },
  { canonical: "Khujand", aliases: ["khujand", "худжанд", "хуҷанд"] },
  { canonical: "Penjikent", aliases: ["penjikent", "пенджикент", "панҷакент"] },
  { canonical: "Badakhshan", aliases: ["badakhshan", "бадахшан", "khorog", "хорог", "хоруғ"] }
];

function normalizeCityFilter(city?: string) {
  const raw = city?.trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  const hit = CITY_ALIASES.find(
    (item) => item.canonical.toLowerCase() === lower || item.aliases.some((alias) => alias === lower || lower.includes(alias))
  );
  return hit?.canonical ?? raw;
}

function matchesQueryText(hotel: { name: string; city: string; description: string }, query: string) {
  const q = query.toLowerCase();
  const blob = `${hotel.name} ${hotel.city} ${hotel.description}`.toLowerCase();
  if (blob.includes(q)) return true;
  return CITY_ALIASES.some((item) => {
    const cityHit = item.canonical.toLowerCase() === hotel.city.toLowerCase() || item.aliases.includes(hotel.city.toLowerCase());
    return cityHit && item.aliases.some((alias) => q.includes(alias) || alias.includes(q));
  });
}

export type PropertyTypeFilter = "ANY" | "HOTEL" | "HOSTEL" | "GUEST_HOUSE" | "APARTMENT" | "ECO_HOUSE";

type SearchInput = {
  q?: string;
  city?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyTypeFilter;
  wifi?: boolean;
  breakfast?: boolean;
  parking?: boolean;
  ratingMin?: number;
  sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
};

export async function searchApprovedHotels(input: SearchInput) {
  return safeDbQuery("searchApprovedHotels", () => searchApprovedHotelsQuery(input), []);
}

async function searchApprovedHotelsQuery(input: SearchInput) {
  const amenitiesAnd: Prisma.RoomWhereInput[] = [];
  if (input.wifi) amenitiesAnd.push({ amenities: { contains: '"wifi"' } });
  if (input.breakfast) amenitiesAnd.push({ amenities: { contains: '"breakfast"' } });
  if (input.parking) amenitiesAnd.push({ amenities: { contains: '"parking"' } });

  const city = normalizeCityFilter(input.city);

  const where: Prisma.HotelWhereInput = {
    status: "APPROVED",
    city: city ? { contains: city, mode: "insensitive" } : undefined,
    propertyType: input.propertyType && input.propertyType !== "ANY" ? input.propertyType : undefined,
    rating: input.ratingMin != null ? { gte: input.ratingMin } : undefined,
    rooms: {
      some: {
        capacity: input.guests ? { gte: input.guests } : undefined,
        price: {
          gte: input.minPrice ?? undefined,
          lte: input.maxPrice ?? undefined
        },
        ...(amenitiesAnd.length ? { AND: amenitiesAnd } : {})
      }
    }
  };

  const orderBy: Prisma.HotelOrderByWithRelationInput[] =
    input.sortBy === "RATING_DESC"
      ? [{ rating: "desc" }, { createdAt: "desc" }]
      : [{ favorites: { _count: "desc" } }, { rating: "desc" }, { createdAt: "desc" }];

  const hotels = await prisma.hotel.findMany({
    where,
    include: {
      rooms: true
    },
    orderBy
  });

  if (input.q?.trim()) {
    const query = input.q.trim();
    const ranked = hotels
      .map((hotel) => {
        const minPrice = hotel.rooms.length ? Math.min(...hotel.rooms.map((r) => Number(r.price))) : 0;
        const score = scoreHotelByIntent({
          query,
          hotelName: hotel.name,
          city: hotel.city,
          rating: hotel.rating,
          minPrice,
          rooms: hotel.rooms.map((room) => ({ capacity: room.capacity, amenities: room.amenities }))
        });
        return { hotel, score, matched: matchesQueryText(hotel, query) || score > 0 };
      })
      .filter((item) => item.matched)
      .sort((a, b) => (a.score === b.score ? b.hotel.rating - a.hotel.rating : b.score - a.score));
    return ranked.map((item) => item.hotel);
  }

  if (input.sortBy === "PRICE_ASC") {
    hotels.sort((a, b) => {
      const aMin = a.rooms.length ? Math.min(...a.rooms.map((r) => Number(r.price))) : Number.POSITIVE_INFINITY;
      const bMin = b.rooms.length ? Math.min(...b.rooms.map((r) => Number(r.price))) : Number.POSITIVE_INFINITY;
      return aMin - bMin;
    });
  }

  return hotels;
}

