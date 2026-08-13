import { parseAmenitiesJson } from "@/lib/pms/amenities";

export type HotelRoomInput = {
  id: number;
  title: string;
  price: unknown;
  capacity: number;
  amenities: string;
  availability: boolean;
  status?: string | null;
  photos: { url: string }[];
  roomTypeId: number | null;
};

export type HotelRoomTypeInput = {
  id: number;
  name: string;
  description: string | null;
  basePrice: unknown;
  maxGuests: number;
  bedsCount: number;
  mealPlan: string;
  amenities: string;
  photos: { url: string }[];
  _count?: { rooms: number };
};

export type RoomVariantView = {
  id: number;
  title: string;
  price: number;
  capacity: number;
  amenities: string[];
  photos: string[];
  bookHref: string;
};

export type RoomCategoryView = {
  key: string;
  name: string;
  description: string | null;
  photos: string[];
  identical: boolean;
  count: number;
  minPrice: number;
  maxPrice: number;
  capacity: number | null;
  amenities: string[];
  bookHref: string | null;
  variants: RoomVariantView[];
};

function isBookable(room: HotelRoomInput) {
  return room.availability && (!room.status || room.status === "ACTIVE");
}

function fingerprint(room: HotelRoomInput) {
  const amenities = parseAmenitiesJson(room.amenities)
    .map((item) => item.toLowerCase())
    .sort()
    .join(",");
  return [room.title.trim().toLowerCase(), Number(room.price), room.capacity, amenities].join("|");
}

function bookingHref(opts: { roomId?: number; roomTypeId?: number; checkIn?: string; checkOut?: string }) {
  const params = new URLSearchParams();
  if (opts.roomId) params.set("roomId", String(opts.roomId));
  if (opts.roomTypeId) params.set("roomTypeId", String(opts.roomTypeId));
  if (opts.checkIn) params.set("checkIn", opts.checkIn);
  if (opts.checkOut) params.set("checkOut", opts.checkOut);
  return `/booking?${params.toString()}`;
}

function toVariant(room: HotelRoomInput, checkIn?: string, checkOut?: string): RoomVariantView {
  return {
    id: room.id,
    title: room.title,
    price: Number(room.price),
    capacity: room.capacity,
    amenities: parseAmenitiesJson(room.amenities),
    photos: room.photos.map((photo) => photo.url),
    bookHref: bookingHref({ roomId: room.id, checkIn, checkOut })
  };
}

function groupFromRooms(
  name: string,
  description: string | null,
  rooms: HotelRoomInput[],
  extraPhotos: string[],
  bookAsTypeId: number | undefined,
  checkIn?: string,
  checkOut?: string
): RoomCategoryView | null {
  if (!rooms.length && !bookAsTypeId) return null;
  const fps = rooms.map(fingerprint);
  const identical = rooms.length <= 1 || fps.every((item) => item === fps[0]);
  const prices = rooms.length ? rooms.map((room) => Number(room.price)) : [];
  const sample = rooms[0];
  const photos =
    extraPhotos.length > 0 ? extraPhotos : rooms.flatMap((room) => room.photos.map((photo) => photo.url));
  const first = rooms[0];

  return {
    key: bookAsTypeId ? `type-${bookAsTypeId}` : `title-${name}`,
    name,
    description,
    photos,
    identical,
    count: rooms.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    capacity: sample?.capacity ?? null,
    amenities: sample ? parseAmenitiesJson(sample.amenities) : [],
    bookHref:
      identical && first
        ? bookAsTypeId
          ? bookingHref({ roomTypeId: bookAsTypeId, checkIn, checkOut })
          : bookingHref({ roomId: first.id, checkIn, checkOut })
        : null,
    variants: identical ? [] : rooms.map((room) => toVariant(room, checkIn, checkOut))
  };
}

export function groupHotelRooms(input: {
  rooms: HotelRoomInput[];
  roomTypes: HotelRoomTypeInput[];
  checkIn?: string;
  checkOut?: string;
  fallbackTitle: string;
}): RoomCategoryView[] {
  const groups: RoomCategoryView[] = [];
  const used = new Set<number>();

  for (const roomType of input.roomTypes) {
    const members = input.rooms.filter((room) => room.roomTypeId === roomType.id && isBookable(room));
    members.forEach((room) => used.add(room.id));
    const group = groupFromRooms(
      roomType.name,
      roomType.description,
      members,
      roomType.photos.map((photo) => photo.url),
      roomType.id,
      input.checkIn,
      input.checkOut
    );
    if (group && (group.count > 0 || Number(roomType.basePrice) > 0)) {
      if (!group.count) {
        group.minPrice = Number(roomType.basePrice);
        group.maxPrice = Number(roomType.basePrice);
        group.capacity = roomType.maxGuests;
        group.amenities = parseAmenitiesJson(roomType.amenities);
        group.count = roomType._count?.rooms ?? 0;
        group.bookHref = bookingHref({
          roomTypeId: roomType.id,
          checkIn: input.checkIn,
          checkOut: input.checkOut
        });
        group.identical = true;
      }
      groups.push(group);
    }
  }

  const rest = input.rooms.filter((room) => !used.has(room.id) && isBookable(room));
  const byTitle = new Map<string, HotelRoomInput[]>();
  for (const room of rest) {
    const title = room.title.trim().length >= 4 ? room.title.trim() : input.fallbackTitle;
    const list = byTitle.get(title) ?? [];
    list.push(room);
    byTitle.set(title, list);
  }

  for (const [title, members] of byTitle) {
    const group = groupFromRooms(title, null, members, [], undefined, input.checkIn, input.checkOut);
    if (group) groups.push(group);
  }

  return groups;
}

export function hotelPriceRange(groups: RoomCategoryView[]) {
  const prices = groups.flatMap((group) => [group.minPrice, group.maxPrice]).filter((price) => price > 0);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
