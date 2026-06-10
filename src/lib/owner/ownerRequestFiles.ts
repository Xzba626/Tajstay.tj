import type { OwnerApplication } from "@prisma/client";
import type { OwnerApplicationUploadValue, OwnerApplicationUploads } from "@/lib/owner/applicationMeta";
import { parseOwnerApplicationMeta } from "@/lib/owner/applicationMeta";

export const OWNER_REQUEST_FILE_TYPES = [
  "passportFront",
  "passportBack",
  "selfieWithDoc",
  "propertyDoc",
  "facade",
  "room",
  "bathroom"
] as const;

export type OwnerRequestFileType = (typeof OWNER_REQUEST_FILE_TYPES)[number];

const COLUMN_MAP: Record<OwnerRequestFileType, keyof OwnerApplication | null> = {
  passportFront: "passportFront",
  passportBack: "passportBack",
  selfieWithDoc: "selfieWithDoc",
  propertyDoc: "propertyDoc",
  facade: null,
  room: null,
  bathroom: null
};

const LEGACY_META_MAP: Record<OwnerRequestFileType, keyof OwnerApplicationUploads | null> = {
  passportFront: "identity",
  passportBack: "identityBack",
  selfieWithDoc: "selfie",
  propertyDoc: "propertyDoc",
  facade: "facade",
  room: "room",
  bathroom: "bathroom"
};

function resolveUploadValue(value: OwnerApplicationUploadValue | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.photo_url ?? value.document_url ?? null;
}

export function getOwnerRequestFileRef(application: OwnerApplication, type: OwnerRequestFileType): string | null {
  const column = COLUMN_MAP[type];
  if (column) {
    const direct = application[column];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }

  const meta = parseOwnerApplicationMeta(application.applicationMeta);
  const metaKey = LEGACY_META_MAP[type];
  if (!meta?.uploads || !metaKey) return null;
  return resolveUploadValue(meta.uploads[metaKey]);
}

export function ownerRequestHasFile(application: OwnerApplication, type: OwnerRequestFileType): boolean {
  return Boolean(getOwnerRequestFileRef(application, type));
}

export function listOwnerRequestFileTypes(application: OwnerApplication): OwnerRequestFileType[] {
  return OWNER_REQUEST_FILE_TYPES.filter((t) => ownerRequestHasFile(application, t));
}
