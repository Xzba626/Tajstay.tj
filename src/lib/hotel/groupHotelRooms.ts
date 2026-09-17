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
  photos: { url: string; kind?: string | null; sceneLabel?: string | null }[];
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
  /** Equirectangular 360 scenes (honest 360° — not mesh 3D). */
  panoScenes: { url: string; label: string }[];
  identical: boolean;
  count: number;
  minPrice: number;
  maxPrice: number;
  capacity: number | null;
  amenities: string[];
  bookHref: string | null;
  variants: RoomVariantView[];
  /** true only when real date-scoped availability was checked and came back at zero - never
   *  inferred, never shown when dates haven't been picked yet (see soldOut docs on groupHotelRooms). */
  soldOut: boolean;
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

function bookingHref(opts: { roomId?: number; roomTypeId?: number; checkIn?: string; checkOut?: string; guests?: string }) {
  const params = new URLSearchParams();
  if (opts.roomId) params.set("roomId", String(opts.roomId));
  if (opts.roomTypeId) params.set("roomTypeId", String(opts.roomTypeId));
  if (opts.checkIn) params.set("checkIn", opts.checkIn);
  if (opts.checkOut) params.set("checkOut", opts.checkOut);
  if (opts.guests) params.set("guests", opts.guests);
  return `/booking?${params.toString()}`;
}

function toVariant(room: HotelRoomInput, checkIn?: string, checkOut?: string, guests?: string): RoomVariantView {
  return {
    id: room.id,
    title: room.title,
    price: Number(room.price),
    capacity: room.capacity,
    amenities: parseAmenitiesJson(room.amenities),
    photos: room.photos.map((photo) => photo.url),
    bookHref: bookingHref({ roomId: room.id, checkIn, checkOut, guests })
  };
}

function groupFromRooms(
  name: string,
  description: string | null,
  rooms: HotelRoomInput[],
  extraPhotos: string[],
  bookAsTypeId: number | undefined,
  checkIn?: string,
  checkOut?: string,
  unavailableRoomIds?: Set<number>,
  guests?: string
): RoomCategoryView | null {
  if (!rooms.length && !bookAsTypeId) return null;
  const fps = rooms.map(fingerprint);
  const identical = rooms.length <= 1 || fps.every((item) => item === fps[0]);
  const prices = rooms.length ? rooms.map((room) => Number(room.price)) : [];
  const sample = rooms[0];
  const photos =
    extraPhotos.length > 0 ? extraPhotos : rooms.flatMap((room) => room.photos.map((photo) => photo.url));
  // When we know real date-scoped availability per physical room, prefer a free member as the
  // booking target and mark the whole group sold out only if every member is occupied - a
  // "category" of otherwise-identical rooms is only truly sold out when none of them are free.
  const freeMembers = unavailableRoomIds ? rooms.filter((room) => !unavailableRoomIds.has(room.id)) : rooms;
  const soldOut = !bookAsTypeId && rooms.length > 0 && Boolean(unavailableRoomIds) && freeMembers.length === 0;
  const first = freeMembers[0] ?? rooms[0];

  return {
    key: bookAsTypeId ? `type-${bookAsTypeId}` : `title-${name}`,
    name,
    description,
    photos,
    panoScenes: [],
    identical,
    count: rooms.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    capacity: sample?.capacity ?? null,
    amenities: sample ? parseAmenitiesJson(sample.amenities) : [],
    bookHref:
      identical && first
        ? bookAsTypeId
          ? bookingHref({ roomTypeId: bookAsTypeId, checkIn, checkOut, guests })
          : bookingHref({ roomId: first.id, checkIn, checkOut, guests })
        : null,
    variants: identical ? [] : rooms.map((room) => toVariant(room, checkIn, checkOut, guests)),
    soldOut
  };
}

export function groupHotelRooms(input: {
  rooms: HotelRoomInput[];
  roomTypes: HotelRoomTypeInput[];
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  fallbackTitle: string;
  /** Real date-scoped availability, computed via getHotelDateAvailability - a RoomType present
   *  here has zero real availableCount for [checkIn, checkOut) (see src/lib/pms/inventory.ts).
   *  Omit when no dates have been picked yet - a category is never shown sold out before the
   *  guest has chosen dates to check it against. */
  unavailableRoomTypeIds?: Set<number>;
  /** Same, for standalone physical rooms with no RoomType (roomTypeId === null). */
  unavailableRoomIds?: Set<number>;
}): RoomCategoryView[] {
  const groups: RoomCategoryView[] = [];
  const used = new Set<number>();

  for (const roomType of input.roomTypes) {
    const members = input.rooms.filter((room) => room.roomTypeId === roomType.id && isBookable(room));
    members.forEach((room) => used.add(room.id));
    const typePhotos = roomType.photos ?? [];
    const gallery = typePhotos.filter((p) => (p.kind ?? "PHOTO") !== "PANO360").map((p) => p.url);
    const panos = typePhotos
      .filter((p) => p.kind === "PANO360")
      .map((p, i) => ({ url: p.url, label: p.sceneLabel?.trim() || `360-${i + 1}` }));
    const group = groupFromRooms(
      roomType.name,
      roomType.description,
      members,
      gallery.length ? gallery : typePhotos.map((p) => p.url),
      roomType.id,
      input.checkIn,
      input.checkOut,
      undefined,
      input.guests
    );
    if (group && (group.count > 0 || Number(roomType.basePrice) > 0)) {
      group.panoScenes = panos;
      if (!group.count) {
        // Zero physical inventory: show category commercially, but never offer a book CTA.
        // Inventory assert would reject anyway (availableCount = 0); UI must match.
        group.minPrice = Number(roomType.basePrice);
        group.maxPrice = Number(roomType.basePrice);
        group.capacity = roomType.maxGuests;
        group.amenities = parseAmenitiesJson(roomType.amenities);
        group.count = roomType._count?.rooms ?? 0;
        group.bookHref = null;
        group.soldOut = Boolean(input.checkIn && input.checkOut);
        group.identical = true;
      }
      // RoomType-level real availability (from getRoomTypeAvailability, the same invariant the
      // booking write path enforces) overrides any per-room guess - it already accounts for
      // physical-room occupancy AND unassigned type-level bookings together.
      if (input.unavailableRoomTypeIds) {
        group.soldOut = input.unavailableRoomTypeIds.has(roomType.id);
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
    const group = groupFromRooms(title, null, members, [], undefined, input.checkIn, input.checkOut, input.unavailableRoomIds, input.guests);
    if (group) groups.push(group);
  }

  return groups;
}

export function hotelPriceRange(groups: RoomCategoryView[]) {
  const prices = groups.flatMap((group) => [group.minPrice, group.maxPrice]).filter((price) => price > 0);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
