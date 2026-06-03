/** Resolve hotel / room labels when Booking.roomId is optional (PMS unassigned bookings). */

type HotelSlice = {
  id: number;
  ownerId: number;
  name: string;
  city?: string;
  coverImageUrl?: string | null;
};

export type BookingLike = {
  room?: { id?: number; title?: string; hotel: HotelSlice } | null;
  assignedRoom?: { id?: number; title?: string; hotel: HotelSlice } | null;
  roomType?: { id?: number; name?: string; hotel: HotelSlice } | null;
};

export function bookingHotelOptional(booking: BookingLike): HotelSlice | null {
  return booking.assignedRoom?.hotel ?? booking.room?.hotel ?? booking.roomType?.hotel ?? null;
}

export function bookingHotel(booking: BookingLike): HotelSlice {
  const hotel = bookingHotelOptional(booking);
  if (!hotel) throw new Error("BOOKING_HOTEL_MISSING");
  return hotel;
}

export function bookingRoomTitle(booking: BookingLike): string {
  return booking.assignedRoom?.title ?? booking.room?.title ?? booking.roomType?.name ?? "—";
}

export function bookingPhysicalRoomId(booking: {
  assignedRoomId?: number | null;
  roomId?: number | null;
}): number | null {
  return booking.assignedRoomId ?? booking.roomId ?? null;
}
