import { prisma } from "@/lib/prisma";
import { LocalVaultDeviceStatus } from "@prisma/client";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import { HEARTBEAT_PATH, buildDeviceCanonical } from "@/lib/local-vault/canonical";
import {
  assertNoQuery,
  assertTimestampSkew,
  parseTimestampSeconds,
  readPoPHeaders,
  verifyEd25519Signature,
} from "@/lib/local-vault/verify";
import { bodyHashHex } from "@/lib/local-vault/encoding";
import { consumeNonce, subjectDevice } from "@/lib/local-vault/nonce";
import { assertLvRateLimits, lvClientIp, LV_RL } from "@/lib/local-vault/rateLimit";
import { derivedOnlineStatus } from "@/lib/local-vault/authz";

export async function deviceHeartbeat(req: Request, rawBody: Buffer) {
  const url = new URL(req.url);
  assertNoQuery(url);

  const { timestamp, nonce, signature, deviceIdHeader } = readPoPHeaders(req);
  if (!deviceIdHeader) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
  const deviceId = deviceIdHeader;
  const timestampSec = parseTimestampSeconds(timestamp);
  assertTimestampSkew(timestampSec);

  const ip = lvClientIp(req);
  await assertLvRateLimits([
    { key: `lv:device:ip:${ip}`, ...LV_RL.DEVICE_IP },
    { key: `lv:device:id:${deviceId}`, ...LV_RL.DEVICE_ID },
  ]);

  const binding = await prisma.localVaultDeviceBinding.findUnique({ where: { deviceId } });
  if (!binding) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 401);
  }
  if (binding.status === LocalVaultDeviceStatus.REVOKED) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 403);
  }

  const bodyHash = bodyHashHex(rawBody);
  const canonical = buildDeviceCanonical({
    method: "POST",
    canonicalPath: HEARTBEAT_PATH,
    timestamp,
    nonce,
    deviceId,
    bodyHash,
  });

  verifyEd25519Signature({
    canonical,
    signatureB64url: signature,
    publicKeyB64url: binding.publicKey,
  });

  await consumeNonce({
    subjectKey: subjectDevice(deviceId),
    nonce,
    timestampSec,
  });

  const updated = await prisma.localVaultDeviceBinding.update({
    where: { id: binding.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    ok: true,
    deviceId: updated.deviceId,
    status: updated.status,
    presence: derivedOnlineStatus(updated.lastSeenAt),
    lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
  };
}
