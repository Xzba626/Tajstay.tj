/** Prisma where fragments for hotel-moderator-scoped data. */

export function moderatorHotelWhere(userId: number) {
  return {
    moderators: { some: { userId } },
    deletedAt: null as null
  };
}

export function moderatorBookingWhere(userId: number) {
  return {
    OR: [
      { room: { hotel: moderatorHotelWhere(userId) } },
      { roomType: { hotel: moderatorHotelWhere(userId) } },
      { assignedRoom: { hotel: moderatorHotelWhere(userId) } }
    ]
  };
}

export function moderatorOfflineBookingWhere(userId: number) {
  return {
    source: "OWNER_MANUAL" as const,
    ...moderatorBookingWhere(userId)
  };
}
