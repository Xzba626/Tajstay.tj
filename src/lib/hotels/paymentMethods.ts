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

export async function deleteHotelPaymentMethod(hotelId: number, methodId: number, ownerId: number) {
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId } });
  if (!hotel) throw new Error("FORBIDDEN");
  const existing = await prisma.hotelPaymentMethod.findFirst({ where: { id: methodId, hotelId } });
  if (!existing) throw new Error("NOT_FOUND");
  await prisma.hotelPaymentMethod.delete({ where: { id: methodId } });
}
