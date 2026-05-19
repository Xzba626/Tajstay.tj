import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db/safeDb";
import { scoreHotelByIntent } from "@/lib/services/searchIntent";
import { normalizePropertyType, type PropertyTypeFilter } from "@/lib/domain/propertyTypes";

export type { PropertyTypeFilter } from "@/lib/domain/propertyTypes";

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

  const hasRoomCriteria = Boolean(
    (input.guests != null && input.guests > 1) ||
      input.minPrice != null ||
      input.maxPrice != null ||
      amenitiesAnd.length
  );
  const priceFilter: Prisma.DecimalFilter | undefined =
    input.minPrice != null || input.maxPrice != null
      ? {
          gte: input.minPrice ?? undefined,
          lte: input.maxPrice ?? undefined
        }
      : undefined;
  const roomWhere: Prisma.RoomWhereInput = {
    availability: true,
    capacity: input.guests && input.guests > 1 ? { gte: input.guests } : undefined,
    price: priceFilter,
    ...(amenitiesAnd.length ? { AND: amenitiesAnd } : {})
  };
  const propertyType =
    input.propertyType && input.propertyType !== "ANY" ? normalizePropertyType(input.propertyType) : null;

  const where: Prisma.HotelWhereInput = {
    status: "APPROVED",
    city: input.city ? { contains: input.city, mode: "insensitive" } : undefined,
    propertyType: propertyType ?? undefined,
    rating: input.ratingMin != null ? { gte: input.ratingMin } : undefined,
    rooms: hasRoomCriteria ? { some: roomWhere } : undefined
  };

  const orderBy: Prisma.HotelOrderByWithRelationInput[] =
    input.sortBy === "RATING_DESC"
      ? [{ rating: "desc" }, { createdAt: "desc" }]
      : [{ favorites: { _count: "desc" } }, { rating: "desc" }, { createdAt: "desc" }];

  const hotels = await prisma.hotel.findMany({
    where,
    include: {
      rooms: { where: { availability: true } }
    },
    orderBy
  });

  if (input.q?.trim()) {
    hotels.sort((a, b) => {
      const aMin = a.rooms.length ? Math.min(...a.rooms.map((r) => Number(r.price))) : 0;
      const bMin = b.rooms.length ? Math.min(...b.rooms.map((r) => Number(r.price))) : 0;
      const aScore = scoreHotelByIntent({
        query: input.q,
        hotelName: a.name,
        city: a.city,
        rating: a.rating,
        minPrice: aMin,
        rooms: a.rooms.map((room) => ({ capacity: room.capacity, amenities: room.amenities }))
      });
      const bScore = scoreHotelByIntent({
        query: input.q,
        hotelName: b.name,
        city: b.city,
        rating: b.rating,
        minPrice: bMin,
        rooms: b.rooms.map((room) => ({ capacity: room.capacity, amenities: room.amenities }))
      });
      if (aScore === bScore) return b.rating - a.rating;
      return bScore - aScore;
    });
  } else if (input.sortBy === "PRICE_ASC") {
    hotels.sort((a, b) => {
      const aMin = a.rooms.length ? Math.min(...a.rooms.map((r) => Number(r.price))) : Number.POSITIVE_INFINITY;
      const bMin = b.rooms.length ? Math.min(...b.rooms.map((r) => Number(r.price))) : Number.POSITIVE_INFINITY;
      return aMin - bMin;
    });
  }

  return hotels;
}

