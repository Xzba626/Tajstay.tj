import { prisma } from "@/lib/prisma";

export type BulkRoomSpec = {
  hotelId: number;
  roomTypeId: number;
  roomNumbers: string[];
  basePrice: number;
  capacity: number;
};

/** Generate room numbers from range 101-120 or prefix A-1..A-10 */
export function expandRoomNumbers(input: {
  from?: number;
  to?: number;
  prefix?: string;
  count?: number;
}): string[] {
  if (input.from != null && input.to != null) {
    const lo = Math.min(input.from, input.to);
    const hi = Math.max(input.from, input.to);
    if (hi - lo > 2000) throw new Error("range_too_large");
    return Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
  }
  if (input.prefix && input.count) {
    if (input.count > 2000) throw new Error("range_too_large");
    return Array.from({ length: input.count }, (_, i) => `${input.prefix}${i + 1}`);
  }
  return [];
}

export async function bulkCreatePhysicalRooms(spec: BulkRoomSpec) {
  const roomType = await prisma.roomType.findUnique({
    where: { id: spec.roomTypeId },
    select: { id: true, hotelId: true, name: true, basePrice: true, maxGuests: true, amenities: true, weekendPrice: true, minNights: true, extraGuestPrice: true }
  });
  if (!roomType || roomType.hotelId !== spec.hotelId) throw new Error("invalid_room_type");

  const created: number[] = [];
  for (const roomNumber of spec.roomNumbers) {
    const num = roomNumber.trim();
    if (!num) continue;
    try {
      const room = await prisma.room.create({
        data: {
          hotelId: spec.hotelId,
          roomTypeId: spec.roomTypeId,
          roomNumber: num,
          title: `${roomType.name} ${num}`,
          price: roomType.basePrice,
          weekendPrice: roomType.weekendPrice,
          minNights: roomType.minNights,
          extraGuestPrice: roomType.extraGuestPrice,
          capacity: roomType.maxGuests,
          amenities: roomType.amenities,
          availability: true,
          status: "ACTIVE",
          housekeepingStatus: "CLEAN"
        }
      });
      created.push(room.id);
    } catch {
      // skip duplicates (unique hotelId+roomNumber)
    }
  }
  return { createdCount: created.length, roomIds: created };
}
