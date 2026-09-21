import { prisma } from "@/lib/prisma";
import { LocalVaultDeviceStatus } from "@prisma/client";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import { buildDeviceCanonical } from "@/lib/local-vault/canonical";
import {
  assertNoQuery,
  assertTimestampSkew,
  parseTimestampSeconds,
  readPoPHeaders,
  verifyEd25519Signature
} from "@/lib/local-vault/verify";
import { bodyHashHex } from "@/lib/local-vault/encoding";
import { consumeNonce, subjectDevice } from "@/lib/local-vault/nonce";
import { assertLvRateLimits, lvClientIp, LV_RL } from "@/lib/local-vault/rateLimit";
import {
  buildIncremental,
  buildSnapshot,
  clampLimit,
  DELIVERY_PROTOCOL_VERSION
} from "@/lib/local-vault/bookingDelivery";

export const BOOKING_SYNC_PATH = "/api/local-vault/bookings/sync";

/**
 * Booking delivery sync for an activated Local Vault device.
 *
 * Auth reuses the EXISTING Ed25519 proof-of-possession exactly as `deviceHeartbeat` does — same
 * canonical string, same nonce replay protection, same rate buckets (§21/§27). No parallel auth
 * system was introduced.
 *
 * Why POST with a body rather than `?cursor=`: `assertNoQuery` forbids query strings, and the
 * canonical covers `bodyHash`, so putting the cursor in the body keeps it signed and tamper-evident.
 *
 * Hotel scope is taken from the verified DeviceBinding and NEVER from the request body (§22) — a
 * client-supplied hotelId is ignored entirely.
 */
export async function deviceBookingSync(req: Request, rawBody: Buffer) {
  const url = new URL(req.url);
  assertNoQuery(url);

  const { timestamp, nonce, signature, deviceIdHeader } = readPoPHeaders(req);
  if (!deviceIdHeader) throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  const deviceId = deviceIdHeader;
  const timestampSec = parseTimestampSeconds(timestamp);
  assertTimestampSkew(timestampSec);

  const ip = lvClientIp(req);
  await assertLvRateLimits([
    { key: `lv:device:ip:${ip}`, ...LV_RL.DEVICE_IP },
    { key: `lv:device:id:${deviceId}`, ...LV_RL.DEVICE_ID }
  ]);

  const binding = await prisma.localVaultDeviceBinding.findUnique({ where: { deviceId } });
  if (!binding) throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 401);
  if (binding.status === LocalVaultDeviceStatus.REVOKED) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 403);
  }

  const bodyHash = bodyHashHex(rawBody);
  verifyEd25519Signature({
    canonical: buildDeviceCanonical({
      method: "POST",
      canonicalPath: BOOKING_SYNC_PATH,
      timestamp,
      nonce,
      deviceId,
      bodyHash
    }),
    signatureB64url: signature,
    publicKeyB64url: binding.publicKey
  });

  await consumeNonce({ subjectKey: subjectDevice(deviceId), nonce, timestampSec });

  let parsed: { mode?: string; cursor?: unknown; limit?: unknown } = {};
  if (rawBody.length) {
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
    }
  }

  // Authoritative scope — from the binding, not the payload.
  const hotelId = binding.hotelId;
  const limit = clampLimit(parsed.limit);
  const mode = parsed.mode === "snapshot" ? "snapshot" : "incremental";

  await prisma.localVaultDeviceBinding.update({
    where: { id: binding.id },
    data: { lastSeenAt: new Date() }
  });

  if (mode === "snapshot") {
    const after = Number(parsed.cursor);
    const snap = await buildSnapshot(hotelId, limit, Number.isFinite(after) && after > 0 ? after : 0);
    return {
      ok: true,
      protocolVersion: DELIVERY_PROTOCOL_VERSION,
      mode: "snapshot" as const,
      hotelId,
      items: snap.items,
      nextCursor: snap.nextBookingId,
      headRevision: snap.headRevision,
      hasMore: snap.hasMore
    };
  }

  const cursorRaw = Number(parsed.cursor);
  const cursor = Number.isFinite(cursorRaw) && cursorRaw > 0 ? Math.floor(cursorRaw) : 0;
  const inc = await buildIncremental(hotelId, cursor, limit);
  return {
    ok: true,
    protocolVersion: DELIVERY_PROTOCOL_VERSION,
    mode: "incremental" as const,
    hotelId,
    items: inc.items,
    nextCursor: inc.nextCursor,
    hasMore: inc.hasMore
  };
}
