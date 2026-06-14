export type OwnerApplicationFileSlot = {
  photo_url?: string;
  document_url?: string;
  file_type: "photo" | "document";
};

/** Legacy entries may be a plain URL string. */
export type OwnerApplicationUploadValue = string | OwnerApplicationFileSlot;

export type OwnerApplicationUploads = {
  identity?: OwnerApplicationUploadValue;
  identityBack?: OwnerApplicationUploadValue;
  selfie?: OwnerApplicationUploadValue;
  facade?: OwnerApplicationUploadValue;
  room?: OwnerApplicationUploadValue;
  bathroom?: OwnerApplicationUploadValue;
  propertyDoc?: OwnerApplicationUploadValue;
  extraPhotos?: string[];
};

export type OwnerApplicationMeta = {
  applicantType: string;
  city: string;
  propertyType: string;
  address: string;
  roomCount?: string;
  guestCapacity?: string;
  propertyDescription?: string;
  experience?: string;
  houseRules?: string;
  uploads?: OwnerApplicationUploads;
  consentAt: string;
};

import { decryptField, isEncryptedField } from "@/lib/security/fieldEncryption";

export function parseOwnerApplicationMeta(raw: unknown): OwnerApplicationMeta | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const text = isEncryptedField(raw) ? decryptField(raw) : raw;
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") return parsed as OwnerApplicationMeta;
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === "object") return raw as OwnerApplicationMeta;
  return null;
}
