import { prisma } from "@/lib/prisma";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import { subjectActivate, subjectDevice, TIMESTAMP_SKEW_SEC } from "@/lib/local-vault/canonical";

/**
 * Atomic nonce insert AFTER signature verification.
 * Unique(subjectKey, nonce) — conflict = replay.
 */
export async function consumeNonce(input: {
  subjectKey: string;
  nonce: string;
  timestampSec: number;
}): Promise<void> {
  const expiresAt = new Date((input.timestampSec + TIMESTAMP_SKEW_SEC + 60) * 1000);
  try {
    await prisma.localVaultUsedNonce.create({
      data: {
        subjectKey: input.subjectKey,
        nonce: input.nonce,
        expiresAt,
      },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 409);
    }
    throw e;
  }
}

export { subjectActivate, subjectDevice };
