/** Prisma where fragments for owner-scoped bookings (PMS: roomType / assigned / legacy room). */

/**
 * `hotelId` is optional (single-hotel owners have nothing to scope down from), but when present
 * it must narrow every branch of the OR — otherwise a multi-hotel owner filtered to Hotel A would
 * still see Hotel B's bookings via whichever branch forgot the extra clause.
 */
export function ownerBookingWhere(ownerId: number, hotelId?: number) {
  // Unscoped ("all my hotels") must mean "all my APPROVED hotels" - a PENDING/REJECTED hotel has
  // no real bookings to show, and must never silently become part of an aggregate view either.
  const hotelFilter = hotelId ? { id: hotelId, ownerId } : { ownerId, status: "APPROVED" };
  return {
    OR: [
      { room: { hotel: hotelFilter } },
      { roomType: { hotel: hotelFilter } },
      { assignedRoom: { hotel: hotelFilter } }
    ]
  };
}

export function ownerOfflineBookingWhere(ownerId: number, hotelId?: number) {
  return {
    source: "OWNER_MANUAL" as const,
    ...ownerBookingWhere(ownerId, hotelId)
  };
}
