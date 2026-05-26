/** Standard booking relations for hotel/owner resolution (PMS). */
export const bookingWithHotelInclude = {
  room: { include: { hotel: true } },
  roomType: { include: { hotel: true } },
  assignedRoom: { include: { hotel: true } }
} as const;
