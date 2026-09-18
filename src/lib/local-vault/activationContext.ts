import { prisma } from "@/lib/prisma";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

export type ActivationHotelContext = {
  id: number;
  name: string;
};

export type ActivationOwnerContext = {
  id: number;
  displayName: string;
};

export type ActivationAuthorityContext = {
  hotel: ActivationHotelContext;
  owner: ActivationOwnerContext;
};

/**
 * Authoritative Hotel + current Owner for Local Vault activation success.
 * Owner = Hotel.ownerId → User (never activatedByUserId).
 * Minimal fields only — no email/phone/secrets.
 */
export async function loadActivationAuthorityContext(
  hotelId: number
): Promise<ActivationAuthorityContext> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
      name: true,
      status: true,
      ownerId: true,
      owner: { select: { id: true, name: true } },
    },
  });

  if (!hotel || hotel.status !== "APPROVED") {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 400);
  }

  if (!hotel.owner) {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 500);
  }

  const displayName = hotel.owner.name.trim();
  if (!displayName) {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 500);
  }

  return {
    hotel: { id: hotel.id, name: hotel.name },
    owner: { id: hotel.owner.id, displayName },
  };
}
