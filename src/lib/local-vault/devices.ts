import { prisma } from "@/lib/prisma";
import { LocalVaultDeviceStatus } from "@prisma/client";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import {
  assertOwnerHotelAccess,
  requireLvOwnerOrAdmin,
  derivedOnlineStatus,
  type LvActor,
} from "@/lib/local-vault/authz";
import { writeLvAudit, LV_AUDIT } from "@/lib/local-vault/audit";

export async function listDevices(queryHotelId?: number | null) {
  const actor = await requireLvOwnerOrAdmin();
  return listDevicesAs(actor, queryHotelId);
}

export async function listDevicesAs(actor: LvActor, queryHotelId?: number | null) {
  let hotelFilter: number[] | null = null;
  if (actor.role === "OWNER") {
    const hotels = await prisma.hotel.findMany({
      where: { ownerId: actor.user.id },
      select: { id: true },
    });
    hotelFilter = hotels.map((h) => h.id);
    if (queryHotelId != null) {
      if (!hotelFilter.includes(queryHotelId)) {
        throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 403);
      }
      hotelFilter = [queryHotelId];
    }
    if (hotelFilter.length === 0) {
      return { devices: [] };
    }
  } else if (queryHotelId != null) {
    hotelFilter = [queryHotelId];
  }

  const rows = await prisma.localVaultDeviceBinding.findMany({
    where: hotelFilter ? { hotelId: { in: hotelFilter } } : undefined,
    orderBy: { activatedAt: "desc" },
  });

  return {
    devices: rows.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      installationId: d.installationId,
      hotelId: d.hotelId,
      status: d.status,
      presence: derivedOnlineStatus(d.lastSeenAt),
      platform: d.platform,
      architecture: d.architecture,
      appVersion: d.appVersion,
      activatedAt: d.activatedAt.toISOString(),
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      revokedAt: d.revokedAt?.toISOString() ?? null,
    })),
  };
}

export async function revokeDevice(input: { bindingId: string; reason?: string | null }) {
  const actor = await requireLvOwnerOrAdmin();
  return revokeDeviceAs(actor, input);
}

export async function revokeDeviceAs(
  actor: LvActor,
  input: { bindingId: string; reason?: string | null }
) {
  const binding = await prisma.localVaultDeviceBinding.findUnique({
    where: { id: input.bindingId },
  });
  if (!binding) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 404);
  }

  if (actor.role === "OWNER") {
    await assertOwnerHotelAccess(actor.user.id, binding.hotelId);
  }

  if (binding.status === LocalVaultDeviceStatus.REVOKED) {
    return {
      id: binding.id,
      deviceId: binding.deviceId,
      status: binding.status,
      revokedAt: binding.revokedAt?.toISOString() ?? null,
    };
  }

  const reason = input.reason ? String(input.reason).trim().slice(0, 500) : null;
  const updated = await prisma.localVaultDeviceBinding.update({
    where: { id: binding.id },
    data: {
      status: LocalVaultDeviceStatus.REVOKED,
      revokedAt: new Date(),
      revokedByUserId: actor.user.id,
      revokeReason: reason,
    },
  });

  await writeLvAudit({
    action: LV_AUDIT.DEVICE_REVOKED,
    hotelId: updated.hotelId,
    deviceId: updated.deviceId,
    actorUserId: actor.user.id,
    metadata: { bindingId: updated.id, reason: reason ?? undefined },
  });

  return {
    id: updated.id,
    deviceId: updated.deviceId,
    status: updated.status,
    revokedAt: updated.revokedAt?.toISOString() ?? null,
  };
}
