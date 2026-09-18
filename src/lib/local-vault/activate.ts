import { prisma } from "@/lib/prisma";
import { LocalVaultDeviceStatus, Prisma } from "@prisma/client";
import { hmacCodeDigest, normalizeActivationCode } from "@/lib/local-vault/codeDigest";
import { requireCodePepper, isPepperConfigured } from "@/lib/local-vault/pepper";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import {
  ACTIVATE_PATH,
  buildActivateCanonical,
} from "@/lib/local-vault/canonical";
import {
  assertTimestampSkew,
  parseTimestampSeconds,
  readPoPHeaders,
  verifyEd25519Signature,
  assertNoQuery,
} from "@/lib/local-vault/verify";
import { bodyHashHex, publicKeyFingerprint } from "@/lib/local-vault/encoding";
import { consumeNonce, subjectActivate } from "@/lib/local-vault/nonce";
import { assertLvRateLimits, lvClientIp, LV_RL } from "@/lib/local-vault/rateLimit";
import { assertPlatformArch, assertHotelAvailableForActivation } from "@/lib/local-vault/authz";
import { writeLvAudit, LV_AUDIT } from "@/lib/local-vault/audit";
import { loadActivationAuthorityContext } from "@/lib/local-vault/activationContext";

export type ActivateBody = {
  activationCode: string;
  installationId: string;
  deviceId: string;
  publicKey: string;
  appVersion?: string;
  platform: string;
  architecture: string;
};

