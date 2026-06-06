import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db/safeDb";
import { scoreHotelByIntent } from "@/lib/services/searchIntent";
import { citiesMatch } from "@/lib/geo/cities";
import { sortByDistance, type GeoCoords } from "@/lib/geo/distance";
import {
  ACTIVE_OFFLINE_BOOKING_STATUSES,
  INACTIVE_ONLINE_BOOKING_STATUSES
} from "@/lib/booking/availability";
import { BOOKING_SOURCE } from "@/lib/domain/booking";

export type PropertyTypeFilter = "ANY" | "HOTEL" | "HOSTEL" | "GUEST_HOUSE" | "APARTMENT" | "ECO_HOUSE";

type SearchInput = {
  q?: string;
  city?: string;
  /** Boost hotels in this city (IP geo) when no explicit city filter */
  nearbyCity?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyTypeFilter;
  wifi?: boolean;
  breakfast?: boolean;
  parking?: boolean;
  ratingMin?: number;
  sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
  checkIn?: string;
  checkOut?: string;
  /** Visitor GPS — sort by distance when set */
  origin?: GeoCoords;
};

function parseSearchDateOnly(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function roomAvailableForDatesFilter(checkIn: Date, checkOut: Date): Prisma.RoomWhereInput {
  return {
    bookings: {
      none: {
        AND: [
          { checkIn: { lt: checkOut } },
          { checkOut: { gt: checkIn } },
          {
            OR: [
              {
                source: BOOKING_SOURCE.PLATFORM,
                status: { notIn: [...INACTIVE_ONLINE_BOOKING_STATUSES] }
              },
              {
                source: BOOKING_SOURCE.OWNER_MANUAL,
                offlineStatus: { in: [...ACTIVE_OFFLINE_BOOKING_STATUSES] }
              }
            ]
          }
        ]
      }
    }
  };
}

export async function searchApprovedHotels(input: SearchInput) {
  return safeDbQuery("searchApprovedHotels", () => searchApprovedHotelsQuery(input), []);
}

async function searchApprovedHotelsQuery(input: SearchInput) {
  const amenitiesAnd: Prisma.RoomWhereInput[] = [];
  if (input.wifi) amenitiesAnd.push({ amenities: { contains: '"wifi"' } });
  if (input.breakfast) {
    amenitiesAnd.push({
      OR: [{ amenities: { contains: '"breakfast_included"' } }, { amenities: { contains: '"breakfast"' } }]
    });
  }
  if (input.parking) amenitiesAnd.push({ amenities: { contains: '"parking"' } });

  const checkIn = parseSearchDateOnly(input.checkIn);
  const checkOut = parseSearchDateOnly(input.checkOut);
  const hasDateRange = Boolean(checkIn && checkOut && checkOut.getTime() > checkIn.getTime());

  const roomMatch: Prisma.RoomWhereInput = {
    capacity: input.guests ? { gte: input.guests } : undefined,
    price: {
      gte: input.minPrice ?? undefined,
      lte: input.maxPrice ?? undefined
    },
    ...(amenitiesAnd.length ? { AND: amenitiesAnd } : {}),
    ...(hasDateRange ? roomAvailableForDatesFilter(checkIn!, checkOut!) : {})
  };

  const where: Prisma.HotelWhereInput = {
    status: "APPROVED",
    city: input.city ? { contains: input.city } : undefined,
    propertyType: input.propertyType && input.propertyType !== "ANY" ? input.propertyType : undefined,
    rating: input.ratingMin != null ? { gte: input.ratingMin } : undefined,
    rooms: {
      some: roomMatch
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

  if (input.nearbyCity?.trim() && !input.city?.trim() && !input.origin) {
    const near = input.nearbyCity.trim();
    hotels.sort((a, b) => {
      const aNear = citiesMatch(a.city, near) ? 0 : 1;
      const bNear = citiesMatch(b.city, near) ? 0 : 1;
      if (aNear !== bNear) return aNear - bNear;
      return b.rating - a.rating;
    });
  }

  if (input.origin) {
    return sortByDistance(
      hotels.map((h) => ({ ...h, lat: h.latitude, lng: h.longitude })),
      input.origin
    );
  }

  return hotels;
}

