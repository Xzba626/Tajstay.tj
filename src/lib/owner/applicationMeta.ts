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

export function parseOwnerApplicationMeta(raw: unknown): OwnerApplicationMeta | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as OwnerApplicationMeta;
}
