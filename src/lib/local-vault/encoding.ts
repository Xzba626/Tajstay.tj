import crypto from "crypto";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

const B64URL_RE = /^[A-Za-z0-9_-]+$/;

export function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function b64urlDecode(s: string, expectedLen?: number): Buffer {
  if (!s || !B64URL_RE.test(s) || s.includes("=")) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const buf = Buffer.from(b64, "base64");
  if (expectedLen != null && buf.length !== expectedLen) {
    throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
  }
  return buf;
}

export function publicKeyFingerprint(rawPub32: Buffer): string {
  return crypto.createHash("sha256").update(rawPub32).digest("hex");
}

export function bodyHashHex(bodyBytes: Buffer): string {
  return crypto.createHash("sha256").update(bodyBytes).digest("hex");
}

export function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
