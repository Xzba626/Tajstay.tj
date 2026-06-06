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

function conflictingBookingsWhere(checkIn: Date, checkOut: Date): Prisma.BookingWhereInput {
  return {
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
  };
}

function roomAvailableForDatesFilter(checkIn: Date, checkOut: Date): Prisma.RoomWhereInput {
  return {
    bookings: {
      none: conflictingBookingsWhere(checkIn, checkOut)
    }
  };
}

type RoomWithBookings = {
  capacity: number;
  price: Prisma.Decimal | number;
  amenities: string;
  bookings?: { id: number }[];
};

function roomMeetsSearchFilters(room: RoomWithBookings, input: SearchInput): boolean {
  if (input.guests && room.capacity < input.guests) return false;
  const price = Number(room.price);
  if (input.minPrice != null && price < input.minPrice) return false;
  if (input.maxPrice != null && price > input.maxPrice) return false;
  if (input.wifi && !room.amenities.includes('"wifi"')) return false;
  if (input.breakfast && !room.amenities.includes('"breakfast_included"') && !room.amenities.includes('"breakfast"')) {
    return false;
  }
  if (input.parking && !room.amenities.includes('"parking"')) return false;
  return true;
}

type HotelAvailabilityData = {
  rooms: RoomWithBookings[];
  roomTypes?: Array<{ rooms: RoomWithBookings[] }>;
};

function countAvailableRoomsForDates(hotel: HotelAvailabilityData, input: SearchInput): number {
  const typedRooms = hotel.roomTypes?.flatMap((rt) => rt.rooms) ?? [];
  const candidates = typedRooms.length > 0 ? typedRooms : hotel.rooms;
  return candidates.filter((room) => roomMeetsSearchFilters(room, input) && (room.bookings?.length ?? 0) === 0).length;
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
      rooms: hasDateRange
        ? {
            include: {
              bookings: {
                where: conflictingBookingsWhere(checkIn!, checkOut!),
                select: { id: true }
              }
            }
          }
        : true,
      ...(hasDateRange
        ? {
            roomTypes: {
              include: {
                rooms: {
                  include: {
                    bookings: {
                      where: conflictingBookingsWhere(checkIn!, checkOut!),
                      select: { id: true }
                    }
                  }
                }
              }
            }
          }
        : {})
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

  const withAvailability = hotels.map((hotel) => {
    const availableRoomsCount = hasDateRange
      ? countAvailableRoomsForDates(hotel as unknown as HotelAvailabilityData, input)
      : undefined;
    const { roomTypes: _roomTypes, rooms, ...rest } = hotel;
    return {
      ...rest,
      rooms: rooms.map((room) => {
        const { bookings: _bookings, ...roomRest } = room as (typeof room) & { bookings?: { id: number }[] };
        return roomRest;
      }),
      ...(availableRoomsCount != null ? { availableRoomsCount } : {})
    };
  });

  if (input.origin) {
    return sortByDistance(
      withAvailability.map((h) => ({ ...h, lat: h.latitude, lng: h.longitude })),
      input.origin
    );
  }

  return withAvailability;
}

