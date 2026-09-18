import crypto from "crypto";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";
import { b64urlDecode } from "@/lib/local-vault/encoding";
import { TIMESTAMP_SKEW_SEC } from "@/lib/local-vault/canonical";

export function parseTimestampSeconds(raw: string): number {
  if (!/^\d{1,12}$/.test(raw)) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
  return n;
}

export function assertTimestampSkew(timestampSec: number, nowSec = Math.floor(Date.now() / 1000)): void {
  if (Math.abs(nowSec - timestampSec) > TIMESTAMP_SKEW_SEC) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
}

/** Decode Ed25519 public key (32 raw bytes) from base64url; return SPKI KeyObject. */
export function ed25519PublicKeyFromB64url(publicKeyB64url: string): {
  raw: Buffer;
  keyObject: crypto.KeyObject;
} {
  const raw = b64urlDecode(publicKeyB64url, 32);
  // SPKI DER prefix for Ed25519 + 32-byte key
  const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
  const spki = Buffer.concat([spkiPrefix, raw]);
  const keyObject = crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
  return { raw, keyObject };
}

export function verifyEd25519Signature(input: {
  canonical: string;
  signatureB64url: string;
  publicKeyB64url: string;
}): { rawPub: Buffer } {
  const { raw, keyObject } = ed25519PublicKeyFromB64url(input.publicKeyB64url);
  const sig = b64urlDecode(input.signatureB64url, 64);
  const ok = crypto.verify(null, Buffer.from(input.canonical, "utf8"), keyObject, sig);
  if (!ok) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 401);
  }
  return { rawPub: raw };
}

export function assertNoQuery(url: URL): void {
  if (url.search && url.search !== "?") {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
}

export function readPoPHeaders(req: Request): {
  timestamp: string;
  nonce: string;
  signature: string;
  deviceIdHeader: string | null;
} {
  const timestamp = req.headers.get("x-lv-timestamp")?.trim() ?? "";
  const nonce = req.headers.get("x-lv-nonce")?.trim() ?? "";
  const signature = req.headers.get("x-lv-signature")?.trim() ?? "";
  const deviceIdHeader = req.headers.get("x-lv-device-id")?.trim() ?? null;
  if (!timestamp || !nonce || !signature) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
  // nonce must be valid base64url (16 bytes when decoded)
  b64urlDecode(nonce, 16);
  return { timestamp, nonce, signature, deviceIdHeader };
}
