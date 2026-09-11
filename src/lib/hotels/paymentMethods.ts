import { prisma } from "@/lib/prisma";

export const HOTEL_PAYMENT_METHOD_TYPES = ["CARD", "WALLET", "BANK", "OTHER"] as const;
export type HotelPaymentMethodType = (typeof HOTEL_PAYMENT_METHOD_TYPES)[number];

/** Guest-facing: only active methods for one hotel, ordered for display. */
export async function getHotelPaymentMethods(hotelId: number) {
  return prisma.hotelPaymentMethod.findMany({
    where: { hotelId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
  });
}

/** Owner-facing: every method (active + inactive) for a hotel they own. Throws if not the owner. */
export async function getOwnerHotelPaymentMethods(hotelId: number, ownerId: number) {
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId } });
  if (!hotel) throw new Error("FORBIDDEN");
  return prisma.hotelPaymentMethod.findMany({
    where: { hotelId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
  });
}

type UpsertInput = {
  type: string;
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

function validate(input: UpsertInput): void {
  if (!HOTEL_PAYMENT_METHOD_TYPES.includes(input.type as HotelPaymentMethodType)) {
    throw new Error("INVALID_TYPE");
  }
  if (!input.displayLabel.trim() || !input.recipientName.trim() || !input.paymentIdentifier.trim()) {
    throw new Error("INVALID_INPUT");
  }
}

export async function createHotelPaymentMethod(hotelId: number, ownerId: number, input: UpsertInput) {
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId } });
  if (!hotel) throw new Error("FORBIDDEN");
  validate(input);
  return prisma.hotelPaymentMethod.create({
    data: {
      hotelId,
      type: input.type,
      displayLabel: input.displayLabel.trim(),
      recipientName: input.recipientName.trim(),
      paymentIdentifier: input.paymentIdentifier.trim(),
      instructions: input.instructions?.trim() || null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0
    }
  });
}

export async function updateHotelPaymentMethod(
  hotelId: number,
  methodId: number,
  ownerId: number,
  input: Partial<UpsertInput>
) {
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId } });
  if (!hotel) throw new Error("FORBIDDEN");
  const existing = await prisma.hotelPaymentMethod.findFirst({ where: { id: methodId, hotelId } });
  if (!existing) throw new Error("NOT_FOUND");

  if (input.type !== undefined && !HOTEL_PAYMENT_METHOD_TYPES.includes(input.type as HotelPaymentMethodType)) {
    throw new Error("INVALID_TYPE");
  }
  if (
    (input.displayLabel !== undefined && !input.displayLabel.trim()) ||
    (input.recipientName !== undefined && !input.recipientName.trim()) ||
    (input.paymentIdentifier !== undefined && !input.paymentIdentifier.trim())
  ) {
    throw new Error("INVALID_INPUT");
  }

  return prisma.hotelPaymentMethod.update({
    where: { id: methodId },
    data: {
      type: input.type,
      displayLabel: input.displayLabel?.trim(),
      recipientName: input.recipientName?.trim(),
      paymentIdentifier: input.paymentIdentifier?.trim(),
      instructions: input.instructions === undefined ? undefined : input.instructions?.trim() || null,
      isActive: input.isActive,
      sortOrder: input.sortOrder
    }
  });
}

type PaymentMethodSnapshot = {
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions: string | null;
};

export function buildPaymentMethodSnapshot(method: {
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions: string | null;
}): PaymentMethodSnapshot {
  return {
    displayLabel: method.displayLabel,
    recipientName: method.recipientName,
    paymentIdentifier: method.paymentIdentifier,
    instructions: method.instructions
  };
}

/**
 * Guest selects which hotel-owned payment method they'll pay with. This is the moment the
 * requisites shown to the guest become an immutable snapshot on the Booking - BEFORE any money
 * moves, not when the guest later uploads a receipt. If the owner edits/removes the method
 * afterward, this booking keeps showing exactly what the guest was told to pay to.
 *
 * Re-selectable up until the guest actually submits proof (they may change their mind about which
 * method to use); locked once paymentProofUrl is set, since by then real money may have already
 * moved against the snapshot shown.
 */
export async function selectHotelPaymentMethodForBooking(
  bookingId: number,
  guestId: number,
  hotelPaymentMethodId: number
): Promise<{ ok: true; snapshot: PaymentMethodSnapshot } | { ok: false; reason: "not_found" | "forbidden" | "locked" | "invalid_method" }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } },
      assignedRoom: { include: { hotel: true } }
    }
  });
  if (!booking) return { ok: false, reason: "not_found" };
  if (booking.userId !== guestId) return { ok: false, reason: "forbidden" };
  if (booking.paymentProofUrl) return { ok: false, reason: "locked" };

  const hotelId = booking.assignedRoom?.hotel.id ?? booking.room?.hotel.id ?? booking.roomType?.hotel.id;
  if (!hotelId) return { ok: false, reason: "not_found" };

  const method = await prisma.hotelPaymentMethod.findFirst({
    where: { id: hotelPaymentMethodId, hotelId, isActive: true }
  });
  if (!method) return { ok: false, reason: "invalid_method" };

  const snapshot = buildPaymentMethodSnapshot(method);
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      hotelPaymentMethodId: method.id,
      paymentMethodSnapshot: JSON.parse(JSON.stringify(snapshot)),
      paymentMethod: snapshot.displayLabel
    }
  });

  return { ok: true, snapshot };
}

export async function deleteHotelPaymentMethod(hotelId: number, methodId: number, ownerId: number) {
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId } });
  if (!hotel) throw new Error("FORBIDDEN");
  const existing = await prisma.hotelPaymentMethod.findFirst({ where: { id: methodId, hotelId } });
  if (!existing) throw new Error("NOT_FOUND");
  await prisma.hotelPaymentMethod.delete({ where: { id: methodId } });
}
