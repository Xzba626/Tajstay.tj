import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function encryptionKey(): Buffer {
  const raw = process.env.OWNER_DATA_ENCRYPTION_KEY?.trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    return createHash("sha256").update(raw, "utf8").digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("OWNER_DATA_ENCRYPTION_KEY must be set in production");
  }
  const fallback = process.env.AUTH_SECRET?.trim() || "tajstay-dev-encryption-key";
  return createHash("sha256").update(fallback, "utf8").digest();
}

export function isEncryptedField(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

/** AES-256-GCM; stored as enc:v1:<base64url(iv|tag|ciphertext)>. */
export function encryptField(plaintext: string): string {
  const text = plaintext.trim();
  if (!text) return plaintext;
  if (isEncryptedField(text)) return text;

  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64url");
  return `${PREFIX}${payload}`;
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null;
  if (!isEncryptedField(value)) return value;

  const raw = value.slice(PREFIX.length);
  const buf = Buffer.from(raw, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);

  const key = encryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
