import { prisma } from "@/lib/prisma";
import {
  generateActivationCodePlaintext,
  hmacCodeDigest,
  normalizeActivationCode,
} from "@/lib/local-vault/codeDigest";
import { requireCodePepper, isPepperConfigured } from "@/lib/local-vault/pepper";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import { assertOwnerHotelAccess, requireLvOwnerOrAdmin, type LvActor } from "@/lib/local-vault/authz";
import { assertLvRateLimits, LV_RL } from "@/lib/local-vault/rateLimit";
import { writeLvAudit, LV_AUDIT } from "@/lib/local-vault/audit";

const CODE_TTL_MS = 10 * 60_000;

export async function createActivationCode(input: { hotelId: number }) {
  const actor = await requireLvOwnerOrAdmin();
  return createActivationCodeAs(actor, input);
}

export async function createActivationCodeAs(actor: LvActor, input: { hotelId: number }) {
  if (!isPepperConfigured()) {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 503);
  }
  requireCodePepper();

  const hotelId = Number(input.hotelId);
  if (!Number.isFinite(hotelId) || hotelId <= 0) {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 400);
  }

  if (actor.role === "OWNER") {
    await assertOwnerHotelAccess(actor.user.id, hotelId);
  } else {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { id: true, status: true } });
    if (!hotel) throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 400);
  }

  await assertLvRateLimits([
    { key: `lv:code:create:user:${actor.user.id}`, ...LV_RL.CODE_CREATE_USER },
    { key: `lv:code:create:hotel:${hotelId}`, ...LV_RL.CODE_CREATE_HOTEL },
  ]);

  let plaintext = "";
  let codeDigest = "";
  for (let i = 0; i < 5; i++) {
    plaintext = generateActivationCodePlaintext();
    codeDigest = hmacCodeDigest(normalizeActivationCode(plaintext));
    const clash = await prisma.localVaultActivationCode.findUnique({ where: { codeDigest } });
    if (!clash) break;
    plaintext = "";
  }
  if (!plaintext) throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 500);

  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const row = await prisma.localVaultActivationCode.create({
    data: {
      codeDigest,
      hotelId,
      createdByUserId: actor.user.id,
      expiresAt,
    },
  });

  await writeLvAudit({
    action: LV_AUDIT.ACTIVATION_CODE_CREATED,
    hotelId,
    actorUserId: actor.user.id,
    metadata: { codeId: row.id, expiresAt: expiresAt.toISOString() },
  });

  return {
    id: row.id,
    hotelId,
    expiresAt: expiresAt.toISOString(),
    activationCode: plaintext,
  };
}
