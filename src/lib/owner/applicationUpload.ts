import type { OwnerApplicationFileSlot } from "@/lib/owner/applicationMeta";

export const OWNER_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const OWNER_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const OWNER_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const OWNER_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export type DualSlotFiles = { photo: File | null; document: File | null };

export type DualSlotKey = "identity" | "identityBack" | "propertyDoc";

export function dualSlotFilled(slot: DualSlotFiles): boolean {
  return Boolean(slot.photo || slot.document);
}

export function validateOwnerPhotoFile(file: File | null): "type" | "size" | null {
  if (!file) return null;
  if (!OWNER_PHOTO_MIME_TYPES.includes(file.type as (typeof OWNER_PHOTO_MIME_TYPES)[number])) return "type";
  if (file.size > OWNER_PHOTO_MAX_BYTES) return "size";
  return null;
}

export function validateOwnerDocumentFile(file: File | null): "type" | "size" | null {
  if (!file) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeOk = OWNER_DOCUMENT_MIME_TYPES.includes(file.type as (typeof OWNER_DOCUMENT_MIME_TYPES)[number]);
  const extOk = ext === "pdf" || ext === "doc" || ext === "docx";
  if (!mimeOk && !extOk) return "type";
  if (file.size > OWNER_DOCUMENT_MAX_BYTES) return "size";
  return null;
}

export function validateDualSlot(
  slot: DualSlotFiles,
  required: boolean
): "missing" | "photo_type" | "photo_size" | "doc_type" | "doc_size" | null {
  if (!dualSlotFilled(slot)) return required ? "missing" : null;
  if (slot.photo) {
    const err = validateOwnerPhotoFile(slot.photo);
    if (err === "type") return "photo_type";
    if (err === "size") return "photo_size";
  }
  if (slot.document) {
    const err = validateOwnerDocumentFile(slot.document);
    if (err === "type") return "doc_type";
    if (err === "size") return "doc_size";
  }
  return null;
}

export function buildFileSlotFromUrls(photoUrl?: string, documentUrl?: string): OwnerApplicationFileSlot | undefined {
  if (photoUrl) return { photo_url: photoUrl, file_type: "photo" };
  if (documentUrl) return { document_url: documentUrl, file_type: "document" };
  return undefined;
}

export function resolveOwnerFileSlotUrl(slot: string | OwnerApplicationFileSlot | undefined): string | undefined {
  if (!slot) return undefined;
  if (typeof slot === "string") return slot;
  return slot.photo_url ?? slot.document_url ?? undefined;
}

export function isOwnerFileSlotDocument(slot: string | OwnerApplicationFileSlot | undefined): boolean {
  if (!slot || typeof slot === "string") return false;
  return slot.file_type === "document" || Boolean(slot.document_url && !slot.photo_url);
}
