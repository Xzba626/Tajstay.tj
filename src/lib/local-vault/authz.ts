import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import type { User } from "@prisma/client";

export type LvActor = { user: User; role: "OWNER" | "ADMIN" };

/** Owner or Admin session required. Manager/Guest denied. */
export async function requireLvOwnerOrAdmin(): Promise<LvActor> {
  const user = await getSessionUser();
  if (!user) throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 401);
  if (user.isBanned) throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 403);
  if (user.role === "ADMIN") return { user, role: "ADMIN" };
  if (user.role === "OWNER") return { user, role: "OWNER" };
  throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 403);
}

export async function assertOwnerHotelAccess(ownerId: number, hotelId: number) {
  const hotel = await prisma.hotel.findFirst({
    where: { id: hotelId, ownerId },
    select: { id: true, status: true, ownerId: true, name: true },
  });
  if (!hotel) throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 403);
  return hotel;
}

export async function assertHotelAvailableForActivation(hotelId: number) {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true, status: true, ownerId: true },
  });
  if (!hotel || hotel.status !== "APPROVED") {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 400);
  }
  return hotel;
}

/** Allowed platforms / architectures for 2B.1 desktop. */
export const LV_ALLOWED_PLATFORMS = new Set(["windows"]);
export const LV_ALLOWED_ARCHITECTURES = new Set(["x64"]);

export function assertPlatformArch(platform: string, architecture: string): void {
  const p = String(platform ?? "").trim().toLowerCase();
  const a = String(architecture ?? "").trim().toLowerCase();
  if (!LV_ALLOWED_PLATFORMS.has(p) || !LV_ALLOWED_ARCHITECTURES.has(a)) {
    throw new LvError(LV_ERROR.UNSUPPORTED_APP_VERSION, 400);
  }
}

export const ONLINE_THRESHOLD_MS = 5 * 60_000;

export function derivedOnlineStatus(lastSeenAt: Date | null | undefined): "ONLINE" | "OFFLINE" {
  if (!lastSeenAt) return "OFFLINE";
  return Date.now() - lastSeenAt.getTime() <= ONLINE_THRESHOLD_MS ? "ONLINE" : "OFFLINE";
}
