type HotelLite = {
  id: number;
  name: string;
  rating: number;
  rooms?: Array<{ id: number; price: number | string }>;
};

type BookingLite = {
  roomId: number;
  status: string;
  createdAt: Date;
};

export function buildOwnerPricingInsights(hotels: HotelLite[] = [], recentBookings: BookingLite[] = []) {
  const thresholdDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const fresh = recentBookings.filter((b) => b?.createdAt && b.createdAt >= thresholdDate);

  return hotels
    .map((hotel) => {
      const rooms = hotel.rooms ?? [];
      const roomIds = new Set(rooms.map((room) => room.id));
      const bookingsCount = fresh.filter((b) => roomIds.has(b.roomId) && (b.status === "PENDING_OWNER" || b.status === "CONFIRMED")).length;
      const roomsCount = rooms.length || 1;
      const pressure = bookingsCount / roomsCount;
      const suggestedDelta = pressure >= 2 ? 15 : pressure >= 1 ? 8 : pressure >= 0.5 ? 3 : -5;
      return {
        hotelId: hotel.id,
        hotelName: hotel.name,
        pressure,
        suggestedDelta
      };
    })
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 4);
}