export async function activateDevice(req: Request, rawBody: Buffer, body: ActivateBody) {
  if (!isPepperConfigured()) {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 503);
  }
  requireCodePepper();

  const url = new URL(req.url);
  assertNoQuery(url);

  const { timestamp, nonce, signature } = readPoPHeaders(req);
  const timestampSec = parseTimestampSeconds(timestamp);
  assertTimestampSkew(timestampSec);

  const installationId = String(body.installationId ?? "").trim();
  const deviceId = String(body.deviceId ?? "").trim();
  const publicKey = String(body.publicKey ?? "").trim();
  const platform = String(body.platform ?? "").trim().toLowerCase();
  const architecture = String(body.architecture ?? "").trim().toLowerCase();
  const appVersion = body.appVersion != null ? String(body.appVersion).trim() : null;

  if (!installationId || !deviceId || !publicKey) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
  assertPlatformArch(platform, architecture);

  const normalized = normalizeActivationCode(body.activationCode);
  const codeDigest = hmacCodeDigest(normalized);

  const ip = lvClientIp(req);
  await assertLvRateLimits([
    { key: `lv:activate:ip:${ip}`, ...LV_RL.ACTIVATE_IP },
    { key: `lv:activate:code:${codeDigest}`, ...LV_RL.ACTIVATE_CODE },
    { key: `lv:activate:device:${deviceId}`, ...LV_RL.ACTIVATE_DEVICE },
  ]);

  const bodyHash = bodyHashHex(rawBody);
  const canonical = buildActivateCanonical({
    method: "POST",
    canonicalPath: ACTIVATE_PATH,
    timestamp,
    nonce,
    publicKey,
    bodyHash,
  });

  // Signature BEFORE nonce insert
  const { rawPub } = verifyEd25519Signature({
    canonical,
    signatureB64url: signature,
    publicKeyB64url: publicKey,
  });
  const publicKeyFp = publicKeyFingerprint(rawPub);

  await consumeNonce({
    subjectKey: subjectActivate(publicKeyFp),
    nonce,
    timestampSec,
  });

  const codeRow = await prisma.localVaultActivationCode.findUnique({ where: { codeDigest } });
  if (!codeRow) {
    throw new LvError(LV_ERROR.INVALID_CODE, 400);
  }
  if (codeRow.usedAt) {
    throw new LvError(LV_ERROR.ALREADY_USED, 409);
  }
  if (codeRow.expiresAt.getTime() <= Date.now()) {
    throw new LvError(LV_ERROR.EXPIRED_CODE, 400);
  }

  await assertHotelAvailableForActivation(codeRow.hotelId);

  // Identity conflict checks against existing bindings
  const byInstall = await prisma.localVaultDeviceBinding.findUnique({ where: { installationId } });
  const byDevice = await prisma.localVaultDeviceBinding.findUnique({ where: { deviceId } });
  const byKey = await prisma.localVaultDeviceBinding.findUnique({ where: { publicKey } });
  const byFp = await prisma.localVaultDeviceBinding.findUnique({ where: { publicKeyFp } });

  const existing = byInstall ?? byDevice ?? byKey ?? byFp;

  if (existing) {
    const sameIdentity =
      existing.installationId === installationId &&
      existing.deviceId === deviceId &&
      existing.publicKey === publicKey &&
      existing.publicKeyFp === publicKeyFp;

    if (!sameIdentity) {
      throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 409);
    }

    if (existing.status === LocalVaultDeviceStatus.ACTIVE) {
      throw new LvError(LV_ERROR.DEVICE_ALREADY_BOUND, 409);
    }

    // REVOKED + exact same identity + fresh code → reactivate same row
    if (existing.status === LocalVaultDeviceStatus.REVOKED) {
      if (existing.hotelId !== codeRow.hotelId) {
        throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 409);
      }
      const updated = await prisma.$transaction(async (tx) => {
        const consumed = await tx.localVaultActivationCode.updateMany({
          where: { id: codeRow.id, usedAt: null },
          data: { usedAt: new Date(), usedByDeviceId: deviceId },
        });
        if (consumed.count !== 1) {
          throw new LvError(LV_ERROR.ALREADY_USED, 409);
        }
        return tx.localVaultDeviceBinding.update({
          where: { id: existing.id },
          data: {
            status: LocalVaultDeviceStatus.ACTIVE,
            revokedAt: null,
            revokedByUserId: null,
            revokeReason: null,
            platform,
            architecture,
            appVersion,
            lastSeenAt: new Date(),
            activatedByUserId: codeRow.createdByUserId,
          },
        });
      });

      await writeLvAudit({
        action: LV_AUDIT.DEVICE_REACTIVATED,
        hotelId: updated.hotelId,
        deviceId: updated.deviceId,
        actorUserId: codeRow.createdByUserId,
        metadata: { bindingId: updated.id, codeId: codeRow.id },
      });

      const context = await loadActivationAuthorityContext(updated.hotelId);
      return {
        device: serializeDevice(updated),
        reactivated: true,
        hotel: context.hotel,
        owner: context.owner,
      };
    }
  }

  // Fresh activation
  try {
    const created = await prisma.$transaction(async (tx) => {
      const consumed = await tx.localVaultActivationCode.updateMany({
        where: { id: codeRow.id, usedAt: null },
        data: { usedAt: new Date(), usedByDeviceId: deviceId },
      });
      if (consumed.count !== 1) {
        throw new LvError(LV_ERROR.ALREADY_USED, 409);
      }
      return tx.localVaultDeviceBinding.create({
        data: {
          deviceId,
          installationId,
          publicKey,
          publicKeyFp,
          hotelId: codeRow.hotelId,
          status: LocalVaultDeviceStatus.ACTIVE,
          platform,
          architecture,
          appVersion,
          activatedByUserId: codeRow.createdByUserId,
          lastSeenAt: new Date(),
        },
      });
    });

    await writeLvAudit({
      action: LV_AUDIT.DEVICE_ACTIVATED,
      hotelId: created.hotelId,
      deviceId: created.deviceId,
      actorUserId: codeRow.createdByUserId,
      metadata: { bindingId: created.id, codeId: codeRow.id },
    });

    const context = await loadActivationAuthorityContext(created.hotelId);
    return {
      device: serializeDevice(created),
      reactivated: false,
      hotel: context.hotel,
      owner: context.owner,
    };
  } catch (e: unknown) {
    if (e instanceof LvError) throw e;
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 409);
    }
    throw e;
  }
}

function serializeDevice(d: {
  id: string;
  deviceId: string;
  installationId: string;
  hotelId: number;
  status: LocalVaultDeviceStatus;
  platform: string;
  architecture: string;
  appVersion: string | null;
  activatedAt: Date;
  lastSeenAt: Date | null;
}) {
  return {
    id: d.id,
    deviceId: d.deviceId,
    installationId: d.installationId,
    hotelId: d.hotelId,
    status: d.status,
    platform: d.platform,
    architecture: d.architecture,
    appVersion: d.appVersion,
    activatedAt: d.activatedAt.toISOString(),
    lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
  };
}
