import crypto from "crypto";
import { requireCodePepper } from "@/lib/local-vault/pepper";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

/** Strip whitespace; digits only; reject otherwise. */
export function normalizeActivationCode(raw: string): string {
  const stripped = String(raw ?? "").replace(/\s+/g, "");
  if (!stripped || !/^\d+$/.test(stripped) || stripped.length < 6 || stripped.length > 16) {
    throw new LvError(LV_ERROR.INVALID_CODE, 400);
  }
  return stripped;
}

export function hmacCodeDigest(normalizedCode: string, pepper = requireCodePepper()): string {
  return crypto.createHmac("sha256", pepper).update(normalizedCode, "utf8").digest("hex");
}

/** Cryptographically random 8-digit human code. */
export function generateActivationCodePlaintext(): string {
  const n = crypto.randomInt(0, 100_000_000);
  return String(n).padStart(8, "0");
}
