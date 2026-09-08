/**
 * Prisma Decimal must not cross the RSC → Client Component boundary.
 * Keep money as a 2-decimal string so precision is not lost in JSON/RSC.
 */
export function moneyToFixed2(value: unknown): string {
  if (value == null) return "0.00";
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(2) : "0.00";
  }
  if (typeof value === "object" && value !== null && "toFixed" in value) {
    try {
      return (value as { toFixed: (digits: number) => string }).toFixed(2);
    } catch {
      return "0.00";
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export type ClientRoom = {
  price: string;
  availability: boolean;
  [key: string]: unknown;
};

export function serializeHotelForClient<T extends { rooms?: Array<{ price: unknown; availability?: boolean } & Record<string, unknown>> }>(
  hotel: T
): T {
  const rooms = (hotel.rooms ?? []).map((room) => ({
    ...room,
    price: moneyToFixed2(room.price),
    availability: Boolean(room.availability)
  }));
  return { ...hotel, rooms };
}
