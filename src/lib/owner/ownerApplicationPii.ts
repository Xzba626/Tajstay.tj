import type { OwnerApplication, Prisma } from "@prisma/client";
import { decryptField, encryptField, isEncryptedField } from "@/lib/security/fieldEncryption";
import { parseOwnerApplicationMeta, type OwnerApplicationMeta } from "@/lib/owner/applicationMeta";

const PII_STRING_FIELDS = ["fullName", "phone", "email", "businessName", "address", "inn"] as const;

type PiiStringField = (typeof PII_STRING_FIELDS)[number];

export type DecryptedOwnerApplication = OwnerApplication & {
  applicationMeta: OwnerApplicationMeta | null;
};

function encryptOptional(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  const trimmed = value.trim();
  if (!trimmed) return value === "" ? "" : null;
  return encryptField(trimmed);
}

/** Encrypt owner PII before persisting to the database. */
export function encryptOwnerApplicationInput(
  input: Prisma.OwnerApplicationUncheckedCreateInput
): Prisma.OwnerApplicationUncheckedCreateInput {
  const next: Prisma.OwnerApplicationUncheckedCreateInput = { ...input };
  for (const field of PII_STRING_FIELDS) {
    const value = next[field];
    if (typeof value === "string" && value.trim() && !isEncryptedField(value)) {
      next[field] = encryptField(value);
    }
  }
  if (input.applicationMeta != null && typeof input.applicationMeta === "object") {
    next.applicationMeta = encryptField(JSON.stringify(input.applicationMeta));
  }
  return next;
}

function decryptMeta(raw: Prisma.JsonValue | null | undefined): OwnerApplicationMeta | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const decrypted = decryptField(raw);
    if (!decrypted) return null;
    try {
      return parseOwnerApplicationMeta(JSON.parse(decrypted));
    } catch {
      return null;
    }
  }
  return parseOwnerApplicationMeta(raw);
}

/** Decrypt owner PII for authorized admin review only. */
export function decryptOwnerApplicationRow(row: OwnerApplication): DecryptedOwnerApplication {
  const decrypted: Record<string, unknown> = { ...row };
  for (const field of PII_STRING_FIELDS) {
    const value = row[field];
    decrypted[field] = typeof value === "string" ? decryptField(value) : value;
  }
  decrypted.applicationMeta = decryptMeta(row.applicationMeta);
  return decrypted as DecryptedOwnerApplication;
}

export function decryptOwnerApplicationField(value: string | null | undefined): string | null {
  return decryptField(value);
}
