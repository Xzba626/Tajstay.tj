/** Prisma where fragments for owner-scoped bookings (PMS: roomType / assigned / legacy room). */

export function ownerBookingWhere(ownerId: number) {
  return {
    OR: [
      { room: { hotel: { ownerId } } },
      { roomType: { hotel: { ownerId } } },
      { assignedRoom: { hotel: { ownerId } } }
    ]
  };
}

export function ownerOfflineBookingWhere(ownerId: number) {
  return {
    source: "OWNER_MANUAL" as const,
    ...ownerBookingWhere(ownerId)
  };
}
